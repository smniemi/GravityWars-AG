# GravityWars Web Port Roadmap

This living document outlines the incremental plan to bring the iPhone version of GravityWars to the browser.  
Each milestone is intentionally small so we can verify behaviour after every step.

## Milestone 0 – Scaffold (✅)
- [x] Create `web/` workspace with Vite + TypeScript configuration.
- [x] Add placeholder render loop to confirm bundler + canvas plumbing.

**Verify:** `npm run dev` renders the bootstrap canvas text.

## Milestone 1 – Legacy engine → WebAssembly
1. **Prepare build system**
   - Mirror `GameCode/` under `web/native/` or use the existing folder as a submodule.
   - Add `CMakeLists.txt` or a dedicated `Makefile` tailored for Emscripten (`emcc`).
   - Use `./tools/build-wasm.sh` as the single entry point (already scaffolded).
2. **Expose API surface**
   - Export `main_init`, `main_end`, `control`, `animate`, `memory` getters, and state structs via `EMSCRIPTEN_KEEPALIVE`.
   - Define a C header documenting shared structs for the TS bridge.
3. **Scripted build**
   - Write `tools/build-wasm.sh` to compile to `dist/native/gravitywars.{wasm,js}`.
   - Include a JSON manifest describing exported functions and memory offsets.

**Verify:** Import the wasm wrapper from Node and assert we can call `main_init()` without crashing.

## Milestone 2 – Asset pipeline
1. **Palette + tiles**
   - Node script (`tools/gw-extract.ts`) to convert `.gw` palette/tile files into PNG + metadata JSON.
2. **Levels**
   - Parse `levelXX` definitions into JSON with block indices, spawn locations, metadata (name, author, comment).
3. **Audio**
   - Transcode `.m4r/.wav` to `.mp3` + `.ogg` (done outside repo; include instructions + placeholders).

**Verify:** Loader unit tests ensure converted assets match original lengths/checksums.

## Milestone 3 – Runtime shell
1. Implement `src/core/wasmBridge.ts` to load wasm, allocate input buffers, and run the control loop.
2. Build `src/render/Renderer.ts` to set up WebGL2, upload the converted atlases, and draw a static level.
3. Introduce `src/ui/InputController.ts` that maps keyboard/mouse/touch to the legacy scancodes.

**Verify:** Tutorial mode runs (using recorded `demo[]` data) and displays the ship moving over the converted terrain.

## Milestone 4 – Gameplay parity
1. Implement destructible terrain updates + particle effects.
2. Port HUD/LCD text using Canvas2D → texture updates.
3. Wire up level transitions, high-score persistence, and music playback.

**Verify:** Complete a level end-to-end in the browser with audio + score upload stub.

## Milestone 5 – Polish & deployment
1. Responsive layout for mobile browsers, on-screen controls, settings modal.
2. Replace CocosLive with a lightweight HTTPS leaderboard (optional).
3. Configure CI/CD to build + deploy (Netlify/GitHub Pages).

**Verify:** Automated smoke tests (Playwright) load the app, run tutorial, and confirm draw calls succeed.

---

Feel free to annotate each milestone with notes or unexpected findings as we go. This keeps the porting effort transparent and auditable.

