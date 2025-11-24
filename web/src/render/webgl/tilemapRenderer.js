import { ShaderProgram } from './shader.js';
const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_zoom;

out vec2 v_texCoord;

void main() {
  vec2 position = (a_position - u_camera) * u_zoom;
  vec2 zeroToOne = position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  v_texCoord = a_texCoord;
}
`;
const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec4 u_color;

out vec4 outColor;

void main() {
  vec4 texColor = texture(u_texture, v_texCoord);
  outColor = texColor * u_color;
  // Simple alpha test if needed, though most tiles are opaque
  if (outColor.a < 0.1) discard;
}
`;
const TILE_SIZE = 32;
export class TilemapRenderer {
    gl;
    shader;
    vao;
    vertexBuffer;
    vertexCount = 0;
    mapWidth = 0;
    mapHeight = 0;
    constructor(gl) {
        this.gl = gl;
        this.shader = new ShaderProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
        const vao = gl.createVertexArray();
        if (!vao)
            throw new Error('Failed to create VAO');
        this.vao = vao;
        gl.bindVertexArray(vao);
        const buffer = gl.createBuffer();
        if (!buffer)
            throw new Error('Failed to create buffer');
        this.vertexBuffer = buffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        // a_position
        const posLoc = this.shader.getAttributeLocation('a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 4 * 4, 0);
        // a_texCoord
        const texLoc = this.shader.getAttributeLocation('a_texCoord');
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
        gl.bindVertexArray(null);
        this.shader.use();
        this.gl.uniform4f(this.shader.getUniformLocation('u_color'), 1, 1, 1, 1);
    }
    build(map, atlas) {
        this.mapWidth = map.width;
        this.mapHeight = map.height;
        // 6 vertices per tile, 4 floats per vertex (x, y, u, v)
        const vertices = new Float32Array(map.width * map.height * 6 * 4);
        let ptr = 0;
        const atlasWidth = atlas.canvas.width;
        const atlasHeight = atlas.canvas.height;
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const blockId = map.tiles[y * map.width + x];
                const pos = atlas.positions[blockId];
                if (!pos)
                    continue;
                const x0 = x * TILE_SIZE;
                const y0 = y * TILE_SIZE;
                const x1 = x0 + TILE_SIZE;
                const y1 = y0 + TILE_SIZE;
                // UV coordinates
                // Add a half-pixel inset to avoid bleeding/rounding errors with GL_NEAREST
                const halfPixelX = 0.5 / atlasWidth;
                const halfPixelY = 0.5 / atlasHeight;
                const u0 = pos.sx / atlasWidth + halfPixelX;
                const v0 = pos.sy / atlasHeight + halfPixelY;
                const u1 = (pos.sx + TILE_SIZE) / atlasWidth - halfPixelX;
                const v1 = (pos.sy + TILE_SIZE) / atlasHeight - halfPixelY;
                // Triangle 1
                vertices[ptr++] = x0;
                vertices[ptr++] = y0;
                vertices[ptr++] = u0;
                vertices[ptr++] = v0;
                vertices[ptr++] = x1;
                vertices[ptr++] = y0;
                vertices[ptr++] = u1;
                vertices[ptr++] = v0;
                vertices[ptr++] = x0;
                vertices[ptr++] = y1;
                vertices[ptr++] = u0;
                vertices[ptr++] = v1;
                // Triangle 2
                vertices[ptr++] = x0;
                vertices[ptr++] = y1;
                vertices[ptr++] = u0;
                vertices[ptr++] = v1;
                vertices[ptr++] = x1;
                vertices[ptr++] = y0;
                vertices[ptr++] = u1;
                vertices[ptr++] = v0;
                vertices[ptr++] = x1;
                vertices[ptr++] = y1;
                vertices[ptr++] = u1;
                vertices[ptr++] = v1;
            }
        }
        this.vertexCount = ptr / 4;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    }
    updateTiles(map, atlas) {
        // For now, if many tiles change, it might be simpler to rebuild.
        // But for destructible terrain, we can update just the affected quads.
        // However, since we packed the buffer sequentially, we can calculate the offset.
        // NOTE: This assumes the buffer was built iterating x then y exactly as above.
        // And that EVERY tile has space reserved.
        // Wait, my build loop skips tiles if !pos. That breaks the indexing.
        // To support partial updates efficiently, we should probably always emit a quad, 
        // but with 0 size or transparent texture if empty.
        // OR, just rebuild the whole mesh. It's 20x45 = 900 tiles. 
        // Rebuilding 900 quads is extremely cheap in JS. Let's just rebuild for simplicity and robustness.
        this.build(map, atlas);
    }
    setColor(r, g, b, a) {
        this.shader.use();
        this.gl.uniform4f(this.shader.getUniformLocation('u_color'), r, g, b, a);
    }
    draw(texture, cameraX, cameraY, zoom) {
        this.shader.use();
        this.gl.uniform2f(this.shader.getUniformLocation('u_resolution'), this.gl.canvas.width, this.gl.canvas.height);
        this.gl.uniform2f(this.shader.getUniformLocation('u_camera'), cameraX, cameraY);
        this.gl.uniform1f(this.shader.getUniformLocation('u_zoom'), zoom);
        texture.bind(0);
        this.gl.uniform1i(this.shader.getUniformLocation('u_texture'), 0);
        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
        this.gl.bindVertexArray(null);
    }
}
