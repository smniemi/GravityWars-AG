import type { GravityWarsRuntime } from './wasmBridge.js';

const ACTION_COUNT = 12; // N_ACTION + 1
const ACTION_STRUCT_SIZE = 18; // 9 shorts

const OFFSET_X = 0;
const OFFSET_Y = 2;
const OFFSET_FRAME = 8;
const OFFSET_STATE = 10;
const OFFSET_TYPE = 16;
const OFFSET_START = 4;
const OFFSET_STOP = 6;

export interface ActionState {
  id: number;
  x: number;
  y: number;
  frame: number;
  start: number;
  stop: number;
  type: number;
  active: boolean;
}

export function createActionReader(runtime: GravityWarsRuntime) {
  const getPtr = resolveFunction(runtime, 'get_action_buffer');
  const basePtr = getPtr();
  const view = new DataView(runtime.HEAPU8.buffer);

  return {
    read(): ActionState[] {
      const actions: ActionState[] = [];
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

type PtrFn = () => number;

function resolveFunction(runtime: GravityWarsRuntime, name: string): PtrFn {
  const module = runtime as unknown as Record<string, unknown>;
  const candidates = [name, `_${name}`];

  for (const candidate of candidates) {
    const fn = module[candidate];
    if (typeof fn === 'function') {
      return (fn as () => number).bind(module);
    }
  }

  if (runtime.cwrap) {
    return runtime.cwrap(name, 'number', []);
  }

  throw new Error(`Unable to resolve wasm export ${name}`);
}

