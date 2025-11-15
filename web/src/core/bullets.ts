import type { GravityWarsRuntime } from './wasmBridge.js';

const BULLET_COUNT = 12; // N_BULLETS + 1
const BULLET_STRUCT_SIZE = 32;
const OFFSET_X = 0;
const OFFSET_Y = 4;
const OFFSET_ACTIVE = 28;
const FIXED_POINT_SHIFT = 10;

export interface BulletSnapshot {
  id: number;
  x: number;
  y: number;
  active: boolean;
}

export function createBulletReader(runtime: GravityWarsRuntime) {
  const getPtr = resolveFunction(runtime, 'get_bullets_buffer');
  const basePtr = getPtr();
  const view = new DataView(runtime.HEAPU8.buffer);

  return {
    read(): BulletSnapshot[] {
      const bullets: BulletSnapshot[] = [];
      for (let i = 0; i < BULLET_COUNT; i++) {
        const offset = basePtr + i * BULLET_STRUCT_SIZE;
        const active = Boolean(view.getUint8(offset + OFFSET_ACTIVE));
        const rawX = view.getInt32(offset + OFFSET_X, true);
        const rawY = view.getInt32(offset + OFFSET_Y, true);
        bullets.push({
          id: i,
          x: rawX >> FIXED_POINT_SHIFT,
          y: rawY >> FIXED_POINT_SHIFT,
          active
        });
      }
      return bullets;
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

