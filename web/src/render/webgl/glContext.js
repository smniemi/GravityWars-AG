export function createWebGLContext(canvas) {
    const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false, // 2D game, depth buffer not strictly needed unless we use it for layering
        stencil: false,
        preserveDrawingBuffer: false
    });
    if (!gl) {
        throw new Error('WebGL2 not supported');
    }
    return gl;
}
export function resizeCanvasToDisplaySize(canvas, multiplier = 1) {
    const width = (canvas.clientWidth * multiplier) | 0;
    const height = (canvas.clientHeight * multiplier) | 0;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}
