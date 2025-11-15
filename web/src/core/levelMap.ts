import type { GravityWarsRuntime } from './wasmBridge';

const LEVEL_WIDTH = 20;
const LEVEL_HEIGHT = 45;
const TILE_COUNT = LEVEL_WIDTH * LEVEL_HEIGHT;

export interface LevelMap {
  width: number;
  height: number;
  objects: Uint8Array;
  tiles: Uint8Array;
}

export function createLevelMap(runtime: GravityWarsRuntime): LevelMap {
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

type PtrFn = () => number;

function resolveFunction(runtime: GravityWarsRuntime, name: string): PtrFn {
  const module = runtime as Record<string, unknown>;
  const variants = [name, `_${name}`];

  for (const variant of variants) {
    const fn = module[variant];
    if (typeof fn === 'function') {
      return (fn as () => number).bind(module);
    }
  }

  if (runtime.cwrap) {
    return runtime.cwrap(name, 'number', []);
  }

  throw new Error(`Unable to resolve wasm export ${name}`);
}

