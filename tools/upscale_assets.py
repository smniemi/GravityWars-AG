#!/usr/bin/env python3
"""
Asset Upscaler for GravityWars.
Uses blocks_indexed.png as source, with edge-aware blending.
Blurs alpha to smoothly blend AI-upscaled edges with NN-upscaled interiors.
"""

import os
import sys
import io
import time
import requests
import replicate
import numpy as np
from scipy.ndimage import distance_transform_edt
from PIL import Image, ImageOps, ImageFile, ImageFilter
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
ImageFile.LOAD_TRUNCATED_IMAGES = True

# Constants
BLOCK_SIZE = 32
CONTEXT_PAD = 4
TILE_WITH_CONTEXT = BLOCK_SIZE + 2 * CONTEXT_PAD  # 40
GRID_COUNT = 6
GRID_PIXELS = GRID_COUNT * TILE_WITH_CONTEXT  # 240
SCALE = 4
UP_TILE_SIZE = BLOCK_SIZE * SCALE  # 128
STRIDE = 33  # Spacing in blocks_indexed.png (32px block + 1px red line)

# Alpha Logic from EAGLView.m / tileAtlas.ts
# Index 0 and 176-190 are transparent background
# Index 195 is water (should be transparent for shader handling)
TRANSPARENT_INDICES = [0] + list(range(176, 191))
RED_DOOR_INDICES = [192, 193, 194]
GREEN_PORTAL_INDEX = 196

def setup_replicate():
    api_key = os.getenv('REPLICATE_API_KEY')
    if not api_key:
        print("Error: REPLICATE_API_KEY not found in .env file")
        sys.exit(1)
    os.environ['REPLICATE_API_TOKEN'] = api_key

def upscale_grid(image_buf, max_retries=5):
    """Upscale a grid image using Replicate at 4x"""
    retry_count = 0
    while retry_count < max_retries:
        try:
            output = replicate.run(
                "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                input={"image": image_buf, "scale": SCALE, "face_enhance": False}
            )
            if output:
                image_data = requests.get(output).content
                return Image.open(io.BytesIO(image_data)).convert('RGB')
        except Exception as e:
            if "429" in str(e) or "throttled" in str(e).lower():
                retry_count += 1
                wait = 10 * retry_count
                print(f"  Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  Upscale error: {e}")
                break
    return None

def load_blocks_indexed(project_root):
    """Load blocks_indexed.png and strip red grid lines to create a clean block sheet."""
    atlas_path = project_root / "blocks_indexed.png"
    atlas = Image.open(atlas_path).convert('RGB')
    
    # blocks_indexed.png is 320x792 with 33px spacing
    # 9 columns (320/33=9.7), 24 rows (792/33=24)
    cols = 9
    rows = 24
    
    clean = Image.new('RGB', (cols * BLOCK_SIZE, rows * BLOCK_SIZE))
    
    for row in range(rows):
        for col in range(cols):
            sx = col * STRIDE
            sy = row * STRIDE
            if sx + BLOCK_SIZE <= atlas.width and sy + BLOCK_SIZE <= atlas.height:
                block = atlas.crop((sx, sy, sx + BLOCK_SIZE, sy + BLOCK_SIZE))
                clean.paste(block, (col * BLOCK_SIZE, row * BLOCK_SIZE))
    
    return clean, cols

def load_gifs(project_root):
    """Load original GIF files for palette-based alpha extraction."""
    gifs = []
    for i in range(4):
        path = project_root / f"GameCode/tools/OriginalPictures/a{i}.gif"
        gifs.append(Image.open(path))
    return gifs

def get_alpha_from_gif(gifs, block_id):
    """Get alpha mask for a block using original palette indices from GIF."""
    if block_id >= 216:
        return None
    
    gif_idx = block_id // 54
    local_idx = block_id % 54
    row = local_idx // 9
    col = local_idx % 9
    
    gif = gifs[gif_idx]
    # Block at (col*33+1, row*33+1) - skip the red grid line
    sx = col * STRIDE + 1
    sy = row * STRIDE + 1
    
    block = gif.crop((sx, sy, sx + BLOCK_SIZE, sy + BLOCK_SIZE))
    data = list(block.getdata())
    
    mask_data = []
    for idx in data:
        if idx in TRANSPARENT_INDICES:
            mask_data.append(0)
        elif idx in RED_DOOR_INDICES:
            mask_data.append(254)  # Red door marker
        elif idx == GREEN_PORTAL_INDEX:
            mask_data.append(253)  # Green portal marker
        # Water (195) falls through to 255 (Solid)
        else:
            mask_data.append(255)
    
    mask = Image.new('L', (BLOCK_SIZE, BLOCK_SIZE))
    mask.putdata(mask_data)
    return mask

def is_empty_block(clean_sheet, block_id, cols):
    """Check if a block is mostly transparent (brown background)."""
    row = block_id // cols
    col = block_id % cols
    bx = col * BLOCK_SIZE
    by = row * BLOCK_SIZE
    
    block = clean_sheet.crop((bx, by, bx + BLOCK_SIZE, by + BLOCK_SIZE))
    data = list(block.getdata())
    
    # Count pixels that match brown/transparent range
    transparent_count = sum(1 for r, g, b in data if r < 75 and g < 60 and b < 50)
    return transparent_count > (BLOCK_SIZE * BLOCK_SIZE * 0.9)  # 90% transparent

def get_block_with_mirrored_context(clean_sheet, block_id, cols):
    """Extract 40x40 crop with mirrored edges for context."""
    row = block_id // cols
    col = block_id % cols
    
    bx = col * BLOCK_SIZE
    by = row * BLOCK_SIZE
    
    if bx + BLOCK_SIZE > clean_sheet.width or by + BLOCK_SIZE > clean_sheet.height:
        return None
    
    core = clean_sheet.crop((bx, by, bx + BLOCK_SIZE, by + BLOCK_SIZE))
    
    # Build 40x40 with mirrored edges
    result = Image.new('RGB', (TILE_WITH_CONTEXT, TILE_WITH_CONTEXT))
    
    # Paste core at center
    result.paste(core, (CONTEXT_PAD, CONTEXT_PAD))
    
    # Top edge
    top = ImageOps.flip(core.crop((0, 0, BLOCK_SIZE, CONTEXT_PAD)))
    result.paste(top, (CONTEXT_PAD, 0))
    
    # Bottom edge
    bottom = ImageOps.flip(core.crop((0, BLOCK_SIZE - CONTEXT_PAD, BLOCK_SIZE, BLOCK_SIZE)))
    result.paste(bottom, (CONTEXT_PAD, CONTEXT_PAD + BLOCK_SIZE))
    
    # Left edge
    left = ImageOps.mirror(core.crop((0, 0, CONTEXT_PAD, BLOCK_SIZE)))
    result.paste(left, (0, CONTEXT_PAD))
    
    # Right edge
    right = ImageOps.mirror(core.crop((BLOCK_SIZE - CONTEXT_PAD, 0, BLOCK_SIZE, BLOCK_SIZE)))
    result.paste(right, (CONTEXT_PAD + BLOCK_SIZE, CONTEXT_PAD))
    
    # Corners (mirrored both ways)
    tl = ImageOps.mirror(ImageOps.flip(core.crop((0, 0, CONTEXT_PAD, CONTEXT_PAD))))
    result.paste(tl, (0, 0))
    tr = ImageOps.mirror(ImageOps.flip(core.crop((BLOCK_SIZE - CONTEXT_PAD, 0, BLOCK_SIZE, CONTEXT_PAD))))
    result.paste(tr, (CONTEXT_PAD + BLOCK_SIZE, 0))
    bl = ImageOps.mirror(ImageOps.flip(core.crop((0, BLOCK_SIZE - CONTEXT_PAD, CONTEXT_PAD, BLOCK_SIZE))))
    result.paste(bl, (0, CONTEXT_PAD + BLOCK_SIZE))
    br = ImageOps.mirror(ImageOps.flip(core.crop((BLOCK_SIZE - CONTEXT_PAD, BLOCK_SIZE - CONTEXT_PAD, BLOCK_SIZE, BLOCK_SIZE))))
    result.paste(br, (CONTEXT_PAD + BLOCK_SIZE, CONTEXT_PAD + BLOCK_SIZE))
    
    return result

def get_alpha_mask_from_rgb(block_rgb):
    """Generate alpha mask from RGB values (brown = transparent)."""
    data = list(block_rgb.getdata())
    mask_data = []
    for r, g, b in data:
        # Brown background range
        if r < 75 and g < 60 and b < 50:
            mask_data.append(0)
        # Red door colors ~(255, 39, 0)
        elif r > 200 and g < 80 and b < 50:
            mask_data.append(254)
        # Green portal ~(0, 255, 11)
        elif g > 200 and r < 50 and b < 50:
            mask_data.append(253)
        # Water: Solid (255)
        else:
            mask_data.append(255)
    mask = Image.new('L', block_rgb.size)
    mask.putdata(mask_data)
    return mask

def retro_blend(upscaled_rgb, original_rgb, alpha_mask, alpha_blur_radius=3, max_nn_blend=0.75, edge_falloff=12, force_nn_colors=False):
    """
    Edge-aware retro blend:
    - Block Edges: 100% Nearest-Neighbor to ensure seamless tiling
    - Interior Edges (Alpha): More AI-upscaled for crisp boundaries
    - Interior Solid: Blend NN/AI for retro look
    """
    # Get core 32x32 from 40x40 context block
    core = original_rgb.crop((CONTEXT_PAD, CONTEXT_PAD, CONTEXT_PAD + BLOCK_SIZE, CONTEXT_PAD + BLOCK_SIZE))
    nn_up = core.resize((UP_TILE_SIZE, UP_TILE_SIZE), Image.NEAREST)
    
    # Upscale the provided alpha mask (from GIF palette)
    alpha_up = alpha_mask.resize((UP_TILE_SIZE, UP_TILE_SIZE), Image.NEAREST)
    
    # Blur alpha for smooth transparency transitions
    alpha_blurred = alpha_up.filter(ImageFilter.GaussianBlur(radius=alpha_blur_radius))
    
    # 1. Compute distance from Void (alpha=0) to determine "interior" vs "edge"
    # Treat water (alpha 128) as "solid" for the purpose of retro blending
    alpha_arr = np.array(alpha_up)
    is_visible = alpha_arr > 10
    dist_from_void = distance_transform_edt(is_visible)
    
    # 2. Compute distance from Block Border (for seamless tiling)
    h, w = alpha_arr.shape
    y_grid, x_grid = np.indices((h, w))
    dist_from_border = np.min([y_grid, h-1-y_grid, x_grid, w-1-x_grid], axis=0)
    
    # Border Blend: 0 at border (100% NN), 1 at 'border_falloff' pixels in
    border_falloff = 4  # 4 pixels of NN at border
    border_factor = np.clip(dist_from_border / border_falloff, 0, 1)

    # Retro Blend Factor (based on distance from void)
    # Edge (dist=0) -> 0 (AI)
    # Interior -> 1 (blend max_nn_blend)
    retro_factor = np.clip(dist_from_void / edge_falloff, 0, 1)
    
    nn_share = retro_factor * max_nn_blend
    border_t = 1.0 - border_factor
    final_nn_share = np.maximum(nn_share, border_t)
    
    # SAFETY: Ensure we don't blend the "background color" of FULLY INVISIBLE NN pixels
    # But allow semi-transparent (water) to blend
    is_safe_nn = (alpha_arr > 10).astype(float)
    final_nn_share = final_nn_share * is_safe_nn
    
    # EXTRA SAFETY: Explicitly check for the "brown" background color in the NN texture
    # and prevent it from blending in, even if alpha logic allows it.
    # Brown range: r < 75 and g < 60 and b < 50
    up_arr = np.array(upscaled_rgb).astype(float)
    nn_arr = np.array(nn_up).astype(float)
    
    nn_r = nn_arr[:,:,0]
    nn_g = nn_arr[:,:,1]
    nn_b = nn_arr[:,:,2]
    is_brown_bg = (nn_r < 75) & (nn_g < 60) & (nn_b < 50)
    # Mask out brown pixels from contributing
    final_nn_share = final_nn_share * (~is_brown_bg).astype(float)
    
    upscaled_contrib = 1.0 - final_nn_share
    
    
    if force_nn_colors:
        blended_arr = nn_arr.astype(np.uint8)
    else:
        blended_arr = (upscaled_contrib[:, :, np.newaxis] * up_arr + 
                       final_nn_share[:, :, np.newaxis] * nn_arr).astype(np.uint8)
    
    blended = Image.fromarray(blended_arr, 'RGB')
    
    # Combine with blurred alpha, keeping RGB values (important for water)
    result = blended.convert('RGBA')
    
    # Load alpha data
    alpha_data = np.array(alpha_blurred)
    
    # For water/transparency: we put the calculated alpha into the alpha channel
    # The RGB channels already contain the correct Blue (from NN/AI blend)
    r, g, b, _ = result.split()
    result = Image.merge('RGBA', (r, g, b, alpha_blurred))
    
    return result


def get_special_block_rgb(gifs, block_id):
    """Generate special blocks (Synthesized for Doors/Portal, GIF for Water)."""
    if block_id >= 216: return None
    
    # Special Blocks (192-196): Use GIF source for texture
    # The alpha mask will be overridden in process_atlas to mark them as special types.
    gif_idx = block_id // 54
    local_idx = block_id % 54
    row = local_idx // 9
    col = local_idx % 9
    
    gif = gifs[gif_idx]
    sx = col * STRIDE + 1
    sy = row * STRIDE + 1
    core = gif.crop((sx, sy, sx + BLOCK_SIZE, sy + BLOCK_SIZE)).convert('RGB')
    
    # Build 40x40 with mirrored edges
    result = Image.new('RGB', (TILE_WITH_CONTEXT, TILE_WITH_CONTEXT))
    result.paste(core, (CONTEXT_PAD, CONTEXT_PAD))
    
    # Simple mirroring for context
    # Top
    result.paste(ImageOps.flip(core.crop((0, 0, BLOCK_SIZE, CONTEXT_PAD))), (CONTEXT_PAD, 0))
    # Bottom
    result.paste(ImageOps.flip(core.crop((0, BLOCK_SIZE - CONTEXT_PAD, BLOCK_SIZE, BLOCK_SIZE))), (CONTEXT_PAD, CONTEXT_PAD + BLOCK_SIZE))
    # Left
    result.paste(ImageOps.mirror(core.crop((0, 0, CONTEXT_PAD, BLOCK_SIZE))), (0, CONTEXT_PAD))
    # Right
    result.paste(ImageOps.mirror(core.crop((BLOCK_SIZE - CONTEXT_PAD, 0, BLOCK_SIZE, BLOCK_SIZE))), (CONTEXT_PAD + BLOCK_SIZE, CONTEXT_PAD))
    
    # Corners
    result.paste(ImageOps.mirror(ImageOps.flip(core.crop((0, 0, CONTEXT_PAD, CONTEXT_PAD)))), (0, 0))
    result.paste(ImageOps.mirror(ImageOps.flip(core.crop((BLOCK_SIZE - CONTEXT_PAD, 0, BLOCK_SIZE, CONTEXT_PAD)))), (CONTEXT_PAD + BLOCK_SIZE, 0))
    result.paste(ImageOps.mirror(ImageOps.flip(core.crop((0, BLOCK_SIZE - CONTEXT_PAD, CONTEXT_PAD, BLOCK_SIZE)))), (0, CONTEXT_PAD + BLOCK_SIZE))
    result.paste(ImageOps.mirror(ImageOps.flip(core.crop((BLOCK_SIZE - CONTEXT_PAD, BLOCK_SIZE - CONTEXT_PAD, BLOCK_SIZE, BLOCK_SIZE)))), (CONTEXT_PAD + BLOCK_SIZE, CONTEXT_PAD + BLOCK_SIZE))
    
    return result

def process_atlas(clean_sheet, cols, gifs, blocks_out_path):
    print("Generating High-Res Atlas with Edge-Aware Retro Blend...")
    
    TOTAL_BLOCKS = 254  # 216 + 38
    COLS = 9
    ROWS = (TOTAL_BLOCKS + COLS - 1) // COLS
    
    final_atlas = Image.new('RGBA', (COLS * UP_TILE_SIZE, ROWS * UP_TILE_SIZE), (0, 0, 0, 0))
    
    batch_size = GRID_COUNT * GRID_COUNT  # 36
    num_batches = (TOTAL_BLOCKS + batch_size - 1) // batch_size
    
    for b in range(num_batches):
        start_id = b * batch_size
        end_id = min(TOTAL_BLOCKS, start_id + batch_size)
        print(f"  Batch {b+1}/{num_batches} (IDs {start_id}-{end_id-1})...")
        
        grid_img = Image.new('RGB', (GRID_PIXELS, GRID_PIXELS))
        grid_originals = {}
        
        for i in range(start_id, end_id):
            local_idx = i - start_id
            bx = (local_idx % GRID_COUNT) * TILE_WITH_CONTEXT
            by = (local_idx // GRID_COUNT) * TILE_WITH_CONTEXT
            
            # Use GIF source for special blocks (Doors, Water, Portal)
            if i in [192, 193, 194, 195, 196]:
                block_with_ctx = get_special_block_rgb(gifs, i)
            else:
                block_with_ctx = get_block_with_mirrored_context(clean_sheet, i, cols)
            
            if not block_with_ctx:
                continue
            
            grid_img.paste(block_with_ctx, (bx, by))
            grid_originals[i] = block_with_ctx

        # Upscale the grid
        buf = io.BytesIO()
        grid_img.save(buf, format='PNG')
        buf.seek(0)
        up_grid = upscale_grid(buf)
        
        if not up_grid:
            print("    Batch failed. Using fallback.")
            up_grid = grid_img.resize((GRID_PIXELS * SCALE, GRID_PIXELS * SCALE), Image.NEAREST)
        
        # Extract and blend each tile
        for i in range(start_id, end_id):
            if i not in grid_originals:
                continue
                
            local_idx = i - start_id
            bx = (local_idx % GRID_COUNT) * TILE_WITH_CONTEXT * SCALE
            by = (local_idx // GRID_COUNT) * TILE_WITH_CONTEXT * SCALE
            
            # Extract upscaled tile (center 128x128 from 160x160)
            margin = CONTEXT_PAD * SCALE
            tile_rgb = up_grid.crop((bx + margin, by + margin, bx + margin + UP_TILE_SIZE, by + margin + UP_TILE_SIZE))
            
            # Get alpha mask
            if i < 216:
                alpha_mask = get_alpha_from_gif(gifs, i)
            else:
                alpha_mask = get_alpha_mask_from_rgb(grid_originals[i].crop((CONTEXT_PAD, CONTEXT_PAD, CONTEXT_PAD + BLOCK_SIZE, CONTEXT_PAD + BLOCK_SIZE)))
            
            # Apply retro blend
            tile_rgba = retro_blend(tile_rgb, grid_originals[i], alpha_mask, force_nn_colors=(i == 195))
            
            # Place in final atlas
            ax = (i % COLS) * UP_TILE_SIZE
            ay = (i // COLS) * UP_TILE_SIZE
            final_atlas.paste(tile_rgba, (ax, ay))

    final_atlas.save(blocks_out_path)
    print(f"✓ Saved high-res atlas to {blocks_out_path}")

def main():
    setup_replicate()
    project_root = Path(__file__).parent.parent
    blocks_out = project_root / "web/public/assets/sprites/blocks_4x.png"
    
    print("Loading blocks_indexed.png...")
    clean_sheet, cols = load_blocks_indexed(project_root)
    
    print("Loading GIF files for alpha extraction...")
    gifs = load_gifs(project_root)
    
    process_atlas(clean_sheet, cols, gifs, blocks_out)

if __name__ == "__main__":
    main()
