export interface Shape {
  type: string;
  position: [number, number];
  color: [number, number, number];
}

export function createShape(type: string, options: { x: number, y: number, color: [number, number, number] }): Shape {
  return {
    type,
    position: [options.x, options.y],
    color: options.color,
  };
}

export function renderShape(gl: WebGLRenderingContext, program: WebGLProgram, shape: Shape) {
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const colorLocation = gl.getUniformLocation(program, "u_color");

  gl.uniform3fv(colorLocation, shape.color);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const positions = new Float32Array([
    shape.position[0] - 0.1, shape.position[1] - 0.1,
    shape.position[0] + 0.1, shape.position[1] - 0.1,
    shape.position[0] - 0.1, shape.position[1] + 0.1,
    shape.position[0] + 0.1, shape.position[1] + 0.1,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}