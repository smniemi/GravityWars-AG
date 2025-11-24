export class Texture {
    gl: WebGL2RenderingContext;
    texture: WebGLTexture;
    width: number;
    height: number;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        const tex = gl.createTexture();
        if (!tex) throw new Error('Failed to create texture');
        this.texture = tex;
        this.width = 0;
        this.height = 0;
    }

    bind(unit = 0) {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }

    setImage(image: HTMLImageElement | HTMLCanvasElement) {
        this.width = image.width;
        this.height = image.height;
        this.bind();
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            image
        );
        this.setParameters();
    }

    setData(width: number, height: number, data: Uint8Array) {
        this.width = width;
        this.height = height;
        this.bind();
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            width,
            height,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            data
        );
        this.setParameters();
    }

    private setParameters() {
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    }

    dispose() {
        this.gl.deleteTexture(this.texture);
    }
}
