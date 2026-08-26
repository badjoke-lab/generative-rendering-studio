import { useEffect, useRef, useState } from "react";

const vertexShaderSource = `#version 300 es
in vec2 a_position;
uniform float u_time;
void main() {
  float pulse = 0.012 * sin(u_time + a_position.x * 8.0 + a_position.y * 5.0);
  vec2 p = a_position * (0.94 + pulse);
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = 2.4;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float alpha = smoothstep(0.5, 0.14, length(p));
  outColor = vec4(0.72, 0.76, 1.0, alpha);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to allocate shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to allocate program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "Unknown link error";
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

function buildFallbackField(count = 2200) {
  const points = new Float32Array(count * 2);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    const r = 0.78 * Math.sqrt(t);
    const a = i * golden;
    points[i * 2] = Math.cos(a) * r * 1.18;
    points[i * 2 + 1] = Math.sin(a) * r * 0.72;
  }
  return points;
}

export function WebGLPreview({ positions }: { positions?: Float32Array }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true });
    if (!gl) {
      setError("WebGL2 is not available in this browser/device.");
      return;
    }

    let program: WebGLProgram;
    try {
      program = createProgram(gl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "WebGL initialization failed");
      return;
    }

    const points = positions && positions.length >= 2 ? positions : buildFallbackField();
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "a_position");
    const time = gl.getUniformLocation(program, "u_time");
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let frame = 0;
    const render = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0.035, 0.04, 0.055, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(time, now / 1000);
      gl.drawArrays(gl.POINTS, 0, points.length / 2);
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [positions]);

  if (error) return <div className="preview-error">{error}</div>;
  return <canvas ref={canvasRef} className="preview-canvas" />;
}
