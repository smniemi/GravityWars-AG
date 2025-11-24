import { GameLoop } from './core/index.js';
import { createKeyboardInput } from './core/input.js';
import { createShipStateReader } from './core/shipState.js';
import { createGlobalStateReader } from './core/globalState.js';
import { createLevelMap } from './core/levelMap.js';
import { createBulletReader } from './core/bullets.js';
import { createActionReader } from './core/actions.js';
import { loadGravityWarsModule } from './core/wasmBridge.js';
import { sendDebugSnapshot } from './debugger.js';
import { createTileAtlas } from './render/tileAtlas.js';
import { SoundManager } from './core/sound.js';
import { createShipSprites } from './render/shipSprites.js';
import { WebGLRenderer } from './render/webgl/renderer.js';
const root = document.getElementById('app') ?? createRoot();
function createRoot() {
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
const renderer = new WebGLRenderer(canvas);
// const ctx = canvas.getContext('2d'); // Keep for debug panel overlay if we want, or move debug to HTML?
// Actually, let's keep a 2D context for the debug panel on a separate canvas or just overlay?
// The current implementation draws debug panel on the SAME canvas. WebGL and 2D cannot share a canvas.
// We need a separate canvas for the debug UI.
const uiCanvas = document.createElement('canvas');
uiCanvas.style.position = 'absolute';
uiCanvas.style.top = '0';
uiCanvas.style.left = '0';
uiCanvas.style.width = '100%';
uiCanvas.style.height = '100%';
uiCanvas.style.pointerEvents = 'none'; // Let clicks pass through
root.appendChild(uiCanvas);
const uiCtx = uiCanvas.getContext('2d');
function resize() {
    renderer.resize();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (uiCanvas.width !== width || uiCanvas.height !== height) {
        uiCanvas.width = width;
        uiCanvas.height = height;
    }
}
window.addEventListener('resize', resize);
resize();
let wasmStatus = 'WASM pending build…';
let runtime = null;
let shipReader = null;
let lastShipState = null;
let globalsReader = null;
let lastGlobals = null;
let levelMap = null;
let tileAtlas = null;
// let levelCanvas: HTMLCanvasElement | null = null; // Removed
let lastTiles = null;
let shipSprites = null;
let clearDynamicBlocks = null;
let advanceLevel = null;
let bulletReader = null;
let currentBullets = [];
let actionReader = null;
let actionStates = [];
let levelAdvancePending = false;
const keyboard = createKeyboardInput();
const soundManager = new SoundManager();
let controls = null;
const cachedExports = {};
const OBJECT_COLORS = {
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
const TILE_PALETTE = {};
const ANGLE_ADJUST_SPEED = 128; // 2x faster rotation
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
};
const SHIP_BLOCK_MAP = {
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
const SHIP_SPECIAL_BLOCK_IDS = Array.from(new Set(Object.values(SHIP_BLOCK_MAP).filter((value) => typeof value === 'number')));
const SHIP_STATE = {
    LANDED: 0,
    FLYING: 1,
    EXPLODING: 2,
    APPEARING: 3,
    DISAPPEARING: 4
};
// Action frame ranges:
// SPARK (bullet explosion): frames 48-51 (4 frames)
// SPLASH (water): frames 113-117 (5 frames)
// Note: These are handled by renderer.drawActions now.
function getExport(name) {
    if (!runtime) {
        throw new Error('WASM runtime not ready');
    }
    if (cachedExports[name]) {
        return cachedExports[name];
    }
    const module = runtime.runtime;
    const variants = [name, `_${name}`];
    for (const variant of variants) {
        const fn = module[variant];
        if (typeof fn === 'function') {
            cachedExports[name] = fn.bind(module);
            return cachedExports[name];
        }
    }
    if (typeof module.cwrap === 'function') {
        const wrapped = module.cwrap(name, 'void', []);
        cachedExports[name] = wrapped;
        return wrapped;
    }
    throw new Error(`Export ${name} not found on wasm runtime.`);
}
// drawShipSprite, drawBullets, drawActionEffects removed - moved to WebGLRenderer
function drawShipFallback(context, ship) {
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
function drawMiniMap(context, map, globals) {
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
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function getTileColor(id) {
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
function hslToHex(h, s, l) {
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
    }
    else if (h < 120) {
        r = x;
        g = c;
    }
    else if (h < 180) {
        g = c;
        b = x;
    }
    else if (h < 240) {
        g = x;
        b = c;
    }
    else if (h < 300) {
        r = x;
        b = c;
    }
    else {
        r = c;
        b = x;
    }
    const to255 = (n) => Math.round((n + m) * 255);
    const hex = (n) => n.toString(16).padStart(2, '0');
    return `#${hex(to255(r))}${hex(to255(g))}${hex(to255(b))}`;
}
function drawDebugPanel(context, ship, globals, input) {
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
function createControls(runtime) {
    return {
        setThrust: resolveVoidFunction(runtime, 'wasm_set_thrust'),
        setFire: resolveVoidFunction(runtime, 'wasm_set_fire'),
        adjustAngle: resolveVoidFunction(runtime, 'wasm_adjust_sa'),
        nextLevel: resolveZeroArgFunction(runtime, 'wasm_next_level'),
        prevLevel: resolveZeroArgFunction(runtime, 'wasm_prev_level')
    };
}
function resolveVoidFunction(runtime, name) {
    const module = runtime;
    const candidates = [name, `_${name}`];
    for (const candidate of candidates) {
        const fn = module[candidate];
        if (typeof fn === 'function') {
            return (value) => fn.call(module, value);
        }
    }
    if (runtime.cwrap) {
        const wrapped = runtime.cwrap(name, 'void', ['number']);
        return (value) => wrapped(value);
    }
    throw new Error(`Unable to resolve wasm export ${name}`);
}
function resolveZeroArgFunction(runtime, name) {
    const module = runtime;
    const candidates = [name, `_${name}`];
    for (const candidate of candidates) {
        const fn = module[candidate];
        if (typeof fn === 'function') {
            return fn.bind(module);
        }
    }
    if (runtime.cwrap) {
        return runtime.cwrap(name, 'void', []);
    }
    throw new Error(`Unable to resolve wasm export ${name}`);
}
function handleLevelTransition() {
    if (!advanceLevel || levelAdvancePending || !lastShipState) {
        return;
    }
    if (lastShipState.state === SHIP_STATE.DISAPPEARING && lastShipState.animationPhase <= 0) {
        levelAdvancePending = true;
        advanceLevel();
        if (runtime?.runtime) {
            levelMap = createLevelMap(runtime.runtime);
            tileAtlas = createTileAtlas(runtime.runtime);
            shipSprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
            if (levelMap && tileAtlas) {
                renderer.buildLevel(levelMap, tileAtlas);
            }
        }
        currentBullets = [];
        levelAdvancePending = false;
        lastTiles = null;
    }
}
const loop = new GameLoop(({ deltaMs }) => {
    if (levelMap && tileAtlas && !renderer.atlasTexture) {
        try {
            renderer.setTileAtlas(tileAtlas);
            renderer.buildLevel(levelMap, tileAtlas);
            console.log('[gravitywars] WebGL level built');
        }
        catch (error) {
            console.error('Failed to build level', error);
        }
    }
    if (!shipSprites && runtime?.runtime) {
        try {
            shipSprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
            renderer.setShipSprites(shipSprites);
        }
        catch (error) {
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
            // Update background based on level
            const levelNum = lastGlobals.levelnum;
            const bgIndex = levelNum % 7;
            let bgName = 'space.jpg'; // Default/Fallback
            switch (bgIndex) {
                case 0:
                    bgName = 'back5_park.JPG';
                    break;
                case 1:
                    bgName = 'back_nebula.jpg';
                    break;
                case 2:
                    bgName = 'back_park.JPG';
                    break;
                case 3:
                    bgName = 'back2_park.JPG';
                    break;
                case 4:
                    bgName = 'back3_park.JPG';
                    break;
                case 5:
                    bgName = 'back4_park.JPG';
                    break;
                case 6:
                    bgName = 'back_park.JPG';
                    break;
            }
            renderer.setBackgroundImage(`/assets/backgrounds/${bgName}`);
            if (lastGlobals.dynamicBlocksChanged) {
                if (runtime?.runtime) {
                    tileAtlas = createTileAtlas(runtime.runtime);
                    shipSprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
                }
                if (levelMap && tileAtlas) {
                    renderer.setTileAtlas(tileAtlas);
                    renderer.setShipSprites(shipSprites);
                    renderer.buildLevel(levelMap, tileAtlas);
                }
                clearDynamicBlocks?.();
            }
            soundManager.update(lastGlobals, actionStates, levelMap);
        }
        if (bulletReader) {
            currentBullets = bulletReader.read().filter((bullet) => bullet.active);
        }
        if (actionReader) {
            actionStates = actionReader.read();
        }
        if (controls) {
            const { thrust, fire, rotate, nextLevel, prevLevel } = keyboard.state;
            controls.setThrust(thrust ? 32 : 0);
            controls.setFire(fire ? 1 : 0);
            if (rotate !== 0) {
                controls.adjustAngle(-rotate * ANGLE_ADJUST_SPEED);
            }
            // Handle level changes
            if (nextLevel) {
                controls.nextLevel();
                keyboard.state.nextLevel = false;
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
            }
            if (prevLevel) {
                controls.prevLevel();
                keyboard.state.prevLevel = false;
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
            }
        }
        handleLevelTransition();
        // Check for tile updates (animations)
        if (levelMap && tileAtlas) {
            if (!lastTiles || lastTiles.length !== levelMap.tiles.length) {
                lastTiles = new Uint8Array(levelMap.tiles);
            }
            else {
                const dirtyIndices = [];
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
    }
    if (levelMap) {
        renderer.drawWorld(levelMap, lastGlobals);
    }
    if (lastGlobals && lastShipState) {
        // Shadow
        if (lastShipState.state !== 2) { // Not exploding
            renderer.drawShip(lastGlobals, lastShipState, SHIP_BLOCK_MAP, -4, 4, [0, 0, 0, 0.5]);
        }
        // Main ship
        renderer.drawShip(lastGlobals, lastShipState, SHIP_BLOCK_MAP);
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
        if (levelMap) {
            drawMiniMap(uiCtx, levelMap, lastGlobals);
        }
        if (lastShipState) {
            drawDebugPanel(uiCtx, lastShipState, lastGlobals, keyboard.state);
        }
        uiCtx.fillStyle = '#0ff';
        uiCtx.font = '16px monospace';
        uiCtx.fillText(`GravityWars WebGL - Δ=${deltaMs.toFixed(2)}ms`, 20, 30);
        uiCtx.fillStyle = '#0f9';
        uiCtx.fillText(wasmStatus, 20, 60);
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
    clearDynamicBlocks = resolveZeroArgFunction(module.runtime, 'wasm_clear_dynamic_blocks');
    advanceLevel = resolveZeroArgFunction(module.runtime, 'wasm_advance_level');
    bulletReader = createBulletReader(module.runtime);
    actionReader = createActionReader(module.runtime);
    getExport('init_gw')();
    getExport('main_init')();
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
