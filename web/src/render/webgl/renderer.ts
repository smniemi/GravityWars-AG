import { createWebGLContext, resizeCanvasToDisplaySize } from './glContext.js';
import { SpriteBatch } from './spriteBatch.js';
import { TilemapRenderer } from './tilemapRenderer.js';
import { isOverlayObject } from '../overlayObjects.js';
import { Texture } from './texture.js';
import type { LevelMap } from '../../core/levelMap.js';
import type { TileAtlas } from '../tileAtlas.js';
import type { GlobalState } from '../../core/globalState.js';
import type { ShipState } from '../../core/shipState.js';
import type { ShipSprites } from '../shipSprites.js';
import type { BulletSnapshot } from '../../core/bullets.js';
import type { ActionState } from '../../core/actions.js';
import { SHIP_SPRITE_SIZE } from '../shipSprites.js';

export interface ViewportInfo {
    cameraX: number;
    cameraY: number;
    zoom: number;
}

export class WebGLRenderer {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    spriteBatch: SpriteBatch;
    backgroundRenderer: TilemapRenderer;
    foregroundRenderer: TilemapRenderer;

    atlasTexture: Texture | null = null;
    shipTextures: {
        thrust: Texture[];
        noThrust: Texture[];
        specials: Record<number, Texture>;
    } | null = null;

    viewport: ViewportInfo = { cameraX: 0, cameraY: 0, zoom: 4.0 };

    // Shockwave state
    private shockwaveActive = false;
    private shockwaveStartTime = 0;
    private shockwaveCenter = { x: 0, y: 0 };
    private lastShipState = 0;
    private lastSx = 0;
    private lastSy = 0;

    constructor(canvas: HTMLCanvasElement) {
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

    setTileAtlas(atlas: TileAtlas) {
        if (this.atlasTexture) {
            this.atlasTexture.dispose();
        }
        this.atlasTexture = new Texture(this.gl);
        this.atlasTexture.setImage(atlas.canvas);
    }

    private currentBackgroundUrl: string | null = null;
    private static backgroundCache: Map<string, HTMLImageElement> = new Map();

    /**
     * Preload a background image into cache without setting it as current.
     * Returns a Promise that resolves when the image is loaded.
     */
    static preloadBackgroundImage(url: string): Promise<void> {
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

    /**
     * Set the background image. If already cached, applies immediately.
     * Returns a Promise that resolves when the image is ready.
     */
    setBackgroundImage(url: string): Promise<void> {
        if (this.currentBackgroundUrl === url) {
            return Promise.resolve();
        }
        this.currentBackgroundUrl = url;

        const cachedImg = WebGLRenderer.backgroundCache.get(url);
        if (cachedImg) {
            // Use cached image immediately
            this.applyBackgroundTexture(cachedImg, url);
            return Promise.resolve();
        }

        // Load new image
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

    private applyBackgroundTexture(img: HTMLImageElement, url: string) {
        if (this.currentBackgroundUrl !== url) return;

        if (this.backgroundTexture) {
            this.backgroundTexture.dispose();
        }
        this.backgroundTexture = new Texture(this.gl);
        this.backgroundTexture.setImage(img);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    }

    private backgroundTexture: Texture | null = null;

    drawBackground(mapWidth: number, mapHeight: number) {
        if (!this.backgroundTexture) return;

        // Parallax factor: 0.5 means background moves at half speed
        const parallaxFactor = 0.5;

        const viewWidth = this.canvas.width / this.viewport.zoom;
        const viewHeight = this.canvas.height / this.viewport.zoom;

        const TILE_SIZE = 32;
        const worldWidth = mapWidth * TILE_SIZE;
        const worldHeight = mapHeight * TILE_SIZE;

        const maxCamX = Math.max(0, worldWidth - viewWidth);
        const maxCamY = Math.max(0, worldHeight - viewHeight);

        // Calculate background dimensions to fit exactly within the parallax traversal.
        // This effectively "zooms out" the background maximally so that the texture covers 
        // the entire traversable area without repeating (staying within 0-1 UV bounds).
        const bgWidth = maxCamX * parallaxFactor + viewWidth;
        const bgHeight = maxCamY * parallaxFactor + viewHeight;

        this.spriteBatch.begin(this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);

        const parallaxX = this.viewport.cameraX * parallaxFactor;
        const parallaxY = this.viewport.cameraY * parallaxFactor;

        const u0 = parallaxX / bgWidth;
        const v0 = parallaxY / bgHeight;
        const u1 = (parallaxX + viewWidth) / bgWidth;
        const v1 = (parallaxY + viewHeight) / bgHeight;

        this.spriteBatch.draw(
            this.backgroundTexture,
            this.viewport.cameraX,
            this.viewport.cameraY,
            viewWidth,
            viewHeight,
            u0, v0, u1, v1
        );

        this.spriteBatch.flush();
    }

    setShipSprites(sprites: ShipSprites) {
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

    buildLevel(map: LevelMap, atlas: TileAtlas) {
        this.backgroundRenderer.build(map, atlas, (i) => !isOverlayObject(map.objects[i]));
        this.foregroundRenderer.build(map, atlas, (i) => isOverlayObject(map.objects[i]));
    }

    updateLevel(map: LevelMap, atlas: TileAtlas) {
        this.buildLevel(map, atlas);
    }

    // Consolidated drawing to ensure correct Z-order:
    // 1. Background Image (Parallax)
    // 2. Wall Shadows
    // 3. Ship Shadow
    // 4. Walls
    // 5. Ship (handled by caller currently, but can be moved later if needed, though Shadow is distinct)
    // Actually, caller handles Main Ship. We handle Ship Shadow here.
    drawWorld(
        map: LevelMap,
        globals: GlobalState | null,
        shipState?: ShipState | null,
        shipBlockMap?: Partial<Record<number, number>>
    ) {
        if (!this.atlasTexture) return;

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
            } else if (globals.shipState === 3 && this.shockwaveActive) {
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
            } else {
                this.backgroundRenderer.setShockwave(this.shockwaveCenter, time);
                this.foregroundRenderer.setShockwave(this.shockwaveCenter, time);
            }
        }

        // 2. Clear
        this.gl.clearColor(0.02, 0.024, 0.04, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // 3. Draw Background (Parallax)
        this.drawBackground(map.width, map.height);

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
        this.backgroundRenderer.draw(
            this.atlasTexture,
            this.viewport.cameraX - shadowX,
            this.viewport.cameraY - shadowY,
            this.viewport.zoom,
            time
        );

        // 6. Draw Ship Shadow (Below Walls, Above Background)
        if (globals && shipState && shipBlockMap && shipState.state !== 2) {
            // Note: Wall shadows shift LAYERS by -shadowX (Shift Left).
            // This creates a shadow to the RIGHT of the object (Outwards).
            // For the ship, we draw the sprite at (ShipX + Offset).
            // To match "Right" shadow, Offset must be Positive.
            // Using same vecX * scale gives positive if cam is right.
            const shipShadowOffX = shadowX;
            const shipShadowOffY = shadowY;

            this.drawShip(
                globals,
                shipState,
                shipBlockMap,
                shipShadowOffX,
                shipShadowOffY,
                [0, 0, 0, shadowAlpha]
            );
        }

        // 7. Draw Walls
        this.backgroundRenderer.setColor(1, 1, 1, 1);
        this.backgroundRenderer.draw(
            this.atlasTexture,
            this.viewport.cameraX,
            this.viewport.cameraY,
            this.viewport.zoom,
            time
        );
    }

    // Deprecated / Internal helper
    drawWorldBackground(map: LevelMap) {
        // Redirect to drawWorld with no ship if called directly
        this.drawWorld(map, null);
    }

    drawWorldForeground() {
        if (!this.atlasTexture) return;

        // Draw World (Foreground/Overlay)
        this.foregroundRenderer.draw(
            this.atlasTexture,
            this.viewport.cameraX,
            this.viewport.cameraY,
            this.viewport.zoom,
            performance.now() / 1000.0
        );
    }

    private calculateOptimalZoom(mapWidth: number, mapHeight: number): number {
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

    private clampCamera(mapWidth: number, mapHeight: number, shipX: number, shipY: number) {
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

    drawShip(
        globals: GlobalState,
        ship: ShipState,
        shipBlockMap: Partial<Record<number, number>>,
        offsetX = 0,
        offsetY = 0,
        color: [number, number, number, number] = [1, 1, 1, 1]
    ) {
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

    drawBullets(bullets: BulletSnapshot[]) {
        if (!this.bulletTexture) {
            this.bulletTexture = new Texture(this.gl);
            // Create a 16x16 radial gradient texture
            const size = 16;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d')!;

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
                this.spriteBatch.draw(
                    this.bulletTexture,
                    bullet.x - worldSize / 2,
                    bullet.y - worldSize / 2,
                    worldSize,
                    worldSize,
                    0, 0, 1, 1,
                    [1, 1, 1, 1]
                );
            }
            this.spriteBatch.flush();
        }
    }

    drawActions(actions: ActionState[], atlas: TileAtlas) {
        if (!this.atlasTexture) return;

        this.spriteBatch.begin(this.viewport.cameraX, this.viewport.cameraY, this.viewport.zoom);

        for (const action of actions) {
            if (!action.active) continue;

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
                this.spriteBatch.draw(
                    this.atlasTexture,
                    action.x - HALF_SIZE,
                    action.y - HALF_SIZE,
                    TILE_SIZE, TILE_SIZE,
                    u0, v0, u1, v1,
                    [1, 1, 1, 1]
                );
            }
        }

        this.spriteBatch.flush();
    }

    private bulletTexture: Texture | null = null;
}
