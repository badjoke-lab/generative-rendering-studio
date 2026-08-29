# Public Development Roadmap

This roadmap is the public development guide for the repository. It describes intended implementation stages at a level suitable for public collaboration. Detailed internal release gates and strategy are maintained outside this public repository.

All roadmap language is service-neutral. Third-party services may be used by individual users, but no specific music-generation, streaming, editing, hosting, or publishing service defines a stage, feature family, persistent ID, or architecture contract.

## Product and release order

The browser application is the primary product and is developed first. The project does not maintain two independent rendering engines or two competing application codebases.

Development order is:

`shared rendering/project core -> browser application -> progressive browser releases -> PWA after web stabilization -> optional desktop wrapper only for demonstrated browser limitations`

A desktop/standalone build, if introduced, must reuse the same project model and rendering core. It is intended for workloads such as long-duration, large-media, codec/container, memory, or high-resolution export cases that cannot be handled reliably in supported browsers. Desktop work must not delay ordinary browser functionality merely to preserve feature parity with a desktop build that may not be necessary.

### Browser release sequence

The intended public release sequence is capability-based rather than date-based:

- **Development Preview — after Stage 2:** still rendering plus usable source-to-source Morph and short browser-safe time-based output. Completed.
- **Public Alpha — after Stage 3:** existing video becomes a first-class import/transformation source. **Current release.**
- **Public Beta — after Stage 5:** procedural sources plus Layers/Timeline/Keyframes and broader Studio composition make the product useful as a production environment rather than a conversion demo.
- **v1 Release Candidate — after Stage 6:** optional audio/data modulation completes the major general-purpose creation paths.
- **v1 Stable — after Stage 7:** practical browser export, resolution/duration/frame-rate handling, audio inclusion where supported, and browser capability handling are hardened.
- **Optional Desktop — evaluated around Stage 7/v1:** implemented only where measured browser limitations justify it.

Deployment/provider details are operational choices rather than core product architecture. Public browser builds should be deployable as a static/browser-first application where practical, with rendering performed locally on the user's device. Hosting may change without changing project files or the rendering core. Public deployment instructions are documented in `docs/DEPLOYMENT.md`.

## Stage 0 — Foundation

- browser application shell;
- modular source / representation / renderer boundaries;
- brand configuration isolated from the core;
- versioned project model;
- WebGL2 rendering foundation;
- tests and CI baseline.

Outcome: the project has a stable browser-first architecture that later rendering, motion, video, audio/data, composition, and export features can extend without becoming one-off demos.

User behavior: users enter a browser-based Studio whose project model and rendering core can support multiple source and renderer types without tying saved projects to a temporary product name or one visual effect.

Status: completed on main.

## Stage 1 — Still rendering

Initial sources:
- PNG / JPEG / WebP;
- SVG;
- text.

Initial renderers:
- Original;
- Glyph;
- Point;
- Particle.

Initial controls include density, glyph set, size, color, background, sampling and dithering-related controls.

Initial still output targets include PNG and WebP where supported.

Outcome: users can import their own still sources, transform their visual representation, adjust the look, and export a still image locally.

User behavior: add an image, SVG, or text source; switch between Original/Glyph/Point/Particle; adjust appearance controls; preview the result; export the current frame as PNG or WebP without requiring a timeline.

Status: completed on main.

## Localization baseline

- English (`en`) and Japanese (`ja`) locale resources;
- browser-language detection on first use;
- explicit language switching in the application;
- persisted local language preference;
- English fallback for unsupported/missing locale entries;
- removal of mixed hard-coded English/Japanese feature strings from working UI components;
- stable translation keys that do not leak into project schemas or persistent renderer/source identifiers;
- both English and Japanese entries required for new shipped controls.

Outcome: the same project/editor behaves consistently in English or Japanese, and future stages can add UI without accumulating language-specific hard-coded strings or changing project compatibility.

User behavior: the editor initially follows the supported browser language, users can switch English/Japanese explicitly, and the chosen UI language persists locally while project content and saved project semantics remain unchanged.

Status: completed on main.

## Stage 2 — Source-to-source morphing

- two-source scenes;
- coherent A-to-B assignment;
- easing and duration controls;
- deterministic project seed;
- GPU-side interpolation for real-time preview;
- animation preview;
- short browser-safe time-based output where reliable.

Outcome: users can load two visual sources and produce a coherent editable transition between them rather than random particle reassignment.

User behavior: add Source A and Source B; enable Morph; scrub progress manually or play it over a chosen duration; select easing; view the transition through compatible Glyph/Point/Particle renderers; export a short animation when the current browser/device supports canvas recording.

Status: completed and merged to main. The Stage 1 + Stage 2 browser build was released as the Development Preview, and its release-candidate checks are retained in `docs/DEVELOPMENT_PREVIEW_CHECKLIST.md`.

## Development Preview release lane — closed

- keep repository CI green on the exact deployment candidate;
- verify the Stage 1 + Stage 2 workflow in real supported browsers;
- verify downloaded still and short animation files actually open and play;
- verify unsupported export paths fail safely;
- verify narrow/mobile first-run behavior does not overflow, hide the preview, or expose non-working later-stage controls;
- prepare provider-independent static deployment settings and public deployment documentation;
- deploy only the build that passed the browser and visual smoke gates;
- verify the publicly served HTML, JavaScript, and CSS bytes match the exact green candidate.

Outcome: the first public browser build was a tested Stage 1 + Stage 2 Development Preview rather than an unverified repository build.

User behavior: open the public browser application without installing desktop software; follow the first-run flow to add a supported still source or create text; render as Original/Glyph/Point/Particle; optionally configure and preview A-to-B Morph; switch English/Japanese; export still frames and, where supported, a short Morph animation locally.

Status: complete and superseded by the Stage 3 Public Alpha release. The historical checklist remains available for regression and release-discipline reference.

## Stage 3 — Existing-video transformation

- browser-decodable video import;
- transformed video render modes;
- temporal coherence between frames;
- original and transformed media in the same composition;
- video as texture, mask or analysis input where supported.

Outcome: existing footage becomes a first-class source that can remain original or be transformed into the same rendering families while preserving stable motion between frames.

User behavior: import existing footage; keep it visible as Original or transform frames into compatible render representations; preview stable transformed motion; combine original and transformed versions rather than being forced to generate footage from scratch.

Status: completed on main and released as the Public Alpha. Browser-decodable MP4/WebM can be loaded as the main source; decoded frames feed Original/Glyph/Point/Particle; play/pause/start/end/seek controls follow the video clock; and the current frame can be saved as PNG/WebP. Temporal-coherence hardening uses deterministic source-space sampling and stable glyph identity. Original and transformed video can be composited with adjustable original opacity, and current-frame export preserves that composition. Synchronized auxiliary browser-decodable video can serve as Texture Video, Mask Video, or Analysis Video while preserving the main point-field identity and remaining local to the browser/device. Stage 3 release gates include Chromium and focused WebKit coverage plus representative real-footage validation across Original/Glyph/Point/Particle at multiple seek positions and repeated-seek stability. Stage 5 Studio workflow is now in progress; Stage 6 audio/data modulation remains later work.

## Stage 4 — Procedural sources

- primitive geometry;
- flow-based forms;
- noise-driven forms;
- several organic/example presets;
- renderer reuse across imported and generated sources.

Outcome: users can create renderable source material inside the tool rather than relying only on imported files, while named organic forms remain presets rather than special-case architecture.

User behavior: choose or configure a generated primitive/flow/noise/organic source, then treat it like imported media by applying compatible renderers and later motion/composition controls. Individual recognizable forms are presets, not the definition of the engine.

Status: completed on main. Sphere, Torus, Grid, Spiral, Wave, Ribbon, Vortex, Noise, Bloom, Filament, and Cluster are shipped as renderer-neutral generated Point Fields with compatible Glyph/Point/Particle rendering, English/Japanese UI coverage, and desktop/mobile browser release checks. Generated-source still output is release-gated through real PNG/WebP download and decode validation. Stage 5 Studio composition is now in progress.

## Stage 5 — Studio workflow

- layers;
- timeline;
- keyframes;
- camera controls;
- masks and blend modes;
- effects;
- morph tracks;
- parameter automation.

Outcome: the product becomes a multi-scene production environment where sources, transformations, motion, and effects can be arranged over time instead of being limited to a single conversion view.

User behavior: stack multiple sources and generated elements as layers; place and trim time-based elements; keyframe visual parameters and camera motion; apply masks/blending/effects; arrange Morph and other motion over time; preview a composed sequence. Still-image users can continue using the simpler non-timeline path.

Status: in progress on main. Initial Studio work now includes explicit optional Motion controls with Static as the default, short Motion animation export, and a first keyframe/parameter-automation slice where Motion Strength can be driven between start/end keyframes and scrubbed or played through the existing transport. The simpler still-image path remains available without enabling the timeline. Broader Layers/Timeline/Camera/Effects composition remains ongoing Stage 5 work.

## Stage 6 — Audio/data modulation

- audio as optional soundtrack;
- waveform and amplitude analysis;
- frequency-band analysis;
- parameter mapping;
- structured/data inputs where practical;
- optional beat/onset assistance as reliability permits;
- editable assisted/automatic workflows built on the same modulation system.

Outcome: optional audio or data can drive visual parameters such as motion, density, color, effects, camera, or morph progress without making audio, music, a particular service, or a particular output genre mandatory.

User behavior: add an audio or supported data source; choose which analysis/data signal drives which visual parameter; preview reactive motion; edit or override assisted mappings; optionally retain audio as soundtrack for a time-based export. This supports audio-reactive visuals, soundtrack-based motion graphics, visualizers, data-driven visuals, and other workflows through the same modulation system.

Status: not started.

## Stage 7 — Export hardening and optional desktop support

- harden still and time-based browser export;
- support practical resolution, duration, and frame-rate choices where reliable;
- include audio in time-based output where the selected output path supports it;
- handle browser codec/container capability differences explicitly;
- improve long-duration and large-media reliability;
- measure browser limitations before committing to a desktop wrapper;
- if justified, add a desktop wrapper that shares the browser application's project model and rendering core.

Outcome: projects can be rendered more reliably as practical finished still or time-based media; desktop support is introduced only where it solves demonstrated browser limits rather than becoming a separate product architecture.

User behavior: choose an output type and supported settings, render the finished composition, receive a usable media file, and remain in the browser for normal workloads. If a later desktop build is justified for heavy workloads, the same project can continue through the shared core instead of requiring a separate authoring product.

Status: not started beyond the Stage 1 still-export baseline and Stage 2 short-output path.

## Later exploration

Potential areas include deeper 3D workflows, point clouds, formula/node editing, custom shaders, interactive exports and additional data/control inputs.

Outcome: advanced workflows can expand without changing the source/representation/renderer/motion architecture used by the simpler product paths.

User behavior: advanced users may eventually construct deeper 3D, programmable, node/formula, custom-shader, point-cloud, interactive, or specialized data-driven workflows while existing simple projects remain valid.

Status: exploratory; not part of the Stage 0–7 completion promise.

## General workflow vocabulary

Product documentation and UI should prefer general capability names such as:

- still-image rendering and stylization;
- text/logo/shape transformation;
- source-to-source morphing;
- existing-video transformation;
- motion graphics and title animation;
- procedural/generative visual creation;
- audio-reactive and soundtrack-based visual creation;
- data-driven visual creation;
- multi-source compositing;
- looping visual/background creation;
- still and time-based media export.

A specific third-party service may be mentioned only as an optional example when context requires it; it must not become the feature heading or product definition.

## Localization rule across all stages

Every newly shipped user-facing control, status, help string, validation message, and workflow label must have English and Japanese locale coverage in the same implementation change. User-authored project content is not automatically translated. Persistent project data remains language-neutral.

Roadmap items may change as implementation and real usage reveal better priorities. Shipped behavior and repository issues take precedence over this document when they differ.
