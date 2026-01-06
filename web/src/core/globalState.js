const STRUCT_SIZE = 60;
export function createGlobalStateReader(runtime) {
    const getPtr = resolveFunction(runtime, 'get_global_state');
    return {
        read() {
            const ptr = getPtr();
            const view = new DataView(runtime.HEAPU8.buffer, ptr, STRUCT_SIZE);
            return {
                shipState: view.getInt32(0, true),
                shipActive: view.getInt32(4, true),
                shipThrust: view.getInt32(8, true),
                sx: view.getFloat32(12, true),
                sy: view.getFloat32(16, true),
                shipFuel: view.getInt32(20, true),
                shipTime: view.getFloat32(24, true),
                shipLife: view.getInt32(28, true),
                shipScore: view.getInt32(32, true),
                numKeys: view.getInt32(36, true),
                levelnum: view.getInt32(40, true),
                sa: view.getInt32(44, true),
                dynamicBlocksChanged: view.getInt32(48, true),
                gameOver: view.getInt32(52, true)
            };
        }
    };
}
function resolveFunction(runtime, name) {
    const module = runtime;
    const candidates = [name, `_${name}`];
    for (const candidate of candidates) {
        const fn = module[candidate];
        if (typeof fn === 'function') {
            return fn.bind(module);
        }
    }
    if (runtime.cwrap) {
        return runtime.cwrap(name, 'number', []);
    }
    throw new Error(`Unable to resolve wasm export ${name}`);
}
