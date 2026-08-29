import { useEffect, useRef, useState } from "react";
import { buildStableGlyphIndices, type GlyphPreset } from "./stableGlyphs";
import { buildRecolorMaskedColors } from "./recolorMask";

export type PreviewRendererMode = "point" | "glyph" | "particle";
export type { GlyphPreset } from "./stableGlyphs";

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec2 a_target_position;
in vec4 a_color;
in vec4 a_target_color;
in float a_glyph;
uniform float u_point_size;
uniform float u_morph_progress;
uniform int u_use_source_color;
uniform vec3 u_tint;
uniform vec2 u_view_scale;
flat out int v_glyph;
out vec4 v_color;
void main() {
  float morph = clamp(u_morph_progress, 0.0, 1.0);
  vec2 sourcePosition = mix(a_position, a_target_position, morph);
  vec4 sourceColor = mix(a_color, a_target_color, morph);
  vec2 p = sourcePosition * 0.94 * u_view_scale;
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = u_point_size;
  v_glyph = int(a_glyph + 0.5);
  v_color = u_use_source_color == 1 ? sourceColor : vec4(u_tint, sourceColor.a);
}`;

const pointFragmentShaderSource = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float alpha = smoothstep(0.5, 0.14, length(p));
  outColor = vec4(v_color.rgb, v_color.a * alpha);
}`;

const particleFragmentShaderSource = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float core = smoothstep(0.30, 0.0, d);
  float halo = smoothstep(0.5, 0.10, d) * 0.45;
  vec3 highlight = mix(v_color.rgb * 0.72, min(vec3(1.0), v_color.rgb * 1.35 + 0.12), core);
  outColor = vec4(highlight, v_color.a * min(1.0, core + halo));
}`;

const glyphFragmentShaderSource = `#version 300 es
precision highp float;
flat in int v_glyph;
in vec4 v_color;
out vec4 outColor;

float box(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - halfSize;
  return 1.0 - smoothstep(0.0, 0.055, max(d.x, d.y));
}
float ring(vec2 p, vec2 scale, float radius, float thickness) {
  float d = abs(length(p / scale) - radius);
  return 1.0 - smoothstep(thickness, thickness + 0.05, d);
}
float lineSeg(vec2 p, vec2 a, vec2 b, float width) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return 1.0 - smoothstep(width, width + 0.04, length(pa - ba * h));
}

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float ink = 0.0;
  if (v_glyph == 0) {
    ink = ring(p, vec2(0.62, 0.90), 0.39, 0.035);
  } else if (v_glyph == 1) {
    float stem = box(p - vec2(0.03, 0.0), vec2(0.075, 0.38));
    float cap = box(p - vec2(-0.06, 0.31), vec2(0.12, 0.06));
    float foot = box(p - vec2(0.0, -0.34), vec2(0.20, 0.06));
    ink = max(stem, max(cap, foot));
  } else if (v_glyph == 2) {
    ink = smoothstep(0.13, 0.0, length(p));
  } else if (v_glyph == 3) {
    ink = max(box(p, vec2(0.34, 0.055)), box(p, vec2(0.055, 0.34)));
  } else if (v_glyph == 4) {
    ink = max(lineSeg(p, vec2(-0.28, -0.28), vec2(0.28, 0.28), 0.055), lineSeg(p, vec2(-0.28, 0.28), vec2(0.28, -0.28), 0.055));
  } else if (v_glyph == 5) {
    ink = max(box(p - vec2(0.0, 0.18), vec2(0.30, 0.05)), max(box(p, vec2(0.30, 0.05)), box(p + vec2(0.0, 0.18), vec2(0.30, 0.05))));
  } else if (v_glyph == 6) {
    ink = max(lineSeg(p, vec2(-0.30, -0.22), vec2(0.0, 0.30), 0.06), lineSeg(p, vec2(0.0, 0.30), vec2(0.30, -0.22), 0.06));
  } else {
    float outer = box(p, vec2(0.31, 0.31));
    float inner = box(p, vec2(0.19, 0.19));
    ink = max(0.0, outer - inner);
  }
  if (ink < 0.06) discard;
  outColor = vec4(v_color.rgb, v_color.a * ink);
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

function buildFallbackColors(count: number) {
  const colors = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) colors.set([0.72, 0.76, 1, 1], i * 4);
  return colors;
}

function hexRgb(hex: string) {
  const clean = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  return [Number.parseInt(clean.slice(0, 2), 16) / 255, Number.parseInt(clean.slice(2, 4), 16) / 255, Number.parseInt(clean.slice(4, 6), 16) / 255] as const;
}

function bindFloatBuffer(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
  data: Float32Array,
  size: number,
) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, name);
  if (location >= 0) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }
  return buffer;
}

export function WebGLPreview({
  positions,
  colors,
  targetPositions,
  targetColors,
  morphProgress = 0,
  mode = "point",
  elementSize = 1,
  tint = "#c7c2ff",
  background = "#090b10",
  useSourceColor = false,
  glyphPreset = "binary",
  transparentBackground = false,
  canvasRef: externalCanvasRef,
}: {
  positions?: Float32Array;
  colors?: Float32Array;
  targetPositions?: Float32Array;
  targetColors?: Float32Array;
  morphProgress?: number;
  mode?: PreviewRendererMode;
  elementSize?: number;
  tint?: string;
  background?: string;
  useSourceColor?: boolean;
  glyphPreset?: GlyphPreset;
  transparentBackground?: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef ?? internalCanvasRef;
  const morphProgressRef = useRef(morphProgress);
  morphProgressRef.current = morphProgress;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, preserveDrawingBuffer: true });
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
    const sourceColors = colors && colors.length === count * 4 ? colors : buildFallbackColors(count);
    const targetPoints = targetPositions && targetPositions.length === points.length ? targetPositions : points;
    const targetSourceColors = targetColors && targetColors.length === sourceColors.length ? targetColors : sourceColors;
    const displaySourceColors = useSourceColor ? sourceColors : buildRecolorMaskedColors(sourceColors);
    const displayTargetColors = useSourceColor ? targetSourceColors : buildRecolorMaskedColors(targetSourceColors);
    const glyphs = buildStableGlyphIndices(points, sourceColors, glyphPreset);

    const positionBuffer = bindFloatBuffer(gl, program, "a_position", points, 2);
    const targetPositionBuffer = bindFloatBuffer(gl, program, "a_target_position", targetPoints, 2);
    const colorBuffer = bindFloatBuffer(gl, program, "a_color", displaySourceColors, 4);
    const targetColorBuffer = bindFloatBuffer(gl, program, "a_target_color", displayTargetColors, 4);
    const glyphBuffer = bindFloatBuffer(gl, program, "a_glyph", glyphs, 1);

    const pointSize = gl.getUniformLocation(program, "u_point_size");
    const morph = gl.getUniformLocation(program, "u_morph_progress");
    const sourceColorUniform = gl.getUniformLocation(program, "u_use_source_color");
    const tintUniform = gl.getUniformLocation(program, "u_tint");
    const viewScaleUniform = gl.getUniformLocation(program, "u_view_scale");
    const tintRgb = hexRgb(tint);
    const bgRgb = hexRgb(background);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let frame = 0;
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      if (transparentBackground) gl.clearColor(0, 0, 0, 0);
      else gl.clearColor(bgRgb[0], bgRgb[1], bgRgb[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(morph, Math.min(1, Math.max(0, morphProgressRef.current)));
      gl.uniform1i(sourceColorUniform, useSourceColor ? 1 : 0);
      gl.uniform3f(tintUniform, tintRgb[0], tintRgb[1], tintRgb[2]);
      const viewportAspect = width / Math.max(1, height);
      const viewScaleX = viewportAspect >= 1 ? 1 / viewportAspect : 1;
      const viewScaleY = viewportAspect >= 1 ? 1 : viewportAspect;
      gl.uniform2f(viewScaleUniform, viewScaleX, viewScaleY);
      const baseSize = mode === "glyph" ? 8 : mode === "particle" ? 5.5 : 2.4;
      gl.uniform1f(pointSize, baseSize * Math.max(0.4, elementSize) * dpr);
      gl.drawArrays(gl.POINTS, 0, count);
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(targetPositionBuffer);
      gl.deleteBuffer(colorBuffer);
      gl.deleteBuffer(targetColorBuffer);
      gl.deleteBuffer(glyphBuffer);
      gl.deleteProgram(program);
    };
  }, [background, canvasRef, colors, elementSize, glyphPreset, mode, positions, targetColors, targetPositions, tint, transparentBackground, useSourceColor]);

  if (error) return <div className="preview-error">{error}</div>;
  return <canvas ref={canvasRef} className="preview-canvas" />;
}