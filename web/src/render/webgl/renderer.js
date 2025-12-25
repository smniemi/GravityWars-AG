import { createWebGLContext, resizeCanvasToDisplaySize } from './glContext.js';
import { SpriteBatch } from './spriteBatch.js';
import { TilemapRenderer } from './tilemapRenderer.js';
import { isOverlayObject } from '../overlayObjects.js';
import { Texture } from './texture.js';
import { SHIP_SPRITE_SIZE } from '../shipSprites.js';
export class WebGLRenderer {
    canvas;
    gl;
    spriteBatch;
    backgroundRenderer;
    foregroundRenderer;
    atlasTexture = null;
    shipTextures = null;
    viewport = { cameraX: 0, cameraY: 0, zoom: 4.0 };
    // Shockwave state
    shockwaveActive = false;
    shockwaveStartTime = 0;
    shockwaveCenter = { x: 0, y: 0 };
    lastShipState = 0;
    lastSx = 0;
    lastSy = 0;
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = createWebGLContext(canvas);
        this.spriteBatch = new SpriteBatch(this.gl);
        this.backgroundRenderer = new TilemapRenderer(this.gl);
        this.foregroundRenderer = new TilemapRenderer(this.gl);
        // Enable blending
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
    clear() {
        this.gl.clearColor(0.02, 0.024, 0.04, 1.0); // #05060a
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    resize() {
        if (resizeCanvasToDisplaySize(this.canvas)) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    setTileAtlas(atlas) {
        if (this.atlasTexture) {
            this.atlasTexture.dispose();
        }
        this.atlasTexture = new Texture(this.gl);
        this.atlasTexture.setImage(atlas.canvas);
    }
    currentBackgroundUrl = null;
    setBackgroundImage(url) {
        if (this.currentBackgroundUrl === url)
            return;
        this.currentBackgroundUrl = url;
        const img = new Image();
        img.src = url;
        img.onload = () => {
            if (this.currentBackgroundUrl === url) {
                if (this.backgroundTexture) {
                    this.backgroundTexture.dispose();
                }
                this.backgroundTexture = new Texture(this.gl);
                this.backgroundTexture.setImage(img);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture.texture);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
            }
        };
    }
    backgroundTexture = null;
    drawBackground() {
        if (!this.backgroundTexture)
            return;
        // Parallax factor: 0.5 means background moves at half speed
        const parallaxX = this.viewport.cameraX * 0.5;
        const parallaxY = this.viewport.cameraY * 0.5;
        const viewWidth = this.canvas.width / this.viewport.zoom;
        const viewHeight = this.canvas.height / this.viewport.zoom;
        this.spriteBatch.begin(this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
        const bgWidth = 1024; // Approx size of back1385.JPG
        const bgHeight = 1024;
        const u0 = parallaxX / bgWidth;
        const v0 = parallaxY / bgHeight;
        const u1 = u0 + viewWidth / bgWidth;
        const v1 = v0 + viewHeight / bgHeight;
        this.spriteBatch.draw(this.backgroundTexture, this.viewport.cameraX, this.viewport.cameraY, viewWidth, viewHeight, u0, v0, u1, v1);
        this.spriteBatch.flush();
    }
    setShipSprites(sprites) {
        this.shipTextures = {
            thrust: sprites.thrust.map(img => {
                const tex = new Texture(this.gl);
                tex.setImage(img);
                return tex;
            }),
            noThrust: sprites.noThrust.map(img => {
                const tex = new Texture(this.gl);
                tex.setImage(img);
                return tex;
            }),
            specials: {}
        };
        for (const [id, img] of Object.entries(sprites.specials)) {
            const tex = new Texture(this.gl);
            tex.setImage(img);
            this.shipTextures.specials[Number(id)] = tex;
        }
    }
    buildLevel(map, atlas) {
        this.backgroundRenderer.build(map, atlas, (i) => !isOverlayObject(map.objects[i]));
        this.foregroundRenderer.build(map, atlas, (i) => isOverlayObject(map.objects[i]));
    }
    updateLevel(map, atlas) {
        this.buildLevel(map, atlas);
    }
    // Consolidated drawing to ensure correct Z-order:
    // 1. Background Image (Parallax)
    // 2. Wall Shadows
    // 3. Ship Shadow
    // 4. Walls
    // 5. Ship (handled by caller currently, but can be moved later if needed, though Shadow is distinct)
    // Actually, caller handles Main Ship. We handle Ship Shadow here.
    drawWorld(map, globals, shipState, shipBlockMap) {
        if (!this.atlasTexture)
            return;
        // Ensure state is correct
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.disable(this.gl.DEPTH_TEST); // 2D game, usually painter's algo
        // 1. Setup Camera
        if (globals) {
            const minZoom = this.calculateOptimalZoom(map.width, map.height);
            const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
            const baseZoom = isMobile ? 2.0 : 4.0;
            this.viewport.zoom = Math.max(baseZoom, minZoom);
            this.clampCamera(map.width, map.height, globals.sx, globals.sy);
            if (globals.shipState === 2 && this.lastShipState !== 2) {
                this.shockwaveActive = true;
                this.shockwaveStartTime = performance.now() / 1000;
                const dx = globals.sx - this.lastSx;
                const dy = globals.sy - this.lastSy;
                const len = Math.sqrt(dx * dx + dy * dy);
                let offsetX = 0;
                let offsetY = 0;
                if (len > 0) {
                    offsetX = (dx / len) * 16;
                    offsetY = (dy / len) * 16;
                }
                this.shockwaveCenter = {
                    x: (globals.sx + 16) + offsetX,
                    y: (globals.sy + 16) + offsetY
                };
            }
            else if (globals.shipState === 3 && this.shockwaveActive) {
                // Force stop shockwave on respawn
                this.shockwaveActive = false;
                this.backgroundRenderer.setShockwave({ x: 0, y: 0 }, 0);
                this.foregroundRenderer.setShockwave({ x: 0, y: 0 }, 0);
            }
            this.lastShipState = globals.shipState;
            this.lastSx = globals.sx;
            this.lastSy = globals.sy;
        }
        if (this.shockwaveActive) {
            const time = (performance.now() / 1000) - this.shockwaveStartTime;
            if (time > 2.0) {
                this.shockwaveActive = false;
                this.backgroundRenderer.setShockwave({ x: 0, y: 0 }, 0);
                this.foregroundRenderer.setShockwave({ x: 0, y: 0 }, 0);
            }
            else {
                this.backgroundRenderer.setShockwave(this.shockwaveCenter, time);
                this.foregroundRenderer.setShockwave(this.shockwaveCenter, time);
            }
        }
        // 2. Clear
        this.gl.clearColor(0.02, 0.024, 0.04, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        // 3. Draw Background (Parallax)
        this.drawBackground();
        // 4. Calculate Shadow Vector
        const TILE_SIZE = 32;
        const mapCenterX = (map.width * TILE_SIZE) / 2;
        const mapCenterY = (map.height * TILE_SIZE) / 2;
        const camCenterX = this.viewport.cameraX + (this.canvas.width / this.viewport.zoom) / 2;
        const camCenterY = this.viewport.cameraY + (this.canvas.height / this.viewport.zoom) / 2;
        const vecX = camCenterX - mapCenterX;
        const vecY = camCenterY - mapCenterY;
        const shadowScale = 0.015;
        const shadowX = vecX * shadowScale;
        const shadowY = vecY * shadowScale;
        const shadowAlpha = 0.5;
        // 5. Draw Wall Shadows
        const time = performance.now() / 1000.0;
        this.backgroundRenderer.setColor(0, 0, 0, shadowAlpha);
        this.backgroundRenderer.draw(this.atlasTexture, this.viewport.cameraX - shadowX, this.viewport.cameraY - shadowY, this.viewport.zoom, time);
        // 6. Draw Ship Shadow (Below Walls, Above Background)
        if (globals && shipState && shipBlockMap && shipState.state !== 2) {
            // Note: Wall shadows shift LAYERS by -shadowX (Shift Left).
            // This creates a shadow to the RIGHT of the object (Outwards).
            // For the ship, we draw the sprite at (ShipX + Offset).
            // To match "Right" shadow, Offset must be Positive.
            // Using same vecX * scale gives positive if cam is right.
            const shipShadowOffX = shadowX;
            const shipShadowOffY = shadowY;
            this.drawShip(globals, shipState, shipBlockMap, shipShadowOffX, shipShadowOffY, [0, 0, 0, shadowAlpha]);
        }
        // 7. Draw Walls
        this.backgroundRenderer.setColor(1, 1, 1, 1);
        this.backgroundRenderer.draw(this.atlasTexture, this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom, time);
    }
    // Deprecated / Internal helper
    drawWorldBackground(map) {
        // Redirect to drawWorld with no ship if called directly
        this.drawWorld(map, null);
    }
    drawWorldForeground() {
        if (!this.atlasTexture)
            return;
        // Draw World (Foreground/Overlay)
        this.foregroundRenderer.draw(this.atlasTexture, this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom, performance.now() / 1000.0);
    }
    calculateOptimalZoom(mapWidth, mapHeight) {
        const TILE_SIZE = 32;
        const worldWidth = mapWidth * TILE_SIZE;
        const worldHeight = mapHeight * TILE_SIZE;
        // We want to ensure the viewport is always within the playing field.
        // This means we must zoom in enough so that the viewport width <= worldWidth
        // AND viewport height <= worldHeight.
        // zoom >= canvas.width / worldWidth
        // zoom >= canvas.height / worldHeight
        const widthRatio = this.canvas.width / worldWidth;
        const heightRatio = this.canvas.height / worldHeight;
        // Return the max of the two ratios to ensure we cover the canvas
        // (or rather, ensure the viewport fits INSIDE the world)
        return Math.max(widthRatio, heightRatio);
    }
    clampCamera(mapWidth, mapHeight, shipX, shipY) {
        const TILE_SIZE = 32;
        const viewW = this.canvas.width / this.viewport.zoom;
        const viewH = this.canvas.height / this.viewport.zoom;
        const worldWidth = mapWidth * TILE_SIZE;
        const worldHeight = mapHeight * TILE_SIZE;
        // Calculate desired camera position (centered on ship)
        let cameraX = shipX - viewW / 2;
        let cameraY = shipY - viewH / 2;
        // Strict bounds - clamp camera so viewport stays completely within level
        cameraX = Math.max(0, Math.min(cameraX, worldWidth - viewW));
        cameraY = Math.max(0, Math.min(cameraY, worldHeight - viewH));
        // If viewport is larger than world, center it
        if (viewW >= worldWidth) {
            cameraX = (worldWidth - viewW) / 2;
        }
        if (viewH >= worldHeight) {
            cameraY = (worldHeight - viewH) / 2;
        }
        this.viewport.cameraX = cameraX;
        this.viewport.cameraY = cameraY;
    }
    drawShip(globals, ship, shipBlockMap, offsetX = 0, offsetY = 0, color = [1, 1, 1, 1]) {
        this.spriteBatch.begin(this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
        const image = ship.image ?? 0;
        const x = globals.sx + offsetX;
        const y = globals.sy + offsetY;
        // 1. Standard Ship (Thrust/No Thrust)
        if (image === 0 || image === 1) { // NO_THRUST or THRUST
            if (this.shipTextures) {
                const orientation = ((globals.sa ?? 0) >>> 9) & 31;
                const variant = image === 1 ? this.shipTextures.thrust : this.shipTextures.noThrust;
                const tex = variant[orientation];
                if (tex) {
                    this.spriteBatch.draw(tex, x, y, SHIP_SPRITE_SIZE, SHIP_SPRITE_SIZE, 0, 0, 1, 1, color);
                }
            }
        }
        // 2. Special blocks (Explosions/Appear)
        else {
            const blockId = shipBlockMap[image];
            if (blockId !== undefined && this.shipTextures) {
                const specialTex = this.shipTextures.specials[blockId];
                if (specialTex) {
                    this.spriteBatch.draw(specialTex, x, y, SHIP_SPRITE_SIZE, SHIP_SPRITE_SIZE, 0, 0, 1, 1, color);
                }
            }
        }
        this.spriteBatch.flush();
    }
    drawBullets(bullets) {
        if (!this.bulletTexture) {
            this.bulletTexture = new Texture(this.gl);
            // Create a 16x16 radial gradient texture
            const size = 16;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.4, 'rgba(200, 240, 255, 0.8)');
            grad.addColorStop(1, 'rgba(0, 100, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, size, size);
            this.bulletTexture.setImage(canvas);
        }
        if (this.bulletTexture) {
            // Bullet size in world units (pixels)
            // Tiles are 32x32. Bullets should be visible.
            const worldSize = 6.0;
            this.spriteBatch.begin(this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
            for (const bullet of bullets) {
                this.spriteBatch.draw(this.bulletTexture, bullet.x - worldSize / 2, bullet.y - worldSize / 2, worldSize, worldSize, 0, 0, 1, 1, [1, 1, 1, 1]);
            }
            this.spriteBatch.flush();
        }
    }
    drawActions(actions, atlas) {
        if (!this.atlasTexture)
            return;
        this.spriteBatch.begin(this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
        for (const action of actions) {
            if (!action.active)
                continue;
            // Map action frames to atlas blocks
            // SPARK: 48-51
            // SPLASH: 113-117
            // We can use the 'frame' property directly if it maps to block IDs?
            // The 'frame' in ActionState seems to be an animation counter, not a block ID.
            // However, looking at GamePlay.m, it seems 'frame' might be the block ID for some actions?
            // Let's assume 'frame' in ActionState IS the block ID to render.
            // If not, we need a mapping.
            // Based on `actions.ts`, frame is read from the struct.
            // Let's try using action.frame as the block ID directly first.
            // If it's 0-based index into the atlas.
            const blockId = action.frame;
            // Hotfix: WASM module has off-by-one error in animation ranges, 
            // causing it to show the first frame of the *next* block sequence.
            // Since we can't recompile WASM (missing emcc), we hide the bad frames here.
            // Spark: 48-51 (51 is bad)
            // Splash: 113-117 (117 is bad)
            if (blockId === 51 || blockId === 117) {
                continue;
            }
            const pos = atlas.positions[blockId];
            if (pos) {
                const atlasWidth = atlas.canvas.width;
                const atlasHeight = atlas.canvas.height;
                const u0 = pos.sx / atlasWidth;
                const v0 = pos.sy / atlasHeight;
                const u1 = (pos.sx + 32) / atlasWidth;
                const v1 = (pos.sy + 32) / atlasHeight;
                // Actions are usually 32x32
                const TILE_SIZE = 32;
                const HALF_SIZE = TILE_SIZE / 2;
                this.spriteBatch.draw(this.atlasTexture, action.x - HALF_SIZE, action.y - HALF_SIZE, TILE_SIZE, TILE_SIZE, u0, v0, u1, v1, [1, 1, 1, 1]);
            }
        }
        this.spriteBatch.flush();
    }
    bulletTexture = null;
}
