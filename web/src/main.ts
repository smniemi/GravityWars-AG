import './style.css';
import { createTileAtlas, type TileAtlas } from './render/tileAtlas.js';
import { SoundManager } from './core/sound.js';
import { createShipSprites, type ShipSprites } from './render/shipSprites.js';
import { WebGLRenderer } from './render/webgl/renderer.js';
import { drawHUD } from './ui/hud.js';
import { Joystick } from './ui/joystick.js';
import { Button } from './ui/button.js';
import { loadGravityWarsModule, type GravityWarsRuntime } from './core/wasmBridge.js';
import { createShipStateReader, type ShipState } from './core/shipState.js';
import { createGlobalStateReader, type GlobalState } from './core/globalState.js';
import { createLevelMap, type LevelMap } from './core/levelMap.js';
import { createBulletReader, type BulletSnapshot } from './core/bullets.js';
import { createActionReader, type ActionState } from './core/actions.js';
import { createKeyboardInput, type KeyboardState } from './core/input.js';
import { GameLoop } from './core/index.js';
import { StartScreen } from './ui/startScreen.js';
import { GameOverScreen } from './ui/gameOverScreen.js';
import { LevelIntroScreen } from './ui/levelIntroScreen.js';
import { GameCompleteScreen } from './ui/gameCompleteScreen.js';
import { LevelCompleteScreen } from './ui/levelComplete.js';

const root = document.getElementById('app') ?? createRoot();

function createRoot(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'app';
  document.body.appendChild(el);
  return el;
}

// Debug log to verify version
console.log('[Main] App Version: 1.0.1 (Relative Paths Configured)');

const canvas = document.createElement('canvas');
canvas.width = 960;
canvas.height = 540;
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.display = 'block';
canvas.style.background = '#05060a';
canvas.tabIndex = 0; // Make canvas focusable
canvas.style.outline = 'none'; // Remove focus outline

root.appendChild(canvas);
canvas.focus();

// Toggle fullscreen on double click
root.addEventListener('dblclick', () => {
  if (!document.fullscreenElement) {
    root.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
});

const renderer = new WebGLRenderer(canvas);

const uiCanvas = document.createElement('canvas');
uiCanvas.style.position = 'absolute';
uiCanvas.style.top = '0';
uiCanvas.style.left = '0';
uiCanvas.style.width = '100%';
uiCanvas.style.height = '100%';
uiCanvas.style.pointerEvents = 'none'; // Let clicks pass through
root.appendChild(uiCanvas);

const uiCtx = uiCanvas.getContext('2d');

// Joystick

const joystick = new Joystick();
const fireButton = new Button('FIRE');
const thrustButton = new Button('ACCEL');

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;

function resize() {
  renderer.resize();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (uiCanvas.width !== width || uiCanvas.height !== height) {
    uiCanvas.width = width;
    uiCanvas.height = height;

    // Common margin matching HUD padding
    const margin = 20;

    // Button radius
    const btnRadius = 60;
    // Joystick radius
    const joystickRadius = 64;

    // Button spacing (vertical gap between FIRE and ACCEL centers = 2 * btnRadius + gap)
    const buttonGap = 20; // Gap between button edges
    const buttonSpacing = btnRadius * 2 + buttonGap;

    // Left side buttons: center X is margin + btnRadius from left edge
    const xLeft = margin + btnRadius;

    // ACCEL button near bottom: center Y is margin + btnRadius from bottom
    const accelY = height - margin - btnRadius;
    // FIRE button above ACCEL
    const fireY = accelY - buttonSpacing;

    fireButton.setPosition(xLeft, fireY, btnRadius);
    thrustButton.setPosition(xLeft, accelY, btnRadius);

    // Joystick on right side: center X is margin + radius from right edge
    const xRight = width - margin - joystickRadius;
    // Center Y same as average of buttons, or slightly above bottom
    const joystickY = height - margin - joystickRadius;
    joystick.setPosition(xRight, joystickY, joystickRadius);
  }
}

window.addEventListener('resize', resize);
resize();

let wasmStatus = 'WASM pending build…';
let runtime: Awaited<ReturnType<typeof loadGravityWarsModule>> | null = null;
let shipReader: ReturnType<typeof createShipStateReader> | null = null;
let lastShipState: ShipState | null = null;
let globalsReader: ReturnType<typeof createGlobalStateReader> | null = null;
let lastGlobals: GlobalState | null = null;
let levelMap: LevelMap | null = null;
let tileAtlas: TileAtlas | null = null;

let lastTiles: Uint8Array | null = null;

let shipSprites: ShipSprites | null = null;
let clearDynamicBlocks: (() => void) | null = null;
let advanceLevel: (() => void) | null = null;
let bulletReader: ReturnType<typeof createBulletReader> | null = null;
let currentBullets: BulletSnapshot[] = [];
let actionReader: ReturnType<typeof createActionReader> | null = null;
let actionStates: ActionState[] = [];
let levelAdvancePending = false;

// Initialize input system asynchronously
let keyboard: Awaited<ReturnType<typeof createKeyboardInput>> | null = null;
(async () => {
  keyboard = await createKeyboardInput(root, joystick, fireButton, thrustButton);
})();
const soundManager = new SoundManager();
soundManager.setSfxVolume(0.5); // Default to 50% for intro

// Initialize start screen
let startScreen: StartScreen | null = null;
let gameOverScreen: GameOverScreen | null = null;
let levelIntroScreen: LevelIntroScreen | null = null;
let gameCompleteScreen: GameCompleteScreen | null = null;
let levelCompleteScreen: LevelCompleteScreen | null = null;
let gameStarted = false;

// Total number of levels in the game
const TOTAL_LEVELS = 13;
let levelIntroActive = false;
let previousNumKeys = -1; // Track previous key count to detect when portal activates

// Override controls to disable them until game starts
// Override controls to disable them until game starts
// Controls initially null until WASM loads
// Removed duplicate soundManager
let controls: ControlFns | null = null;
type ExportName = 'init_gw' | 'main_init' | 'control' | 'animate' | 'wasm_next_level' | 'wasm_prev_level' | 'wasm_restart_level' | 'get_current_level_name' | 'wasm_add_score';

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
const BACKGROUND_TILE_COLOR = '#07090d';
const MINIMAP_TILE_SIZE = 6;
const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.06)';
const TILE_PALETTE: Record<number, string> = {};
const ANGLE_ADJUST_SPEED = 128; // Standard rotation speed
const SHIP_IMAGE = {
  NO_THRUST: 0,
  THRUST: 1,
  EXPLODE_1: 2,
  EXPLODE_2: 3,
  EXPLODE_3: 4,
  EXPLODE_4: 5,
  EXPLODE_5: 6,
  APPEAR_1: 7,
  APPEAR_2: 8,
  APPEAR_3: 9,
  APPEAR_4: 10,
  APPEAR_5: 11
} as const;

const SHIP_BLOCK_MAP: Partial<Record<number, number>> = {
  [SHIP_IMAGE.EXPLODE_1]: 45,
  [SHIP_IMAGE.EXPLODE_2]: 46,
  [SHIP_IMAGE.EXPLODE_3]: 47,
  [SHIP_IMAGE.EXPLODE_4]: 48,
  [SHIP_IMAGE.EXPLODE_5]: 49,
  [SHIP_IMAGE.APPEAR_1]: 157,
  [SHIP_IMAGE.APPEAR_2]: 158,
  [SHIP_IMAGE.APPEAR_3]: 159,
  [SHIP_IMAGE.APPEAR_4]: 160,
  [SHIP_IMAGE.APPEAR_5]: 161
};

const SHIP_SPECIAL_BLOCK_IDS = Array.from(
  new Set(
    Object.values(SHIP_BLOCK_MAP).filter((value): value is number => typeof value === 'number')
  )
);

const SHIP_STATE = {
  LANDED: 0,
  FLYING: 1,
  EXPLODING: 2,
  APPEARING: 3,
  DISAPPEARING: 4
} as const;

function getExport(name: ExportName): () => void {
  if (!runtime) {
    throw new Error('WASM runtime not ready');
  }

  if (cachedExports[name]) {
    return cachedExports[name]!;
  }

  const module = runtime.runtime as unknown as Record<string, unknown>;
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

function drawShipFallback(context: CanvasRenderingContext2D, ship: ShipState) {
  const scale = 1 / 64;
  const px = uiCanvas.width / 2 + ship.x * scale;
  const py = uiCanvas.height / 2 - ship.y * scale;

  context.fillStyle = ship.active ? '#ff0' : '#777';
  context.beginPath();
  context.arc(px, py, 6, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#fff';
  context.font = '12px monospace';
  context.fillText(`(${ship.x}, ${ship.y})`, px + 10, py - 10);
}

// @ts-ignore
function drawMiniMap(
  context: CanvasRenderingContext2D,
  map: LevelMap,
  globals: GlobalState | null
) {
  const tileSize = MINIMAP_TILE_SIZE;
  const mapWidthPx = map.width * tileSize;
  const mapHeightPx = map.height * tileSize;
  const originX = uiCanvas.width - mapWidthPx - 20;
  const originY = uiCanvas.height - mapHeightPx - 20;

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
  input: KeyboardState,
  cheatMode: boolean
) {
  const lines = [
    `CHEAT MODE: ${cheatMode ? 'ON' : 'OFF'}`,
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
  const x = uiCanvas.width - width - 12;
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
  setSA: (value: number) => void;
  getDemoBufferPtr: () => number;
  getDemoCount: () => number;
  nextLevel: () => void;
  // Duplicate removed
  prevLevel: () => void;
  restartLevel: () => void;
  toggleCheatMode: () => void;
  getCheatMode: () => number; // Returns int (0 or 1)
  addScore: (value: number) => void;
};

function createControls(runtime: GravityWarsRuntime): ControlFns {
  return {
    setThrust: resolveVoidFunction(runtime, 'wasm_set_thrust'),
    setFire: resolveVoidFunction(runtime, 'wasm_set_fire'),
    adjustAngle: resolveVoidFunction(runtime, 'wasm_adjust_sa'),
    setSA: resolveVoidFunction(runtime, 'wasm_set_sa'),
    getDemoBufferPtr: resolveZeroArgReturningIntFunction(runtime, 'get_demo_buffer'),
    getDemoCount: resolveZeroArgReturningIntFunction(runtime, 'get_demo_count'),
    nextLevel: resolveZeroArgFunction(runtime, 'wasm_next_level'),
    prevLevel: resolveZeroArgFunction(runtime, 'wasm_prev_level'),
    restartLevel: resolveZeroArgFunction(runtime, 'wasm_restart_level'),
    toggleCheatMode: resolveZeroArgFunction(runtime, 'wasm_toggle_cheat_mode'),
    getCheatMode: resolveZeroArgReturningIntFunction(runtime, 'wasm_get_cheat_mode'),
    addScore: resolveVoidFunction(runtime, 'wasm_add_score')
  };
}

function resolveVoidFunction(runtime: GravityWarsRuntime, name: string) {
  const module = runtime as unknown as Record<string, unknown>;
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

function resolveZeroArgFunction(runtime: GravityWarsRuntime, name: string) {
  const module = runtime as unknown as Record<string, unknown>;
  const candidates = [name, `_${name}`];

  for (const candidate of candidates) {
    const fn = module[candidate];
    if (typeof fn === 'function') {
      return (fn as () => void).bind(module);
    }
  }

  if (runtime.cwrap) {
    return runtime.cwrap(name, 'void', []);
  }

  throw new Error(`Unable to resolve wasm export ${name}`);
}

function resolveZeroArgReturningIntFunction(runtime: GravityWarsRuntime, name: string) {
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

function readWasmString(ptr: number, runtime: any) {
  const memory = (runtime.runtime as any).HEAPU8;
  let end = ptr;
  while (memory[end] !== 0) end++;
  let str = new TextDecoder().decode(memory.subarray(ptr, end));
  return str.replace(/"/g, '');
}

function playLevelIntro() {
  if (!runtime || !controls) return;

  if (!levelIntroScreen) {
    levelIntroScreen = new LevelIntroScreen(root);
  }

  levelIntroActive = true;
  gameStarted = true; // Ensure rendering happens

  reloadLevel();

  // Capture start score for PB calculation
  if (globalsReader) {
    levelStartScore = globalsReader.read().shipScore;
  }

  const getLevelNamePtr = getExport('get_current_level_name') as () => number;
  const levelName = readWasmString(getLevelNamePtr(), runtime);

  levelIntroScreen.show(levelName, () => {
    levelIntroActive = false;
  });
}

function handleLevelTransition() {
  if (!advanceLevel || levelAdvancePending || !lastShipState || !lastGlobals) {
    return;
  }

  // Skip level transition handling during intro/attractor mode (level 0)
  // The intro demo should just loop - not trigger level complete screen
  if (lastGlobals.levelnum === 0 || !gameStarted) {
    return;
  }
  if (lastShipState.state === SHIP_STATE.DISAPPEARING && lastShipState.animationPhase <= 0) {
    levelAdvancePending = true;

    // Check if this is the last level (level 60)
    const currentLevelNum = lastGlobals.levelnum;

    if (currentLevelNum >= TOTAL_LEVELS) {
      // Game complete! Show congratulations screen
      if (!gameCompleteScreen) {
        gameCompleteScreen = new GameCompleteScreen(root,
          // Play Again - start from level 1
          () => {
            // Navigate back to level 1
            if (controls && globalsReader) {
              let current = globalsReader.read().levelnum;
              while (current > 1) {
                controls.prevLevel();
                current = globalsReader.read().levelnum;
              }
              while (current < 1) {
                controls.nextLevel();
                current = globalsReader.read().levelnum;
              }
              reloadLevel();
              playLevelIntro();
            }
          },
          // Back to Menu
          () => {
            gameStarted = false;
            soundManager.setSfxVolume(0.5);
            startScreen?.show();
            if (globalsReader) {
              let current = globalsReader.read().levelnum;
              const prevFn = getExport('wasm_prev_level');
              let attempts = 0;
              while (current > 0 && attempts++ < 70) {
                prevFn();
                current = globalsReader.read().levelnum;
              }
              soundManager.update(globalsReader.read(), [], levelMap);
            }
          }
        );
      }

      gameCompleteScreen.show(lastGlobals.shipScore);
    } else {
      // Normal level transition
      // Show Level Complete Screen
      // Show Level Complete Screen
      // Fix for HMR stale instance: check if method exists
      if (!levelCompleteScreen || typeof (levelCompleteScreen as any).setOnContinue !== 'function') {
        if (levelCompleteScreen) {
          // Cleanup old instance if it exists but is stale
          try { (levelCompleteScreen as any).hide?.(); } catch { }
          try { (levelCompleteScreen as any).element?.remove(); } catch { }
        }
        levelCompleteScreen = new LevelCompleteScreen(root, () => { });
      }

      // We need to capture the current stats before they are reset by advanceLevel
      const bonusTime = lastGlobals.shipTime; // Assuming time is remaining
      const bonusFuel = lastGlobals.shipFuel;

      const timeBonus = Math.floor(bonusTime * 10);
      const fuelBonus = Math.floor(bonusFuel);
      const totalBonus = timeBonus + fuelBonus;

      // Update callback for this specific level transition
      levelCompleteScreen.setOnContinue(() => {
        if (controls && advanceLevel) {
          controls.addScore(totalBonus);

          // Unlock the next level before advancing
          const nextLevel = currentLevelNum + 1;
          startScreen?.unlockLevel(nextLevel);

          advanceLevel();
          // Reset level start score for the next level
          if (globalsReader) {
            const newState = globalsReader.read();
            levelStartScore = newState.shipScore;
          }
          playLevelIntro();
          console.log(`[LevelComplete] Added score: ${totalBonus} (Time: ${bonusTime.toFixed(1)}*10 + Fuel: ${bonusFuel}). Level ${nextLevel} unlocked.`);
        }
      });

      const getLevelNamePtr = getExport('get_current_level_name') as () => number;
      const levelName = readWasmString(getLevelNamePtr(), runtime);

      levelCompleteScreen.show({
        levelName: levelName,
        time: bonusTime,
        fuel: bonusFuel,
        currentScore: lastGlobals.shipScore, // This is current score BEFORE bonus
        levelIndex: lastGlobals.levelnum,
        levelStartScore: levelStartScore
      });
    }
  }

  levelAdvancePending = false;
}


let lastBgName = '';
let levelStartScore = 0;
let introDemoFrame = 0;
let demoData: Int32Array | null = null;
let demoCount = 0;
let rotationHoldStart = 0; // Track when rotation key was first pressed

const loop = new GameLoop(({ deltaMs }) => {


  if (levelMap && tileAtlas && !renderer.atlasTexture) {
    try {
      renderer.setTileAtlas(tileAtlas);
      renderer.buildLevel(levelMap, tileAtlas);
      console.log('[gravitywars] WebGL level built');
    } catch (error) {
      console.error('Failed to build level', error);
    }
  }

  if (!shipSprites && runtime?.runtime) {
    try {
      shipSprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
      renderer.setShipSprites(shipSprites);
    } catch (error) {
      console.error('Failed to build ship sprites', error);
    }
  }

  renderer.clear();
  if (uiCtx) {
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
  }

  if (runtime) {
    getExport('control')();
    getExport('animate')();
    if (shipReader) {
      lastShipState = shipReader.read();
    }
    if (globalsReader) {
      lastGlobals = globalsReader.read();

      // Update background only when level changes or on initial load
      const levelNum = lastGlobals.levelnum;
      const bgIndex = levelNum % 7;
      let bgName = 'space.jpg';

      switch (bgIndex) {
        case 0: bgName = 'back5_park.JPG'; break;
        case 1: bgName = 'back_nebula.jpg'; break;
        case 2: bgName = 'back_park.JPG'; break;
        case 3: bgName = 'back2_park.JPG'; break;
        case 4: bgName = 'back3_park.JPG'; break;
        case 5: bgName = 'back4_park.JPG'; break;
        case 6: bgName = 'back_park.JPG'; break;
      }

      if (bgName !== lastBgName) {
        if (!bgName || bgName === 'undefined') {
          bgName = 'space.jpg';
        }
        console.log(`[Main] Switching background to: ${bgName} for level ${levelNum}`);
        renderer.setBackgroundImage(`assets/backgrounds/${bgName}`);
        lastBgName = bgName;
      }

      if (lastGlobals.dynamicBlocksChanged) {
        if (runtime?.runtime) {
          tileAtlas = createTileAtlas(runtime.runtime);
          shipSprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
        }
        if (levelMap && tileAtlas) {
          renderer.setTileAtlas(tileAtlas);
          renderer.setShipSprites(shipSprites!);
          renderer.buildLevel(levelMap, tileAtlas);
        }
        clearDynamicBlocks?.();
      }
      soundManager.update(lastGlobals, actionStates, levelMap);

      // Check if all keys were just collected (portal activated)
      // NumKeys goes from positive to 0 when last key is collected
      // After that it becomes -1, so we check for the transition to 0
      if (gameStarted && previousNumKeys > 0 && lastGlobals.numKeys <= 0) {
        // Last key was collected - show portal activated message
        if (!levelIntroScreen) {
          levelIntroScreen = new LevelIntroScreen(root);
        }
        levelIntroScreen.showMessage('PORTAL ACTIVATED', '');
        console.log('[Main] Portal activated - all keys collected');
      }
      previousNumKeys = lastGlobals.numKeys;
    }
    if (bulletReader) {
      currentBullets = bulletReader.read().filter((bullet) => bullet.active);
    }
    if (actionReader) {
      actionStates = actionReader.read();
    }
    if (controls && keyboard) {
      const { thrust, fire, rotate, nextLevel, prevLevel } = keyboard.state;

      // Use same thrust value for both mobile and desktop for consistent physics
      const thrustValue = 24;

      if (gameStarted && !levelIntroActive) {
        // Apply analog thrust if available (thrust is 0-1)
        controls.setThrust(thrust * thrustValue);
        controls.setFire(fire ? 1 : 0);

        if (keyboard.state.targetAngle !== undefined && lastGlobals) {
          // Analog steering
          const targetRad = -keyboard.state.targetAngle - Math.PI / 2;
          const currentRad = ((lastGlobals.sa % 16384) / 16384) * Math.PI * 2;

          let diff = targetRad - currentRad;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          const adjustment = diff * 0.1;
          const adjustmentUnits = (adjustment / (Math.PI * 2)) * 16384;

          controls.adjustAngle(adjustmentUnits);

        } else if (rotate !== 0) {
          // Dynamic rotation speed based on hold duration
          const now = performance.now();
          if (rotationHoldStart === 0) {
            rotationHoldStart = now;
          }
          const holdDuration = now - rotationHoldStart;

          // Speed tiers: tap (0-200ms) = 0.5x precision, long press (200ms+) = 2x fast
          const speedMultiplier = holdDuration > 200 ? 2 : 0.5;

          controls.adjustAngle(-rotate * ANGLE_ADJUST_SPEED * speedMultiplier);
        } else {
          // Reset hold timer when rotation stops
          rotationHoldStart = 0;
        }
      } else if (lastGlobals?.levelnum === 0) {
        // Intro screen / Attractor mode: play demo path
        if (!demoData && runtime?.runtime) {
          const ptr = controls.getDemoBufferPtr();
          demoCount = controls.getDemoCount();
          if (ptr && demoCount > 0) {
            // demo is int[count][10]
            // We use the runtime's HEAP32 which should be an Int32Array view
            // If it's not present, we can create one from buffer
            const heap32 = (runtime.runtime as any).HEAP32 || new Int32Array(runtime.runtime.HEAPU8.buffer);
            demoData = heap32.subarray(ptr >> 2, (ptr >> 2) + demoCount * 10);
            console.log(`[Main] Intro demo loaded: ${demoCount} frames`);
          }
        }

        if (demoData && demoCount > 0) {
          if (introDemoFrame === 0) {
            // Fast forward to 13.7s
            const SKIP_SECONDS = 13.7;
            const FPS = 60;
            const skipFrames = Math.floor(SKIP_SECONDS * FPS);

            for (let i = 0; i < skipFrames; i++) {
              if (i >= demoCount) break;
              const off = i * 10;
              controls.setThrust(demoData[off + 7]);
              controls.setFire(demoData[off + 8]);
              controls.setSA(demoData[off + 9]);
              getExport('control')(); // Physics step
            }
            introDemoFrame = skipFrames;
          }

          const frameIdx = introDemoFrame % demoCount;
          const offset = frameIdx * 10;

          // demo structure: frame_number, left_x, left_y, left_on, right_x, right_y, right_on, thrust, fire, sa
          const thrustVal = demoData[offset + 7];
          const fireVal = demoData[offset + 8];
          const saVal = demoData[offset + 9];

          controls.setThrust(thrustVal);
          controls.setFire(fireVal);
          controls.setSA(saVal);

          introDemoFrame++;

          if (introDemoFrame >= demoCount) {
            controls.restartLevel();
            introDemoFrame = 0;
          }
        }
      }

      // Allow level skipping ONLY if debug is allowed? Or just block it till start?
      // For now, block it.
      if (gameStarted) {
        // Handle level changes (debug keys)
        if (nextLevel && keyboard) {
          controls.nextLevel();
          keyboard.state.nextLevel = false;
          reloadLevel();
        }

        if (prevLevel && keyboard) {
          controls.prevLevel();
          keyboard.state.prevLevel = false;
          reloadLevel();
        }

        // Handle cheat mode toggle (press 'd')
        if (keyboard.state.toggleCheat) {
          controls.toggleCheatMode();
          keyboard.state.toggleCheat = false;
          const isCheatOn = controls.getCheatMode();
          console.log(`[Main] Cheat mode ${isCheatOn ? 'ENABLED' : 'DISABLED'}: No wall collision, high fuel/time`);
        }
      }
    }



    if (gameStarted && lastGlobals && lastGlobals.gameOver) {
      if (!gameOverScreen) {


        gameOverScreen = new GameOverScreen(root,
          // Replay
          () => {
            controls?.restartLevel();
            reloadLevel();
          },
          // Menu
          () => {
            gameStarted = false;
            soundManager.setSfxVolume(0.5);
            startScreen?.show();
            if (globalsReader) {
              let current = globalsReader.read().levelnum;
              const prevFn = getExport('wasm_prev_level');
              let attempts = 0;
              while (current > 0 && attempts++ < 20) {
                prevFn();
                current = globalsReader.read().levelnum;
              }
              soundManager.update(globalsReader.read(), [], levelMap);
            }
          }
        );
      }

      if (gameOverScreen && lastGlobals) {
        const getLevelNamePtr = getExport('get_current_level_name') as () => number;
        // @ts-ignore
        const readString = (ptr: number) => {
          // @ts-ignore
          const memory = runtime.runtime.HEAPU8;
          let end = ptr;
          while (memory[end] !== 0) end++;
          let str = new TextDecoder().decode(memory.subarray(ptr, end));
          return str.replace(/"/g, '');
        };

        const levelName = readString(getLevelNamePtr());
        gameOverScreen.show(levelName, lastGlobals.shipScore);
      }
    }
  }


  handleLevelTransition();

  // Check for tile updates (animations)
  if (levelMap && tileAtlas) {
    if (!lastTiles || lastTiles.length !== levelMap.tiles.length) {
      lastTiles = new Uint8Array(levelMap.tiles);
    } else {
      const dirtyIndices: number[] = [];
      // Scan for changes
      for (let i = 0; i < levelMap.tiles.length; i++) {
        if (levelMap.tiles[i] !== lastTiles[i]) {
          dirtyIndices.push(i);
          lastTiles[i] = levelMap.tiles[i];
        }
      }

      if (dirtyIndices.length > 0) {
        renderer.updateLevel(levelMap, tileAtlas);
      }
    }
  }
  if (levelMap) {
    renderer.drawWorld(levelMap, lastGlobals, lastShipState, SHIP_BLOCK_MAP);
  }

  if (lastGlobals && lastShipState) {
    renderer.drawShip(lastGlobals, lastShipState, SHIP_BLOCK_MAP);
  }

  if (levelMap) {
    renderer.drawWorldForeground();
  }

  if (currentBullets.length) {
    renderer.drawBullets(currentBullets);
  }

  if (actionStates.length && tileAtlas) {
    renderer.drawActions(actionStates, tileAtlas);
  }

  if (uiCtx) {
    if (!levelMap && lastShipState) {
      drawShipFallback(uiCtx, lastShipState);
    }

    // if (levelMap) {
    //   drawMiniMap(uiCtx, levelMap, lastGlobals);
    // }

    if (lastGlobals && gameStarted) {
      drawHUD(uiCtx, lastGlobals);
    }

    // Render Joystick
    // Render Joystick
    if (isMobile && gameStarted) {
      joystick.render(uiCtx);
      fireButton.render(uiCtx);
      thrustButton.render(uiCtx);
    }

    // Debug displays - toggleable with "0" key
    const showDebug = keyboard?.state.toggleDebug ?? false;

    if (showDebug) {
      if (lastShipState) {
        const isCheatOn = controls ? controls.getCheatMode() : 0;
        drawDebugPanel(uiCtx, lastShipState, lastGlobals, keyboard?.state ?? { thrust: 0, fire: false, rotate: 0, nextLevel: false, prevLevel: false, toggleDebug: false, toggleCheat: false }, !!isCheatOn);
      }

      uiCtx.fillStyle = '#0ff';
      uiCtx.font = '16px monospace';
      uiCtx.fillText(`GravityWars WebGL - Δ=${deltaMs.toFixed(2)}ms`, 20, 30);
      uiCtx.fillStyle = '#0f9';
      uiCtx.fillText(wasmStatus, 20, 60);
    }
  }


});


function reloadLevel() {
  if (runtime?.runtime) {
    levelMap = createLevelMap(runtime.runtime);
    tileAtlas = createTileAtlas(runtime.runtime);
    shipSprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
    if (levelMap && tileAtlas) {
      renderer.setTileAtlas(tileAtlas);
      renderer.setShipSprites(shipSprites);
      renderer.buildLevel(levelMap, tileAtlas);
    }
  }
  currentBullets = [];
  previousNumKeys = -1; // Reset key tracking for new level
}

loop.start();

loadGravityWarsModule()
  .then((module) => {
    runtime = module;
    shipReader = createShipStateReader(module.runtime);
    globalsReader = createGlobalStateReader(module.runtime);
    levelMap = createLevelMap(module.runtime);
    controls = createControls(module.runtime);
    clearDynamicBlocks = resolveZeroArgFunction(module.runtime, 'wasm_clear_dynamic_blocks');
    advanceLevel = resolveZeroArgFunction(module.runtime, 'wasm_advance_level');
    bulletReader = createBulletReader(module.runtime);
    actionReader = createActionReader(module.runtime);
    getExport('init_gw')();
    getExport('main_init')();

    // Force start at Level 0 (Attractor)
    // We loop backwards until we hit level 0
    let currentLevel = globalsReader.read().levelnum;
    console.log(`[Main] Initial level: ${currentLevel}. Setting to 0 (Attractor)...`);
    let attempts = 0;
    const prevLevelFn = getExport('wasm_prev_level');
    const nextLevelFn = getExport('wasm_next_level');

    // If we are > 0, decrease level
    while (currentLevel > 0 && attempts < 20) {
      prevLevelFn();
      currentLevel = globalsReader.read().levelnum;
      attempts++;
    }

    // If we are < 0 (unlikely but possible with weird logic), increase
    while (currentLevel < 0 && attempts < 20) {
      nextLevelFn();
      currentLevel = globalsReader.read().levelnum;
      attempts++;
    }

    console.log(`[Main] Level set to: ${currentLevel}`);

    // Hide loading overlay now that everything is ready
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.transition = 'opacity 0.4s ease-out';
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 400);
      console.log('[Main] Loading overlay hidden - game ready');
    }

    // Create Start Screen
    if (!startScreen) {
      startScreen = new StartScreen(root, (selectedLevel) => {
        console.log(`[Main] Starting game at level ${selectedLevel}`);
        // CRITICAL: Unlock audio on mobile - must be called during user gesture
        soundManager.unlock();
        soundManager.setSfxVolume(1.0);
        startScreen?.hide();

        // Navigate to selected level
        // Level 0 is the Attractor, so selected Level 1 maps to engine level 1
        const targetLevel = selectedLevel;
        console.log(`[Main] Navigating to level ${targetLevel} (user selected ${selectedLevel})...`);

        // Get current level and navigate to target using next/prev level functions
        // (wasm_set_level doesn't exist, so we must iterate)
        let currentLevel = globalsReader?.read().levelnum ?? 0;
        let attempts = 0;
        const maxAttempts = 100;

        while (currentLevel !== targetLevel && attempts < maxAttempts) {
          if (currentLevel < targetLevel) {
            controls?.nextLevel();
          } else {
            controls?.prevLevel();
          }
          currentLevel = globalsReader?.read().levelnum ?? 0;
          attempts++;
        }

        console.log(`[Main] Level navigation complete after ${attempts} iterations. Current Level: ${currentLevel}`);

        playLevelIntro();

        // Ensure music for new level starts
        soundManager.update(globalsReader!.read(), [], levelMap);
      });
      startScreen.show();
    }

    tileAtlas = createTileAtlas(module.runtime);
    console.log('DEBUG: TileAtlas created', tileAtlas);
    shipSprites = createShipSprites(module.runtime, SHIP_SPECIAL_BLOCK_IDS);
    if (levelMap && tileAtlas) {
      renderer.setTileAtlas(tileAtlas);
      renderer.setShipSprites(shipSprites);
      renderer.buildLevel(levelMap, tileAtlas);
    }
    wasmStatus = 'WASM module ready.';
  })
  .catch((error) => {
    wasmStatus = `WASM unavailable: ${error.message}`;
    console.warn(error);
  });
