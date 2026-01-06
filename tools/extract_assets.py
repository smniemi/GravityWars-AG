#!/usr/bin/env python3
"""
Exploration script to extract specific blocks from blocks_indexed.png
Indices: 208 (Ship), 207 (Thrust), 45-49 (Explosion), 113-117 (Splash)
"""

from PIL import Image
from pathlib import Path

def extract_block(atlas, index):
    BLOCK_SIZE = 32
    BLOCK_SPACING = 33
    BLOCKS_PER_ROW = 9
    
    row = index // BLOCKS_PER_ROW
    col = index % BLOCKS_PER_ROW
    
    x = col * BLOCK_SPACING
    y = row * BLOCK_SPACING
    
    return atlas.crop((x, y, x + BLOCK_SIZE, y + BLOCK_SIZE))

def main():
    project_root = Path(__file__).parent.parent
    atlas_path = project_root / "blocks_indexed.png"
    output_dir = project_root / "tools/extracted_assets"
    output_dir.mkdir(exist_ok=True)
    
    if not atlas_path.exists():
        print(f"Atlas not found at {atlas_path}")
        return
        
    atlas = Image.open(atlas_path).convert('RGB')
    
    # Ship
    extract_block(atlas, 208).save(output_dir / "ship_base.png")
    extract_block(atlas, 207).save(output_dir / "ship_thrust.png")
    
    # Explosions
    for i in range(45, 50):
        extract_block(atlas, i).save(output_dir / f"explosion_{i-45}.png")
        
    # Splashes
    for i in range(113, 118):
        extract_block(atlas, i).save(output_dir / f"splash_{i-113}.png")
        
    # Appear
    for i in range(157, 162):
        extract_block(atlas, i).save(output_dir / f"appear_{i-157}.png")
        
    print(f"Extracted assets to {output_dir}")

if __name__ == "__main__":
    main()
