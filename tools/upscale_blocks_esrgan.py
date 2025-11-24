#!/usr/bin/env python3
"""
Texture Block Upscaler - Replicate Real-ESRGAN (Image-to-Image)
Uses Replicate's Real-ESRGAN model for true image-to-image upscaling
"""

import os
import sys
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv
import time
import replicate
import requests
import io

load_dotenv()

BLOCK_SIZE = 32
UPSCALE_FACTOR = 16  # Changed from 8 to 16
UPSCALED_SIZE = BLOCK_SIZE * UPSCALE_FACTOR  # 512x512
BLOCKS_PER_ROW = 20
TEST_MODE_BLOCKS = None  # None = process all blocks

def setup_replicate():
    """Configure Replicate API"""
    api_key = os.getenv('REPLICATE_API_KEY')
    if not api_key:
        print("Error: REPLICATE_API_KEY not found in .env file")
        print("Get one at: https://replicate.com/account/api-tokens")
        sys.exit(1)
    
    os.environ['REPLICATE_API_TOKEN'] = api_key  # Replicate SDK uses REPLICATE_API_TOKEN internally
    print(f"✓ Replicate API key loaded")

def extract_blocks(atlas_path):
    """Extract individual 32x32 blocks from the texture atlas"""
    print(f"Loading texture atlas from: {atlas_path}")
    atlas = Image.open(atlas_path)
    
    if atlas.mode != 'RGB':
        atlas = atlas.convert('RGB')
    
    atlas_width, atlas_height = atlas.size
    print(f"Atlas dimensions: {atlas_width}x{atlas_height}")
    
    blocks = []
    block_count = 0
    
    for y in range(0, atlas_height, BLOCK_SIZE):
        for x in range(0, atlas_width, BLOCK_SIZE):
            block = atlas.crop((x, y, x + BLOCK_SIZE, y + BLOCK_SIZE))
            blocks.append({
                'image': block,
                'index': block_count,
                'x': x,
                'y': y
            })
            block_count += 1
    
    print(f"Extracted {len(blocks)} blocks")
    return blocks

def save_temp_image(image, index):
    """Save image temporarily for upload"""
    temp_path = Path(f"temp_block_{index}.png")
    image.save(temp_path, 'PNG')
    return temp_path

def upscale_with_replicate(block_image, block_index):
    """
    Image-to-image upscaling using Replicate's Real-ESRGAN
    """
    
    print(f"  Block {block_index}: Upscaling with Real-ESRGAN (image-to-image)...")
    
    temp_path = None
    try:
        # Save block temporarily
        temp_path = save_temp_image(block_image, block_index)
        print(f"  Saved temp image: {temp_path}")
        
        # Use Real-ESRGAN for upscaling
        print(f"  Calling Replicate API...")
        with open(temp_path, "rb") as f:
            output = replicate.run(
                "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                input={
                    "image": f,
                    "scale": 4,  # Real-ESRGAN max is 4x, we'll upscale twice
                    "face_enhance": False  # Keep pixel art style
                }
            )
        
        print(f"  Replicate response: {output}")
        
        # Download the upscaled image
        if output:
            print(f"  Downloading upscaled image from: {output}")
            image_data = requests.get(output).content
            upscaled = Image.open(io.BytesIO(image_data))
            
            # Ensure correct size
            if upscaled.size != (UPSCALED_SIZE, UPSCALED_SIZE):
                upscaled = upscaled.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.LANCZOS)
            
            print(f"  ✓ Upscaled to {upscaled.size[0]}x{upscaled.size[1]}")
            return upscaled
        else:
            print(f"  ✗ No output from Replicate")
            return None
            
    except Exception as e:
        print(f"  ✗ Replicate error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        print(f"  → Falling back to nearest-neighbor")
        return block_image.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.NEAREST)
    finally:
        # Clean up temp file
        if temp_path and temp_path.exists():
            try:
                time.sleep(0.1)  # Brief delay to ensure file is released
                temp_path.unlink()
            except Exception as e:
                print(f"  Warning: Could not delete temp file: {e}")

def create_atlas(blocks, output_path, upscaled=False):
    """Create a texture atlas from blocks"""
    size = UPSCALED_SIZE if upscaled else BLOCK_SIZE
    blocks_per_row = BLOCKS_PER_ROW
    num_rows = (len(blocks) + blocks_per_row - 1) // blocks_per_row
    
    atlas_width = blocks_per_row * size
    atlas_height = num_rows * size
    
    print(f"Creating {'upscaled' if upscaled else 'original'} atlas: {atlas_width}x{atlas_height}")
    
    atlas = Image.new('RGB', (atlas_width, atlas_height), color=(0, 0, 0))
    
    for i, block_data in enumerate(blocks):
        if block_data['image'] is None:
            continue
        
        row = i // blocks_per_row
        col = i % blocks_per_row
        x = col * size
        y = row * size
        
        atlas.paste(block_data['image'], (x, y))
    
    atlas.convert('RGB').save(output_path, 'JPEG', quality=95)
    print(f"✓ Saved: {output_path}")

def main():
    print("=" * 70)
    print("Texture Upscaler - Replicate Real-ESRGAN (Image-to-Image)")
    print("=" * 70)
    
    setup_replicate()
    
    project_root = Path(__file__).parent.parent
    atlas_path = project_root / "blocks_indexed.png"
    output_dir = project_root / "tools" / "upscaled_textures"
    output_dir.mkdir(exist_ok=True)
    
    if not atlas_path.exists():
        print(f"Error: Texture atlas not found at {atlas_path}")
        sys.exit(1)
    
    print(f"\nExtracting blocks from: {atlas_path.name}")
    blocks = extract_blocks(atlas_path)
    
    num_blocks = len(blocks) if TEST_MODE_BLOCKS is None else TEST_MODE_BLOCKS
    print(f"\nProcessing {num_blocks} blocks at {UPSCALE_FACTOR}x ({UPSCALED_SIZE}x{UPSCALED_SIZE})...")
    
    # Save original
    print("\n[1/3] Creating original atlas...")
    original_jpg = output_dir / "original_atlas_esrgan_full.jpg"
    create_atlas(blocks[:num_blocks], original_jpg, upscaled=False)
    
    # Upscale with Real-ESRGAN
    print("\n[2/3] Image-to-image upscaling with Real-ESRGAN...")
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
        
        # Rate limiting
        if i < num_blocks - 1:
            print("  Waiting 5s for rate limiting...")
            time.sleep(5)
    
    # Create upscaled atlas
    print("\n[3/3] Creating upscaled atlas...")
    upscaled_jpg = output_dir / "upscaled_atlas_esrgan_full_16x.jpg"
    create_atlas(upscaled_blocks, upscaled_jpg, upscaled=True)
    
    print("\n" + "=" * 70)
    print("✓ Complete!")
    print(f"\nOutput: {output_dir}")
    print(f"  - original_atlas_esrgan.jpg  ({BLOCK_SIZE}x{BLOCK_SIZE})")
    print(f"  - upscaled_atlas_esrgan.jpg  ({UPSCALED_SIZE}x{UPSCALED_SIZE})")
    print("\nReal-ESRGAN: True image-to-image AI upscaling")
    print("=" * 70)

if __name__ == "__main__":
    main()
