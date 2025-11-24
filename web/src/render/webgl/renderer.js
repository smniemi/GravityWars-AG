import { createWebGLContext, resizeCanvasToDisplaySize } from './glContext.js';
import { SpriteBatch } from './spriteBatch.js';
import { TilemapRenderer } from './tilemapRenderer.js';
import { Texture } from './texture.js';
import { SHIP_SPRITE_SIZE } from '../shipSprites.js';
export class WebGLRenderer {
    canvas;
    gl;
    spriteBatch;
    tilemapRenderer;
    atlasTexture = null;
    shipTextures = null;
    viewport = { cameraX: 0, cameraY: 0, zoom: 4.0 };
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = createWebGLContext(canvas);
        this.spriteBatch = new SpriteBatch(this.gl);
        this.tilemapRenderer = new TilemapRenderer(this.gl);
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
        this.tilemapRenderer.build(map, atlas);
    }
    updateLevel(map, atlas) {
        this.buildLevel(map, atlas);
    }
    drawWorld(map, globals) {
        if (globals) {
            // Calculate optimal zoom to fit viewport within level bounds
            const minZoom = this.calculateOptimalZoom(map.width, map.height);
            this.viewport.zoom = Math.max(4.0, minZoom);
            // Clamp camera within bounds
            this.clampCamera(map.width, map.height, globals.sx, globals.sy);
        }
        this.gl.clearColor(0.02, 0.024, 0.04, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.drawBackground();
        const shadowAlpha = 0.5;
        const shadowOffset = 4;
        // Shadow: World
        if (this.atlasTexture) {
            this.tilemapRenderer.setColor(0, 0, 0, shadowAlpha);
            this.tilemapRenderer.draw(this.atlasTexture, this.viewport.cameraX - shadowOffset, this.viewport.cameraY - shadowOffset, this.viewport.zoom);
            this.tilemapRenderer.setColor(1, 1, 1, 1); // Reset
            // Draw World (Foreground)
            this.tilemapRenderer.draw(this.atlasTexture, this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
        }
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
        if (!this.whiteTexture) {
            this.whiteTexture = new Texture(this.gl);
            this.whiteTexture.setData(1, 1, new Uint8Array([255, 255, 255, 255]));
        }
        if (this.whiteTexture) {
            const worldSize = Math.max(3 / this.viewport.zoom, 2.4);
            this.spriteBatch.begin(this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);
            for (const bullet of bullets) {
                this.spriteBatch.draw(this.whiteTexture, bullet.x, bullet.y, worldSize, worldSize, 0, 0, 1, 1, [0.48, 0.97, 1.0, 1.0] // #7cf7ff
                );
            }
            this.spriteBatch.flush();
        }
    }
    drawActions(_actions, _atlas) {
        // TODO: Implement action drawing
    }
    whiteTexture = null;
}
