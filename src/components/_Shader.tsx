import React, { useEffect, useRef, useState } from "react";
import { GUI } from "lil-gui";
import { setupWebGL } from "./webglSetup";
import { createShaders } from "./shaders";
import { createDoubleFBO, blit } from "./fboUtils";
import { updateMousePosition, resizeCanvas } from "./canvasUtils";

interface Blob {
  color: [number, number, number];
  position: [number, number];
  size: number;
}

interface Params {
  pointerMultiplier: number;
  pointerPower: number;
  deltaThreshold: number;
  pointerFadeSpeed: number;
  speedTextureFadeSpeed: number;
}

const MAX_BLOBS = 10;

const WebGLFluidSimulation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blobs, setBlobs] = useState<Blob[]>([
    { color: [0.8549, 0.7059, 0.1961], position: [0.3, 0.3], size: 1.0 },
    { color: [0.7569, 0.2863, 0.1765], position: [-0.3, 0], size: 1.2 },
    { color: [0.2627, 0.4627, 0.6706], position: [0.5, 0], size: 0.8 },
  ]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = setupWebGL(canvas);
    if (!gl) return;

    const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

    const params: Params = {
      pointerMultiplier: 0.051,
      pointerPower: 0.35,
      deltaThreshold: 0.5,
      pointerFadeSpeed: 0.75,
      speedTextureFadeSpeed: 0.95,
    };

    const pointer = {
      x: 0,
      y: 0,
      moving: 0,
      dx: 0,
      dy: 0,
      dxTarget: 0,
      dyTarget: 0,
    };

    const {
      speedShaderProgram,
      outputShaderProgram,
      speedShaderUniforms,
      outputShaderUniforms,
    } = createShaders(gl);

    let velocity = createDoubleFBO(gl, canvas.width, canvas.height);

    // Event listeners
    window.addEventListener("pointermove", (e) =>
      updateMousePosition(e.pageX, e.pageY, pointer, params)
    );
    window.addEventListener("touchmove", (e) =>
      updateMousePosition(
        e.targetTouches[0].pageX,
        e.targetTouches[0].pageY,
        pointer,
        params
      )
    );
    window.addEventListener("click", (e) =>
      updateMousePosition(e.pageX, e.pageY, pointer, params)
    );

    function updatePointer(pointer: any, params: Params) {
      pointer.dx += (pointer.dxTarget - pointer.dx) * params.deltaThreshold;
      pointer.dy += (pointer.dyTarget - pointer.dy) * params.deltaThreshold;
      pointer.moving *= params.pointerFadeSpeed;
      if (pointer.moving < 0.05) pointer.moving = 0;
    }

    function updateVelocity(
      gl: WebGLRenderingContext,
      program: WebGLProgram,
      uniforms: any,
      velocity: any,
      pointer: any,
      params: Params,
      canvas: HTMLCanvasElement
    ) {
      gl.useProgram(program);
      gl.uniform1i(uniforms.u_prev_frame_texture, velocity.read().texture);
      gl.uniform2f(
        uniforms.u_pointer_position,
        pointer.x / canvas.width,
        1 - pointer.y / canvas.height
      );
      gl.uniform1f(uniforms.u_pointer_power, pointer.moving);
      gl.uniform2f(uniforms.u_delta_xy, pointer.dx, pointer.dy);
      gl.uniform1f(uniforms.u_ratio, canvas.width / canvas.height);
      gl.uniform1f(uniforms.u_speed_fade, params.speedTextureFadeSpeed);

      blit(gl, velocity.write());
      velocity.swap();
    }

    function updateUniforms() {
      if (!gl) return;
      gl.useProgram(outputShaderProgram);

      gl.uniform1i(outputShaderUniforms.u_blob_count, blobs.length);

      for (let i = 0; i < MAX_BLOBS; i++) {
        if (i < blobs.length) {
          gl.uniform3fv(
            outputShaderUniforms[`u_blob_colors[${i}]`],
            blobs[i].color
          );
          gl.uniform2fv(
            outputShaderUniforms[`u_blob_positions[${i}]`],
            blobs[i].position
          );
          gl.uniform1f(
            outputShaderUniforms[`u_blob_sizes[${i}]`],
            blobs[i].size
          );
        } else {
          // Set default values for unused blob slots
          gl.uniform3fv(outputShaderUniforms[`u_blob_colors[${i}]`], [0, 0, 0]);
          gl.uniform2fv(outputShaderUniforms[`u_blob_positions[${i}]`], [0, 0]);
          gl.uniform1f(outputShaderUniforms[`u_blob_sizes[${i}]`], 0);
        }
      }

      // Update pointer position
      gl.uniform2f(
        outputShaderUniforms.u_pointer_position,
        pointer.x / canvas.width,
        pointer.y / canvas.height
      );
    }

    function renderOutput(
      gl: WebGLRenderingContext,
      program: WebGLProgram,
      uniforms: any,
      velocity: any,
      canvas: HTMLCanvasElement
    ) {
      gl.useProgram(program);
      gl.uniform1i(uniforms.u_speed_texture, velocity.read().texture);
      gl.uniform1f(uniforms.u_ratio, canvas.width / canvas.height);

      blit(gl);
    }

    // Animation loop
    function render() {
      if (!gl) return;
      const currentTime = performance.now();

      gl.useProgram(outputShaderProgram);
      gl.uniform1f(outputShaderUniforms.u_time, currentTime);

      updatePointer(pointer, params);

      updateVelocity(
        gl,
        speedShaderProgram,
        speedShaderUniforms,
        velocity,
        pointer,
        params,
        canvas
      );

      updateUniforms();

      renderOutput(
        gl,
        outputShaderProgram,
        outputShaderUniforms,
        velocity,
        canvas
      );

      requestAnimationFrame(render);
    }

    // GUI setup
    const gui = new GUI();
    gui
      .add(params, "pointerMultiplier", 0, 0.3)
      .onChange(() => {
        gl.useProgram(outputShaderProgram);
        gl.uniform1f(
          outputShaderUniforms.u_pointer_multiplier,
          params.pointerMultiplier
        );
      })
      .name("cursor disturbing power");

    // Add blob controls
    const blobFolder = gui.addFolder("Blobs");
    blobs.forEach((blob, index) => {
      const blobGui = blobFolder.addFolder(`Blob ${index + 1}`);
      blobGui.addColor(blob, "color");
      blobGui.add(blob.position, "0", -1, 1).name("X");
      blobGui.add(blob.position, "1", -1, 1).name("Y");
      blobGui.add(blob, "size", 0.1, 2);
    });

    // Add blob button
    blobFolder.add(
      {
        addBlob: () => {
          if (blobs.length < MAX_BLOBS) {
            setBlobs([
              ...blobs,
              {
                color: [Math.random(), Math.random(), Math.random()],
                position: [Math.random() * 2 - 1, Math.random() * 2 - 1],
                size: Math.random() + 0.5,
              },
            ]);
          }
        },
      },
      "addBlob"
    );

    // Initial setup
    resizeCanvas(canvas, gl, velocity, devicePixelRatio);
    window.addEventListener("resize", () =>
      resizeCanvas(canvas, gl, velocity, devicePixelRatio)
    );

    // Start the animation
    render();

    // Cleanup function
    return () => {
      window.removeEventListener("resize", () =>
        resizeCanvas(canvas, gl, velocity, devicePixelRatio)
      );
      gui.destroy();
    };
  }, [blobs]);

  return (
    <div className="w-full h-full overflow-hidden bg-[#f3f2f1]">
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full" />
    </div>
  );
};

export default WebGLFluidSimulation;
