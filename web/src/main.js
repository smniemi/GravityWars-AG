import './style.css';
import { createTileAtlas, loadHighResTileAtlas, updateDynamicBlocks, initializeDestructibleBlocks } from './render/tileAtlas.js';
import { SoundManager } from './core/sound.js';
import { createShipSprites, loadHighResShipTextures } from './render/shipSprites.js';
import { WebGLRenderer } from './render/webgl/renderer.js';
import { drawHUD } from './ui/hud.js';
import { Joystick } from './ui/joystick.js';
import { Button } from './ui/button.js';
import { loadGravityWarsModule } from './core/wasmBridge.js';
import { createShipStateReader } from './core/shipState.js';
import { createGlobalStateReader } from './core/globalState.js';
import { createLevelMap } from './core/levelMap.js';
import { createBulletReader } from './core/bullets.js';
import { createActionReader } from './core/actions.js';
import { createKeyboardInput } from './core/input.js';
import { GameLoop } from './core/index.js';
import { StartScreen } from './ui/startScreen.js';
import { GameOverScreen } from './ui/gameOverScreen.js';
import { LevelIntroScreen } from './ui/levelIntroScreen.js';
import { GameCompleteScreen } from './ui/gameCompleteScreen.js';
import { LevelCompleteScreen } from './ui/levelComplete.js';
import { runSupabaseTest } from './core/supabaseTest.js';
import { trackGameStart, trackLevelStart } from './core/gameStats.js';
/**
 * Get the background image name for a given level number.
 */
function getBackgroundNameForLevel(levelNum) {
    const bgIndex = levelNum % 7;
    switch (bgIndex) {
        case 0: return 'back5_park_v2.jpg';
        case 1: return 'back_nebula_v2.jpg';
        case 2: return 'back_park_v2.jpg';
        case 3: return 'back2_park_v2.jpg';
        case 4: return 'back3_park_v2.jpg';
        case 5: return 'back4_park_v2.jpg';
        case 6: return 'back_park_v2.jpg';
        default: return 'space_v2.jpg';
    }
}
/**
 * Get the full background URL for a given level number.
 */
function getBackgroundUrlForLevel(levelNum) {
    const bgName = getBackgroundNameForLevel(levelNum);
    return `assets/backgrounds/${bgName}`;
}
const root = document.getElementById('app') ?? createRoot();
function createRoot() {
    const el = document.createElement('div');
    el.id = 'app';
    document.body.appendChild(el);
    return el;
}
// Debug log to verify version
console.log('[Main] App Version: 1.0.1 (Relative Paths Configured)');
// Temporary Supabase Connectivity Test
runSupabaseTest();
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
    }
    else {
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
let runtime = null;
let shipReader = null;
let lastShipState = null;
let globalsReader = null;
let lastGlobals = null;
let levelMap = null;
let tileAtlas = null;
let lastTiles = null;
let shipSprites = null;
let clearDynamicBlocks = null;
let advanceLevel = null;
let bulletReader = null;
let currentBullets = [];
let actionReader = null;
let actionStates = [];
let levelAdvancePending = false;
// Initialize input system asynchronously
let keyboard = null;
(async () => {
    keyboard = await createKeyboardInput(root, joystick, fireButton, thrustButton);
})();
const soundManager = new SoundManager();
soundManager.setSfxVolume(0.5); // Default to 50% for intro
// Initialize start screen
let startScreen = null;
let gameOverScreen = null;
let levelIntroScreen = null;
let gameCompleteScreen = null;
let levelCompleteScreen = null;
let gameStarted = false;
// Total number of levels in the game
const TOTAL_LEVELS = 13;
let levelIntroActive = false;
let previousNumKeys = -1; // Track previous key count to detect when portal activates
// Override controls to disable them until game starts
// Override controls to disable them until game starts
// Controls initially null until WASM loads
// Removed duplicate soundManager
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
// @ts-ignore
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
function drawDebugPanel(context, ship, globals, input, cheatMode) {
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
function createControls(runtime) {
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
function resolveZeroArgReturningIntFunction(runtime, name) {
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
function readWasmString(ptr, runtime) {
    const memory = runtime.runtime.HEAPU8;
    let end = ptr;
    while (memory[end] !== 0)
        end++;
    let str = new TextDecoder().decode(memory.subarray(ptr, end));
    return str.replace(/"/g, '');
}
async function playLevelIntro() {
    if (!runtime || !controls)
        return;
    if (!levelIntroScreen) {
        levelIntroScreen = new LevelIntroScreen(root);
    }
    levelIntroActive = true;
    gameStarted = true; // Ensure rendering happens
    // Preload the background for the current level BEFORE reloading level data
    // This prevents the old background from showing before the new one loads
    if (globalsReader) {
        const levelNum = globalsReader.read().levelnum;
        const bgUrl = getBackgroundUrlForLevel(levelNum);
        console.log(`[Main] Preloading background: ${bgUrl} for level ${levelNum}`);
        try {
            await renderer.setBackgroundImage(bgUrl);
        }
        catch (err) {
            console.warn(`[Main] Failed to preload background: ${bgUrl}`, err);
        }
        lastBgName = getBackgroundNameForLevel(levelNum);
    }
    reloadLevel();
    // Capture start score for PB calculation
    if (globalsReader) {
        levelStartScore = globalsReader.read().shipScore;
        // Track level start event
        const levelNum = globalsReader.read().levelnum;
        if (levelNum > 0) {
            trackLevelStart(levelNum);
        }
    }
    const getLevelNamePtr = getExport('get_current_level_name');
    const levelName = readWasmString(getLevelNamePtr(), runtime);
    levelIntroScreen.show(levelName, () => {
        levelIntroActive = false;
    });
}
function handleLevelTransition(force = false) {
    if (!advanceLevel || levelAdvancePending || !lastShipState || !lastGlobals) {
        return;
    }
    // Skip level transition handling during intro/attractor mode (level 0)
    // The intro demo should just loop - not trigger level complete screen
    if (lastGlobals.levelnum === 0 || !gameStarted) {
        return;
    }
    if (force || (lastShipState.state === SHIP_STATE.DISAPPEARING && lastShipState.animationPhase <= 0)) {
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
                });
            }
            gameCompleteScreen.show(lastGlobals.shipScore);
        }
        else {
            // Normal level transition
            // Show Level Complete Screen
            // Show Level Complete Screen
            // Fix for HMR stale instance: check if method exists
            if (!levelCompleteScreen || typeof levelCompleteScreen.setOnContinue !== 'function') {
                if (levelCompleteScreen) {
                    // Cleanup old instance if it exists but is stale
                    try {
                        levelCompleteScreen.hide?.();
                    }
                    catch { }
                    try {
                        levelCompleteScreen.element?.remove();
                    }
                    catch { }
                }
                levelCompleteScreen = new LevelCompleteScreen(root, () => { });
            }
            // We need to capture the current stats before they are reset by advanceLevel
            const bonusTime = lastGlobals.shipTime; // Assuming time is remaining
            const bonusFuel = lastGlobals.shipFuel;
            const bonusLives = lastGlobals.shipLife;
            const timeBonus = Math.floor(bonusTime * 5);
            const fuelBonus = Math.floor(bonusFuel * 2);
            const livesBonus = Math.floor(bonusLives * 1000);
            const totalBonus = timeBonus + fuelBonus + livesBonus;
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
                    console.log(`[LevelComplete] Added score: ${totalBonus} (Time: ${bonusTime.toFixed(1)}*5 + Fuel: ${bonusFuel}*2 + Lives: ${bonusLives}*1000). Level ${nextLevel} unlocked.`);
                    // Reset pending flag now that we've advanced
                    levelAdvancePending = false;
                }
            });
            const getLevelNamePtr = getExport('get_current_level_name');
            const levelName = readWasmString(getLevelNamePtr(), runtime);
            levelCompleteScreen.show({
                levelName: levelName,
                time: bonusTime,
                fuel: bonusFuel,
                lives: bonusLives,
                currentScore: lastGlobals.shipScore, // This is current score BEFORE bonus
                levelIndex: lastGlobals.levelnum,
                levelStartScore: levelStartScore
            });
        }
    }
    // NOTE: levelAdvancePending stays true while level complete screen is visible
    // It will be reset when onContinue is called (user clicks/taps)
}
let lastBgName = '';
let levelStartScore = 0;
let introDemoFrame = 0;
let introDemoNeedsRestart = false; // Flag to defer restart until before control() runs
let demoData = null;
let demoCount = 0;
let rotationHoldStart = 0; // Track when rotation key was first pressed
let previousShipStatus = 0;
let previousShipActive = 0;
let fuelClickCount = 0;
let lastFuelClickTime = 0;
const loop = new GameLoop(({ deltaMs }) => {
    if (levelMap && tileAtlas && !renderer.atlasTexture) {
        try {
            renderer.setTileAtlas(tileAtlas);
            renderer.buildLevel(levelMap, tileAtlas);
            console.log('[gravitywars] WebGL level built');
            applyHighResUpgrades(tileAtlas, null);
        }
        catch (error) {
            console.error('Failed to build level', error);
        }
    }
    if (!shipSprites && runtime?.runtime) {
        try {
            const sprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
            shipSprites = sprites;
            renderer.setShipSprites(sprites);
            joystick.setShipSprites(sprites);
            applyHighResUpgrades(null, sprites);
        }
        catch (error) {
            console.error('Failed to initialize ship sprites', error);
        }
    }
    renderer.clear();
    if (uiCtx) {
        uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    }
    if (runtime) {
        // Load demo data early, so it's available for fast-forward on the first frame
        if (!demoData && runtime?.runtime && controls && globalsReader?.read().levelnum === 0) {
            const ptr = controls.getDemoBufferPtr();
            demoCount = controls.getDemoCount();
            if (ptr && demoCount > 0) {
                const heap32 = runtime.runtime.HEAP32 || new Int32Array(runtime.runtime.HEAPU8.buffer);
                demoData = heap32.subarray(ptr >> 2, (ptr >> 2) + demoCount * 10);
                console.log(`[Main] Intro demo loaded early: ${demoCount} frames`);
            }
        }
        // Handle intro demo fast-forward at the START of the frame, before control() runs
        // This ensures the sequence is identical on initial load AND on restart
        const shouldFastForward = (
        // Restart case: flag was set when demo reached the end
        introDemoNeedsRestart ||
            // Initial case: we have demo data and haven't fast-forwarded yet
            (demoData && demoCount > 0 && introDemoFrame === 0 && globalsReader?.read().levelnum === 0));
        if (shouldFastForward && controls) {
            // On restart, we need to reset the level first
            if (introDemoNeedsRestart) {
                controls.restartLevel();
            }
            introDemoNeedsRestart = false;
            introDemoFrame = 0;
            // Now do the fast-forward immediately, before the normal control() runs
            if (demoData && demoCount > 0) {
                const SKIP_SECONDS = 13.7;
                const FPS = 60;
                const skipFrames = Math.floor(SKIP_SECONDS * FPS);
                for (let i = 0; i < skipFrames; i++) {
                    if (i >= demoCount)
                        break;
                    const off = i * 10;
                    controls.setThrust(demoData[off + 7]);
                    controls.setFire(demoData[off + 8]);
                    controls.setSA(demoData[off + 9]);
                    getExport('control')(); // Physics step
                }
                introDemoFrame = skipFrames;
            }
        }
        // Skip normal control()/animate() if we just did fast-forward
        // The fast-forward already includes all necessary physics steps
        if (!shouldFastForward) {
            getExport('control')();
            getExport('animate')();
        }
        else {
            // Just run animate() to update animations after fast-forward
            getExport('animate')();
        }
        // Update destructible blocks (copy from memory to atlas)
        // Update destructible blocks (copy from memory to atlas)
        if (tileAtlas && runtime?.runtime) {
            if (updateDynamicBlocks(tileAtlas, runtime.runtime)) {
                renderer.syncDynamicAtlas(tileAtlas);
            }
        }
        if (shipReader) {
            lastShipState = shipReader.read();
            // Check for crash (state 1), respawn (1->0 state), or ANY active transition (death/spawn)
            if ((lastShipState.state === 1 && previousShipStatus !== 1) ||
                (lastShipState.state === 0 && previousShipStatus === 1) ||
                (lastShipState.active !== previousShipActive)) {
                joystick.reset();
            }
            previousShipStatus = lastShipState.state;
            previousShipActive = lastShipState.active;
        }
        if (keyboard?.state.rotate && lastShipState && lastShipState.state === 0 && lastShipState.active === 1) {
            const ROT_SPEED = 0.008; // Adjust rotation speed
            joystick.rotate(keyboard.state.rotate * ROT_SPEED * deltaMs);
        }
        else if (joystick && !joystick.isTouching && joystick.active) {
            // If no key rotation and not touching, deactivate to stop highlighting/lerping
            joystick.active = false;
        }
        if (globalsReader) {
            lastGlobals = globalsReader.read();
            // Update background only when level changes or on initial load
            // Note: Background is preloaded in playLevelIntro(), so this is just a fallback
            const levelNum = lastGlobals.levelnum;
            const bgName = getBackgroundNameForLevel(levelNum);
            if (bgName !== lastBgName) {
                console.log(`[Main] Switching background to: ${bgName} for level ${levelNum}`);
                // Use the Promise-based API but don't await (fire-and-forget in game loop)
                renderer.setBackgroundImage(getBackgroundUrlForLevel(levelNum)).catch(err => {
                    console.warn(`[Main] Failed to set background image: ${bgName}`, err);
                });
                lastBgName = bgName;
            }
            if (lastGlobals.dynamicBlocksChanged) {
                if (runtime?.runtime) {
                    tileAtlas = createTileAtlas(runtime.runtime);
                    shipSprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
                    applyHighResUpgrades(tileAtlas, shipSprites);
                }
                if (levelMap && tileAtlas) {
                    renderer.setTileAtlas(tileAtlas);
                    renderer.setShipSprites(shipSprites);
                    joystick.setShipSprites(shipSprites);
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
            const thrustValue = 18;
            if (gameStarted && !levelIntroActive) {
                // Apply analog thrust if available (thrust is 0-1)
                controls.setThrust(thrust * thrustValue);
                controls.setFire(fire ? 1 : 0);
                if (keyboard.state.targetAngle !== undefined && lastGlobals) {
                    // Analog steering
                    const targetRad = -keyboard.state.targetAngle - Math.PI / 2;
                    const currentRad = ((lastGlobals.sa % 16384) / 16384) * Math.PI * 2;
                    let diff = targetRad - currentRad;
                    while (diff > Math.PI)
                        diff -= Math.PI * 2;
                    while (diff < -Math.PI)
                        diff += Math.PI * 2;
                    const adjustment = diff * 0.1;
                    const adjustmentUnits = (adjustment / (Math.PI * 2)) * 16384;
                    controls.adjustAngle(adjustmentUnits);
                }
                else if (rotate !== 0) {
                    // Dynamic rotation speed based on hold duration
                    const now = performance.now();
                    if (rotationHoldStart === 0) {
                        rotationHoldStart = now;
                    }
                    const holdDuration = now - rotationHoldStart;
                    // Speed tiers: tap (0-200ms) = 0.5x precision, long press (200ms+) = 2x fast
                    const speedMultiplier = holdDuration > 200 ? 2 : 0.5;
                    controls.adjustAngle(-rotate * ANGLE_ADJUST_SPEED * speedMultiplier);
                }
                else {
                    // Reset hold timer when rotation stops
                    rotationHoldStart = 0;
                }
            }
            else if (lastGlobals?.levelnum === 0) {
                // Intro screen / Attractor mode: play demo path
                // Note: Demo data loading is now done earlier in the frame (before fast-forward check)
                if (demoData && demoCount > 0) {
                    // Fast-forward is now handled at the start of the frame (before control())
                    // Here we just handle normal demo playback
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
                        // Set flag to restart at the beginning of next frame
                        // This ensures restart + fast-forward happens BEFORE control() runs
                        introDemoNeedsRestart = true;
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
                // Handle force level complete (press 'c')
                if (keyboard.state.triggerComplete) {
                    keyboard.state.triggerComplete = false;
                    console.log('[Main] Keyboard shortcut (C) detected! Triggering level complete...');
                    handleLevelTransition(true);
                }
            }
        }
        if (gameStarted && lastGlobals && lastGlobals.gameOver) {
            if (!gameOverScreen) {
                gameOverScreen = new GameOverScreen(root, 
                // Replay
                // Replay
                () => {
                    if (controls && globalsReader) {
                        const targetLevel = globalsReader.read().levelnum;
                        // Reset game state to restore lives (sets level to 1, score to 0)
                        getExport('main_init')();
                        // Navigate back to the level we were on
                        let current = globalsReader.read().levelnum;
                        let attempts = 0;
                        while (current !== targetLevel && attempts < 100) {
                            if (current < targetLevel) {
                                controls.nextLevel();
                            }
                            else {
                                controls.prevLevel();
                            }
                            current = globalsReader.read().levelnum;
                            attempts++;
                        }
                        // Reset level start score since this is effectively a new game
                        levelStartScore = 0;
                        controls.restartLevel();
                        reloadLevel();
                    }
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
                });
            }
            if (gameOverScreen && lastGlobals) {
                const getLevelNamePtr = getExport('get_current_level_name');
                // @ts-ignore
                const readString = (ptr) => {
                    // @ts-ignore
                    const memory = runtime.runtime.HEAPU8;
                    let end = ptr;
                    while (memory[end] !== 0)
                        end++;
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
    if (levelMap) {
        const isIntroLevel = lastGlobals?.levelnum === 0;
        renderer.drawWorld(levelMap, lastGlobals, lastShipState, SHIP_BLOCK_MAP, isIntroLevel);
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
            if (lastGlobals) {
                // Calculate ship angle in radians (CCW from UP)
                const shipAngle = ((lastGlobals.sa % 16384) / 16384) * Math.PI * 2;
                joystick.setShipDisplayAngle(shipAngle);
            }
            joystick.render(uiCtx);
            fireButton.render(uiCtx);
            thrustButton.render(uiCtx);
        }
        // Debug displays - toggleable with "0" key
        const showDebug = keyboard?.state.toggleDebug ?? false;
        if (showDebug) {
            if (lastShipState) {
                const isCheatOn = controls ? controls.getCheatMode() : 0;
                drawDebugPanel(uiCtx, lastShipState, lastGlobals, keyboard?.state ?? { thrust: 0, fire: false, rotate: 0, nextLevel: false, prevLevel: false, toggleDebug: false, toggleCheat: false, triggerComplete: false }, !!isCheatOn);
            }
            uiCtx.fillStyle = '#0ff';
            uiCtx.font = '16px monospace';
            uiCtx.fillText(`GravityWars WebGL - Δ=${deltaMs.toFixed(2)}ms`, 20, 30);
            uiCtx.fillStyle = '#0f9';
            uiCtx.fillText(wasmStatus, 20, 60);
        }
    }
});
function applyHighResUpgrades(atlas, sprites) {
    if (atlas) {
        const targetAtlas = atlas;
        loadHighResTileAtlas(targetAtlas).then(() => {
            if (targetAtlas === tileAtlas && levelMap) {
                renderer.setTileAtlas(targetAtlas);
                renderer.buildLevel(levelMap, targetAtlas);
            }
        }).catch(() => { });
    }
    if (sprites) {
        const targetSprites = sprites;
        loadHighResShipTextures(targetSprites).then(() => {
            if (targetSprites === shipSprites) {
                renderer.setShipSprites(targetSprites);
                joystick.setShipSprites(targetSprites);
            }
        }).catch(() => { });
    }
}
function reloadLevel() {
    if (runtime?.runtime) {
        const currentLevel = globalsReader?.read().levelnum ?? 0;
        levelMap = createLevelMap(runtime.runtime, currentLevel);
        // Ensure destructible blocks exist in memory
        initializeDestructibleBlocks(runtime.runtime);
        tileAtlas = createTileAtlas(runtime.runtime);
        shipSprites = createShipSprites(runtime.runtime, SHIP_SPECIAL_BLOCK_IDS);
        if (levelMap && tileAtlas) {
            renderer.setTileAtlas(tileAtlas);
            renderer.setShipSprites(shipSprites);
            joystick.setShipSprites(shipSprites);
            joystick.reset();
            renderer.buildLevel(levelMap, tileAtlas);
            // Apply upgrades
            applyHighResUpgrades(tileAtlas, shipSprites);
        }
    }
    currentBullets = [];
    previousNumKeys = -1; // Reset key tracking for new level
}
loop.start();
loadGravityWarsModule()
    .then((module) => {
    runtime = module;
    initializeDestructibleBlocks(module.runtime);
    shipReader = createShipStateReader(module.runtime);
    globalsReader = createGlobalStateReader(module.runtime);
    levelMap = createLevelMap(module.runtime, 0); // Starting at level 0 (intro)
    controls = createControls(module.runtime);
    clearDynamicBlocks = resolveZeroArgFunction(module.runtime, 'wasm_clear_dynamic_blocks');
    advanceLevel = resolveZeroArgFunction(module.runtime, 'wasm_advance_level');
    bulletReader = createBulletReader(module.runtime);
    actionReader = createActionReader(module.runtime);
    getExport('init_gw')();
    getExport('main_init')();
    // Initialize blocks after main_init to ensure they aren't cleared
    initializeDestructibleBlocks(module.runtime);
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
            // Track game start event
            trackGameStart();
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
                }
                else {
                    controls?.prevLevel();
                }
                currentLevel = globalsReader?.read().levelnum ?? 0;
                attempts++;
            }
            console.log(`[Main] Level navigation complete after ${attempts} iterations. Current Level: ${currentLevel}`);
            playLevelIntro();
            // Ensure music for new level starts
            soundManager.update(globalsReader.read(), [], levelMap);
        });
        startScreen.show();
    }
    tileAtlas = createTileAtlas(module.runtime);
    console.log('DEBUG: TileAtlas created', tileAtlas);
    shipSprites = createShipSprites(module.runtime, SHIP_SPECIAL_BLOCK_IDS);
    if (levelMap && tileAtlas) {
        renderer.setTileAtlas(tileAtlas);
        renderer.setShipSprites(shipSprites);
        joystick.setShipSprites(shipSprites);
        renderer.buildLevel(levelMap, tileAtlas);
    }
    wasmStatus = 'WASM module ready.';
    // Debug Shortcut: Force level complete by clicking fuel area 3 times rapidly
    const handleFuelClick = (clientX, clientY) => {
        if (!gameStarted || lastGlobals?.levelnum === 0 || levelAdvancePending)
            return;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        // HUD Fuel is in top-right. In CSS pixels, x > width - 250, y < 80 is a safe bet.
        const width = canvas.clientWidth;
        if (x > width - 250 && y < 80) {
            const now = performance.now();
            if (now - lastFuelClickTime > 1000) {
                fuelClickCount = 1;
            }
            else {
                fuelClickCount++;
            }
            lastFuelClickTime = now;
            if (fuelClickCount >= 3) {
                console.log('[Cheat] Rapid fuel clicks detected! Triggering level complete...');
                fuelClickCount = 0;
                handleLevelTransition(true);
            }
        }
    };
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0)
            handleFuelClick(e.clientX, e.clientY);
    });
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            handleFuelClick(e.touches[0].clientX, e.touches[0].clientY);
        }
    });
})
    .catch((error) => {
    wasmStatus = `WASM unavailable: ${error.message}`;
    console.warn(error);
});
