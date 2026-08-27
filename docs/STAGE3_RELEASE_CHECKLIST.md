# Stage 3 Release Readiness Checklist

This checklist defines the public-safe release gate for Stage 3 existing-video transformation. It complements `docs/ROADMAP.md` and the closed Stage 1 + Stage 2 `docs/DEVELOPMENT_PREVIEW_CHECKLIST.md`.

## Stage 3 shipped scope

- [x] Browser-decodable MP4/WebM can be imported as the main video source.
- [x] Decoded video frames feed Original, Glyph, Point and Particle rendering paths.
- [x] Video play, pause, start, end and normalized seek controls update the transformed preview.
- [x] The currently displayed video frame can be exported as PNG/WebP.
- [x] Source-space sampling remains deterministic across adjacent frames.
- [x] Symbols glyph identity is anchored to source-space position rather than active-array order.
- [x] Original video can be shown beneath transformed output with adjustable opacity.
- [x] Composite current-frame PNG/WebP export preserves the original-video underlay plus transformed overlay.
- [x] A synchronized Texture Video can supply source-space color by normalized main-video progress.
- [x] A synchronized Mask Video can control visibility with strength and inversion controls.
- [x] A synchronized Analysis Video can derive deterministic frame brightness and drive transformed element size with adjustable strength.
- [x] Texture, mask and analysis inputs preserve the main point-field identity and remain local to the browser/device.
- [x] English and Japanese strings ship together for Stage 3 controls and validation states.

## Explicit non-scope for this release gate

The Stage 3 release gate does not claim:

- transformed long-duration video export;
- video-to-source Morph;
- procedural sources;
- full Layers / Timeline / Keyframes;
- general audio/data modulation;
- production-grade codec/container export hardening;
- desktop application support.

These remain later roadmap work.

## Automated browser gates

- [x] Repository type checking, unit tests and production build pass.
- [x] Chromium covers main video import, frame transformation, transport, seek, current-frame export, original-underlay composition, synchronized mask, synchronized texture and synchronized analysis roles.
- [x] Retained Chromium evidence contains representative Original, Glyph/Symbols, Point, composite, mask, texture and analysis frames.
- [ ] Chromium release-coherence gate samples the same moving subject across multiple normalized positions and proves transformed output does not collapse, reverse direction or exhibit a large element-count discontinuity.
- [ ] WebKit second-browser gate proves Stage 3 video decode/import, transformed Point output, normalized seek and PNG current-frame export on the hosted release runner.

## Manual evidence gates

- [ ] Inspect retained multi-position coherence evidence for obvious temporal popping, blank frames, collapse or direction reversal.
- [ ] Inspect retained WebKit Stage 3 video evidence for a usable transformed frame rather than a decoded-but-blank canvas.
- [ ] Inspect representative real-footage behavior on a supported device/browser and record any coherence defect that is severe enough to block the Stage 3 release.
- [ ] Confirm narrow/mobile first-run evidence still has no catastrophic horizontal overflow or inaccessible initial preview after Stage 3 controls are present.

## Release-candidate gate

Stage 3 is not marked complete merely because its individual features exist on `main`. The release candidate must satisfy the new coherence and second-browser gates above, preserve the already-green Stage 1 + Stage 2 regression suite, and pass visual inspection on the exact candidate intended for deployment.

After those checks pass, the final candidate must follow the same deployment discipline as the Development Preview: green repository CI, retained evidence inspection, deployment of the exact green browser artifact, and verification that the publicly served HTML/JavaScript/CSS bytes match that candidate.
