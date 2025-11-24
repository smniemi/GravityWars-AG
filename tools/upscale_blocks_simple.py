"""
Texture Block Upscaler for GravityWars - Simple Test Version
Extracts 32x32 blocks and upscales them using nearest-neighbor (no API required)
"""

import sys
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Configuration
BLOCK_SIZE = 32
UPSCALE_FACTOR = 8
UPSCALED_SIZE = BLOCK_SIZE * UPSCALE_FACTOR  # 256x256
BLOCKS_PER_ROW = 9  # 320 width ÷ 33 spacing = 9 blocks per row
TEST_MODE_BLOCKS = 3

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
            # Extract 32x32 block (skipping the border)
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

def upscale_block_simple(block_image):
    """Upscale using nearest-neighbor interpolation"""
    return block_image.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.NEAREST)

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
    print("GravityWars Texture Block Upscaler - Simple Test Version")
    print("=" * 70)
    
    # Check for API key (optional for this version)
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        print(f"\n✓ API key loaded from .env file")
    else:
        print(f"\nℹ No API key found (not required for simple upscaling)")
    
    project_root = Path(__file__).parent.parent
    atlas_path = project_root / "blocks_indexed.png"
    output_dir = project_root / "tools" / "upscaled_textures"
    output_dir.mkdir(exist_ok=True)
    
    if not atlas_path.exists():
        print(f"Error: Texture atlas not found at {atlas_path}")
        sys.exit(1)
    
    print(f"\nExtracting blocks from: {atlas_path.name}")
    blocks = extract_blocks(atlas_path)
    
    print(f"\nProcessing first {TEST_MODE_BLOCKS} blocks (TEST MODE)...")
    
    # Save original atlas
    print("\n[1/3] Creating original atlas (JPEG)...")
    original_jpg = output_dir / "original_atlas.jpg"
    create_atlas(blocks[:TEST_MODE_BLOCKS], original_jpg, upscaled=False)
    
    # Upscale blocks
    print("\n[2/3] Upscaling blocks (nearest-neighbor)...")
    upscaled_blocks = []
    for i in range(min(TEST_MODE_BLOCKS, len(blocks))):
        block = blocks[i]
        print(f"  Block {i}: {BLOCK_SIZE}x{BLOCK_SIZE} → {UPSCALED_SIZE}x{UPSCALED_SIZE}")
        
        upscaled = upscale_block_simple(block['image'])
        upscaled_blocks.append({
            'image': upscaled,
            'index': block['index'],
            'x': block['x'],
            'y': block['y']
        })
    
    # Create upscaled atlas
    print("\n[3/3] Creating upscaled atlas (JPEG)...")
    upscaled_jpg = output_dir / "upscaled_atlas.jpg"
    create_atlas(upscaled_blocks, upscaled_jpg, upscaled=True)
    
    print("\n" + "=" * 70)
    print("✓ Processing complete!")
    print(f"\nOutput files in: {output_dir}")
    print(f"  - original_atlas.jpg  ({BLOCK_SIZE}x{BLOCK_SIZE} blocks)")
    print(f"  - upscaled_atlas.jpg  ({UPSCALED_SIZE}x{UPSCALED_SIZE} blocks)")
    print("\nNote: Using nearest-neighbor upscaling (no AI enhancement)")
    print("=" * 70)

if __name__ == "__main__":
    main()
