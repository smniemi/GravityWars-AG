#!/usr/bin/env python3
"""
Texture Block Upscaler - Real-ESRGAN 8x (Full Atlas)
Processes all blocks at 8x upscaling (32x32 → 256x256)
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
UPSCALE_FACTOR = 8
UPSCALED_SIZE = BLOCK_SIZE * UPSCALE_FACTOR  # 256x256
BLOCKS_PER_ROW = 9  # 320 width ÷ 33 spacing = 9 blocks per row
TEST_MODE_BLOCKS = None  # None = process all blocks

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

def save_temp_image(image, index):
    """Save image temporarily for upload"""
    temp_path = Path(f"temp_block_{index}.png")
    image.save(temp_path, 'PNG')
    return temp_path

def upscale_with_replicate(block_image, block_index, max_retries=5):
    """Image-to-image upscaling using Replicate's Real-ESRGAN at 8x with retry logic"""
    
    print(f"  Block {block_index}: Upscaling 8x with Real-ESRGAN...")
    
    temp_path = None
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            temp_path = save_temp_image(block_image, block_index)
            
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
                upscaled = Image.open(io.BytesIO(image_data))
                
                if upscaled.size != (UPSCALED_SIZE, UPSCALED_SIZE):
                    upscaled = upscaled.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.LANCZOS)
                
                print(f"  ✓ Upscaled to {UPSCALED_SIZE}x{UPSCALED_SIZE}")
                return upscaled
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

def main():
    print("=" * 70)
    print("Real-ESRGAN 8x Upscaler - Full Atlas")
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
    
    print(f"\nProcessing {num_blocks} blocks at 8x (256x256)...")
    
    # Save original
    print("\n[1/3] Creating original atlas...")
    original_png = output_dir / "original_atlas_full_8x.png"
    create_atlas(blocks[:num_blocks], original_png, upscaled=False)
    
    # Upscale
    print("\n[2/3] Upscaling with Real-ESRGAN...")
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
    print("\n[3/3] Creating upscaled atlas...")
    upscaled_png = output_dir / "upscaled_atlas_full_8x.png"
    create_atlas(upscaled_blocks, upscaled_png, upscaled=True)
    
    print("\n" + "=" * 70)
    print("✓ Complete!")
    print(f"\nOutput: {output_dir}")
    print(f"  - original_atlas_full_8x.png")
    print(f"  - upscaled_atlas_full_8x.png (256x256 per block)")
    print("=" * 70)

if __name__ == "__main__":
    main()
