const ACTION_COUNT = 12; // N_ACTION + 1
const ACTION_STRUCT_SIZE = 18; // 9 shorts
const OFFSET_X = 0;
const OFFSET_Y = 2;
const OFFSET_FRAME = 8;
const OFFSET_STATE = 10;
const OFFSET_TYPE = 16;
const OFFSET_START = 4;
const OFFSET_STOP = 6;
export function createActionReader(runtime) {
    const getPtr = resolveFunction(runtime, 'get_action_buffer');
    const basePtr = getPtr();
    const view = new DataView(runtime.HEAPU8.buffer);
    return {
        read() {
            const actions = [];
            for (let i = 0; i < ACTION_COUNT; i++) {
                const offset = basePtr + i * ACTION_STRUCT_SIZE;
                const frame = view.getInt16(offset + OFFSET_FRAME, true);
                const state = view.getInt16(offset + OFFSET_STATE, true);
                if (!state) {
                    continue;
                }
                actions.push({
                    id: i,
                    x: view.getInt16(offset + OFFSET_X, true),
                    y: view.getInt16(offset + OFFSET_Y, true),
                    frame,
                    start: view.getInt16(offset + OFFSET_START, true),
                    stop: view.getInt16(offset + OFFSET_STOP, true),
                    type: view.getInt16(offset + OFFSET_TYPE, true),
                    active: Boolean(state)
                });
            }
            return actions;
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
