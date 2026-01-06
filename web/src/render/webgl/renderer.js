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
    dynamicBackgroundRenderer;
    foregroundRenderer;
    atlasTexture = null;
    dynamicAtlasTexture = null;
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
        this.dynamicBackgroundRenderer = new TilemapRenderer(this.gl);
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
        // 1. Static Atlas (High-Res or Low-Res Base)
        if (this.atlasTexture && this.atlasTexture.lastSource === atlas.canvas) {
            this.atlasTexture.isHighRes = atlas.isHighRes;
        }
        else {
            if (this.atlasTexture) {
                this.atlasTexture.dispose();
            }
            this.atlasTexture = new Texture(this.gl);
            this.atlasTexture.setImage(atlas.canvas);
            this.atlasTexture.lastSource = atlas.canvas;
            this.atlasTexture.isHighRes = atlas.isHighRes;
        }
        // 2. Dynamic Atlas (Low-Res subset)
        if (atlas.lowRes) {
            const lowCanvas = atlas.lowRes.canvas;
            if (this.dynamicAtlasTexture && this.dynamicAtlasTexture.lastSource === lowCanvas) {
                // Already set
            }
            else {
                if (this.dynamicAtlasTexture)
                    this.dynamicAtlasTexture.dispose();
                this.dynamicAtlasTexture = new Texture(this.gl);
                this.dynamicAtlasTexture.setImage(lowCanvas);
                this.dynamicAtlasTexture.lastSource = lowCanvas;
            }
        }
    }
    /**
     * Updates the dynamic atlas texture from the low-res canvas.
     * Call this when updateDynamicBlocks returns true.
     */
    syncDynamicAtlas(atlas) {
        if (this.dynamicAtlasTexture && atlas.lowRes) {
            this.dynamicAtlasTexture.setImage(atlas.lowRes.canvas);
        }
    }
    // Keeping legacy method for compatibility/completeness, though mostly unused now
    syncTileAtlas(atlas) {
        if (this.atlasTexture && this.atlasTexture.lastSource === atlas.canvas) {
            this.atlasTexture.setImage(atlas.canvas);
        }
    }
    currentBackgroundUrl = null;
    static backgroundCache = new Map();
    static preloadBackgroundImage(url) {
        if (WebGLRenderer.backgroundCache.has(url)) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                WebGLRenderer.backgroundCache.set(url, img);
                resolve();
            };
            img.onerror = reject;
            img.src = url;
        });
    }
    setBackgroundImage(url) {
        if (this.currentBackgroundUrl === url) {
            return Promise.resolve();
        }
        this.currentBackgroundUrl = url;
        const cachedImg = WebGLRenderer.backgroundCache.get(url);
        if (cachedImg) {
            this.applyBackgroundTexture(cachedImg, url);
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                WebGLRenderer.backgroundCache.set(url, img);
                if (this.currentBackgroundUrl === url) {
                    this.applyBackgroundTexture(img, url);
                }
                resolve();
            };
            img.onerror = reject;
            img.src = url;
        });
    }
    applyBackgroundTexture(img, url) {
        if (this.currentBackgroundUrl !== url)
            return;
        if (this.backgroundTexture) {
            this.backgroundTexture.dispose();
        }
        this.backgroundTexture = new Texture(this.gl);
        this.backgroundTexture.setImage(img);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    }
    backgroundTexture = null;
    drawBackground(mapWidth, mapHeight) {
        if (!this.backgroundTexture)
            return;
        const parallaxFactor = 0.5;
        const viewWidth = this.canvas.width / this.viewport.zoom;
        const viewHeight = this.canvas.height / this.viewport.zoom;
        const TILE_SIZE = 32;
        const worldWidth = mapWidth * TILE_SIZE;
        const worldHeight = mapHeight * TILE_SIZE;
        const maxCamX = Math.max(0, worldWidth - viewWidth);
        const maxCamY = Math.max(0, worldHeight - viewHeight);
        const bgWidth = maxCamX * parallaxFactor + viewWidth;
        const bgHeight = maxCamY * parallaxFactor + viewHeight;
        this.spriteBatch.begin(this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
        const parallaxX = this.viewport.cameraX * parallaxFactor;
        const parallaxY = this.viewport.cameraY * parallaxFactor;
        const u0 = parallaxX / bgWidth;
        const v0 = parallaxY / bgHeight;
        const u1 = (parallaxX + viewWidth) / bgWidth;
        const v1 = (parallaxY + viewHeight) / bgHeight;
        this.spriteBatch.draw(this.backgroundTexture, this.viewport.cameraX, this.viewport.cameraY, viewWidth, viewHeight, u0, v0, u1, v1);
        this.spriteBatch.flush();
    }
    setShipSprites(sprites) {
        if (this.shipTextures && this.shipTextures.lastSource === sprites &&
            this.shipTextures.isHighRes === !!sprites.isHighRes) {
            return;
        }
        if (this.shipTextures) {
            this.shipTextures.thrust.forEach(t => t.dispose());
            this.shipTextures.noThrust.forEach(t => t.dispose());
            Object.values(this.shipTextures.specials).forEach(t => t.dispose());
            this.shipTextures.thrustBase?.dispose();
            this.shipTextures.noThrustBase?.dispose();
        }
        this.shipTextures = {
            thrust: sprites.thrust.map((img) => {
                const tex = new Texture(this.gl);
                tex.setImage(img);
                return tex;
            }),
            noThrust: sprites.noThrust.map((img) => {
                const tex = new Texture(this.gl);
                tex.setImage(img);
                return tex;
            }),
            specials: {},
            noThrustBase: null,
            thrustBase: null
        };
        this.shipTextures.lastSource = sprites;
        this.shipTextures.isHighRes = !!sprites.isHighRes;
        for (const [id, img] of Object.entries(sprites.specials)) {
            const tex = new Texture(this.gl);
            tex.setImage(img);
            this.shipTextures.specials[Number(id)] = tex;
        }
        if (sprites.noThrustBase && this.shipTextures) {
            const tex = new Texture(this.gl);
            tex.setImage(sprites.noThrustBase);
            this.shipTextures.noThrustBase = tex;
        }
        if (sprites.thrustBase && this.shipTextures) {
            const tex = new Texture(this.gl);
            tex.setImage(sprites.thrustBase);
            this.shipTextures.thrustBase = tex;
        }
    }
    buildLevel(map, atlas) {
        // Destructible blocks are at indices 216-253 (from C: init.c copies them to block[216+count])
        const DESTRUCTIBLE_START = 216;
        // Static pass: Exclude destructible blocks (>= 216)
        this.backgroundRenderer.build(map, atlas, (i) => !isOverlayObject(map.objects[i]) && map.tiles[i] < DESTRUCTIBLE_START);
        // Dynamic pass: Include only destructible blocks (>= 216)
        if (atlas.lowRes) {
            const dynamicAtlas = atlas.lowRes || atlas;
            this.dynamicBackgroundRenderer.build(map, dynamicAtlas, (i) => {
                const tileId = map.tiles[i];
                return (tileId >= DESTRUCTIBLE_START);
            });
        }
        this.foregroundRenderer.build(map, atlas, (i) => isOverlayObject(map.objects[i]));
    }
    updateLevel(map, atlas) {
        this.buildLevel(map, atlas);
    }
    drawWorld(map, globals, shipState, shipBlockMap, isIntroLevel = false) {
        if (!this.atlasTexture)
            return;
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.disable(this.gl.DEPTH_TEST);
        // 1. Setup Camera
        if (globals) {
            if (isIntroLevel) {
                const INTRO_VISIBLE_WIDTH = 15 * 32;
                const INTRO_VISIBLE_HEIGHT = 10 * 32;
                const zoomForWidth = this.canvas.width / INTRO_VISIBLE_WIDTH;
                const zoomForHeight = this.canvas.height / INTRO_VISIBLE_HEIGHT;
                this.viewport.zoom = Math.max(zoomForWidth, zoomForHeight);
                this.clampCamera(15, 10, globals.sx, globals.sy);
            }
            else {
                const minZoom = this.calculateOptimalZoom(map.width, map.height);
                const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
                const baseZoom = isMobile ? 2.0 : 4.0;
                this.viewport.zoom = Math.max(baseZoom, minZoom);
                this.clampCamera(map.width, map.height, globals.sx, globals.sy);
            }
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
                this.shockwaveActive = false;
                this.backgroundRenderer.setShockwave({ x: 0, y: 0 }, 0);
                this.dynamicBackgroundRenderer.setShockwave({ x: 0, y: 0 }, 0);
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
                this.dynamicBackgroundRenderer.setShockwave({ x: 0, y: 0 }, 0);
                this.foregroundRenderer.setShockwave({ x: 0, y: 0 }, 0);
            }
            else {
                this.backgroundRenderer.setShockwave(this.shockwaveCenter, time);
                this.dynamicBackgroundRenderer.setShockwave(this.shockwaveCenter, time);
                this.foregroundRenderer.setShockwave(this.shockwaveCenter, time);
            }
        }
        // 2. Clear
        this.gl.clearColor(0.02, 0.024, 0.04, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        // 3. Draw Background (Parallax)
        this.drawBackground(map.width, map.height);
        const time = performance.now() / 1000.0;
        // 4. Draw Shadows
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
        // Static Wall Shadows
        this.backgroundRenderer.setColor(0, 0, 0, shadowAlpha);
        this.backgroundRenderer.draw(this.atlasTexture, this.viewport.cameraX - shadowX, this.viewport.cameraY - shadowY, this.viewport.zoom, time);
        // Dynamic Wall Shadows
        if (this.dynamicAtlasTexture) {
            this.dynamicBackgroundRenderer.setColor(0, 0, 0, shadowAlpha);
            this.dynamicBackgroundRenderer.draw(this.dynamicAtlasTexture, this.viewport.cameraX - shadowX, this.viewport.cameraY - shadowY, this.viewport.zoom, time);
        }
        if (globals && shipState && shipBlockMap && shipState.state !== 2) {
            const shipShadowOffX = shadowX;
            const shipShadowOffY = shadowY;
            this.drawShip(globals, shipState, shipBlockMap, shipShadowOffX, shipShadowOffY, [0, 0, 0, shadowAlpha]);
        }
        // 5. Draw Static Walls
        this.backgroundRenderer.setColor(1, 1, 1, 1);
        this.backgroundRenderer.draw(this.atlasTexture, this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom, time);
        // 6. Draw Dynamic Walls
        if (this.dynamicAtlasTexture) {
            this.dynamicBackgroundRenderer.setColor(1, 1, 1, 1);
            this.dynamicBackgroundRenderer.draw(this.dynamicAtlasTexture, this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom, time);
        }
    }
    drawWorldBackground(map) {
        this.drawWorld(map, null);
    }
    drawWorldForeground() {
        if (!this.atlasTexture)
            return;
        this.foregroundRenderer.draw(this.atlasTexture, this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom, performance.now() / 1000.0);
    }
    calculateOptimalZoom(mapWidth, mapHeight) {
        const TILE_SIZE = 32;
        const worldWidth = mapWidth * TILE_SIZE;
        const worldHeight = mapHeight * TILE_SIZE;
        const widthRatio = this.canvas.width / worldWidth;
        const heightRatio = this.canvas.height / worldHeight;
        return Math.max(widthRatio, heightRatio);
    }
    clampCamera(mapWidth, mapHeight, shipX, shipY) {
        const TILE_SIZE = 32;
        const viewW = this.canvas.width / this.viewport.zoom;
        const viewH = this.canvas.height / this.viewport.zoom;
        const worldWidth = mapWidth * TILE_SIZE;
        const worldHeight = mapHeight * TILE_SIZE;
        let cameraX = shipX - viewW / 2;
        let cameraY = shipY - viewH / 2;
        cameraX = Math.max(0, Math.min(cameraX, worldWidth - viewW));
        cameraY = Math.max(0, Math.min(cameraY, worldHeight - viewH));
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
        if (image === 0 || image === 1) {
            if (this.shipTextures) {
                const angleRad = ((globals.sa ?? 0) / 16384) * Math.PI * 2;
                const renderRotation = -angleRad;
                const baseTex = image === 1 ? this.shipTextures.thrustBase : this.shipTextures.noThrustBase;
                if (baseTex) {
                    this.spriteBatch.draw(baseTex, x + SHIP_SPRITE_SIZE / 2, y + SHIP_SPRITE_SIZE / 2, SHIP_SPRITE_SIZE, SHIP_SPRITE_SIZE, 0, 0, 1, 1, color, renderRotation, SHIP_SPRITE_SIZE / 2, SHIP_SPRITE_SIZE / 2);
                }
                else {
                    const orientation = ((globals.sa ?? 0) >>> 9) & 31;
                    const variant = image === 1 ? this.shipTextures.thrust : this.shipTextures.noThrust;
                    const tex = variant[orientation];
                    if (tex) {
                        this.spriteBatch.draw(tex, x, y, SHIP_SPRITE_SIZE, SHIP_SPRITE_SIZE, 0, 0, 1, 1, color);
                    }
                }
            }
        }
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
            const blockId = action.frame;
            if (blockId === 51 || blockId === 117) {
                continue;
            }
            const pos = atlas.positions[blockId];
            if (pos) {
                const atlasWidth = atlas.canvas.width;
                const atlasHeight = atlas.canvas.height;
                const u0 = pos.sx / atlasWidth;
                const v0 = pos.sy / atlasHeight;
                const u1 = (pos.sx + atlas.tileSize) / atlasWidth;
                const v1 = (pos.sy + atlas.tileSize) / atlasHeight;
                const TILE_SIZE = 32;
                const HALF_SIZE = TILE_SIZE / 2;
                this.spriteBatch.draw(this.atlasTexture, action.x - HALF_SIZE, action.y - HALF_SIZE, TILE_SIZE, TILE_SIZE, u0, v0, u1, v1, [1, 1, 1, 1]);
            }
        }
        this.spriteBatch.flush();
    }
    bulletTexture = null;
}
