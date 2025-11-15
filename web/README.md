# GravityWars Web scaffold

This directory contains the modern WebGL/TypeScript client for GravityWars.  
The goal is to keep the legacy C gameplay code under `../GameCode` (to be compiled to WebAssembly) while building a new rendering/UI shell in WebGL2.

## Getting started

> ⚠️ Network access is disabled in this environment, so `npm install` will fail here.  
> Run the commands locally with network connectivity to pull dependencies.

```bash
cd web
npm install
npm run dev
```

Any assets placed in `public/` are served statically. The source code is organized into:

```
src/
  core/    # WASM bindings, shared state
  render/  # WebGL renderers, shaders
  ui/      # Menus, HUD, input handling
  assets/  # Runtime asset loaders and metadata
```

## Building the wasm module

The browser client expects the legacy engine to be available under `public/native/`.  
Use the helper script from the repo root:

```bash
./tools/build-wasm.sh
```

This script (documented in `native/README.md`) compiles `GameCode/*.c` with Emscripten and writes:

- `web/public/native/gravitywars.js` – ESM loader produced by `emcc`
- `web/public/native/gravitywars.wasm` – compiled module
- `web/public/native/gravitywars.json` – manifest used by `loadGravityWarsModule`

When the manifest or wasm is missing, the running app will display a friendly status message and log guidance in the console.

## Next planned steps

1. Finalise the wasm build (export structs, memory layout, etc.).
2. Implement the real `wasmBridge` bindings + data marshaling.
3. Replace the current 2D canvas placeholder with an actual WebGL2 renderer.

