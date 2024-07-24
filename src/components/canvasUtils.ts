import { createDoubleFBO } from './fboUtils';

export function updateMousePosition(eX: number, eY: number, pointer: any, params: any) {
  pointer.dxTarget = eX - pointer.x;
  pointer.dyTarget = eY - pointer.y;

  pointer.dxTarget = Math.sign(pointer.dxTarget) * Math.pow(Math.abs(pointer.dxTarget), params.pointerPower);
  pointer.dyTarget = Math.sign(pointer.dyTarget) * Math.pow(Math.abs(pointer.dyTarget), params.pointerPower);

  pointer.x = eX;
  pointer.y = eY;

  pointer.moving = 1;
}

export function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, velocity: any, devicePixelRatio: number) {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  velocity = createDoubleFBO(gl, canvas.width, canvas.height);
}