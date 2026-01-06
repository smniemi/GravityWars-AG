#!/usr/bin/env python3
"""
Background Upscaler - Real-ESRGAN 4x with Tile Padding
Upscales the level background image 4x, using wrapping padding to ensure seamless tiling.
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

def setup_replicate():
    """Configure Replicate API"""
    api_key = os.getenv('REPLICATE_API_KEY')
    if not api_key:
        print("Error: REPLICATE_API_KEY not found in .env file")
        sys.exit(1)
    
    os.environ['REPLICATE_API_TOKEN'] = api_key
    print(f"✓ Replicate API key loaded")

def create_padded_image(image, pad_amount):
    """
    Create a padded version of the image for seamless tiling.
    Wraps content from opposite sides into the padding area.
    """
    width, height = image.size
    new_width = width + 2 * pad_amount
    new_height = height + 2 * pad_amount
    
    padded = Image.new('RGB', (new_width, new_height))
    
    # Paste center (original)
    padded.paste(image, (pad_amount, pad_amount))
    
    # 1. Edges (Horizontal wrapping)
    # Left padding gets content from Right side
    left_strip = image.crop((width - pad_amount, 0, width, height))
    padded.paste(left_strip, (0, pad_amount))
    
    # Right padding gets content from Left side
    right_strip = image.crop((0, 0, pad_amount, height))
    padded.paste(right_strip, (width + pad_amount, pad_amount))
    
    # 2. Edges (Vertical wrapping) - need to handle full width including corners for correct process?
    # Actually, usually better to wrap the CENTER image vertically first, 
    # but since we want the corners to be correct for diagonal tiling, we should:
    # Top padding gets content from Bottom side
    top_strip = image.crop((0, height - pad_amount, width, height))
    padded.paste(top_strip, (pad_amount, 0))
    
    # Bottom padding gets content from Top side
    bottom_strip = image.crop((0, 0, width, pad_amount))
    padded.paste(bottom_strip, (pad_amount, height + pad_amount))
    
    # 3. Corners
    # Top-Left corner gets Bottom-Right pixel area
    tl_corner = image.crop((width - pad_amount, height - pad_amount, width, height))
    padded.paste(tl_corner, (0, 0))
    
    # Top-Right corner gets Bottom-Left pixel area
    tr_corner = image.crop((0, height - pad_amount, pad_amount, height))
    padded.paste(tr_corner, (width + pad_amount, 0))
    
    # Bottom-Left corner gets Top-Right pixel area
    bl_corner = image.crop((width - pad_amount, 0, width, pad_amount))
    padded.paste(bl_corner, (0, height + pad_amount))
    
    # Bottom-Right corner gets Top-Left pixel area
    br_corner = image.crop((0, 0, pad_amount, pad_amount))
    padded.paste(br_corner, (width + pad_amount, height + pad_amount))
    
    return padded

def upscale_image(image, scale=4):
    """
    Upscale image using Replicate's Real-ESRGAN
    """
    print(f"Upscaling image ({image.size[0]}x{image.size[1]}) with scale {scale}x...")
    
    # Save to buffer
    buf = io.BytesIO()
    image.save(buf, format='PNG')
    buf.seek(0)
    
    try:
        output = replicate.run(
            "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
            input={
                "image": buf,
                "scale": scale,
                "face_enhance": False
            }
        )
        
        if output:
            print("Download output...")
            image_data = requests.get(output).content
            return Image.open(io.BytesIO(image_data))
            
    except Exception as e:
        print(f"Error during upscale: {e}")
        return None

def main():
    setup_replicate()
    
    # Paths
    project_root = Path(__file__).parent.parent
    input_path = project_root / "web/public/assets/backgrounds/back5_park.JPG"
    output_dir = project_root / "web/public/assets/backgrounds"
    output_filename = "back5_park_v2.png" # Using PNG for better quality output
    output_path = output_dir / output_filename
    
    if not input_path.exists():
        print(f"Error: Input file not found at {input_path}")
        # Try checking in gfx folder just in case
        input_path = project_root / "gfx/back5_park.JPG"
        if not input_path.exists():
             print(f"Error: Input file not found at {input_path} either.")
             sys.exit(1)
        print(f"Found at {input_path}")

    print(f"Loading {input_path}...")
    original = Image.open(input_path).convert('RGB')
    
    # Parameters
    PAD_SIZE = 64 # Enough context
    SCALE = 4
    
    print("Preparing padded image for seamless tiling...")
    padded = create_padded_image(original, PAD_SIZE)
    # padded.save(output_dir / "debug_padded.png") # Debug
    
    print("Sending to Replicate...")
    upscaled_padded = upscale_image(padded, scale=SCALE)
    
    if upscaled_padded:
        print("Extracting center...")
        
        # Calculate crop area
        # The padding was PAD_SIZE in original pixels
        # So in upscaled pixels, it is PAD_SIZE * SCALE
        upscaled_pad = PAD_SIZE * SCALE
        original_w, original_h = original.size
        target_w = original_w * SCALE
        target_h = original_h * SCALE
        
        # Crop
        left = upscaled_pad
        top = upscaled_pad
        right = left + target_w
        bottom = top + target_h
        
        final_image = upscaled_padded.crop((left, top, right, bottom))
        
        # Save
        print(f"Saving to {output_path}...")
        final_image.save(output_path, "PNG")
        
        print(f"Done! Created {output_filename} ({target_w}x{target_h})")
        print("\nTo use this in the game:")
        print(f"1. Update web/src/main.ts to point to '{output_filename}' for level 0")
        print("   OR")
        print(f"2. Rename this file to 'back5_park.JPG' (and convert format if needed)")
    else:
        print("Failed to upscale.")

if __name__ == "__main__":
    main()
