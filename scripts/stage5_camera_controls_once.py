from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing pattern in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


# WebGL camera uniforms and live refs.
webgl = "apps/web/src/webgl/WebGLPreview.tsx"
replace_once(webgl,
    "uniform vec3 u_tint;\nuniform vec2 u_view_scale;",
    "uniform vec3 u_tint;\nuniform vec2 u_view_scale;\nuniform vec2 u_camera_pan;\nuniform float u_camera_zoom;\nuniform float u_camera_rotation;")
replace_once(webgl,
    "  vec2 p = (sourcePosition * (0.94 + pulse) + drift) * u_view_scale;\n  gl_Position = vec4(p, 0.0, 1.0);",
    "  vec2 scene = sourcePosition * (0.94 + pulse) + drift;\n  float cameraRadians = radians(u_camera_rotation);\n  float cameraCos = cos(cameraRadians);\n  float cameraSin = sin(cameraRadians);\n  mat2 cameraRotation = mat2(cameraCos, cameraSin, -cameraSin, cameraCos);\n  vec2 p = (cameraRotation * scene) * u_camera_zoom * u_view_scale + u_camera_pan;\n  gl_Position = vec4(p, 0.0, 1.0);")
replace_once(webgl,
    '  glyphPreset = "binary",\n  transparentBackground = false,',
    '  glyphPreset = "binary",\n  cameraPanX = 0,\n  cameraPanY = 0,\n  cameraZoom = 1,\n  cameraRotation = 0,\n  transparentBackground = false,')
replace_once(webgl,
    "  glyphPreset?: GlyphPreset;\n  transparentBackground?: boolean;",
    "  glyphPreset?: GlyphPreset;\n  cameraPanX?: number;\n  cameraPanY?: number;\n  cameraZoom?: number;\n  cameraRotation?: number;\n  transparentBackground?: boolean;")
replace_once(webgl,
    "  const motionSpeedRef = useRef(motionSpeed);\n  motionSpeedRef.current = motionSpeed;\n  const [error, setError] = useState<string | null>(null);",
    "  const motionSpeedRef = useRef(motionSpeed);\n  motionSpeedRef.current = motionSpeed;\n  const cameraPanXRef = useRef(cameraPanX);\n  cameraPanXRef.current = cameraPanX;\n  const cameraPanYRef = useRef(cameraPanY);\n  cameraPanYRef.current = cameraPanY;\n  const cameraZoomRef = useRef(cameraZoom);\n  cameraZoomRef.current = cameraZoom;\n  const cameraRotationRef = useRef(cameraRotation);\n  cameraRotationRef.current = cameraRotation;\n  const [error, setError] = useState<string | null>(null);")
replace_once(webgl,
    '    const viewScaleUniform = gl.getUniformLocation(program, "u_view_scale");',
    '    const viewScaleUniform = gl.getUniformLocation(program, "u_view_scale");\n    const cameraPanUniform = gl.getUniformLocation(program, "u_camera_pan");\n    const cameraZoomUniform = gl.getUniformLocation(program, "u_camera_zoom");\n    const cameraRotationUniform = gl.getUniformLocation(program, "u_camera_rotation");')
replace_once(webgl,
    "      gl.uniform2f(viewScaleUniform, viewScaleX, viewScaleY);\n      const baseSize = mode === \"glyph\" ? 8 : mode === \"particle\" ? 5.5 : 2.4;\n      gl.uniform1f(pointSize, baseSize * Math.max(0.4, elementSize) * dpr);",
    "      gl.uniform2f(viewScaleUniform, viewScaleX, viewScaleY);\n      const safeCameraPanX = Number.isFinite(cameraPanXRef.current) ? Math.min(1, Math.max(-1, cameraPanXRef.current)) : 0;\n      const safeCameraPanY = Number.isFinite(cameraPanYRef.current) ? Math.min(1, Math.max(-1, cameraPanYRef.current)) : 0;\n      const safeCameraZoom = Number.isFinite(cameraZoomRef.current) ? Math.min(3, Math.max(0.25, cameraZoomRef.current)) : 1;\n      const safeCameraRotation = Number.isFinite(cameraRotationRef.current) ? cameraRotationRef.current : 0;\n      gl.uniform2f(cameraPanUniform, safeCameraPanX, safeCameraPanY);\n      gl.uniform1f(cameraZoomUniform, safeCameraZoom);\n      gl.uniform1f(cameraRotationUniform, safeCameraRotation);\n      const baseSize = mode === \"glyph\" ? 8 : mode === \"particle\" ? 5.5 : 2.4;\n      gl.uniform1f(pointSize, baseSize * Math.max(0.4, elementSize) * dpr * safeCameraZoom);")
replace_once(webgl,
    '  return <canvas ref={canvasRef} className="preview-canvas" />;',
    '  return <canvas ref={canvasRef} className="preview-canvas" data-camera-pan-x={cameraPanX.toFixed(3)} data-camera-pan-y={cameraPanY.toFixed(3)} data-camera-zoom={cameraZoom.toFixed(3)} data-camera-rotation={cameraRotation.toFixed(1)} />;')

# Canvas 2D Original preview uses the same camera coordinate convention.
original = "apps/web/src/canvas/OriginalPreview.tsx"
replace_once(original,
    "  raster,\n  background,\n}: {",
    "  raster,\n  background,\n  cameraPanX = 0,\n  cameraPanY = 0,\n  cameraZoom = 1,\n  cameraRotation = 0,\n}: {")
replace_once(original,
    "  raster?: RasterPixels;\n  background: string;\n}) {",
    "  raster?: RasterPixels;\n  background: string;\n  cameraPanX?: number;\n  cameraPanY?: number;\n  cameraZoom?: number;\n  cameraRotation?: number;\n}) {")
replace_once(original,
    "        const x = (width - drawWidth) / 2;\n        const y = (height - drawHeight) / 2;\n        ctx.imageSmoothingEnabled = true;\n        ctx.imageSmoothingQuality = \"high\";\n        ctx.drawImage(source, x, y, drawWidth, drawHeight);",
    "        const safePanX = Number.isFinite(cameraPanX) ? Math.min(1, Math.max(-1, cameraPanX)) : 0;\n        const safePanY = Number.isFinite(cameraPanY) ? Math.min(1, Math.max(-1, cameraPanY)) : 0;\n        const safeZoom = Number.isFinite(cameraZoom) ? Math.min(3, Math.max(0.25, cameraZoom)) : 1;\n        const safeRotation = Number.isFinite(cameraRotation) ? cameraRotation : 0;\n        ctx.imageSmoothingEnabled = true;\n        ctx.imageSmoothingQuality = \"high\";\n        ctx.translate(width / 2 + safePanX * width / 2, height / 2 - safePanY * height / 2);\n        ctx.rotate((safeRotation * Math.PI) / 180);\n        ctx.scale(safeZoom, safeZoom);\n        ctx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);")
replace_once(original,
    "  }, [background, canvasRef, raster]);",
    "  }, [background, cameraPanX, cameraPanY, cameraRotation, cameraZoom, canvasRef, raster]);")
replace_once(original,
    '  return <canvas ref={canvasRef} className="preview-canvas" />;',
    '  return <canvas ref={canvasRef} className="preview-canvas" data-camera-pan-x={cameraPanX.toFixed(3)} data-camera-pan-y={cameraPanY.toFixed(3)} data-camera-zoom={cameraZoom.toFixed(3)} data-camera-rotation={cameraRotation.toFixed(1)} />;')

# Video composite forwards one scene camera to both existing layers.
composite = "apps/web/src/canvas/VideoCompositePreview.tsx"
replace_once(composite,
    "  useSourceColor,\n  glyphPreset,\n}: {",
    "  useSourceColor,\n  glyphPreset,\n  cameraPanX = 0,\n  cameraPanY = 0,\n  cameraZoom = 1,\n  cameraRotation = 0,\n}: {")
replace_once(composite,
    "  useSourceColor: boolean;\n  glyphPreset: GlyphPreset;\n}) {",
    "  useSourceColor: boolean;\n  glyphPreset: GlyphPreset;\n  cameraPanX?: number;\n  cameraPanY?: number;\n  cameraZoom?: number;\n  cameraRotation?: number;\n}) {")
replace_once(composite,
    '<OriginalPreview canvasRef={originalCanvasRef} raster={raster} background={background} />',
    '<OriginalPreview canvasRef={originalCanvasRef} raster={raster} background={background} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />')
replace_once(composite,
    "          glyphPreset={glyphPreset}\n          transparentBackground",
    "          glyphPreset={glyphPreset}\n          cameraPanX={cameraPanX}\n          cameraPanY={cameraPanY}\n          cameraZoom={cameraZoom}\n          cameraRotation={cameraRotation}\n          transparentBackground")

# App state, preview wiring, and camera inspector.
main = "apps/web/src/main.tsx"
replace_once(main,
    '  const [videoOriginalOnTop, setVideoOriginalOnTop] = useState(false);',
    '  const [videoOriginalOnTop, setVideoOriginalOnTop] = useState(false);\n  const [cameraPanX, setCameraPanX] = useState(0);\n  const [cameraPanY, setCameraPanY] = useState(0);\n  const [cameraZoom, setCameraZoom] = useState(1);\n  const [cameraRotation, setCameraRotation] = useState(0);')
replace_once(main,
    '<OriginalPreview canvasRef={previewCanvas} raster={raster} background={background} />',
    '<OriginalPreview canvasRef={previewCanvas} raster={raster} background={background} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />')
replace_once(main,
    'glyphPreset={glyphPreset} originalOnTop={videoOriginalOnTop} />',
    'glyphPreset={glyphPreset} originalOnTop={videoOriginalOnTop} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />')
replace_once(main,
    'glyphPreset={glyphPreset} />',
    'glyphPreset={glyphPreset} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />')
renderer_marker = '        <section className="inspector-section guided-section"><div className="section-guide"><span className="step-badge">2</span><div><h2>{t("inspector.rendererMode")}</h2>'
camera_section = '''        <section className="inspector-section" data-stage5-camera="true">\n          <h2>{t("camera.title")}</h2>\n          <p>{t("camera.hint")}</p>\n          <label>{t("camera.panX")}<div className="range-row"><input aria-label={t("camera.panX")} type="range" min="-100" max="100" value={Math.round(cameraPanX * 100)} disabled={animationExporting} onChange={(event) => setCameraPanX(Number(event.target.value) / 100)} /><output>{Math.round(cameraPanX * 100)}%</output></div></label>\n          <label>{t("camera.panY")}<div className="range-row"><input aria-label={t("camera.panY")} type="range" min="-100" max="100" value={Math.round(cameraPanY * 100)} disabled={animationExporting} onChange={(event) => setCameraPanY(Number(event.target.value) / 100)} /><output>{Math.round(cameraPanY * 100)}%</output></div></label>\n          <label>{t("camera.zoom")}<div className="range-row"><input aria-label={t("camera.zoom")} type="range" min="25" max="300" value={Math.round(cameraZoom * 100)} disabled={animationExporting} onChange={(event) => setCameraZoom(Number(event.target.value) / 100)} /><output>{Math.round(cameraZoom * 100)}%</output></div></label>\n          <label>{t("camera.rotation")}<div className="range-row"><input aria-label={t("camera.rotation")} type="range" min="-180" max="180" value={Math.round(cameraRotation)} disabled={animationExporting} onChange={(event) => setCameraRotation(Number(event.target.value))} /><output>{Math.round(cameraRotation)}°</output></div></label>\n          <button type="button" className="source-secondary" disabled={animationExporting} onClick={() => { setCameraPanX(0); setCameraPanY(0); setCameraZoom(1); setCameraRotation(0); }}>{t("camera.reset")}</button>\n        </section>\n'''
replace_once(main, renderer_marker, camera_section + renderer_marker)

# Locales.
replace_once("apps/web/src/i18n/locales/en.ts",
    '  "timeline.currentOpacity": "Current opacity",',
    '  "timeline.currentOpacity": "Current opacity",\n  "camera.title": "Camera",\n  "camera.hint": "Pan, zoom, or rotate the composed view. The same camera transform is used by Original and transformed renderers.",\n  "camera.panX": "Pan X",\n  "camera.panY": "Pan Y",\n  "camera.zoom": "Zoom",\n  "camera.rotation": "Rotation",\n  "camera.reset": "Reset camera",')
replace_once("apps/web/src/i18n/locales/ja.ts",
    '  "timeline.currentOpacity": "現在の濃さ",',
    '  "timeline.currentOpacity": "現在の濃さ",\n  "camera.title": "カメラ",\n  "camera.hint": "合成ビューを移動・拡大縮小・回転します。元画像と変換レンダラーで同じカメラ変換を使います。",\n  "camera.panX": "横移動",\n  "camera.panY": "縦移動",\n  "camera.zoom": "ズーム",\n  "camera.rotation": "回転",\n  "camera.reset": "カメラをリセット",')

# Browser regression and visual evidence.
test = Path("tests/browser/stage5-camera-controls.spec.ts")
test.write_text(r'''import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

async function webglBrightBounds(page: import("@playwright/test").Page) {
  return page.locator(".preview-frame .preview-canvas").evaluate((canvas) => {
    const target = canvas as HTMLCanvasElement;
    const gl = target.getContext("webgl2");
    if (!gl || target.width <= 0 || target.height <= 0) return null;
    const pixels = new Uint8Array(target.width * target.height * 4);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let minX = target.width;
    let maxX = -1;
    let minY = target.height;
    let maxY = -1;
    for (let y = 0; y < target.height; y += 1) {
      for (let x = 0; x < target.width; x += 1) {
        const i = (y * target.width + x) * 4;
        if ((pixels[i] ?? 0) > 48 || (pixels[i + 1] ?? 0) > 48 || (pixels[i + 2] ?? 0) > 48) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;
    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  });
}

async function createRibbon(page: import("@playwright/test").Page) {
  const panel = page.locator(".procedural-source-panel");
  await panel.getByRole("button", { name: "Ribbon" }).click();
  await panel.getByRole("button", { name: /Create procedural source/ }).click();
  await expect(page.locator(".asset-card.selected")).toContainText("Ribbon");
}

test("webkit second-browser critical: Stage 5 Camera pans zooms and rotates the shared WebGL view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");
  await createRibbon(page);

  const camera = page.locator('[data-stage5-camera="true"]');
  await expect(camera.getByRole("heading", { name: "Camera", exact: true })).toBeVisible();
  const before = await webglBrightBounds(page);
  expect(before).not.toBeNull();

  await page.getByLabel("Pan X").fill("30");
  await page.getByLabel("Pan Y").fill("20");
  await page.getByLabel("Zoom").fill("150");
  await page.getByLabel("Rotation").fill("25");

  const canvas = page.locator(".preview-frame .preview-canvas");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.300");
  await expect(canvas).toHaveAttribute("data-camera-pan-y", "0.200");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.500");
  await expect(canvas).toHaveAttribute("data-camera-rotation", "25.0");

  await expect.poll(async () => (await webglBrightBounds(page))?.centerX ?? 0).toBeGreaterThan((before?.centerX ?? 0) + 20);
  await expect.poll(async () => (await webglBrightBounds(page))?.centerY ?? 0).toBeGreaterThan((before?.centerY ?? 0) + 10);
  await expect.poll(async () => (await webglBrightBounds(page))?.width ?? 0).toBeGreaterThan((before?.width ?? 0) * 1.15);

  await page.screenshot({ path: `${evidenceDir}/stage5-camera-ribbon-1440x700-en.png`, fullPage: true });
  await page.getByLabel("Language").selectOption("ja");
  await expect(camera.getByRole("heading", { name: "カメラ", exact: true })).toBeVisible();
  await expect(page.getByLabel("横移動")).toHaveValue("30");
  await expect(page.getByLabel("ズーム")).toHaveValue("150");
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-ribbon-1440x700-ja.png`, fullPage: true });
});

test("Stage 5 Camera also transforms Original video canvas and still export", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Original canvas/export evidence is retained in Chromium");
  await page.setViewportSize({ width: 1440, height: 700 });
  const movingSquareWebm = Buffer.from(readFileSync("tests/fixtures/stage3-moving-square.webm.base64", "utf8").trim(), "base64");
  await page.goto("/");
  await page.locator('input[data-source-kind="video"]').setInputFiles({ name: "camera-source.webm", mimeType: "video/webm", buffer: movingSquareWebm });
  await page.getByRole("button", { name: "Original", exact: true }).click();
  const canvas = page.locator(".preview-frame .preview-canvas");
  const before = await canvas.screenshot();
  await page.getByLabel("Pan X").fill("35");
  await page.getByLabel("Pan Y").fill("-25");
  await page.getByLabel("Zoom").fill("140");
  await page.getByLabel("Rotation").fill("20");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.350");
  const after = await canvas.screenshot();
  expect(after.equals(before)).toBe(false);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const download = await downloadPromise;
  const path = `${evidenceDir}/outputs/stage5-camera-${download.suggestedFilename()}`;
  await download.saveAs(path);
  const bytes = readFileSync(path);
  expect(bytes.byteLength).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-original-1440x700-en.png`, fullPage: true });
});

test("Stage 5 Camera controls remain usable without horizontal overflow on mobile", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Mobile evidence is retained in Chromium");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await createRibbon(page);
  await page.getByLabel("Pan X").fill("20");
  await page.getByLabel("Zoom").fill("130");
  await page.getByLabel("Rotation").fill("-15");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('[data-stage5-camera="true"]')).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-ribbon-390x844-en.png`, fullPage: true });
});
''')
