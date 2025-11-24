#!/usr/bin/env python3
"""
Texture Block Upscaler for GravityWars - Imagen 3 Version
Extracts 32x32 blocks and upscales them to 256x256 using Google's Imagen 3 API
"""

import os
import sys
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv
import time
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

# Configuration
BLOCK_SIZE = 32
UPSCALE_FACTOR = 8
UPSCALED_SIZE = BLOCK_SIZE * UPSCALE_FACTOR  # 256x256
BLOCKS_PER_ROW = 20
TEST_MODE_BLOCKS = 3

def setup_imagen_client():
    """Configure Imagen API client"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env file")
        print("Please add your API key to the .env file")
        sys.exit(1)
    
    print(f"✓ API key loaded from .env")
    
    # Configure the client with API key
    client = genai.Client(api_key=api_key)
    return client

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

def upscale_with_imagen(client, block_image, block_index):
    """
    Upscale using Imagen 3 API with image editing
    """
    
    print(f"  Block {block_index}: Upscaling with Imagen 3...")
    
    try:
        # Create a prompt for upscaling that preserves the pixel art style
        prompt = f"""Upscale this 32x32 pixel game texture to 256x256 pixels (8x larger).
        
CRITICAL REQUIREMENTS:
- Preserve EXACT colors from the original
- Maintain PERFECT EDGE CONTINUITY for seamless tiling
- Keep pixel art aesthetic with sharp, clean edges
- No blur or smoothing
- This is tile #{block_index} that must connect perfectly with adjacent tiles

Output a crisp, sharp 256x256 pixel art texture."""

        # Use Imagen's edit capability to upscale
        response = client.models.edit_image(
            model='imagen-3.0-generate-001',
            prompt=prompt,
            reference_images=[block_image],
            config=types.EditImageConfig(
                number_of_images=1,
                edit_mode='PRODUCT_IMAGE',  # Best for preserving details
            )
        )
        
        # Get the upscaled image
        if response.generated_images:
            upscaled = response.generated_images[0].image
            # Resize to exact target size if needed
            if upscaled.size != (UPSCALED_SIZE, UPSCALED_SIZE):
                upscaled = upscaled.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.LANCZOS)
            print(f"  ✓ Upscaled with Imagen 3 to {UPSCALED_SIZE}x{UPSCALED_SIZE}")
            return upscaled
        else:
            print(f"  ✗ No image returned from Imagen API")
            return None
            
    except Exception as e:
        print(f"  ✗ Imagen API error: {e}")
        print(f"  → Falling back to nearest-neighbor upscaling")
        # Fallback to simple upscaling
        upscaled = block_image.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.NEAREST)
        return upscaled

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
    print("GravityWars Texture Block Upscaler - Imagen 3 AI Version")
    print("=" * 70)
    
    # Setup Imagen client
    print("\nInitializing Imagen 3 API...")
    client = setup_imagen_client()
    
    # Paths
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
    original_jpg = output_dir / "original_atlas_imagen.jpg"
    create_atlas(blocks[:TEST_MODE_BLOCKS], original_jpg, upscaled=False)
    
    # Upscale blocks with Imagen
    print("\n[2/3] Upscaling blocks with Imagen 3 AI...")
    upscaled_blocks = []
    
    for i in range(min(TEST_MODE_BLOCKS, len(blocks))):
        block = blocks[i]
        print(f"\nBlock {i+1}/{TEST_MODE_BLOCKS}:")
        
        upscaled = upscale_with_imagen(client, block['image'], block['index'])
        
        if upscaled:
            upscaled_blocks.append({
                'image': upscaled,
                'index': block['index'],
                'x': block['x'],
                'y': block['y']
            })
        
        # Rate limiting to avoid API throttling
        if i < TEST_MODE_BLOCKS - 1:
            print("  Waiting 3s for rate limiting...")
            time.sleep(3)
    
    # Create upscaled atlas
    print("\n[3/3] Creating upscaled atlas (JPEG)...")
    upscaled_jpg = output_dir / "upscaled_atlas_imagen.jpg"
    create_atlas(upscaled_blocks, upscaled_jpg, upscaled=True)
    
    print("\n" + "=" * 70)
    print("✓ Processing complete!")
    print(f"\nOutput files in: {output_dir}")
    print(f"  - original_atlas_imagen.jpg  ({BLOCK_SIZE}x{BLOCK_SIZE} blocks)")
    print(f"  - upscaled_atlas_imagen.jpg  ({UPSCALED_SIZE}x{UPSCALED_SIZE} blocks)")
    print("=" * 70)

if __name__ == "__main__":
    main()
