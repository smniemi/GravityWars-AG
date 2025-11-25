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
    drawWorldBackground(map) {
        if (!this.atlasTexture)
            return;
        this.gl.clearColor(0.02, 0.024, 0.04, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.drawBackground();
        // Dynamic Shadow Calculation
        // Light source is at the center of the map
        const TILE_SIZE = 32;
        const mapCenterX = (map.width * TILE_SIZE) / 2;
        const mapCenterY = (map.height * TILE_SIZE) / 2;
        const camCenterX = this.viewport.cameraX + (this.canvas.width / this.viewport.zoom) / 2;
        const camCenterY = this.viewport.cameraY + (this.canvas.height / this.viewport.zoom) / 2;
        // Vector from Center to Camera
        const vecX = camCenterX - mapCenterX;
        const vecY = camCenterY - mapCenterY;
        // Scale factor for shadow offset
        const shadowScale = 0.015;
        const shadowX = vecX * shadowScale;
        const shadowY = vecY * shadowScale;
        const shadowAlpha = 0.5;
        // Shadow: World (Background)
        this.backgroundRenderer.setColor(0, 0, 0, shadowAlpha);
        this.backgroundRenderer.draw(this.atlasTexture, this.viewport.cameraX - shadowX, this.viewport.cameraY - shadowY, this.viewport.zoom);
        this.backgroundRenderer.setColor(1, 1, 1, 1); // Reset
        this.foregroundRenderer.setColor(1, 1, 1, 1); // Reset
        // Draw World (Background)
        this.backgroundRenderer.draw(this.atlasTexture, this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
    }
    drawWorldForeground() {
        if (!this.atlasTexture)
            return;
        // Draw World (Foreground/Overlay)
        this.foregroundRenderer.draw(this.atlasTexture, this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
    }
    // Legacy support if needed, or remove
    drawWorld(map, globals) {
        if (globals) {
            // Calculate optimal zoom to fit viewport within level bounds
            const minZoom = this.calculateOptimalZoom(map.width, map.height);
            // Detect mobile: use 2x zoom out (zoom=2.0) for mobile, 4.0 for desktop
            const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
            const baseZoom = isMobile ? 2.0 : 4.0;
            this.viewport.zoom = Math.max(baseZoom, minZoom);
            // Clamp camera within bounds
            this.clampCamera(map.width, map.height, globals.sx, globals.sy);
        }
        this.drawWorldBackground(map);
        // Note: Ship and Foreground must be drawn manually after this in main loop
    }
    calculateOptimalZoom(mapWidth, mapHeight) {
        const TILE_SIZE = 32;
        const worldWidth = mapWidth * TILE_SIZE;
        const worldHeight = mapHeight * TILE_SIZE;
        const canvasAspect = this.canvas.width / this.canvas.height;
        const worldAspect = worldWidth / worldHeight;
        let zoom;
        if (canvasAspect > worldAspect) {
            // Canvas is wider - fit to height
            zoom = this.canvas.height / worldHeight;
        }
        else {
            // Canvas is taller - fit to width
            zoom = this.canvas.width / worldWidth;
        }
        return zoom;
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
            // Bullet size in world units
            const worldSize = 0.8;
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
            const pos = atlas.positions[blockId];
            if (pos) {
                const atlasWidth = atlas.canvas.width;
                const atlasHeight = atlas.canvas.height;
                const u0 = pos.sx / atlasWidth;
                const v0 = pos.sy / atlasHeight;
                const u1 = (pos.sx + 32) / atlasWidth;
                const v1 = (pos.sy + 32) / atlasHeight;
                // Actions are usually 32x32
                this.spriteBatch.draw(this.atlasTexture, action.x, action.y, 1.0, 1.0, // 1 tile size
                u0, v0, u1, v1, [1, 1, 1, 1]);
            }
        }
        this.spriteBatch.flush();
    }
    bulletTexture = null;
}
