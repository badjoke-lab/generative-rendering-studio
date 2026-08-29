from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing replacement target: {label}")
    return text.replace(old, new, 1)


main_path = Path("apps/web/src/main.tsx")
main = main_path.read_text()
main = replace_once(main, '  createMorphMapping,\n', '  createMorphMapping,\n  createMotionStrengthTrack,\n  createNumericKeyframe,\n', 'core imports create')
main = replace_once(main, '  sampleRasterToPointField,\n', '  sampleMotionStrengthTrack,\n  sampleRasterToPointField,\n', 'core imports sample')
main = replace_once(main, '  type MorphEasing,\n', '  type KeyframeEasing,\n  type MorphEasing,\n', 'core imports easing')
main = replace_once(
    main,
    '  const [motionDuration, setMotionDuration] = useState(3);\n',
    '  const [motionDuration, setMotionDuration] = useState(3);\n  const [motionKeyframesEnabled, setMotionKeyframesEnabled] = useState(false);\n  const [motionStrengthStart, setMotionStrengthStart] = useState(0.35);\n  const [motionStrengthEnd, setMotionStrengthEnd] = useState(1.65);\n  const [motionKeyframeEasing, setMotionKeyframeEasing] = useState<KeyframeEasing>("ease-in-out");\n  const [motionTimelineTime, setMotionTimelineTime] = useState(0);\n  const [motionTimelinePlaying, setMotionTimelinePlaying] = useState(false);\n',
    'motion keyframe state',
)
anchor = '  const videoRoleSuffix = `${hasVideoTexture ? ` · ${t("preview.videoTextured")}` : ""}${hasVideoMask ? ` · ${t("preview.videoMasked")}` : ""}${hasVideoAnalysis ? ` · ${t("preview.videoAnalyzed")}` : ""}`;\n\n'
insert = '''  const videoRoleSuffix = `${hasVideoTexture ? ` · ${t("preview.videoTextured")}` : ""}${hasVideoMask ? ` · ${t("preview.videoMasked")}` : ""}${hasVideoAnalysis ? ` · ${t("preview.videoAnalyzed")}` : ""}`;
  const motionStrengthTrack = useMemo(
    () => createMotionStrengthTrack("motion-strength", [
      createNumericKeyframe(0, motionStrengthStart, motionKeyframeEasing),
      createNumericKeyframe(motionDuration, motionStrengthEnd),
    ]),
    [motionDuration, motionKeyframeEasing, motionStrengthEnd, motionStrengthStart],
  );
  const motionTimelineActive = motionKeyframesEnabled && motionMode !== "static" && !isVideoSource && !morphEnabled;
  const effectiveMotionStrength = motionTimelineActive
    ? sampleMotionStrengthTrack(motionStrengthTrack, motionTimelineTime) ?? motionStrength
    : motionStrength;

'''
main = replace_once(main, anchor, insert, 'motion track memo')
morph_effect = '''  useEffect(() => {
    if (!morphPlaying || !morphEnabled || !morphPacked || isVideoSource) return;
    const start = performance.now() - morphProgress * morphDuration * 1000;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(1, (now - start) / Math.max(100, morphDuration * 1000));
      setMorphProgress(next);
      if (next >= 1) setMorphPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isVideoSource, morphDuration, morphEnabled, morphPacked, morphPlaying]);

'''
timeline_effect = morph_effect + '''  useEffect(() => {
    if (!motionTimelinePlaying || !motionTimelineActive) return;
    const start = performance.now() - motionTimelineTime * 1000;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(motionDuration, (now - start) / 1000);
      setMotionTimelineTime(next);
      if (next >= motionDuration) setMotionTimelinePlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motionDuration, motionTimelineActive, motionTimelinePlaying]);

'''
main = replace_once(main, morph_effect, timeline_effect, 'motion timeline playback effect')
main = replace_once(main, '    setMorphPlaying(false);\n    if (animateMorph) {', '    setMorphPlaying(false);\n    setMotionTimelinePlaying(false);\n    const animateMotionKeyframes = animateMotion && motionKeyframesEnabled && !animateMorph;\n    if (animateMotionKeyframes) setMotionTimelineTime(0);\n    if (animateMorph) {', 'export timeline setup')
main = replace_once(main, '        onProgress: animateMorph ? setMorphProgress : () => {},\n', '        onProgress: animateMorph\n          ? setMorphProgress\n          : animateMotionKeyframes\n            ? (progress) => setMotionTimelineTime(progress * motionDuration)\n            : () => {},\n', 'export progress route')
main = replace_once(main, '      if (animateMorph) setMorphProgress(1);\n      setAnimationExporting(false);', '      if (animateMorph) setMorphProgress(1);\n      if (animateMotionKeyframes) setMotionTimelineTime(motionDuration);\n      setAnimationExporting(false);', 'export timeline final')
old_transport_state = '''  const transportProgress = isVideoSource && videoDuration > 0 ? (videoTime / videoDuration) * 100 : morphProgress * 100;
  const transportPlaying = isVideoSource ? videoPlaying : morphPlaying;
'''
new_transport_state = '''  const transportProgress = isVideoSource && videoDuration > 0
    ? (videoTime / videoDuration) * 100
    : motionTimelineActive
      ? (motionTimelineTime / Math.max(0.001, motionDuration)) * 100
      : morphProgress * 100;
  const transportPlaying = isVideoSource ? videoPlaying : motionTimelineActive ? motionTimelinePlaying : morphPlaying;
  const transportCanUse = isVideoSource
    ? hasSource && videoDuration > 0
    : motionTimelineActive
      ? hasSource && rendererMode !== "original"
      : canMorph;
  const playTransport = () => {
    if (isVideoSource) { void playVideo(); return; }
    if (motionTimelineActive) {
      if (motionTimelineTime >= motionDuration) setMotionTimelineTime(0);
      setMotionTimelinePlaying(true);
      return;
    }
    setMorphEnabled(true);
    if (morphProgress >= 1) setMorphProgress(0);
    setMorphPlaying(true);
  };
  const stopTransport = () => {
    if (isVideoSource) stopVideo();
    else if (motionTimelineActive) setMotionTimelinePlaying(false);
    else setMorphPlaying(false);
  };
  const seekTransport = (progress: number) => {
    if (isVideoSource) { seekVideo(progress); return; }
    if (motionTimelineActive) {
      setMotionTimelinePlaying(false);
      setMotionTimelineTime(progress * motionDuration);
      return;
    }
    setMorphPlaying(false);
    setMorphProgress(progress);
  };
'''
main = replace_once(main, old_transport_state, new_transport_state, 'transport state')
main = main.replace('motionStrength={motionStrength}', 'motionStrength={effectiveMotionStrength}')
main = replace_once(main, 'isVideoSource ? formatTime(videoTime) : morphEnabled ? `${Math.round(morphProgress * 100)}%` : "00:00:00.00"', 'isVideoSource ? formatTime(videoTime) : motionTimelineActive ? formatTime(motionTimelineTime) : morphEnabled ? `${Math.round(morphProgress * 100)}%` : "00:00:00.00"', 'preview timecode')
old_transport = '''        <div className="transport-bar">
          <button aria-label={isVideoSource ? t("video.play") : t("morph.play")} disabled={isVideoSource ? !hasSource || videoPlaying || animationExporting : !canMorph || animationExporting} onClick={() => { if (isVideoSource) void playVideo(); else { setMorphEnabled(true); if (morphProgress >= 1) setMorphProgress(0); setMorphPlaying(true); } }}>▶</button>
          <button aria-label={isVideoSource ? t("video.stop") : t("morph.stop")} disabled={!transportPlaying || animationExporting} onClick={() => { if (isVideoSource) stopVideo(); else setMorphPlaying(false); }}>■</button>
          <button aria-label={isVideoSource ? t("video.start") : "Start"} disabled={isVideoSource ? !hasSource || animationExporting : !canMorph || animationExporting} onClick={() => { if (isVideoSource) seekVideo(0); else { setMorphPlaying(false); setMorphProgress(0); } }}>|◀</button>
          <button aria-label={isVideoSource ? t("video.end") : "End"} disabled={isVideoSource ? !hasSource || videoDuration <= 0 || animationExporting : !canMorph || animationExporting} onClick={() => { if (isVideoSource) seekVideo(1); else { setMorphPlaying(false); setMorphProgress(1); } }}>▶|</button>
          <div className="transport-time">{isVideoComposite ? t("preview.videoComposite") : isVideoSource ? t("preview.video") : morphEnabled ? t("preview.morph") : t("preview.stage1")}</div>
          <input aria-label={isVideoSource ? t("video.timelinePosition") : t("preview.timelinePosition")} type="range" min="0" max="100" value={Math.round(transportProgress)} disabled={isVideoSource ? !hasSource || videoDuration <= 0 || animationExporting : !canMorph || animationExporting} onChange={(e) => { const progress = Number(e.target.value) / 100; if (isVideoSource) seekVideo(progress); else { setMorphPlaying(false); setMorphProgress(progress); } }} />
        </div>
'''
new_transport = '''        <div className="transport-bar" data-timeline-mode={motionTimelineActive ? "motion-strength" : isVideoSource ? "video" : morphEnabled ? "morph" : "idle"}>
          <button aria-label={motionTimelineActive ? t("timeline.play") : isVideoSource ? t("video.play") : t("morph.play")} disabled={!transportCanUse || transportPlaying || animationExporting} onClick={playTransport}>▶</button>
          <button aria-label={motionTimelineActive ? t("timeline.stop") : isVideoSource ? t("video.stop") : t("morph.stop")} disabled={!transportPlaying || animationExporting} onClick={stopTransport}>■</button>
          <button aria-label={motionTimelineActive ? t("timeline.start") : isVideoSource ? t("video.start") : "Start"} disabled={!transportCanUse || animationExporting} onClick={() => seekTransport(0)}>|◀</button>
          <button aria-label={motionTimelineActive ? t("timeline.end") : isVideoSource ? t("video.end") : "End"} disabled={!transportCanUse || animationExporting} onClick={() => seekTransport(1)}>▶|</button>
          <div className="transport-time">{motionTimelineActive ? t("timeline.motionStrength") : isVideoComposite ? t("preview.videoComposite") : isVideoSource ? t("preview.video") : morphEnabled ? t("preview.morph") : t("preview.stage1")}</div>
          <input aria-label={motionTimelineActive ? t("timeline.position") : isVideoSource ? t("video.timelinePosition") : t("preview.timelinePosition")} type="range" min="0" max="100" value={Math.round(transportProgress)} disabled={!transportCanUse || animationExporting} onChange={(e) => seekTransport(Number(e.target.value) / 100)} />
        </div>
'''
main = replace_once(main, old_transport, new_transport, 'transport ui')
old_motion = '''        {rendererMode !== "original" && <section className="inspector-section" data-stage5-motion="true"><h2>{t("motion.title")}</h2><p>{t("motion.hint")}</p><label>{t("motion.type")}<select aria-label={t("motion.type")} value={motionMode} disabled={animationExporting} onChange={(e) => setMotionMode(e.target.value as PreviewMotionMode)}><option value="static">{t("motion.static")}</option><option value="pulse">{t("motion.pulse")}</option><option value="drift">{t("motion.drift")}</option></select></label>{motionMode !== "static" && <><label>{t("motion.strength")}<div className="range-row"><input aria-label={t("motion.strength")} type="range" min="0" max="200" value={Math.round(motionStrength * 100)} disabled={animationExporting} onChange={(e) => setMotionStrength(Number(e.target.value) / 100)} /><output>{Math.round(motionStrength * 100)}%</output></div></label><label>{t("motion.speed")}<div className="range-row"><input aria-label={t("motion.speed")} type="range" min="25" max="300" value={Math.round(motionSpeed * 100)} disabled={animationExporting} onChange={(e) => setMotionSpeed(Number(e.target.value) / 100)} /><output>{motionSpeed.toFixed(2)}×</output></div></label><label>{t("motion.duration")}<div className="range-row"><input aria-label={t("motion.duration")} type="range" min="1" max="12" step="0.5" value={motionDuration} disabled={animationExporting} onChange={(e) => setMotionDuration(Number(e.target.value))} /><output>{motionDuration} {t("morph.seconds")}</output></div></label></>}</section>}
'''
new_motion = '''        {rendererMode !== "original" && <section className="inspector-section" data-stage5-motion="true" data-motion-strength={effectiveMotionStrength.toFixed(3)}><h2>{t("motion.title")}</h2><p>{t("motion.hint")}</p><label>{t("motion.type")}<select aria-label={t("motion.type")} value={motionMode} disabled={animationExporting} onChange={(e) => { const next = e.target.value as PreviewMotionMode; setMotionMode(next); if (next === "static") { setMotionTimelinePlaying(false); setMotionTimelineTime(0); } }}><option value="static">{t("motion.static")}</option><option value="pulse">{t("motion.pulse")}</option><option value="drift">{t("motion.drift")}</option></select></label>{motionMode !== "static" && <><label>{t("motion.strength")}<div className="range-row"><input aria-label={t("motion.strength")} type="range" min="0" max="200" value={Math.round(effectiveMotionStrength * 100)} disabled={animationExporting || motionKeyframesEnabled} onChange={(e) => setMotionStrength(Number(e.target.value) / 100)} /><output>{Math.round(effectiveMotionStrength * 100)}%</output></div></label><label>{t("motion.speed")}<div className="range-row"><input aria-label={t("motion.speed")} type="range" min="25" max="300" value={Math.round(motionSpeed * 100)} disabled={animationExporting} onChange={(e) => setMotionSpeed(Number(e.target.value) / 100)} /><output>{motionSpeed.toFixed(2)}×</output></div></label><label>{t("motion.duration")}<div className="range-row"><input aria-label={t("motion.duration")} type="range" min="1" max="12" step="0.5" value={motionDuration} disabled={animationExporting} onChange={(e) => { setMotionDuration(Number(e.target.value)); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} /><output>{motionDuration} {t("morph.seconds")}</output></div></label><div className="toggle-row"><span>{t("motion.keyframes")}</span><button aria-label={t("motion.keyframes")} disabled={animationExporting || morphEnabled} className={`toggle ${motionKeyframesEnabled ? "on" : ""}`} aria-pressed={motionKeyframesEnabled} onClick={() => { const next = !motionKeyframesEnabled; setMotionKeyframesEnabled(next); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} /></div>{motionKeyframesEnabled && !morphEnabled && <><p>{t("motion.keyframesHint")}</p><label>{t("motion.startStrength")}<div className="range-row"><input aria-label={t("motion.startStrength")} type="range" min="0" max="200" value={Math.round(motionStrengthStart * 100)} disabled={animationExporting} onChange={(e) => { setMotionStrengthStart(Number(e.target.value) / 100); setMotionTimelinePlaying(false); }} /><output>{Math.round(motionStrengthStart * 100)}%</output></div></label><label>{t("motion.endStrength")}<div className="range-row"><input aria-label={t("motion.endStrength")} type="range" min="0" max="200" value={Math.round(motionStrengthEnd * 100)} disabled={animationExporting} onChange={(e) => { setMotionStrengthEnd(Number(e.target.value) / 100); setMotionTimelinePlaying(false); }} /><output>{Math.round(motionStrengthEnd * 100)}%</output></div></label><label>{t("motion.keyframeEasing")}<select aria-label={t("motion.keyframeEasing")} value={motionKeyframeEasing} disabled={animationExporting} onChange={(e) => setMotionKeyframeEasing(e.target.value as KeyframeEasing)}><option value="linear">{t("morph.linear")}</option><option value="ease-in">{t("timeline.easeIn")}</option><option value="ease-out">{t("timeline.easeOut")}</option><option value="ease-in-out">{t("morph.easeInOut")}</option><option value="step">{t("timeline.step")}</option></select></label></>}</>}</section>}
'''
main = replace_once(main, old_motion, new_motion, 'motion ui')
main_path.write_text(main)

webgl_path = Path("apps/web/src/webgl/WebGLPreview.tsx")
webgl = webgl_path.read_text()
webgl = replace_once(webgl, '  const morphProgressRef = useRef(morphProgress);\n  morphProgressRef.current = morphProgress;\n', '  const morphProgressRef = useRef(morphProgress);\n  morphProgressRef.current = morphProgress;\n  const motionStrengthRef = useRef(motionStrength);\n  motionStrengthRef.current = motionStrength;\n  const motionSpeedRef = useRef(motionSpeed);\n  motionSpeedRef.current = motionSpeed;\n', 'webgl motion refs')
webgl = replace_once(webgl, '      gl.uniform1f(motionStrengthUniform, Math.max(0, motionStrength));\n      gl.uniform1f(motionSpeedUniform, Math.max(0.05, motionSpeed));', '      gl.uniform1f(motionStrengthUniform, Math.max(0, motionStrengthRef.current));\n      gl.uniform1f(motionSpeedUniform, Math.max(0.05, motionSpeedRef.current));', 'webgl uniform refs')
webgl = replace_once(webgl, ', motionMode, motionSpeed, motionStrength, positions,', ', motionMode, positions,', 'webgl deps')
webgl_path.write_text(webgl)

en_path = Path("apps/web/src/i18n/locales/en.ts")
en = en_path.read_text()
en = replace_once(en, '  "motion.duration": "Animation duration",\n', '  "motion.duration": "Animation duration",\n  "motion.keyframes": "Animate strength",\n  "motion.keyframesHint": "Two keyframes drive Motion strength across the animation duration. The timeline stays optional for ordinary still work.",\n  "motion.startStrength": "Start strength",\n  "motion.endStrength": "End strength",\n  "motion.keyframeEasing": "Keyframe easing",\n  "timeline.motionStrength": "Motion Strength",\n  "timeline.position": "Motion Strength timeline position",\n  "timeline.play": "Play keyframes",\n  "timeline.stop": "Stop keyframes",\n  "timeline.start": "Timeline start",\n  "timeline.end": "Timeline end",\n  "timeline.easeIn": "Ease In",\n  "timeline.easeOut": "Ease Out",\n  "timeline.step": "Step",\n', 'en timeline keys')
en_path.write_text(en)

ja_path = Path("apps/web/src/i18n/locales/ja.ts")
ja = ja_path.read_text()
ja = replace_once(ja, '  "motion.duration": "アニメーション時間",\n', '  "motion.duration": "アニメーション時間",\n  "motion.keyframes": "強さをキーフレーム化",\n  "motion.keyframesHint": "2つのキーフレームでアニメーション時間内のMotionの強さを変化させます。通常の静止画作業ではタイムラインは必須ではありません。",\n  "motion.startStrength": "開始時の強さ",\n  "motion.endStrength": "終了時の強さ",\n  "motion.keyframeEasing": "キーフレームのイージング",\n  "timeline.motionStrength": "Motionの強さ",\n  "timeline.position": "Motion強さタイムライン位置",\n  "timeline.play": "キーフレームを再生",\n  "timeline.stop": "キーフレームを停止",\n  "timeline.start": "タイムライン先頭",\n  "timeline.end": "タイムライン末尾",\n  "timeline.easeIn": "イーズイン",\n  "timeline.easeOut": "イーズアウト",\n  "timeline.step": "ステップ",\n', 'ja timeline keys')
ja_path.write_text(ja)

test = r'''import { expect, test } from "@playwright/test";

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="black"/><circle cx="78" cy="80" r="52" fill="white"/><rect x="145" y="35" width="60" height="90" fill="#808080"/></svg>`,
);

test("Motion Strength keyframes scrub and play through the optional timeline", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[data-source-kind="still"]').setInputFiles({
    name: "timeline-source.svg",
    mimeType: "image/svg+xml",
    buffer: sourceSvg,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);

  const motionType = page.getByLabel("Motion type");
  await expect(motionType).toHaveValue("static");
  await expect(page.getByLabel("Timeline position")).toBeDisabled();

  await motionType.selectOption("pulse");
  const keyframeToggle = page.getByRole("button", { name: "Animate strength", exact: true });
  await keyframeToggle.click();
  await expect(keyframeToggle).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Start strength").fill("20");
  await page.getByLabel("End strength").fill("180");
  await page.getByLabel("Animation duration").fill("2");
  await page.getByLabel("Keyframe easing").selectOption("linear");

  const timeline = page.getByLabel("Motion Strength timeline position");
  await expect(timeline).toBeEnabled();
  await expect(page.locator('.transport-bar[data-timeline-mode="motion-strength"]')).toBeVisible();

  const motionSection = page.locator('[data-stage5-motion="true"]');
  await timeline.fill("0");
  await expect(motionSection).toHaveAttribute("data-motion-strength", "0.200");
  await timeline.fill("50");
  await expect(motionSection).toHaveAttribute("data-motion-strength", "1.000");
  await timeline.fill("100");
  await expect(motionSection).toHaveAttribute("data-motion-strength", "1.800");

  await page.getByRole("button", { name: "Timeline start", exact: true }).click();
  await expect(timeline).toHaveValue("0");
  await page.getByRole("button", { name: "Play keyframes", exact: true }).click();
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(5);
  await page.getByRole("button", { name: "Stop keyframes", exact: true }).click();

  await page.screenshot({ path: "preview-evidence/stage5-motion-keyframes-1440x700-en.png", fullPage: true });
});
'''
Path("tests/browser/stage5-motion-keyframe-timeline.spec.ts").write_text(test)
