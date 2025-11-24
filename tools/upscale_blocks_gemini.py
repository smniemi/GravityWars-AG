#!/usr/bin/env python3
"""
Texture Block Upscaler - Gemini Vision with Image Reference
Uses Gemini to upscale with the original image as reference
"""

import os
import sys
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv
import time
import google.generativeai as genai
import io

load_dotenv()

BLOCK_SIZE = 32
UPSCALE_FACTOR = 8
UPSCALED_SIZE = BLOCK_SIZE * UPSCALE_FACTOR  # 256x256
BLOCKS_PER_ROW = 20
TEST_MODE_BLOCKS = 3

def setup_gemini():
    """Configure Gemini API"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env file")
        sys.exit(1)
    
    genai.configure(api_key=api_key)
    print(f"✓ Gemini API key loaded")
    return genai.GenerativeModel('gemini-2.0-flash-exp')

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

def upscale_with_gemini(model, block_image, block_index):
    """
    Upscale using Gemini with reference image
    """
    
    print(f"  Block {block_index}: Upscaling with Gemini (image reference)...")
    
    try:
        # First upscale to a larger size for Gemini to work with
        temp_upscaled = block_image.resize((256, 256), Image.NEAREST)
        
        # Create prompt with reference image
        prompt = f"""You are an expert pixel art upscaler. I'm providing you with a 32x32 pixel game texture tile that needs to be upscaled to 256x256 (8x larger).

CRITICAL REQUIREMENTS:
1. Generate an IDENTICAL recreation of this exact image at 256x256 resolution
2. Preserve EXACT colors from the reference image
3. Maintain PERFECT EDGE CONTINUITY - this tile must connect seamlessly with adjacent tiles on all 4 edges
4. Keep the pixel art aesthetic with sharp, clean edges (no blur or smoothing)
5. This is tile #{block_index} - edges must wrap perfectly for seamless tiling

Generate a high-quality 256x256 pixel art version that is IDENTICAL to the reference image but 8x larger, with perfect edge preservation for tiling."""

        # Generate with image reference
        response = model.generate_content([prompt, temp_upscaled])
        
        # Check if we got image data back
        if hasattr(response, 'parts') and response.parts:
            for part in response.parts:
                if hasattr(part, 'inline_data'):
                    # Extract image from response
                    image_data = part.inline_data.data
                    upscaled = Image.open(io.BytesIO(image_data))
                    
                    # Ensure correct size
                    if upscaled.size != (UPSCALED_SIZE, UPSCALED_SIZE):
                        upscaled = upscaled.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.LANCZOS)
                    
                    print(f"  ✓ Upscaled with Gemini to {UPSCALED_SIZE}x{UPSCALED_SIZE}")
                    return upscaled
        
        # If no image in response, try text-based approach
        print(f"  ℹ Gemini returned text response, falling back to nearest-neighbor")
        return block_image.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.NEAREST)
            
    except Exception as e:
        print(f"  ✗ Gemini error: {e}")
        print(f"  → Falling back to nearest-neighbor")
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
    print("Texture Upscaler - Gemini with Image Reference")
    print("=" * 70)
    
    model = setup_gemini()
    
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
    
    # Save original
    print("\n[1/3] Creating original atlas...")
    original_jpg = output_dir / "original_atlas_gemini.jpg"
    create_atlas(blocks[:TEST_MODE_BLOCKS], original_jpg, upscaled=False)
    
    # Upscale with Gemini
    print("\n[2/3] Upscaling with Gemini (image reference)...")
    upscaled_blocks = []
    
    for i in range(min(TEST_MODE_BLOCKS, len(blocks))):
        block = blocks[i]
        print(f"\nBlock {i+1}/{TEST_MODE_BLOCKS}:")
        
        upscaled = upscale_with_gemini(model, block['image'], block['index'])
        
        if upscaled:
            upscaled_blocks.append({
                'image': upscaled,
                'index': block['index'],
                'x': block['x'],
                'y': block['y']
            })
        
        # Rate limiting
        if i < TEST_MODE_BLOCKS - 1:
            print("  Waiting 3s for rate limiting...")
            time.sleep(3)
    
    # Create upscaled atlas
    print("\n[3/3] Creating upscaled atlas...")
    upscaled_jpg = output_dir / "upscaled_atlas_gemini.jpg"
    create_atlas(upscaled_blocks, upscaled_jpg, upscaled=True)
    
    print("\n" + "=" * 70)
    print("✓ Complete!")
    print(f"\nOutput: {output_dir}")
    print(f"  - original_atlas_gemini.jpg  ({BLOCK_SIZE}x{BLOCK_SIZE})")
    print(f"  - upscaled_atlas_gemini.jpg  ({UPSCALED_SIZE}x{UPSCALED_SIZE})")
    print("=" * 70)

if __name__ == "__main__":
    main()
