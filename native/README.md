# GravityWars native build

This folder documents how we turn the legacy C code (`../GameCode`) into a WebAssembly module for the browser client (`web/`).

## Layout

```
GameCode/            # Original 1994/2009 gameplay sources
native/
  README.md          # This file
  exports.json       # (to be generated) list of wasm exports usable from TS
tools/
  build-wasm.sh      # Wrapper script that invokes emcc
web/public/native/   # Final `.wasm` + loader JS served by Vite
```

## Requirements

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) ≥ 3.1  
  (install via `emsdk install latest && emsdk activate latest`)
- CMake or GNU Make (either works; the script defaults to `make`)

## Build workflow

1. Ensure `emsdk_env.sh` is sourced so `emcc`/`emar` are on `$PATH`.
2. Run the helper script from the repo root:

   ```bash
   ./tools/build-wasm.sh
   ```

   The script:
   - Invokes `make -C GameCode` (override with `BUILD_SYSTEM=cmake`)
   - Calls `emcc` with the correct sources/flags
   - Emits:
     - `web/public/native/gravitywars.wasm`
     - `web/public/native/gravitywars.js` (ESM loader)
     - `web/public/native/gravitywars.json` (manifest with export names/sizes)

3. Launch `npm run dev` inside `web/` to load the wasm module via the TS bridge.

## Export surface

The wasm module must expose at least:

- `main_init`, `main_end`
- `control`, `animate`
- Accessors for shared structs (`shipState`, `scans`, palettes, etc.)
- Memory allocation helpers if we decide not to hardwire offsets

Define the list inside `native/exports.json`; `tools/build-wasm.sh` reads this file and passes `-s EXPORTED_FUNCTIONS` to `emcc`.

## Debugging tips

- Use `-s WASM=1 -s ASSERTIONS=1 -s SAFE_HEAP=1` while debugging.
- `emcc --profiling` helps map wasm stack traces back to symbols.
- `node --experimental-wasm-modules web/public/native/gravitywars.js` lets you smoke-test the module without the browser.

> ℹ️ This repo doesn’t currently contain the generated wasm artefacts to avoid bloating source control—build them locally whenever you iterate.

