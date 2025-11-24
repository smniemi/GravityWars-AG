const SPRITE_SIZE = 32;
const FRAME_COUNT = 32;
const VARIANT_STRIDE = FRAME_COUNT * SPRITE_SIZE * SPRITE_SIZE;
const BLOCK_PIXELS = SPRITE_SIZE * SPRITE_SIZE;
export function createShipSprites(runtime, specialBlockIds) {
    const palettePtr = resolveFunction(runtime, 'get_palette_buffer')();
    const shipPtr = resolveFunction(runtime, 'get_ship_buffer')();
    const blockPtr = resolveFunction(runtime, 'get_block_buffer')();
    const paletteRaw = new Uint8Array(runtime.HEAPU8.buffer, palettePtr, 256 * 3);
    const shipRaw = new Uint8Array(runtime.HEAPU8.buffer, shipPtr, VARIANT_STRIDE * 4);
    const blockRaw = new Uint8Array(runtime.HEAPU8.buffer, blockPtr, (216 + 38) * BLOCK_PIXELS);
    const palette = buildPalette(paletteRaw);
    return {
        noThrust: buildVariant(shipRaw, 0, palette),
        thrust: buildVariant(shipRaw, 2, palette),
        specials: buildSpecialSprites(blockRaw, palette, specialBlockIds)
    };
}
function buildVariant(shipRaw, variantIndex, palette) {
    const frames = [];
    const baseOffset = variantIndex * VARIANT_STRIDE;
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
        const canvas = document.createElement('canvas');
        canvas.width = SPRITE_SIZE;
        canvas.height = SPRITE_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            continue;
        }
        const imageData = ctx.createImageData(SPRITE_SIZE, SPRITE_SIZE);
        const dest = imageData.data;
        const frameOffset = baseOffset + frame * SPRITE_SIZE * SPRITE_SIZE;
        for (let i = 0; i < SPRITE_SIZE * SPRITE_SIZE; i++) {
            const paletteIndex = shipRaw[frameOffset + i];
            const [r, g, b, a] = palette[paletteIndex] ?? [0, 0, 0, 0];
            const px = i * 4;
            dest[px] = r;
            dest[px + 1] = g;
            dest[px + 2] = b;
            dest[px + 3] = a;
        }
        ctx.putImageData(imageData, 0, 0);
        frames[frame] = canvas;
    }
    return frames;
}
function buildSpecialSprites(blockRaw, palette, blockIds) {
    const sprites = {};
    blockIds.forEach((blockId) => {
        const canvas = document.createElement('canvas');
        canvas.width = SPRITE_SIZE;
        canvas.height = SPRITE_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        const imageData = ctx.createImageData(SPRITE_SIZE, SPRITE_SIZE);
        const dest = imageData.data;
        const offset = blockId * BLOCK_PIXELS;
        for (let i = 0; i < BLOCK_PIXELS; i++) {
            const paletteIndex = blockRaw[offset + i];
            const [r, g, b] = palette[paletteIndex] ?? [0, 0, 0, 0];
            const px = i * 4;
            dest[px] = r;
            dest[px + 1] = g;
            dest[px + 2] = b;
            dest[px + 3] = paletteIndex === 0 ? 0 : 255;
        }
        ctx.putImageData(imageData, 0, 0);
        sprites[blockId] = canvas;
    });
    return sprites;
}
function buildPalette(raw) {
    const palette = Array.from({ length: 256 }, () => [0, 0, 0, 0]);
    for (let i = 0; i < 256; i++) {
        const r = raw[i * 3] ?? 0;
        const g = raw[i * 3 + 1] ?? 0;
        const b = raw[i * 3 + 2] ?? 0;
        palette[i] = [scalePaletteComponent(r), scalePaletteComponent(g), scalePaletteComponent(b), i === 0 ? 0 : 255];
    }
    return palette;
}
function scalePaletteComponent(value) {
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
export const SHIP_SPRITE_SIZE = SPRITE_SIZE;
