# Development Preview Readiness Checklist

This checklist defines the public-safe readiness checks for the first browser Development Preview. It complements `docs/ROADMAP.md`; it does not replace later release hardening.

## Scope of the first Development Preview

The first Development Preview is the Stage 1 + Stage 2 browser experience:

- PNG / JPEG / WebP / SVG and text source input;
- Original / Glyph / Point / Particle still rendering;
- density, size, edge, dither, color, source-color and background controls;
- PNG / WebP current-frame export;
- English / Japanese UI switching with local preference persistence;
- Source A + Source B Morph setup;
- deterministic/coherent Morph correspondence;
- GPU-side A-to-B interpolation for compatible renderers;
- progress scrubbing, easing, duration and playback;
- short browser-safe animation export when the current browser/device supports canvas recording.

Video import, procedural sources, full Layers/Timeline/Keyframes, audio/data modulation, production-grade long-duration export and optional desktop support are later roadmap stages and must not be presented as already available.

## Automated gates

- [x] Type checking passes in repository CI.
- [x] Core deterministic Morph tests pass in repository CI.
- [x] Web build passes in repository CI.
- [x] English and Japanese locale resources remain structurally synchronized.
- [x] Stage 2 animation export code rejects unsupported recording environments and invalid/empty recordings.
- [x] Real Chromium smoke tests pass against the production build in repository CI.
- [x] Chromium smoke covers PNG/SVG import, Text creation, English/Japanese locale persistence, Original/Glyph/Point/Particle selection, Source A/B Morph controls, still download, short animation recording when supported, and narrow viewport survival.
- [ ] A 390x844 Japanese first-run browser test proves there is no horizontal overflow, the top save action remains on-screen and one-line, the preview reaches the first viewport, and non-working later-stage controls are not exposed as usable actions.

The real-browser CI uses Playwright with the production Vite build. Failure traces/screenshots are retained as CI artifacts so a browser regression is inspectable rather than reduced to a manual claim.

The release lane also retains a `preview-evidence-<commit>` artifact containing representative renderer frames, Morph frames at 0/50/100%, Japanese UI, the animation final frame, the 390x844 viewport, downloaded still/animation outputs, animation replay frames, recording lock/recovery frames, and focused second-browser evidence. This evidence is intentionally visual and file-based: it can expose regressions that DOM assertions cannot. The first retained evidence caught aspect distortion in the transformed WebGL renderers; the current candidate corrects source-space and viewport-space aspect handling and the corrected evidence has been inspected.

## Studio behavior gates

- [x] Source A can be imported from the currently supported still source types.
- [x] Source B can be added as a Morph target.
- [x] Morph cannot be enabled without both usable fields.
- [x] Original renderer is excluded while Morph is active.
- [x] Compatible renderers use start/end GPU buffers plus Morph progress.
- [x] Linear, ease-in-out and smoothstep easing are exposed through localized UI.
- [x] Duration and progress can be edited when not exporting.
- [x] Playback can be started/stopped and scrubbed.
- [x] Short animation export reports the browser-selected preferred recording format when available.
- [x] Short animation export is disabled before recording begins when the current browser/device does not expose the required recording capability.
- [x] Source, renderer, appearance, Morph, transport and still-export mutation controls are locked during animation recording.
- [x] Animation export reports success/failure and leaves the preview on the final Morph frame after a successful recording.
- [ ] The first-run UI explains the usable Stage 1 + Stage 2 path in user terms: add material, choose a look, optionally add a second material for Morph, then save.
- [ ] Development Preview does not expose non-functional Video / 3D / Timeline / Effects / Layers controls as if they were usable features.

## Release-candidate verification

Repository CI performs the deterministic and repeatable Chromium path. The file and visual checks below have also been performed against the exact browser candidate intended for the Development Preview:

- [x] Visually confirm Original/Glyph/Point/Particle output has no blank, corrupted, or obviously unstable canvas on the retained Chromium evidence.
- [x] Visually confirm Source A -> Source B Morph reaches both endpoints without an obvious correspondence reset during playback.
- [x] Open downloaded PNG/WebP files and confirm they decode correctly.
- [x] Open one downloaded short Morph animation, when recording is supported, and confirm non-zero duration and the complete A-to-B transition.
- [x] Confirm recording-time control lock/recovery feels correct in the browser rather than only being DOM-disabled.
- [x] Repeat the critical import/Morph/export path in a second browser family where practical. The focused second-family gate uses WebKit; hosted headless Firefox was also probed but did not expose WebGL2 in that runner environment.
- [x] Visually inspect the retained 390x844 Chromium viewport for catastrophic overlap or inaccessible controls; full mobile authoring is not yet promised.
- [ ] Visually inspect the retained 390x844 Japanese first-run screenshot specifically for the reported mobile failure mode: wrapped/off-screen top actions, vertically broken labels, misleading future-stage controls, and a preview pushed out of the initial viewport.

The downloaded PNG and WebP outputs are decoded during the browser gate and retained for independent inspection. The downloaded short animation is replayed as a real video resource, sampled through the A-to-B transition, and retained together with start/middle/end replay frames. Recording-time and recovered UI frames are retained separately so the control-state transition remains inspectable.

## Deployment gate

The Development Preview may be deployed only after repository CI, including the real Chromium smoke suite, is green and the critical visual/output checks above have been performed on the candidate intended for deployment.

Deployment remains browser-first and provider-independent. A hosting provider or preview URL is not part of the project file format or rendering-core contract.
