import type { LevelMap } from '../core/levelMap.js';
import type { GlobalState } from '../core/globalState.js';
import type { TileAtlas } from './tileAtlas.js';

const TILE_SIZE = 32;

export interface ViewportInfo {
  cameraX: number;
  cameraY: number;
  zoom: number;
}

export function buildLevelCanvas(map: LevelMap, atlas: TileAtlas): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = map.width * TILE_SIZE;
  canvas.height = map.height * TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create level canvas context');
  }
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const idx = y * map.width + x;
      const blockId = map.tiles[idx];
      const pos = atlas.positions[blockId] ?? atlas.positions[0];
      if (!pos) {
        continue;
      }

      ctx.drawImage(
        atlas.canvas,
        pos.sx,
        pos.sy,
        TILE_SIZE,
        TILE_SIZE,
        x * TILE_SIZE,
        y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }

  return canvas;
}

export function updateLevelCanvas(
  canvas: HTMLCanvasElement,
  map: LevelMap,
  atlas: TileAtlas,
  dirtyIndices: number[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  for (const idx of dirtyIndices) {
    const x = idx % map.width;
    const y = Math.floor(idx / map.width);
    const blockId = map.tiles[idx];
    const pos = atlas.positions[blockId] ?? atlas.positions[0];

    // Clear the tile area first (in case of transparency, though blocks are usually opaque)
    ctx.clearRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    if (pos) {
      ctx.drawImage(
        atlas.canvas,
        pos.sx,
        pos.sy,
        TILE_SIZE,
        TILE_SIZE,
        x * TILE_SIZE,
        y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
}

export function drawWorldView(
  ctx: CanvasRenderingContext2D,
  levelCanvas: HTMLCanvasElement,
  globals: GlobalState | null,
  zoom = 1.5
): ViewportInfo {
  const worldWidth = levelCanvas.width;
  const worldHeight = levelCanvas.height;
  const viewWidth = ctx.canvas.width / zoom;
  const viewHeight = ctx.canvas.height / zoom;

  const shipX = globals ? globals.sx : worldWidth / 2;
  const shipY = globals ? globals.sy : worldHeight / 2;

  const cameraX = clamp(shipX - viewWidth / 2, 0, Math.max(0, worldWidth - viewWidth));
  const cameraY = clamp(shipY - viewHeight / 2, 0, Math.max(0, worldHeight - viewHeight));

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    levelCanvas,
    cameraX,
    cameraY,
    viewWidth,
    viewHeight,
    0,
    0,
    ctx.canvas.width,
    ctx.canvas.height
  );

  return { cameraX, cameraY, zoom };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

