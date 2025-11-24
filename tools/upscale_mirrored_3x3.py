#!/usr/bin/env python3
"""
Texture Block Upscaler - Real-ESRGAN 8x with 3x3 Mirrored Context
Processes blocks with surrounding mirrored blocks for better edge continuity
"""

import os
import sys
from PIL import Image, ImageOps
from pathlib import Path
from dotenv import load_dotenv
import time
import replicate
import requests
import io

load_dotenv()

BLOCK_SIZE = 32
UPSCALE_FACTOR = 8
UPSCALED_SIZE = BLOCK_SIZE * UPSCALE_FACTOR  # 256x256
BLOCKS_PER_ROW = 9  # 320 width ÷ 33 spacing = 9 blocks per row
TEST_MODE_BLOCKS = 3  # Test with 3 blocks to start

def setup_replicate():
    """Configure Replicate API"""
    api_key = os.getenv('REPLICATE_API_KEY')
    if not api_key:
        print("Error: REPLICATE_API_KEY not found in .env file")
        sys.exit(1)
    
    os.environ['REPLICATE_API_TOKEN'] = api_key
    print(f"✓ Replicate API key loaded")

def extract_blocks(atlas_path):
    """Extract individual 32x32 blocks from the texture atlas (with 1px borders)"""
    print(f"Loading texture atlas from: {atlas_path}")
    atlas = Image.open(atlas_path)
    
    if atlas.mode != 'RGB':
        atlas = atlas.convert('RGB')
    
    atlas_width, atlas_height = atlas.size
    print(f"Atlas dimensions: {atlas_width}x{atlas_height}")
    
    blocks = []
    block_count = 0
    
    # Blocks are 32x32 but have 1-pixel red borders, so spacing is 33 pixels
    BLOCK_SPACING = 33
    
    for y in range(0, atlas_height, BLOCK_SPACING):
        for x in range(0, atlas_width, BLOCK_SPACING):
            # Only extract if the full 32x32 block fits within the atlas
            if x + BLOCK_SIZE <= atlas_width and y + BLOCK_SIZE <= atlas_height:
                block = atlas.crop((x, y, x + BLOCK_SIZE, y + BLOCK_SIZE))
                blocks.append({
                    'image': block,
                    'index': block_count,
                    'x': x,
                    'y': y
                })
                block_count += 1
    
    print(f"Extracted {len(blocks)} blocks (32x32 each, 33px spacing)")
    return blocks

def create_3x3_mirrored_grid(block_image):
    """
    Create a 3x3 grid where the center is the original block,
    and surrounding blocks are mirrored versions for edge continuity
    
    Grid layout:
    [TL] [T ] [TR]
    [L ] [C ] [R ]
    [BL] [B ] [BR]
    
    Where:
    - C = Center (original block)
    - T/B/L/R = Top/Bottom/Left/Right (flipped once)
    - TL/TR/BL/BR = Corners (flipped twice)
    """
    # Create the 3x3 grid (96x96 pixels)
    grid_size = BLOCK_SIZE * 3
    grid = Image.new('RGB', (grid_size, grid_size))
    
    # Center block (original)
    center = block_image
    
    # Edge blocks (single flip)
    top = ImageOps.flip(block_image)  # Vertical flip
    bottom = ImageOps.flip(block_image)  # Vertical flip
    left = ImageOps.mirror(block_image)  # Horizontal flip
    right = ImageOps.mirror(block_image)  # Horizontal flip
    
    # Corner blocks (double flip)
    top_left = ImageOps.flip(ImageOps.mirror(block_image))
    top_right = ImageOps.flip(ImageOps.mirror(block_image))
    bottom_left = ImageOps.flip(ImageOps.mirror(block_image))
    bottom_right = ImageOps.flip(ImageOps.mirror(block_image))
    
    # Paste blocks into grid
    # Top row
    grid.paste(top_left, (0, 0))
    grid.paste(top, (BLOCK_SIZE, 0))
    grid.paste(top_right, (BLOCK_SIZE * 2, 0))
    
    # Middle row
    grid.paste(left, (0, BLOCK_SIZE))
    grid.paste(center, (BLOCK_SIZE, BLOCK_SIZE))
    grid.paste(right, (BLOCK_SIZE * 2, BLOCK_SIZE))
    
    # Bottom row
    grid.paste(bottom_left, (0, BLOCK_SIZE * 2))
    grid.paste(bottom, (BLOCK_SIZE, BLOCK_SIZE * 2))
    grid.paste(bottom_right, (BLOCK_SIZE * 2, BLOCK_SIZE * 2))
    
    return grid

def extract_center_block(upscaled_grid):
    """
    Extract the center block from the upscaled 3x3 grid
    The grid should be 768x768 (96*8), and we want the center 256x256
    """
    grid_width, grid_height = upscaled_grid.size
    center_size = grid_width // 3
    
    # Calculate center block position
    left = center_size
    top = center_size
    right = left + center_size
    bottom = top + center_size
    
    center_block = upscaled_grid.crop((left, top, right, bottom))
    return center_block

def save_temp_image(image, index):
    """Save image temporarily for upload"""
    temp_path = Path(f"temp_block_{index}.png")
    image.save(temp_path, 'PNG')
    return temp_path

def upscale_with_replicate(block_image, block_index, max_retries=5):
    """
    Image-to-image upscaling using Replicate's Real-ESRGAN at 8x with retry logic
    Uses 3x3 mirrored grid for better edge continuity
    """
    
    print(f"  Block {block_index}: Creating 3x3 mirrored grid...")
    grid_3x3 = create_3x3_mirrored_grid(block_image)
    
    print(f"  Block {block_index}: Upscaling 8x with Real-ESRGAN...")
    
    temp_path = None
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            temp_path = save_temp_image(grid_3x3, block_index)
            
            with open(temp_path, "rb") as f:
                output = replicate.run(
                    "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                    input={
                        "image": f,
                        "scale": 2,
                        "face_enhance": False
                    }
                )
            
            if output:
                image_data = requests.get(output).content
                upscaled_grid = Image.open(io.BytesIO(image_data))
                
                print(f"  Block {block_index}: Extracting center block from upscaled grid...")
                center_block = extract_center_block(upscaled_grid)
                
                # Ensure final size is correct
                if center_block.size != (UPSCALED_SIZE, UPSCALED_SIZE):
                    center_block = center_block.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.LANCZOS)
                
                print(f"  ✓ Upscaled to {UPSCALED_SIZE}x{UPSCALED_SIZE}")
                return center_block
            else:
                return None
                
        except Exception as e:
            error_msg = str(e)
            
            # Check if it's a rate limit error
            if "429" in error_msg or "throttled" in error_msg.lower():
                retry_count += 1
                wait_time = 15 * retry_count  # Exponential backoff: 15s, 30s, 45s, etc.
                print(f"  ⚠ Rate limited. Retry {retry_count}/{max_retries} in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"  ✗ Error: {e}")
                return block_image.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.NEAREST)
        finally:
            if temp_path and temp_path.exists():
                try:
                    time.sleep(0.1)
                    temp_path.unlink()
                except:
                    pass
    
    # If all retries failed, use fallback
    print(f"  ✗ Max retries reached, using fallback")
    return block_image.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.NEAREST)

def create_atlas(blocks, output_path, upscaled=False):
    """Create a texture atlas from blocks"""
    size = UPSCALED_SIZE if upscaled else BLOCK_SIZE
    blocks_per_row = BLOCKS_PER_ROW
    num_rows = (len(blocks) + blocks_per_row - 1) // blocks_per_row
    
    atlas_width = blocks_per_row * size
    atlas_height = num_rows * size
    
    print(f"Creating atlas: {atlas_width}x{atlas_height}")
    
    atlas = Image.new('RGB', (atlas_width, atlas_height), color=(0, 0, 0))
    
    for i, block_data in enumerate(blocks):
        if block_data['image'] is None:
            continue
        
        row = i // blocks_per_row
        col = i % blocks_per_row
        x = col * size
        y = row * size
        
        atlas.paste(block_data['image'], (x, y))
    
    atlas.save(output_path, 'PNG')
    print(f"✓ Saved: {output_path}")

def save_debug_grid(block_image, block_index, output_dir):
    """Save the 3x3 mirrored grid for debugging"""
    grid = create_3x3_mirrored_grid(block_image)
    debug_path = output_dir / f"debug_grid_block_{block_index}.png"
    grid.save(debug_path, 'PNG')
    print(f"  Debug: Saved 3x3 grid to {debug_path}")

def main():
    print("=" * 70)
    print("Real-ESRGAN 8x Upscaler - 3x3 Mirrored Context")
    print("=" * 70)
    
    setup_replicate()
    
    project_root = Path(__file__).parent.parent
    atlas_path = project_root / "blocks_indexed.png"
    output_dir = project_root / "tools" / "upscaled_textures"
    output_dir.mkdir(exist_ok=True)
    
    if not atlas_path.exists():
        print(f"Error: Texture atlas not found")
        sys.exit(1)
    
    blocks = extract_blocks(atlas_path)
    num_blocks = len(blocks) if TEST_MODE_BLOCKS is None else TEST_MODE_BLOCKS
    
    print(f"\nProcessing {num_blocks} blocks at 8x (256x256) with 3x3 mirrored context...")
    
    # Save original
    print("\n[1/4] Creating original atlas...")
    original_png = output_dir / "original_atlas_mirrored_3x3.png"
    create_atlas(blocks[:num_blocks], original_png, upscaled=False)
    
    # Save debug grids for first few blocks
    print("\n[2/4] Creating debug 3x3 grids...")
    for i in range(min(3, num_blocks)):
        save_debug_grid(blocks[i]['image'], blocks[i]['index'], output_dir)
    
    # Upscale
    print("\n[3/4] Upscaling with Real-ESRGAN (3x3 mirrored context)...")
    upscaled_blocks = []
    
    for i in range(num_blocks):
        block = blocks[i]
        print(f"\nBlock {i+1}/{num_blocks}:")
        
        upscaled = upscale_with_replicate(block['image'], block['index'])
        
        if upscaled:
            upscaled_blocks.append({
                'image': upscaled,
                'index': block['index'],
                'x': block['x'],
                'y': block['y']
            })
        
        # Rate limiting: 6 requests per minute = 10 seconds between requests
        if i < num_blocks - 1:
            print("  Waiting 10s for rate limiting...")
            time.sleep(10)
    
    # Create upscaled atlas
    print("\n[4/4] Creating upscaled atlas...")
    upscaled_png = output_dir / "upscaled_atlas_mirrored_3x3.png"
    create_atlas(upscaled_blocks, upscaled_png, upscaled=True)
    
    print("\n" + "=" * 70)
    print("✓ Complete!")
    print(f"\nOutput: {output_dir}")
    print(f"  - original_atlas_mirrored_3x3.png")
    print(f"  - debug_grid_block_*.png (3x3 grids for first 3 blocks)")
    print(f"  - upscaled_atlas_mirrored_3x3.png (256x256 per block)")
    print("\nThe 3x3 mirrored approach should provide better edge continuity!")
    print("=" * 70)

if __name__ == "__main__":
    main()
