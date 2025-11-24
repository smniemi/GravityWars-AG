"""
Debug script to check block extraction from texture atlas
"""

from PIL import Image
from pathlib import Path

atlas_path = Path("blocks_indexed.png")
atlas = Image.open(atlas_path)

print(f"Atlas size: {atlas.size}")
print(f"Atlas mode: {atlas.mode}")

# Check if there are borders
# Sample some pixel colors at expected boundaries
width, height = atlas.size

# Check first few block boundaries
print("\nChecking for borders:")
print(f"Pixel at (32, 0): {atlas.getpixel((32, 0))}")  # Should be border if 33-pixel spacing
print(f"Pixel at (33, 0): {atlas.getpixel((33, 0))}")  # Should be start of next block
print(f"Pixel at (0, 32): {atlas.getpixel((0, 32))}")  # Vertical border
print(f"Pixel at (0, 33): {atlas.getpixel((0, 33))}")  # Next row

# Calculate expected blocks
blocks_per_row = width // 32
rows = height // 32
print(f"\nWith 32x32 blocks: {blocks_per_row} per row, {rows} rows = {blocks_per_row * rows} total")

blocks_per_row_33 = width // 33
rows_33 = height // 33
print(f"With 33x33 spacing: {blocks_per_row_33} per row, {rows_33} rows = {blocks_per_row_33 * rows_33} total")
