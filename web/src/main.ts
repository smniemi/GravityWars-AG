import { GameLoop } from '@core/index';
import { createKeyboardInput, type KeyboardState } from '@core/input';
import { createShipStateReader, type ShipState } from '@core/shipState';
import { createGlobalStateReader, type GlobalState } from '@core/globalState';
import { createLevelMap, type LevelMap } from '@core/levelMap';
import { loadGravityWarsModule } from '@core/wasmBridge';
import type { GravityWarsRuntime } from '@core/wasmBridge';
import { sendDebugSnapshot } from './debugger';

const root = document.getElementById('app') ?? createRoot();

function createRoot(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'app';
  document.body.appendChild(el);
  return el;
}

const canvas = document.createElement('canvas');
canvas.width = 960;
canvas.height = 540;
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.display = 'block';
canvas.style.background = '#05060a';

root.appendChild(canvas);

const ctx = canvas.getContext('2d');

let wasmStatus = 'WASM pending build…';
let runtime: Awaited<ReturnType<typeof loadGravityWarsModule>> | null = null;
let shipReader: ReturnType<typeof createShipStateReader> | null = null;
let lastShipState: ShipState | null = null;
let globalsReader: ReturnType<typeof createGlobalStateReader> | null = null;
let lastGlobals: GlobalState | null = null;
let levelMap: LevelMap | null = null;
const keyboard = createKeyboardInput();
let controls: ControlFns | null = null;
type ExportName = 'init_gw' | 'main_init' | 'control' | 'animate';

const cachedExports: Partial<Record<ExportName, () => void>> = {};

const OBJECT_COLORS: Record<string, string> = {
  '.': '#080808',
  's': '#0f0',
  'f': '#ff0',
  'x': '#f33',
  '@': '#f80',
  'w': '#0af',
  'v': '#0af',
  'a': '#222',
  '&': '#0ff',
  '?': '#0ff',
  '%': '#ff6',
  'T': '#f6f',
  'L': '#f6f'
};
const DEFAULT_TILE_COLOR = '#111';
const SOLID_TILE_COLOR = '#2f364d';
const BACKGROUND_TILE_COLOR = '#07090d';
const MINIMAP_TILE_SIZE = 6;
const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.06)';
const TILE_PALETTE: Record<number, string> = {};

function getExport(name: ExportName): () => void {
  if (!runtime) {
    throw new Error('WASM runtime not ready');
  }

  if (cachedExports[name]) {
    return cachedExports[name]!;
  }

  const module = runtime.runtime as Record<string, unknown>;
  const variants = [name, `_${name}`];

  for (const variant of variants) {
    const fn = module[variant];
    if (typeof fn === 'function') {
      cachedExports[name] = fn.bind(module);
      return cachedExports[name]!;
    }
  }

  if (typeof module.cwrap === 'function') {
    const wrapped = module.cwrap(name, 'void', []);
    cachedExports[name] = wrapped;
    return wrapped;
  }

  throw new Error(`Export ${name} not found on wasm runtime.`);
}

function drawShip(context: CanvasRenderingContext2D, ship: ShipState) {
  const scale = 1 / 64;
  const px = canvas.width / 2 + ship.x * scale;
  const py = canvas.height / 2 - ship.y * scale;

  context.fillStyle = ship.active ? '#ff0' : '#777';
  context.beginPath();
  context.arc(px, py, 6, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#fff';
  context.font = '12px monospace';
  context.fillText(`(${ship.x}, ${ship.y})`, px + 10, py - 10);
}

function drawLevelMap(
  context: CanvasRenderingContext2D,
  map: LevelMap,
  globals: GlobalState | null
) {
  const tileSize = MINIMAP_TILE_SIZE;
  const mapWidthPx = map.width * tileSize;
  const mapHeightPx = map.height * tileSize;
  const originX = canvas.width - mapWidthPx - 20;
  const originY = canvas.height - mapHeightPx - 20;

  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(originX - 4, originY - 4, mapWidthPx + 8, mapHeightPx + 8);

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const idx = y * map.width + x;
      const blockId = map.tiles[idx];
      const baseColor = blockId === 38 ? BACKGROUND_TILE_COLOR : getTileColor(blockId);
      context.fillStyle = baseColor;
      context.fillRect(originX + x * tileSize, originY + y * tileSize, tileSize - 1, tileSize - 1);

      const charCode = map.objects[idx];
      if (charCode) {
        const symbol = String.fromCharCode(charCode);
        const overlay = OBJECT_COLORS[symbol];
        if (overlay) {
          context.fillStyle = overlay;
          context.fillRect(originX + x * tileSize + 1, originY + y * tileSize + 1, tileSize - 2, tileSize - 2);
        }
      }
    }
  }

  if (globals) {
    const tileX = clamp(Math.floor(globals.sx / 32), 0, map.width - 1);
    const tileY = clamp(Math.floor((globals.sy + 28) / 32), 0, map.height - 1);
    const shipX = originX + (tileX + 0.5) * tileSize;
    const shipY = originY + (tileY + 0.5) * tileSize;
    const angle = ((globals.sa % 16384) / 16384) * Math.PI * 2;

    context.save();
    context.translate(shipX, shipY);
    context.rotate(-angle + Math.PI / 2);
    context.fillStyle = '#fff';
    context.beginPath();
    context.moveTo(0, -tileSize * 0.9);
    context.lineTo(tileSize * 0.6, tileSize * 0.6);
    context.lineTo(-tileSize * 0.6, tileSize * 0.6);
    context.closePath();
    context.fill();
    context.restore();
  }

  context.strokeStyle = '#0ff';
  context.strokeRect(originX - 4, originY - 4, mapWidthPx + 8, mapHeightPx + 8);

  context.strokeStyle = GRID_LINE_COLOR;
  context.lineWidth = 1;
  for (let x = 1; x < map.width; x++) {
    const gx = originX + x * tileSize;
    context.beginPath();
    context.moveTo(gx, originY);
    context.lineTo(gx, originY + mapHeightPx);
    context.stroke();
  }
  for (let y = 1; y < map.height; y++) {
    const gy = originY + y * tileSize;
    context.beginPath();
    context.moveTo(originX, gy);
    context.lineTo(originX + mapWidthPx, gy);
    context.stroke();
  }

  context.fillStyle = '#0af';
  context.font = '10px monospace';
  context.fillText('20 x 45 tiles', originX - 4, originY - 8);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTileColor(id: number) {
  if (TILE_PALETTE[id] !== undefined) {
    return TILE_PALETTE[id];
  }

  const normalized = id / 255;
  const hue = (normalized * 320 + (id * 17) % 40) % 360;
  const saturation = 55 + ((id * 13) % 30);
  const lightness = 35 + ((id * 7) % 20);

  const color = hslToHex(hue, saturation, lightness);
  TILE_PALETTE[id] = color;
  return color;
}

function hslToHex(h: number, s: number, l: number) {
  const sat = s / 100;
  const lig = l / 100;

  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const to255 = (n: number) => Math.round((n + m) * 255);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(to255(r))}${hex(to255(g))}${hex(to255(b))}`;
}

function drawDebugPanel(
  context: CanvasRenderingContext2D,
  ship: ShipState,
  globals: GlobalState | null,
  input: KeyboardState
) {
  const lines = [
    `Ship state: ${ship.state}`,
    `Pos: (${ship.x}, ${ship.y})`,
    `Thrust value: ${ship.thrust}`,
    `Fuel: ${globals?.shipFuel ?? 'n/a'}`,
    `Time: ${globals ? globals.shipTime.toFixed(1) : 'n/a'}`,
    `Life: ${globals?.shipLife ?? 'n/a'}`,
    `Score: ${globals?.shipScore ?? 'n/a'}`,
    `Keys: ${globals?.numKeys ?? 'n/a'} | Level: ${globals?.levelnum ?? 'n/a'}`,
    `Angle sa: ${globals?.sa ?? 'n/a'}`,
    `Input thrust: ${input.thrust}`,
    `Input fire: ${input.fire}`,
    `Input rotate: ${input.rotate}`
  ];

  const width = 280;
  const lineHeight = 16;
  const height = lines.length * lineHeight + 12;
  const x = canvas.width - width - 12;
  const y = 12;

  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(x, y, width, height);
  context.strokeStyle = '#0ff';
  context.strokeRect(x, y, width, height);
  context.fillStyle = '#fff';
  context.font = '12px monospace';

  lines.forEach((line, index) => {
    context.fillText(line, x + 8, y + 20 + index * lineHeight);
  });
}

type ControlFns = {
  setThrust: (value: number) => void;
  setFire: (value: number) => void;
  adjustAngle: (delta: number) => void;
};

function createControls(runtime: GravityWarsRuntime): ControlFns {
  return {
    setThrust: resolveVoidFunction(runtime, 'wasm_set_thrust'),
    setFire: resolveVoidFunction(runtime, 'wasm_set_fire'),
    adjustAngle: resolveVoidFunction(runtime, 'wasm_adjust_sa')
  };
}

function resolveVoidFunction(runtime: GravityWarsRuntime, name: string) {
  const module = runtime as Record<string, unknown>;
  const candidates = [name, `_${name}`];

  for (const candidate of candidates) {
    const fn = module[candidate];
    if (typeof fn === 'function') {
      return (value: number) => (fn as (n: number) => void).call(module, value);
    }
  }

  if (runtime.cwrap) {
    const wrapped = runtime.cwrap(name, 'void', ['number']);
    return (value: number) => wrapped(value);
  }

  throw new Error(`Unable to resolve wasm export ${name}`);
}

const loop = new GameLoop(({ deltaMs }) => {
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0ff';
    ctx.font = '16px monospace';
    ctx.fillText(`GravityWars Web bootstrap - Δ=${deltaMs.toFixed(2)}ms`, 20, 30);
    ctx.fillStyle = '#0f9';
    ctx.fillText(wasmStatus, 20, 60);
  }

  if (runtime) {
    getExport('control')();
    getExport('animate')();
    if (shipReader) {
      lastShipState = shipReader.read();
    }
    if (globalsReader) {
      lastGlobals = globalsReader.read();
    }
    if (controls) {
      const { thrust, fire, rotate } = keyboard.state;
      controls.setThrust(thrust ? 32 : 0);
      controls.setFire(fire ? 1 : 0);
      if (rotate !== 0) {
        controls.adjustAngle(rotate * 64);
      }
    }
  }

  if (ctx) {
    if (levelMap) {
      drawLevelMap(ctx, levelMap, lastGlobals);
    }
    if (lastShipState) {
      drawShip(ctx, lastShipState);
      drawDebugPanel(ctx, lastShipState, lastGlobals, keyboard.state);
    }
  }

  if (runtime) {
    sendDebugSnapshot({
      wasmStatus,
      ship: lastShipState,
      globals: lastGlobals,
      input: keyboard.state
    });
  }
});

loop.start();

loadGravityWarsModule()
  .then((module) => {
    runtime = module;
    shipReader = createShipStateReader(module.runtime);
    globalsReader = createGlobalStateReader(module.runtime);
    levelMap = createLevelMap(module.runtime);
    controls = createControls(module.runtime);
    getExport('init_gw')();
    getExport('main_init')();
    wasmStatus = 'WASM module ready.';
  })
  .catch((error) => {
    wasmStatus = `WASM unavailable: ${error.message}`;
    console.warn(error);
  });

