#!/usr/bin/env python3
"""
Test Imagen 4.0 API
"""

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

print("Testing Imagen 4.0 image generation...")

try:
    response = client.models.generate_images(
        model='imagen-4.0-generate-001',  # Using Imagen 4.0
        prompt='A simple pixel art red square on black background, 32x32 pixels',
        config=types.GenerateImagesConfig(
            number_of_images=1,
        )
    )
    
    print(f"✓ Success! Generated {len(response.generated_images)} image(s)")
    
    # Save the first image
    if response.generated_images:
        img = response.generated_images[0].image
        img.save('tools/test_imagen_output.png')
        print(f"✓ Saved test image: tools/test_imagen_output.png")
        print(f"  Size: {img.size}")
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
