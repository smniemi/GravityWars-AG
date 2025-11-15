import type { GravityWarsRuntime } from './wasmBridge';

export interface ShipState {
  active: number;
  x: number;
  y: number;
  thrust: number;
  image: number;
  state: number;
  animationPhase: number;
}

type PtrFn = () => number;

export function createShipStateReader(runtime: GravityWarsRuntime) {
  const getPtr = resolveFunction(runtime, 'get_ship_state');
  const basePtr = getPtr();
  const heap = runtime.HEAPU8;
  const view = new DataView(heap.buffer);

  return {
    read(): ShipState {
      const active = view.getInt32(basePtr, true);
      const x = view.getInt32(basePtr + 4, true);
      const y = view.getInt32(basePtr + 8, true);
      const thrust = view.getInt32(basePtr + 16, true);
      const image = view.getInt32(basePtr + 20, true);
      const state = view.getInt32(basePtr + 24, true);
      const animationPhase = view.getInt32(basePtr + 28, true);

      return {
        active,
        x,
        y,
        thrust,
        image,
        state,
        animationPhase
      };
    }
  };
}

function resolveFunction(runtime: GravityWarsRuntime, name: string): PtrFn {
  const module = runtime as Record<string, unknown>;
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

