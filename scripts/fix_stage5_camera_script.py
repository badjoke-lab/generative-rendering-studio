from pathlib import Path

p = Path("scripts/stage5_camera_controls_once.py")
text = p.read_text()
old = '''replace_once(main,
    'glyphPreset={glyphPreset} originalOnTop={videoOriginalOnTop} />',
    'glyphPreset={glyphPreset} originalOnTop={videoOriginalOnTop} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />')
replace_once(main,
    'glyphPreset={glyphPreset} />',
    'glyphPreset={glyphPreset} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />')
'''
new = '''replace_once(main,
    '<VideoCompositePreview originalCanvasRef={originalUnderlayCanvas} transformedCanvasRef={previewCanvas} raster={raster} originalOpacity={effectiveVideoOriginalOpacity} originalOnTop={videoOriginalOnTop} transformedBlendMode={videoBlendMode} positions={previewPositions} colors={previewColors} mode={rendererMode} motionMode={motionMode} motionStrength={effectiveMotionStrength} motionSpeed={motionSpeed} elementSize={effectiveElementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} />',
    '<VideoCompositePreview originalCanvasRef={originalUnderlayCanvas} transformedCanvasRef={previewCanvas} raster={raster} originalOpacity={effectiveVideoOriginalOpacity} originalOnTop={videoOriginalOnTop} transformedBlendMode={videoBlendMode} positions={previewPositions} colors={previewColors} mode={rendererMode} motionMode={motionMode} motionStrength={effectiveMotionStrength} motionSpeed={motionSpeed} elementSize={effectiveElementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />')
replace_once(main,
    '<WebGLPreview canvasRef={previewCanvas} positions={previewPositions} colors={previewColors} targetPositions={activeMorph?.toPositions} targetColors={activeMorph?.toColors} morphProgress={activeMorph ? easedProgress : 0} mode={rendererMode} motionMode={motionMode} motionStrength={effectiveMotionStrength} motionSpeed={motionSpeed} elementSize={effectiveElementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} />',
    '<WebGLPreview canvasRef={previewCanvas} positions={previewPositions} colors={previewColors} targetPositions={activeMorph?.toPositions} targetColors={activeMorph?.toColors} morphProgress={activeMorph ? easedProgress : 0} mode={rendererMode} motionMode={motionMode} motionStrength={effectiveMotionStrength} motionSpeed={motionSpeed} elementSize={effectiveElementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />')
'''
if old not in text:
    raise SystemExit("camera matcher block not found")
p.write_text(text.replace(old, new, 1))
