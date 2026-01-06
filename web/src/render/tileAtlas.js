const BLOCK_SIZE = 32;
const N_DESTROYEABLE = 38; // From C: config.h
const BLOCK_COUNT = 216 + N_DESTROYEABLE; // Matches C definition block[216 + N_DESTROYEABLE]
const PALETTE_SIZE = 256;
const PALETTE_BYTES = PALETTE_SIZE * 3;
const ATLAS_COLUMNS = 9;
// Block indices for destructible blocks (from C init.c: level[adr]=216+count)
const DESTRUCTIBLE_BLOCK_START = 216;
const DESTRUCTIBLE_BLOCK_END = 216 + N_DESTROYEABLE - 1; // 253
// Palette colors for special pixels (from C config.h):
// DOOR1COLOR=192, DOOR2COLOR=193, DOOR3COLOR=194, WATERCOLOR=195, GREENCOLOR=196
const GREENCOLOR = 196;
export function createTileAtlas(runtime) {
    const palettePtr = resolveFunction(runtime, 'get_palette_buffer')();
    const palette = new Uint8Array(runtime.HEAPU8.buffer, palettePtr, PALETTE_BYTES);
    const blocksPtr = resolveFunction(runtime, 'get_block_buffer')();
    const blockData = new Uint8Array(runtime.HEAPU8.buffer, blocksPtr, BLOCK_COUNT * BLOCK_SIZE * BLOCK_SIZE);
    const atlasCanvas = document.createElement('canvas');
    const rows = Math.ceil(BLOCK_COUNT / ATLAS_COLUMNS);
    atlasCanvas.width = ATLAS_COLUMNS * BLOCK_SIZE;
    atlasCanvas.height = rows * BLOCK_SIZE;
    const atlasCtx = atlasCanvas.getContext('2d', { willReadFrequently: true });
    if (!atlasCtx) {
        throw new Error('Unable to create atlas context');
    }
    const imageData = atlasCtx.createImageData(BLOCK_SIZE, BLOCK_SIZE);
    const positions = [];
    for (let blockIndex = 0; blockIndex < BLOCK_COUNT; blockIndex++) {
        renderBlockToImageData(blockIndex, blockData, palette, imageData);
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
        positions,
        lowRes: {
            canvas: atlasCanvas,
            tileSize: BLOCK_SIZE,
            positions: [...positions]
        }
    };
}
function renderBlockToImageData(blockIndex, blockData, palette, imageData) {
    const pxBase = blockIndex * BLOCK_SIZE * BLOCK_SIZE;
    // Destructible blocks are at indices 216-253 (copied there by C init.c)
    const isDestructibleBlock = (blockIndex >= DESTRUCTIBLE_BLOCK_START && blockIndex <= DESTRUCTIBLE_BLOCK_END);
    for (let pixel = 0; pixel < BLOCK_SIZE * BLOCK_SIZE; pixel++) {
        const dest = pixel * 4;
        const paletteIndex = blockData[pxBase + pixel] ?? 0;
        const paletteOffset = paletteIndex * 3;
        const r = palette[paletteOffset] ?? 0;
        const g = palette[paletteOffset + 1] ?? 0;
        const b = palette[paletteOffset + 2] ?? 0;
        // Use actual palette colors
        imageData.data[dest] = scalePaletteComponent(r);
        imageData.data[dest + 1] = scalePaletteComponent(g);
        imageData.data[dest + 2] = scalePaletteComponent(b);
        // Alpha logic - use special markers to enable shader effects
        const isTransparent = paletteIndex === 0 || (paletteIndex >= 176 && paletteIndex <= 190);
        const isPortal = (paletteIndex === GREENCOLOR);
        const isDoor = (paletteIndex >= 192 && paletteIndex <= 194); // Red door colors
        const isWater = (paletteIndex === 195);
        if (isTransparent) {
            imageData.data[dest + 3] = 0;
        }
        else if (isDestructibleBlock && isDoor) {
            imageData.data[dest + 3] = 254; // Marker for red door pulsation shader effect
        }
        else if (isDestructibleBlock && isWater) {
            imageData.data[dest + 3] = 255; // Water is fully visible
        }
        else if (isPortal) {
            imageData.data[dest + 3] = 253; // Marker for Green portal shader
        }
        else {
            imageData.data[dest + 3] = 255;
        }
    }
}
let cachedHighResAtlas = null;
export async function loadHighResTileAtlas(atlas) {
    if (atlas.isHighRes)
        return Promise.resolve();
    const applyAtlas = (img) => {
        atlas.canvas = img;
        atlas.isHighRes = true;
        atlas.tileSize = 128; // 32 * 4
        // Update positions for High-Res
        atlas.positions = atlas.positions.map(p => ({
            sx: p.sx * 4,
            sy: p.sy * 4
        }));
        // Reset cache to force redraw of destructible blocks on the fresh canvas
        resetDynamicCache();
    };
    if (cachedHighResAtlas) {
        applyAtlas(cachedHighResAtlas);
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                cachedHighResAtlas = img;
                applyAtlas(img);
                console.log(`[HighRes] High-res tile atlas applied (${img.width}x${img.height})`);
                resolve();
            }
            catch (e) {
                reject(e);
            }
        };
        img.onerror = () => {
            reject(new Error('Failed to load high-res blocks atlas'));
        };
        img.src = 'assets/sprites/blocks_4x.png?v=' + Date.now();
    });
}
let lastDynamicData = null;
export function resetDynamicCache() {
    lastDynamicData = null;
}
/**
 * Updates dynamic/destructible blocks (216-253) in the low-res atlas canvas.
 * Returns true if the low-res texture on GPU needs update.
 */
export function updateDynamicBlocks(atlas, runtime) {
    if (!atlas.lowRes)
        return false;
    const getBuffer = resolveFunction(runtime, 'get_block_buffer');
    const blocksPtr = getBuffer();
    const heap = runtime.HEAPU8;
    const blockData = new Uint8Array(heap.buffer, blocksPtr, BLOCK_COUNT * BLOCK_SIZE * BLOCK_SIZE);
    const palettePtr = resolveFunction(runtime, 'get_palette_buffer')();
    const palette = new Uint8Array(heap.buffer, palettePtr, PALETTE_BYTES);
    // Destructible blocks are at indices 216-253
    const extractSize = N_DESTROYEABLE * BLOCK_SIZE * BLOCK_SIZE;
    const currentData = new Uint8Array(extractSize);
    let offset = 0;
    let allZero = true;
    for (let blockId = DESTRUCTIBLE_BLOCK_START; blockId <= DESTRUCTIBLE_BLOCK_END; blockId++) {
        const base = blockId * BLOCK_SIZE * BLOCK_SIZE;
        const chunk = blockData.subarray(base, base + BLOCK_SIZE * BLOCK_SIZE);
        // Check if we have any non-zero data in this chunk
        if (allZero) {
            for (let i = 0; i < chunk.length; i++) {
                if (chunk[i] !== 0) {
                    allZero = false;
                    break;
                }
            }
        }
        currentData.set(chunk, offset);
        offset += chunk.length;
    }
    // SAFETY CHECK: Skip if all memory is zeroed (e.g., during level transition)
    if (allZero) {
        return false;
    }
    // Compare with cache
    if (lastDynamicData && areEqual(lastDynamicData, currentData)) {
        return false; // No changes
    }
    // Update cache
    lastDynamicData = new Uint8Array(currentData);
    const ctx = atlas.lowRes.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        return false;
    const imageData = ctx.createImageData(BLOCK_SIZE, BLOCK_SIZE);
    for (let blockId = DESTRUCTIBLE_BLOCK_START; blockId <= DESTRUCTIBLE_BLOCK_END; blockId++) {
        renderBlockToImageData(blockId, blockData, palette, imageData);
        const pos = atlas.lowRes.positions[blockId];
        if (pos) {
            ctx.putImageData(imageData, pos.sx, pos.sy);
        }
    }
    return true;
}
function areEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
/**
 * Previously tried to initialize destructible blocks in WASM memory.
 * Now a no-op because the C code properly handles this at indices 216+.
 * Kept for API compatibility.
 */
export function initializeDestructibleBlocks(_runtime) {
    // No-op: C code initializes destructible blocks (216+) correctly via init.c
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
