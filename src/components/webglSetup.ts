export function setupWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const gl = canvas.getContext("webgl");
  if (!gl) return null;

  gl.getExtension("OES_texture_float");
  return gl;
}