#!/usr/bin/env python3
"""
Background Batch Upscaler - Real-ESRGAN 4x with Tile Padding
Upscales level background images 4x, using wrapping padding to ensure seamless tiling.
Saves as JPG.
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
    
    # Left padding gets content from Right side
    left_strip = image.crop((width - pad_amount, 0, width, height))
    padded.paste(left_strip, (0, pad_amount))
    
    # Right padding gets content from Left side
    right_strip = image.crop((0, 0, pad_amount, height))
    padded.paste(right_strip, (width + pad_amount, pad_amount))
    
    # Top padding gets content from Bottom side
    top_strip = image.crop((0, height - pad_amount, width, height))
    padded.paste(top_strip, (pad_amount, 0))
    
    # Bottom padding gets content from Top side
    bottom_strip = image.crop((0, 0, width, pad_amount))
    padded.paste(bottom_strip, (pad_amount, height + pad_amount))
    
    # Corners
    tl_corner = image.crop((width - pad_amount, height - pad_amount, width, height))
    padded.paste(tl_corner, (0, 0))
    
    tr_corner = image.crop((0, height - pad_amount, pad_amount, height))
    padded.paste(tr_corner, (width + pad_amount, 0))
    
    bl_corner = image.crop((width - pad_amount, 0, width, pad_amount))
    padded.paste(bl_corner, (0, height + pad_amount))
    
    br_corner = image.crop((0, 0, pad_amount, pad_amount))
    padded.paste(br_corner, (width + pad_amount, height + pad_amount))
    
    return padded

def upscale_image(image, scale=4):
    """
    Upscale image using Replicate's Real-ESRGAN
    """
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
            image_data = requests.get(output).content
            return Image.open(io.BytesIO(image_data))
            
    except Exception as e:
        print(f"Error during upscale: {e}")
        return None

def process_file(input_path, output_path, scale=4, pad_size=64):
    print(f"\n--- Processing: {input_path.name} ---")
    if output_path.exists():
        print(f"Skipping {output_path.name}, already exists.")
        return True

    original = Image.open(input_path).convert('RGB')
    print(f"Preparing padded image ({original.size[0]}x{original.size[1]})...")
    padded = create_padded_image(original, pad_size)
    
    print("Upscaling with Replicate...")
    upscaled_padded = upscale_image(padded, scale=scale)
    
    if upscaled_padded:
        print("Extracting center and saving...")
        upscaled_pad = pad_size * scale
        original_w, original_h = original.size
        target_w = original_w * scale
        target_h = original_h * scale
        
        final_image = upscaled_padded.crop((upscaled_pad, upscaled_pad, upscaled_pad + target_w, upscaled_pad + target_h))
        
        # Save as JPG
        final_image.save(output_path, "JPEG", quality=90)
        print(f"✓ Saved to {output_path.name}")
        return True
    else:
        print(f"✗ Failed to upscale {input_path.name}")
        return False

def main():
    setup_replicate()
    
    project_root = Path(__file__).parent.parent
    bg_dir = project_root / "web/public/assets/backgrounds"
    
    files_to_process = [
        "back5_park.JPG",
        "back_nebula.jpg",
        "back_park.JPG",
        "back2_park.JPG",
        "back3_park.JPG",
        "back4_park.JPG",
        "space.jpg"
    ]
    
    for filename in files_to_process:
        input_path = bg_dir / filename
        if not input_path.exists():
            print(f"Warning: {filename} not found.")
            continue
            
        stem = input_path.stem
        # Special case for back5_park to match the user's manual change
        if stem == "back5_park":
            output_name = f"{stem}_v2.jpg"
        else:
            output_name = f"{stem}_v2.jpg"
            
        output_path = bg_dir / output_name
        
        success = process_file(input_path, output_path)
        if success:
            # Sleep a bit to avoid over-aggressive rate limits
            time.sleep(2)

if __name__ == "__main__":
    main()
