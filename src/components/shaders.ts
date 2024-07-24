import { vertexShaderSource, fragmentSpeedShaderSource, fragmentOutputShaderSource } from './shaderSources';

function createShader(gl: WebGLRenderingContext, sourceCode: string, type: number) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, sourceCode);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createShaderProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create shader program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

function getUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
  const uniforms: { [key: string]: WebGLUniformLocation } = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    const uniformInfo = gl.getActiveUniform(program, i);
    if (uniformInfo) {
      if (uniformInfo.name.includes('[0]')) {
        // Handle array uniforms
        const baseName = uniformInfo.name.slice(0, -3);
        for (let j = 0; j < 10; j++) {
          const name = `${baseName}[${j}]`;
          uniforms[name] = gl.getUniformLocation(program, name) as WebGLUniformLocation;
        }
      } else {
        uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name) as WebGLUniformLocation;
      }
    }
  }
  return uniforms;
}

export function createShaders(gl: WebGLRenderingContext) {
  const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER) as WebGLShader;
  const fragmentSpeedShader = createShader(gl, fragmentSpeedShaderSource, gl.FRAGMENT_SHADER) as WebGLShader;
  const fragmentOutputShader = createShader(gl, fragmentOutputShaderSource, gl.FRAGMENT_SHADER) as WebGLShader;

  const speedShaderProgram = createShaderProgram(gl, vertexShader, fragmentSpeedShader) as WebGLProgram;
  const outputShaderProgram = createShaderProgram(gl, vertexShader, fragmentOutputShader) as WebGLProgram;

  const speedShaderUniforms = getUniforms(gl, speedShaderProgram);
  const outputShaderUniforms = getUniforms(gl, outputShaderProgram);

  return { speedShaderProgram, outputShaderProgram, speedShaderUniforms, outputShaderUniforms };
}