export class ShaderProgram {
    program;
    gl;
    uniforms = {};
    attributes = {};
    constructor(gl, vertexSource, fragmentSource) {
        this.gl = gl;
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        this.program = this.createProgram(vertexShader, fragmentShader);
    }
    use() {
        this.gl.useProgram(this.program);
    }
    getUniformLocation(name) {
        if (this.uniforms[name] === undefined) {
            const loc = this.gl.getUniformLocation(this.program, name);
            if (!loc) {
                console.warn(`Uniform ${name} not found`);
            }
            this.uniforms[name] = loc;
        }
        return this.uniforms[name];
    }
    getAttributeLocation(name) {
        if (this.attributes[name] === undefined) {
            const loc = this.gl.getAttribLocation(this.program, name);
            if (loc === -1) {
                console.warn(`Attribute ${name} not found`);
            }
            this.attributes[name] = loc;
        }
        return this.attributes[name];
    }
    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        if (!shader)
            throw new Error('Failed to create shader');
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Could not compile shader: ${info}`);
        }
        return shader;
    }
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        if (!program)
            throw new Error('Failed to create program');
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Could not link program: ${info}`);
        }
        return program;
    }
}
