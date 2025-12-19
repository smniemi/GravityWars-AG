const BLOCK_SIZE = 32;
const BLOCK_COUNT = 216 + 38; // Matches C definition block[216 + N_DESTROYEABLE]
const PALETTE_SIZE = 256;
const PALETTE_BYTES = PALETTE_SIZE * 3;
const ATLAS_COLUMNS = 16;
export function createTileAtlas(runtime) {
    const palettePtr = resolveFunction(runtime, 'get_palette_buffer')();
    const palette = new Uint8Array(runtime.HEAPU8.buffer, palettePtr, PALETTE_BYTES);
    const blocksPtr = resolveFunction(runtime, 'get_block_buffer')();
    const blockData = new Uint8Array(runtime.HEAPU8.buffer, blocksPtr, BLOCK_COUNT * BLOCK_SIZE * BLOCK_SIZE);
    const atlasCanvas = document.createElement('canvas');
    const rows = Math.ceil(BLOCK_COUNT / ATLAS_COLUMNS);
    atlasCanvas.width = ATLAS_COLUMNS * BLOCK_SIZE;
    atlasCanvas.height = rows * BLOCK_SIZE;
    const atlasCtx = atlasCanvas.getContext('2d', { willReadFrequently: false });
    if (!atlasCtx) {
        throw new Error('Unable to create atlas context');
    }
    const imageData = atlasCtx.createImageData(BLOCK_SIZE, BLOCK_SIZE);
    const positions = [];
    for (let blockIndex = 0; blockIndex < BLOCK_COUNT; blockIndex++) {
        const pxBase = blockIndex * BLOCK_SIZE * BLOCK_SIZE;
        for (let pixel = 0; pixel < BLOCK_SIZE * BLOCK_SIZE; pixel++) {
            const paletteIndex = blockData[pxBase + pixel] ?? 0;
            const paletteOffset = paletteIndex * 3;
            const r = palette[paletteOffset] ?? 0;
            const g = palette[paletteOffset + 1] ?? 0;
            const b = palette[paletteOffset + 2] ?? 0;
            const dest = pixel * 4;
            imageData.data[dest] = scalePaletteComponent(r);
            imageData.data[dest + 1] = scalePaletteComponent(g);
            imageData.data[dest + 2] = scalePaletteComponent(b);
            // Legacy logic from EAGLView.m:
            // p[m+3] = (c!=0 && (c<176 || c>190 ))*255;
            // This means indices 176-190 are transparent background, along with index 0.
            const isTransparent = paletteIndex === 0 || (paletteIndex >= 176 && paletteIndex <= 190);
            imageData.data[dest + 3] = isTransparent ? 0 : 255;
        }
        const col = blockIndex % ATLAS_COLUMNS;
        const row = Math.floor(blockIndex / ATLAS_COLUMNS);
        const dx = col * BLOCK_SIZE;
        const dy = row * BLOCK_SIZE;
        atlasCtx.putImageData(imageData, dx, dy);
        positions.push({ sx: dx, sy: dy });
    }
    return {
        canvas: atlasCanvas,
        tileSize: BLOCK_SIZE,
        positions
    };
}
function scalePaletteComponent(value) {
    // Palette components are 0-63; scale to 0-255 while clamping
    return Math.min(255, Math.round((value / 63) * 255));
}
function resolveFunction(runtime, name) {
    const module = runtime;
    const variants = [name, `_${name}`];
    for (const variant of variants) {
        const fn = module[variant];
        if (typeof fn === 'function') {
            return fn.bind(module);
        }
    }
    if (runtime.cwrap) {
        return runtime.cwrap(name, 'number', []);
    }
    throw new Error(`Unable to resolve wasm export ${name}`);
}
