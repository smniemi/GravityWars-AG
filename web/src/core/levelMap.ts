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

export function createLevelMap(runtime: GravityWarsRuntime, levelNum?: number): LevelMap {
  const getObjectsPtr = resolveFunction(runtime, 'get_objects_buffer');
  const getTilesPtr = resolveFunction(runtime, 'get_level_buffer');
  const objectsPtr = getObjectsPtr();
  const tilesPtr = getTilesPtr();
  const objects = new Uint8Array(runtime.HEAPU8.buffer, objectsPtr, TILE_COUNT);
  const tiles = new Uint8Array(runtime.HEAPU8.buffer, tilesPtr, TILE_COUNT);

  // Special handling for level 0 (intro screen):
  // Copy row 10's tiles to fill all rows 11-44 so the background looks consistent
  if (levelNum === 0) {
    const ROW_10_START = 10 * LEVEL_WIDTH;
    for (let row = 11; row < LEVEL_HEIGHT; row++) {
      const rowStart = row * LEVEL_WIDTH;
      for (let col = 0; col < LEVEL_WIDTH; col++) {
        tiles[rowStart + col] = tiles[ROW_10_START + col];
        objects[rowStart + col] = objects[ROW_10_START + col];
      }
    }
    console.log('[LevelMap] Level 0: Filled rows 11-44 with row 10 content');
  }

  return {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    objects,
    tiles
  };
}

type PtrFn = () => number;

function resolveFunction(runtime: GravityWarsRuntime, name: string): PtrFn {
  const module = runtime as unknown as Record<string, unknown>;
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

