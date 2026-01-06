#!/usr/bin/env python3
"""
Upscale extracted assets with per-frame caching.
"""

import os
import sys
import io
import time
import requests
import replicate
import hashlib
from PIL import Image, ImageOps, ImageFilter
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

def setup_replicate():
    api_key = os.getenv('REPLICATE_API_KEY')
    if not api_key:
        print("Error: REPLICATE_API_KEY not found in .env file")
        sys.exit(1)
    os.environ['REPLICATE_API_TOKEN'] = api_key

def upscale_image(image, scale=4, pad=16, max_retries=5):
    """Upscale with padding for better edges, with retries"""
    w, h = image.size
    padded = Image.new('RGB', (w + 2*pad, h + 2*pad), (0, 0, 0))
    padded.paste(image, (pad, pad))
    
    buf = io.BytesIO()
    padded.save(buf, format='PNG')
    
    retry_count = 0
    while retry_count < max_retries:
        try:
            buf.seek(0)
            output = replicate.run(
                "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                input={"image": buf, "scale": scale, "face_enhance": False}
            )
            if output:
                image_data = requests.get(output).content
                upscaled_padded = Image.open(io.BytesIO(image_data))
                
                up_pad = pad * scale
                up_w = w * scale
                up_h = h * scale
                return upscaled_padded.crop((up_pad, up_pad, up_pad + up_w, up_pad + up_h))
        except Exception as e:
            msg = str(e)
            if "429" in msg or "throttled" in msg.lower():
                retry_count += 1
                wait = 10 * retry_count
                print(f"  Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"Upscale error: {e}")
                break
    return None

def apply_alpha(image, is_block=False):
    """Convert background to transparent. Background is black or brown [4-68, 0-52, 0-44]"""
    ad = image.convert("RGBA")
    data = ad.getdata()
    new_data = []
    for item in data:
        r, g, b = item[:3]
        if is_block:
            # GravityWars brown transparency range indices 0, 176-190
            # RGB range is roughly R<75, G<60, B<50
            if r < 75 and g < 60 and b < 50:
                new_data.append((0, 0, 0, 0))
            else:
                new_data.append(item)
        else:
            # Generic black transparency
            if r < 5 and g < 5 and b < 5:
                new_data.append((0, 0, 0, 0))
            else:
                new_data.append(item)
    ad.putdata(new_data)
    return ad

def create_3x3_mirrored_grid(block_image):
    """Create a 3x3 mirrored grid for seamless upscaling"""
    w, h = block_image.size
    grid = Image.new('RGB', (w * 3, h * 3))
    
    # Original
    center = block_image
    # Flips
    top = ImageOps.flip(block_image)
    left = ImageOps.mirror(block_image)
    corner = ImageOps.flip(left)
    
    # Fill grid
    grid.paste(corner, (0, 0))
    grid.paste(top, (w, 0))
    grid.paste(corner, (w*2, 0))
    
    grid.paste(left, (0, h))
    grid.paste(center, (w, h))
    grid.paste(left, (w*2, h))
    
    grid.paste(corner, (0, h*2))
    grid.paste(top, (w, h*2))
    grid.paste(corner, (w*2, h*2))
    
    return grid

def extract_center_block(upscaled_grid):
    """Extract center block from upscaled 3x3 grid"""
    w, h = upscaled_grid.size
    cw, ch = w // 3, h // 3
    return upscaled_grid.crop((cw, ch, cw * 2, ch * 2))

def smart_blend(up, orig_sharp, max_orig_weight=0.75, blur_radius=3):
    """
    Blends up (AI) and orig_sharp (Retro) using a blurred mask.
    Edges = New (AI)
    Mid = Old (Retro, max_orig_weight influence)
    """
    # Create mask: 1.0 where it's NOT brown background
    ad = orig_sharp.convert("RGBA")
    data = ad.getdata()
    mask_data = []
    for r, g, b, a in data:
        # Retro brown transparency detection
        if r < 75 and g < 60 and b < 50:
            mask_data.append(0)
        else:
            mask_data.append(255)
    
    mask = Image.new("L", orig_sharp.size)
    mask.putdata(mask_data)
    
    # Blur the mask to define "edges" vs "middle"
    blurred_mask = mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    
    final_pixels = []
    up_pixels = up.convert("RGB").getdata()
    orig_pixels = orig_sharp.convert("RGB").getdata()
    mask_vals = blurred_mask.getdata()
    
    for i in range(len(up_pixels)):
        # weight of the original texture (retro)
        # We use a power function to make the transition steeper
        # This pushes the retro influence towards the center and lets AI dominate edges
        w = ((mask_vals[i] / 255.0) ** 2) * max_orig_weight
        
        ur, ug, ub = up_pixels[i]
        or_, og, ob = orig_pixels[i]
        
        fr = int(ur * (1.0 - w) + or_ * w)
        fg = int(ug * (1.0 - w) + og * w)
        fb = int(ub * (1.0 - w) + ob * w)
        final_pixels.append((fr, fg, fb))
        
    res = Image.new("RGB", up.size)
    res.putdata(final_pixels)
    return res

def generate_rotations(image, count=32):
    """Generate rotated frames"""
    frames = []
    w, h = image.size
    for i in range(count):
        angle = - (i * 360 / count) # Negative for counter-clockwise rotation matching game logic
        # Use high quality bicubic rotation
        rotated = image.rotate(angle, resample=Image.BICUBIC, expand=False)
        frames.append(rotated)
    return frames

def create_sprite_sheet(frames, cols=8):
    if not frames: return None
    f_w, f_h = frames[0].size
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * f_w, rows * f_h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        r = i // cols
        c = i % cols
        sheet.paste(frame, (c * f_w, r * f_h))
    return sheet

def main():
    setup_replicate()
    project_root = Path(__file__).parent.parent
    assets_dir = project_root / "tools/extracted_assets"
    output_dir = project_root / "web/public/assets/sprites"
    cache_dir = project_root / "tools/upscaled_cache"
    output_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    def process_with_cache(img_path, name_prefix):
        cache_file = cache_dir / f"{name_prefix}_4x.png"
        if cache_file.exists():
            print(f"  Using cached {name_prefix}_4x.png")
            return Image.open(cache_file)
        
        print(f"  Upscaling {name_prefix}...")
        img = Image.open(img_path)
        up = upscale_image(img)
        if up:
            up.save(cache_file)
            return up
        return None

    # Process Ship
    print("Processing Ship Base...")
    img_path = assets_dir / "ship_base.png"
    up_base = process_with_cache(img_path, "ship_base")
    if up_base:
        # Smart blend: edges from AI, middle from retro (75%)
        orig = Image.open(img_path).convert("RGB")
        orig_sharp = orig.resize(up_base.size, Image.NEAREST)
        blended = smart_blend(up_base, orig_sharp, max_orig_weight=0.75, blur_radius=3)
        
        up_base_alpha = apply_alpha(blended, is_block=True)
        # Save high-res single texture
        up_base_alpha.save(output_dir / "ship_base_highres.png")
        print("  ✓ Saved ship_base_highres.png (smart blend)")
        
        if not (output_dir / "ship_base_4x.png").exists():
            print("  Generating 32 rotations for Ship Base...")
            rot_frames = generate_rotations(up_base_alpha)
            sheet = create_sprite_sheet(rot_frames)
            sheet.save(output_dir / "ship_base_4x.png")
            print("  ✓ Saved ship_base_4x.png")
    
    print("Processing Ship Thrust...")
    img_path_thrust = assets_dir / "ship_thrust.png"
    up_thrust = process_with_cache(img_path_thrust, "ship_thrust")
    if up_thrust:
        # Smart blend: edges from AI, middle from retro (75%)
        orig_t = Image.open(img_path_thrust).convert("RGB")
        orig_t_sharp = orig_t.resize(up_thrust.size, Image.NEAREST)
        blended_t = smart_blend(up_thrust, orig_t_sharp, max_orig_weight=0.75, blur_radius=3)
        
        up_thrust_alpha = apply_alpha(blended_t, is_block=True)
        # Save high-res single texture
        up_thrust_alpha.save(output_dir / "ship_thrust_highres.png")
        print("  ✓ Saved ship_thrust_highres.png (smart blend)")
        
        if not (output_dir / "ship_thrust_4x.png").exists():
            print("  Generating 32 rotations for Ship Thrust...")
            rot_frames = generate_rotations(up_thrust_alpha)
            sheet = create_sprite_sheet(rot_frames)
            sheet.save(output_dir / "ship_thrust_4x.png")
            print("  ✓ Saved ship_thrust_4x.png")
        
    # Process Animations
    animations = {
        "explosion": ("Explosions", 5),
        "splash": ("Splashes", 5),
        "appear": ("Appear", 5)
    }
    
    for key, (label, count) in animations.items():
        print(f"Processing {label}...")
        sheet_path = output_dir / f"{key}_4x.png"
        if sheet_path.exists():
            print(f"  {label} sheet already exists.")
            continue
            
        frames = []
        all_ok = True
        for i in range(count):
            img_path = assets_dir / f"{key}_{i}.png"
            up = process_with_cache(img_path, f"{key}_{i}")
            if up:
                # Consistency check: apply smart blend to animations too
                orig = Image.open(img_path).convert("RGB")
                orig_sharp = orig.resize(up.size, Image.NEAREST)
                blended = smart_blend(up, orig_sharp, max_orig_weight=0.75, blur_radius=3)
                
                frames.append(apply_alpha(blended, is_block=True))
                # Optional: slight delay between frames if not from cache to play nice with API
                if not (cache_dir / f"{key}_{i}_4x.png").exists():
                    time.sleep(2)
            else:
                all_ok = False
                break
        
        if all_ok and frames:
            sheet = create_sprite_sheet(frames, cols=5)
            sheet.save(sheet_path)
            print(f"  ✓ Saved {key}_4x.png")
    # Process Blocks Atlas
    print("Processing Blocks Atlas (Mirrored 3x3 technique)...")
    blocks_out = output_dir / "blocks_4x.png"
    if not blocks_out.exists():
        img = Image.open("blocks_indexed.png").convert("RGB")
        w, h = img.size
        # Gutters: 33px stride
        STRIDE = 33
        COLS = 9
        ROWS = 24
        TILE_SIZE = 32
        UP_TILE_SIZE = 128
        
        tight_atlas = Image.new('RGBA', (COLS * UP_TILE_SIZE, ROWS * UP_TILE_SIZE), (0, 0, 0, 0))
        
        # Phase 1: Quick fill with nearest-neighbor so game is playable immediately
        print("  Quick-filling atlas with nearest-neighbor...")
        for row in range(ROWS):
            for col in range(COLS):
                sx = col * STRIDE
                sy = row * STRIDE
                if sx + TILE_SIZE > w or sy + TILE_SIZE > h: continue
                
                block = img.crop((sx, sy, sx + TILE_SIZE, sy + TILE_SIZE))
                up_tile = block.resize((UP_TILE_SIZE, UP_TILE_SIZE), Image.NEAREST)
                up_tile_alpha = apply_alpha(up_tile, is_block=True)
                tight_atlas.paste(up_tile_alpha, (col * UP_TILE_SIZE, row * UP_TILE_SIZE))
        
        tight_atlas.save(blocks_out)
        print("  ✓ Saved initial nearest-neighbor atlas. Refinement starting...")

        # Phase 2: Refine with AI-upscaled versions
        for row in range(ROWS):
            for col in range(COLS):
                sx = col * STRIDE
                sy = row * STRIDE
                if sx + TILE_SIZE > w or sy + TILE_SIZE > h: continue
                
                block_idx = row * COLS + col
                block = img.crop((sx, sy, sx + TILE_SIZE, sy + TILE_SIZE))
                
                # Check cache for this specific tile
                grid = create_3x3_mirrored_grid(block)
                grid_buf = io.BytesIO()
                grid.save(grid_buf, format='PNG')
                grid_hash = hashlib.md5(grid_buf.getvalue()).hexdigest()
                
                cache_file = cache_dir / f"block_up_{grid_hash}.png"
                up_grid = None
                if cache_file.exists():
                    up_grid = Image.open(cache_file)
                else:
                    print(f"  Upscaling block {block_idx} (row {row}, col {col})...")
                    up_grid = upscale_image(grid) # Default scale=4 will give 384x384 grid
                    if up_grid:
                        up_grid.save(cache_file)
                        # API rate limit delay
                        time.sleep(2)
                
                if up_grid:
                    up_tile = extract_center_block(up_grid)
                else:
                    # Fallback to nearest-neighbor if not cached yet
                    print(f"  Fallback upscaling for block {block_idx}...")
                    up_tile = block.resize((UP_TILE_SIZE, UP_TILE_SIZE), Image.NEAREST)
                
                # Resize to exactly 128 if needed
                if up_tile.size != (UP_TILE_SIZE, UP_TILE_SIZE):
                    up_tile = up_tile.resize((UP_TILE_SIZE, UP_TILE_SIZE), Image.LANCZOS)
                
                up_tile_alpha = apply_alpha(up_tile, is_block=True)
                tight_atlas.paste(up_tile_alpha, (col * UP_TILE_SIZE, row * UP_TILE_SIZE))
                
                # Save partial progress so game always has a file
                tight_atlas.save(blocks_out)
        
        print(f"  ✓ Finished processing mirrored blocks_4x.png")
    else:
        print("  Blocks atlas already exists.")

    print("\nUpscaling complete!")

if __name__ == "__main__":
    main()
