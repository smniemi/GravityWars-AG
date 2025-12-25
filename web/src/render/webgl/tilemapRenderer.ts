import { ShaderProgram } from './shader.js';
import { Texture } from './texture.js';
import type { LevelMap } from '../../core/levelMap.js';
import type { TileAtlas } from '../tileAtlas.js';

const TILE_SIZE = 32;

export class TilemapRenderer {
    gl: WebGL2RenderingContext;
    shader: ShaderProgram;
    vao: WebGLVertexArrayObject;
    vertexBuffer: WebGLBuffer;
    vertexCount: number = 0;
    mapWidth: number = 0;
    mapHeight: number = 0;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;

        // Simple shader for tiles
        const vsSource = `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;
        in float a_objectId;
        in vec2 a_localPos; // 0.0 to 1.0 relative to tile
        
        uniform vec2 u_resolution;
        uniform vec2 u_camera;
        uniform float u_zoom;
        uniform highp float u_time; // Explicit highp
        
        // Shockwave uniforms
        uniform vec2 u_shockwaveCenter; // World coordinates
        uniform float u_shockwaveTime;  // Time since explosion start (seconds)
        uniform vec3 u_shockwaveParams; // x: amplitude, y: frequency, z: speed
        
        out vec2 v_texCoord;
        flat out float v_objectId;
        
        void main() {
            vec2 pos = a_position;
            
            // Portal Scaling Effect (ID: 120)
            // Center scaling logic
            if (abs(a_objectId - 120.0) < 0.5) {
                // Determine center of the tile
                // a_localPos is 0,0 for TopLeft, 1,1 for BottomRight
                // pos is the corner.
                // center = pos + (0.5 - localPos) * 32.0; (assuming 32px tiles)
                
                vec2 center = pos + (vec2(0.5) - a_localPos) * 32.0;
                
                // Pulsate scale: +/- 25% (0.75 to 1.25)
                // Speed 12.0 (3x original 4.0)
                float scale = 1.0 + 0.25 * sin(u_time * 12.0);
                
                // Apply scaling relative to center
                pos = center + (pos - center) * scale;
            }
            
            // Shockwave effect
            if (u_shockwaveTime > 0.0) {
                float dist = distance(pos, u_shockwaveCenter);
                float waveDist = u_shockwaveTime * u_shockwaveParams.z; // Speed
                
                // Calculate wave
                float diff = dist - waveDist;
                float width = 200.0; // Width of the wave ring
                
                if (abs(diff) < width) {
                    // Create a ripple
                    float angle = diff / width * 3.14159; // -PI to PI
                    float offset = cos(angle) * u_shockwaveParams.x; // Amplitude
                    
                    // Direction vector from center
                    vec2 dir = normalize(pos - u_shockwaveCenter);
                    if (length(pos - u_shockwaveCenter) < 0.1) dir = vec2(0.0);
                    
                    pos += dir * offset;
                }
            }

            // Convert world pos to view pos
            vec2 viewPos = (pos - u_camera) * u_zoom;
            
            // Convert to clip space (-1 to 1)
            // 0,0 is top-left in screen pixels
            vec2 clipPos = (viewPos / u_resolution) * 2.0 - 1.0;
            
            // Flip Y because WebGL is bottom-left 0,0 but screen is top-left 0,0
            gl_Position = vec4(clipPos.x, -clipPos.y, 0, 1);
            
            v_texCoord = a_texCoord;
            v_objectId = a_objectId;
        }`;

        const fsSource = `#version 300 es
        precision mediump float;
        
        in vec2 v_texCoord;
        flat in float v_objectId;
        
        uniform sampler2D u_texture;
        uniform vec4 u_color;
        uniform highp float u_time; // Explicit highp to match Vertex Shader
        
        out vec4 outColor;
        
        void main() {
            vec4 texColor = texture(u_texture, v_texCoord);
            
            // Skip transparent pixels (0 alpha)
            if (texColor.a < 0.1) discard;
            
            vec3 finalColor = texColor.rgb;
            
            // Normalize Alpha for output (markers like 254/255 become 1.0 for rendering)
            float finalAlpha = 1.0; 
            
            // Check Alpha Markers
            // 254/255 = 0.996078 (Red)
            // 253/255 = 0.992156 (Green)
            // Use small epsilon for float comparison.
            
            bool isRedMarker = (texColor.a > 0.994 && texColor.a < 0.998);
            bool isGreenMarker = (texColor.a > 0.990 && texColor.a < 0.994);
            
            // Effects based on Object ID
            // Red Wall: '@' (64)
            if (abs(v_objectId - 64.0) < 0.5) {
                if (isRedMarker) {
                    // Pulse Brightness
                    // Speed 9.0
                    float p = sin(u_time * 9.0) * 0.5 + 0.5; // 0 to 1
                    
                    // Increased magnitude (+20% -> 0.6)
                    float brightness = 1.0 + 0.6 * p;
                    
                    finalColor *= brightness;
                    // 33% more red
                    finalColor.r *= 1.33;
                    
                    // Reduced transparency: ~83% opacity
                    finalAlpha = 0.83; 
                }
            }
            
            // Portal: 'x' (120)
            if (abs(v_objectId - 120.0) < 0.5) {
                if (isGreenMarker) {
                    // Pulse Brightness
                    // Speed 12.0
                    float p = sin(u_time * 12.0) * 0.5 + 0.5; // 0 to 1
                    
                    // Increased magnitude
                    float brightness = 1.0 + 0.6 * p;
                    
                    finalColor *= brightness;
                    // Reduced transparency: ~83% opacity
                    finalAlpha = 0.83; 
                }
            }
            
            outColor = vec4(finalColor, finalAlpha) * u_color;
        }`;

        this.shader = new ShaderProgram(gl, vsSource, fsSource);

        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        this.vertexBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        const stride = 7 * 4; // 7 floats per vertex (x, y, u, v, id, lx, ly)

        // a_position
        const posLoc = this.shader.getAttributeLocation('a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);

        // a_texCoord
        const texLoc = this.shader.getAttributeLocation('a_texCoord');
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, stride, 2 * 4);

        // a_objectId
        const idLoc = this.shader.getAttributeLocation('a_objectId');
        gl.enableVertexAttribArray(idLoc);
        gl.vertexAttribPointer(idLoc, 1, gl.FLOAT, false, stride, 4 * 4);

        // a_localPos
        const localLoc = this.shader.getAttributeLocation('a_localPos');
        gl.enableVertexAttribArray(localLoc);
        gl.vertexAttribPointer(localLoc, 2, gl.FLOAT, false, stride, 5 * 4);

        gl.bindVertexArray(null);

        this.shader.use();
        this.gl.uniform4f(this.shader.getUniformLocation('u_color'), 1, 1, 1, 1);
    }

    build(map: LevelMap, atlas: TileAtlas, predicate?: (index: number) => boolean) {
        this.mapWidth = map.width;
        this.mapHeight = map.height;

        // 6 vertices per tile, 7 floats per vertex (x, y, u, v, id, lx, ly)
        const vertices = new Float32Array(map.width * map.height * 6 * 7);
        let ptr = 0;

        const atlasWidth = atlas.canvas.width;
        const atlasHeight = atlas.canvas.height;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const index = y * map.width + x;
                if (predicate && !predicate(index)) continue;

                const blockId = map.tiles[index];
                const objectId = map.objects[index]; // Logical object ID
                const pos = atlas.positions[blockId];

                if (!pos) continue;

                const x0 = x * TILE_SIZE;
                const y0 = y * TILE_SIZE;
                const x1 = x0 + TILE_SIZE;
                const y1 = y0 + TILE_SIZE;

                // UV coordinates
                const halfPixelX = 0.5 / atlasWidth;
                const halfPixelY = 0.5 / atlasHeight;

                const u0 = pos.sx / atlasWidth + halfPixelX;
                const v0 = pos.sy / atlasHeight + halfPixelY;
                const u1 = (pos.sx + TILE_SIZE) / atlasWidth - halfPixelX;
                const v1 = (pos.sy + TILE_SIZE) / atlasHeight - halfPixelY;

                // Cast objectId to float
                const id = objectId;

                // Triangle 1
                // v0: x0, y0 -> local 0,0
                vertices[ptr++] = x0; vertices[ptr++] = y0; vertices[ptr++] = u0; vertices[ptr++] = v0; vertices[ptr++] = id; vertices[ptr++] = 0; vertices[ptr++] = 0;
                // v1: x1, y0 -> local 1,0
                vertices[ptr++] = x1; vertices[ptr++] = y0; vertices[ptr++] = u1; vertices[ptr++] = v0; vertices[ptr++] = id; vertices[ptr++] = 1; vertices[ptr++] = 0;
                // v2: x0, y1 -> local 0,1
                vertices[ptr++] = x0; vertices[ptr++] = y1; vertices[ptr++] = u0; vertices[ptr++] = v1; vertices[ptr++] = id; vertices[ptr++] = 0; vertices[ptr++] = 1;

                // Triangle 2
                // v3: x0, y1 -> local 0,1
                vertices[ptr++] = x0; vertices[ptr++] = y1; vertices[ptr++] = u0; vertices[ptr++] = v1; vertices[ptr++] = id; vertices[ptr++] = 0; vertices[ptr++] = 1;
                // v4: x1, y0 -> local 1,0
                vertices[ptr++] = x1; vertices[ptr++] = y0; vertices[ptr++] = u1; vertices[ptr++] = v0; vertices[ptr++] = id; vertices[ptr++] = 1; vertices[ptr++] = 0;
                // v5: x1, y1 -> local 1,1
                vertices[ptr++] = x1; vertices[ptr++] = y1; vertices[ptr++] = u1; vertices[ptr++] = v1; vertices[ptr++] = id; vertices[ptr++] = 1; vertices[ptr++] = 1;
            }
        }

        this.vertexCount = ptr / 7;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    }

    updateTiles(map: LevelMap, atlas: TileAtlas) {
        this.build(map, atlas);
    }

    setColor(r: number, g: number, b: number, a: number) {
        this.shader.use();
        this.gl.uniform4f(this.shader.getUniformLocation('u_color'), r, g, b, a);
    }

    draw(texture: Texture, cameraX: number, cameraY: number, zoom: number, time: number = 0) {
        this.shader.use();
        this.gl.uniform2f(this.shader.getUniformLocation('u_resolution'), this.gl.canvas.width, this.gl.canvas.height);
        this.gl.uniform2f(this.shader.getUniformLocation('u_camera'), cameraX, cameraY);
        this.gl.uniform1f(this.shader.getUniformLocation('u_zoom'), zoom);
        this.gl.uniform1f(this.shader.getUniformLocation('u_time'), time);

        texture.bind(0);
        this.gl.uniform1i(this.shader.getUniformLocation('u_texture'), 0);

        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
        this.gl.bindVertexArray(null);
    }
    setShockwave(center: { x: number, y: number }, time: number, amplitude: number = 10.0) {
        this.shader.use();
        this.gl.uniform2f(this.shader.getUniformLocation('u_shockwaveCenter'), center.x, center.y);
        this.gl.uniform1f(this.shader.getUniformLocation('u_shockwaveTime'), time);
        // Params: amplitude, frequency (unused in simple ripple), speed
        this.gl.uniform3f(this.shader.getUniformLocation('u_shockwaveParams'), amplitude, 1.0, 500.0);
    }
}
