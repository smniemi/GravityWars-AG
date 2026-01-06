from PIL import Image
from pathlib import Path

root = Path(__file__).parent.parent
atlas_path = root / 'web/public/assets/sprites/blocks_4x.png'
sprite_dir = root / 'web/public/assets/sprites'

atlas = Image.open(atlas_path)

def extract_block(block_id):
    col = block_id % 9
    row = block_id // 9
    return atlas.crop((col * 128, row * 128, col * 128 + 128, row * 128 + 128))

def save_sheet(ids, filename):
    sheet = Image.new('RGBA', (128 * len(ids), 128))
    for n, i in enumerate(ids):
        sheet.paste(extract_block(i), (n * 128, 0))
    sheet.save(sprite_dir / filename)

# Ship
extract_block(208).save(sprite_dir / 'ship_base_highres.png')
extract_block(207).save(sprite_dir / 'ship_thrust_highres.png')

# Sheets
save_sheet(range(45, 50), 'explosion_4x.png')
save_sheet(range(157, 162), 'appear_4x.png')
save_sheet(range(113, 118), 'splash_4x.png')

print("✓ Extracted high-res ship and effect sprites from atlas.")
