# Setting up the Gemini API Key

## Quick Setup

1. **Edit the `.env` file** in the project root:
   ```
   GEMINI_API_KEY=your-actual-api-key-here
   ```

2. **Get your API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **Run the upscaler**:
   ```powershell
   python tools/upscale_blocks_simple.py
   ```

## Files

- `.env` - Your actual API key (not committed to git)
- `.env.example` - Template file (committed to git)
- `.gitignore` - Ensures `.env` is never committed

## Security

The `.env` file is automatically excluded from git commits via `.gitignore`, so your API key stays private.
