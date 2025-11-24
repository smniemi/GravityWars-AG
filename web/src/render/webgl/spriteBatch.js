import { ShaderProgram } from './shader.js';
const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in vec4 a_color;

uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_zoom;

out vec2 v_texCoord;
out vec4 v_color;

void main() {
  // Apply camera and zoom
  vec2 position = (a_position - u_camera) * u_zoom;
  
  // Convert to clip space (-1 to +1)
  vec2 zeroToOne = position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  v_texCoord = a_texCoord;
  v_color = a_color;
}
`;
const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec2 v_texCoord;
in vec4 v_color;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  vec4 texColor = texture(u_texture, v_texCoord);
  outColor = texColor * v_color;
  if (outColor.a < 0.1) discard;
}
`;
const MAX_SPRITES = 2000;
const VERTICES_PER_SPRITE = 6;
const FLOATS_PER_VERTEX = 8; // x, y, u, v, r, g, b, a
export class SpriteBatch {
    gl;
    shader;
    vao;
    vertexBuffer;
    vertexData;
    spriteCount;
    currentTexture = null;
    constructor(gl) {
        this.gl = gl;
        this.shader = new ShaderProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
        this.vertexData = new Float32Array(MAX_SPRITES * VERTICES_PER_SPRITE * FLOATS_PER_VERTEX);
        this.spriteCount = 0;
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
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);
        // a_position
        const posLoc = this.shader.getAttributeLocation('a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 0);
        // a_texCoord
        const texLoc = this.shader.getAttributeLocation('a_texCoord');
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 2 * 4);
        // a_color
        const colorLoc = this.shader.getAttributeLocation('a_color');
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 4 * 4);
        gl.bindVertexArray(null);
    }
    begin(cameraX, cameraY, zoom) {
        this.shader.use();
        this.gl.uniform2f(this.shader.getUniformLocation('u_resolution'), this.gl.canvas.width, this.gl.canvas.height);
        this.gl.uniform2f(this.shader.getUniformLocation('u_camera'), cameraX, cameraY);
        this.gl.uniform1f(this.shader.getUniformLocation('u_zoom'), zoom);
        this.spriteCount = 0;
        this.currentTexture = null;
    }
    draw(texture, x, y, width, height, u0 = 0, v0 = 0, u1 = 1, v1 = 1, color = [1, 1, 1, 1], rotation = 0, originX = 0, originY = 0) {
        if (this.currentTexture !== texture) {
            this.flush();
            this.currentTexture = texture;
        }
        if (this.spriteCount >= MAX_SPRITES) {
            this.flush();
        }
        const i = this.spriteCount * VERTICES_PER_SPRITE * FLOATS_PER_VERTEX;
        // Rotation logic
        let x0 = -originX;
        let y0 = -originY;
        let x1 = width - originX;
        let y1 = -originY;
        let x2 = width - originX;
        let y2 = height - originY;
        let x3 = -originX;
        let y3 = height - originY;
        if (rotation !== 0) {
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            const rx0 = x0 * cos - y0 * sin;
            const ry0 = x0 * sin + y0 * cos;
            const rx1 = x1 * cos - y1 * sin;
            const ry1 = x1 * sin + y1 * cos;
            const rx2 = x2 * cos - y2 * sin;
            const ry2 = x2 * sin + y2 * cos;
            const rx3 = x3 * cos - y3 * sin;
            const ry3 = x3 * sin + y3 * cos;
            x0 = rx0;
            y0 = ry0;
            x1 = rx1;
            y1 = ry1;
            x2 = rx2;
            y2 = ry2;
            x3 = rx3;
            y3 = ry3;
        }
        x0 += x;
        y0 += y;
        x1 += x;
        y1 += y;
        x2 += x;
        y2 += y;
        x3 += x;
        y3 += y;
        const [r, g, b, a] = color;
        // Triangle 1
        this.setVertex(i + 0, x0, y0, u0, v0, r, g, b, a);
        this.setVertex(i + 8, x1, y1, u1, v0, r, g, b, a);
        this.setVertex(i + 16, x2, y2, u1, v1, r, g, b, a);
        // Triangle 2
        this.setVertex(i + 24, x0, y0, u0, v0, r, g, b, a);
        this.setVertex(i + 32, x2, y2, u1, v1, r, g, b, a);
        this.setVertex(i + 40, x3, y3, u0, v1, r, g, b, a);
        this.spriteCount++;
    }
    setVertex(offset, x, y, u, v, r, g, b, a) {
        this.vertexData[offset] = x;
        this.vertexData[offset + 1] = y;
        this.vertexData[offset + 2] = u;
        this.vertexData[offset + 3] = v;
        this.vertexData[offset + 4] = r;
        this.vertexData[offset + 5] = g;
        this.vertexData[offset + 6] = b;
        this.vertexData[offset + 7] = a;
    }
    flush() {
        if (this.spriteCount === 0 || !this.currentTexture)
            return;
        this.gl.bindVertexArray(this.vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        // Only upload used data
        const floatCount = this.spriteCount * VERTICES_PER_SPRITE * FLOATS_PER_VERTEX;
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, floatCount));
        this.currentTexture.bind(0);
        this.gl.uniform1i(this.shader.getUniformLocation('u_texture'), 0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.spriteCount * VERTICES_PER_SPRITE);
        this.spriteCount = 0;
        this.gl.bindVertexArray(null);
    }
}
