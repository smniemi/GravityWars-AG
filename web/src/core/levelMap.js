const LEVEL_WIDTH = 20;
const LEVEL_HEIGHT = 45;
const TILE_COUNT = LEVEL_WIDTH * LEVEL_HEIGHT;
export function createLevelMap(runtime) {
    const getObjectsPtr = resolveFunction(runtime, 'get_objects_buffer');
    const getTilesPtr = resolveFunction(runtime, 'get_level_buffer');
    const objectsPtr = getObjectsPtr();
    const tilesPtr = getTilesPtr();
    const objects = new Uint8Array(runtime.HEAPU8.buffer, objectsPtr, TILE_COUNT);
    const tiles = new Uint8Array(runtime.HEAPU8.buffer, tilesPtr, TILE_COUNT);
    return {
        width: LEVEL_WIDTH,
        height: LEVEL_HEIGHT,
        objects,
        tiles
    };
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
