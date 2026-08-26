import { useEffect, useRef, useState } from "react";

export type PreviewRendererMode = "point" | "glyph" | "particle";

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in float a_glyph;
uniform float u_time;
uniform float u_point_size;
uniform int u_mode;
flat out int v_glyph;
out float v_phase;
void main() {
  float wave = sin(u_time * 1.4 + a_position.x * 8.0 + a_position.y * 5.0);
  float pulse = u_mode == 2 ? 0.024 * wave : 0.012 * wave;
  vec2 drift = u_mode == 2 ? vec2(cos(u_time + a_position.y * 9.0), sin(u_time * 0.8 + a_position.x * 7.0)) * 0.005 : vec2(0.0);
  vec2 p = a_position * (0.94 + pulse) + drift;
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = u_point_size;
  v_glyph = int(a_glyph + 0.5);
  v_phase = wave;
}`;

const pointFragmentShaderSource = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float alpha = smoothstep(0.5, 0.14, length(p));
  outColor = vec4(0.72, 0.76, 1.0, alpha);
}`;

const particleFragmentShaderSource = `#version 300 es
precision highp float;
in float v_phase;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float core = smoothstep(0.30, 0.0, d);
  float halo = smoothstep(0.5, 0.10, d) * 0.45;
  float energy = 0.86 + 0.14 * v_phase;
  vec3 color = mix(vec3(0.42, 0.34, 1.0), vec3(0.88, 0.78, 1.0), core);
  outColor = vec4(color * energy, min(1.0, core + halo));
}`;

const glyphFragmentShaderSource = `#version 300 es
precision highp float;
flat in int v_glyph;
out vec4 outColor;

float box(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - halfSize;
  return 1.0 - smoothstep(0.0, 0.055, max(d.x, d.y));
}

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float ink;
  if (v_glyph == 0) {
    float ring = abs(length(p / vec2(0.62, 0.90)) - 0.39);
    ink = 1.0 - smoothstep(0.035, 0.085, ring);
  } else {
    float stem = box(p - vec2(0.03, 0.0), vec2(0.075, 0.38));
    float cap = box(p - vec2(-0.06, 0.31), vec2(0.12, 0.06));
    float foot = box(p - vec2(0.0, -0.34), vec2(0.20, 0.06));
    ink = max(stem, max(cap, foot));
  }
  if (ink < 0.06) discard;
  outColor = vec4(0.78, 0.76, 1.0, ink);
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

function createProgram(gl: WebGL2RenderingContext, fragmentSource: string) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
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

function buildGlyphIndices(count: number) {
  const glyphs = new Float32Array(count);
  for (let i = 0; i < count; i += 1) glyphs[i] = i % 2;
  return glyphs;
}

export function WebGLPreview({
  positions,
  mode = "point",
  elementSize = 1,
}: {
  positions?: Float32Array;
  mode?: PreviewRendererMode;
  elementSize?: number;
}) {
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

    const fragmentSource = mode === "glyph" ? glyphFragmentShaderSource : mode === "particle" ? particleFragmentShaderSource : pointFragmentShaderSource;
    let program: WebGLProgram;
    try {
      program = createProgram(gl, fragmentSource);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "WebGL initialization failed");
      return;
    }

    const points = positions && positions.length >= 2 ? positions : buildFallbackField();
    const count = points.length / 2;
    const glyphs = buildGlyphIndices(count);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const glyphBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glyphBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, glyphs, gl.STATIC_DRAW);
    const glyph = gl.getAttribLocation(program, "a_glyph");
    if (glyph >= 0) {
      gl.enableVertexAttribArray(glyph);
      gl.vertexAttribPointer(glyph, 1, gl.FLOAT, false, 0, 0);
    }

    const time = gl.getUniformLocation(program, "u_time");
    const pointSize = gl.getUniformLocation(program, "u_point_size");
    const modeUniform = gl.getUniformLocation(program, "u_mode");
    gl.useProgram(program);
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
      gl.uniform1i(modeUniform, mode === "particle" ? 2 : mode === "glyph" ? 1 : 0);
      const baseSize = mode === "glyph" ? 8 : mode === "particle" ? 5.5 : 2.4;
      gl.uniform1f(pointSize, baseSize * Math.max(0.4, elementSize) * dpr);
      gl.drawArrays(gl.POINTS, 0, count);
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(glyphBuffer);
      gl.deleteProgram(program);
    };
  }, [elementSize, mode, positions]);

  if (error) return <div className="preview-error">{error}</div>;
  return <canvas ref={canvasRef} className="preview-canvas" />;
}
