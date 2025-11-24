# Texture Block Upscaler

This tool extracts individual 32x32 pixel blocks from the GravityWars texture atlas and upscales them to 256x256 pixels (8x larger) using the Gemini API.

## Features

- Extracts individual blocks from `blocks_indexed.png`
- Upscales blocks using Gemini 2.0 Flash with edge-preserving prompts
- Maintains tile continuity for seamless assembly
- Outputs both original and upscaled atlases as JPEG files
- Test mode: processes only the first 3 blocks initially

## Setup

1. Install Python dependencies:
```powershell
pip install -r requirements.txt
```

2. Set your Gemini API key:
```powershell
$env:GEMINI_API_KEY = "your-api-key-here"
```

## Usage

Run the upscaler:
```powershell
python tools/upscale_blocks.py
```

## Output

The script creates a `tools/upscaled_textures/` directory containing:
- `original_atlas.jpg` - Original blocks as JPEG
- `upscaled_atlas.jpg` - Upscaled blocks (256x256 each) as JPEG

## Configuration

Edit `upscale_blocks.py` to change:
- `TEST_MODE_BLOCKS` - Number of blocks to process (default: 3)
- `UPSCALE_FACTOR` - Scaling factor (default: 8x)
- `BLOCKS_PER_ROW` - Atlas layout (default: 20)
