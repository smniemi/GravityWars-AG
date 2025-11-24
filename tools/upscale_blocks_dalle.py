#!/usr/bin/env python3
"""
Texture Block Upscaler - OpenAI Vision + DALL-E 3 Approach
Uses GPT-4 Vision to analyze the block, then DALL-E 3 to generate high-quality version
"""

import os
import sys
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv
import time
from openai import OpenAI
import io
import base64
import requests

load_dotenv()

BLOCK_SIZE = 32
UPSCALE_FACTOR = 8
UPSCALED_SIZE = BLOCK_SIZE * UPSCALE_FACTOR  # 256x256
BLOCKS_PER_ROW = 20
TEST_MODE_BLOCKS = 3

def setup_openai_client():
    """Configure OpenAI API client"""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Error: OPENAI_API_KEY not found in .env file")
        sys.exit(1)
    
    print(f"✓ OpenAI API key loaded")
    return OpenAI(api_key=api_key)

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

def image_to_base64(image):
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def upscale_with_vision_dalle(client, block_image, block_index):
    """
    Two-step upscaling:
    1. Use GPT-4 Vision to analyze and describe the block in detail
    2. Use DALL-E 3 to generate a high-quality 1024x1024 version
    3. Resize to 256x256
    """
    
    print(f"  Block {block_index}: Analyzing with GPT-4 Vision...")
    
    try:
        # Step 1: Analyze the image with GPT-4 Vision
        img_base64 = image_to_base64(block_image)
        
        vision_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this 32x32 pixel game texture tile in extreme detail. Describe:
1. Exact colors used (be specific about RGB values if possible)
2. The pattern, shapes, and design elements
3. The style (pixel art, retro game, etc.)
4. Edge characteristics (what's on each edge for seamless tiling)
5. Any gradients, textures, or special effects

Be extremely detailed and precise - this description will be used to recreate the tile at 8x higher resolution while maintaining perfect edge continuity for tiling."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{img_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )
        
        description = vision_response.choices[0].message.content
        print(f"  ✓ Analysis complete")
        print(f"  Description: {description[:100]}...")
        
        # Step 2: Generate high-quality version with DALL-E 3
        print(f"  Generating 1024x1024 version with DALL-E 3...")
        
        dalle_prompt = f"""Create a high-quality 1024x1024 pixel art game texture tile based on this description:

{description}

CRITICAL REQUIREMENTS:
- This is a tileable texture - edges must wrap seamlessly
- Maintain pixel art aesthetic with sharp, clean edges
- Use exact colors from the description
- 8x upscale of the original 32x32 design
- No blur, keep crisp pixel art style
- Perfect edge continuity for seamless tiling"""

        dalle_response = client.images.generate(
            model="dall-e-3",
            prompt=dalle_prompt,
            size="1024x1024",
            quality="hd",
            n=1
        )
        
        # Download the generated image
        image_url = dalle_response.data[0].url
        image_data = requests.get(image_url).content
        upscaled = Image.open(io.BytesIO(image_data))
        
        # Resize to target size
        upscaled = upscaled.resize((UPSCALED_SIZE, UPSCALED_SIZE), Image.LANCZOS)
        
        print(f"  ✓ Generated and resized to {UPSCALED_SIZE}x{UPSCALED_SIZE}")
        return upscaled
            
    except Exception as e:
        print(f"  ✗ Error: {e}")
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
    print("Texture Upscaler - GPT-4 Vision + DALL-E 3")
    print("=" * 70)
    
    client = setup_openai_client()
    
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
    original_jpg = output_dir / "original_atlas_ai.jpg"
    create_atlas(blocks[:TEST_MODE_BLOCKS], original_jpg, upscaled=False)
    
    # Upscale with Vision + DALL-E
    print("\n[2/3] AI Upscaling (Vision → DALL-E 3)...")
    upscaled_blocks = []
    
    for i in range(min(TEST_MODE_BLOCKS, len(blocks))):
        block = blocks[i]
        print(f"\nBlock {i+1}/{TEST_MODE_BLOCKS}:")
        
        upscaled = upscale_with_vision_dalle(client, block['image'], block['index'])
        
        if upscaled:
            upscaled_blocks.append({
                'image': upscaled,
                'index': block['index'],
                'x': block['x'],
                'y': block['y']
            })
        
        # Rate limiting
        if i < TEST_MODE_BLOCKS - 1:
            print("  Waiting 10s for rate limiting...")
            time.sleep(10)
    
    # Create upscaled atlas
    print("\n[3/3] Creating upscaled atlas...")
    upscaled_jpg = output_dir / "upscaled_atlas_ai.jpg"
    create_atlas(upscaled_blocks, upscaled_jpg, upscaled=True)
    
    print("\n" + "=" * 70)
    print("✓ Complete!")
    print(f"\nOutput: {output_dir}")
    print(f"  - original_atlas_ai.jpg  ({BLOCK_SIZE}x{BLOCK_SIZE})")
    print(f"  - upscaled_atlas_ai.jpg  ({UPSCALED_SIZE}x{UPSCALED_SIZE})")
    print("=" * 70)

if __name__ == "__main__":
    main()
