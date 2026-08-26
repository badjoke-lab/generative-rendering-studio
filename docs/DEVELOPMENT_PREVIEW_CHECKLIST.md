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

## Manual browser verification required before public deployment

These checks require a real supported browser/device and are not satisfied by repository CI alone:

- [ ] Import at least one PNG/JPEG/WebP and one SVG in a Chromium-based desktop browser.
- [ ] Confirm Text source creation and Japanese UI rendering.
- [ ] Verify Original/Glyph/Point/Particle visual output with no blank or corrupted canvas.
- [ ] Verify Source A -> Source B Morph visually reaches both endpoints and does not visibly reset correspondence during playback.
- [ ] Verify PNG and WebP still downloads open correctly.
- [ ] Verify one short Morph animation recording downloads, opens, has non-zero duration and shows the full A-to-B transition.
- [ ] Confirm controls remain locked during recording and recover afterward.
- [ ] Confirm a failed/unsupported recording path leaves the editor usable.
- [ ] Repeat the critical import/Morph/export smoke path in at least one second browser family where practical.
- [ ] Check narrow viewport behavior for catastrophic layout breakage even though full mobile authoring is not yet promised.

## Deployment gate

The Development Preview may be deployed only after the automated gates are green and the critical manual browser checks above have been performed on the build intended for deployment.

Deployment remains browser-first and provider-independent. A hosting provider or preview URL is not part of the project file format or rendering-core contract.
