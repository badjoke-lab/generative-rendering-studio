# Public Development Roadmap

This roadmap is the public development guide for the repository. It describes intended implementation stages at a level suitable for public collaboration. Detailed internal release gates and strategy are maintained outside this public repository.

## Stage 0 — Foundation

- browser application shell;
- modular source / representation / renderer boundaries;
- brand configuration isolated from the core;
- versioned project model;
- WebGL2 rendering foundation;
- tests and CI baseline.

Outcome: the project has a stable browser-first architecture that later rendering, motion, video, audio, and export features can extend without becoming one-off demos.

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

## Localization baseline — before Stage 2 UI expansion

Before additional morph UI expands the visible interface, establish the bilingual UI foundation:

- English (`en`) and Japanese (`ja`) locale resources;
- browser-language detection on first use;
- explicit language switching in the application;
- persisted local language preference;
- English fallback for unsupported/missing locale entries;
- removal of mixed hard-coded English/Japanese feature strings from working UI components;
- stable translation keys that do not leak into project schemas or persistent renderer/source identifiers;
- both English and Japanese entries required for new shipped controls.

Outcome: the same project/editor behaves consistently in English or Japanese, and future stages can add UI without accumulating language-specific hard-coded strings or changing project compatibility.

## Stage 2 — Source-to-source morphing

- two-source scenes;
- coherent A-to-B assignment;
- easing and duration controls;
- deterministic project seed;
- animation preview;
- short browser-safe output where reliable.

Outcome: users can load two visual sources and produce a coherent editable transition between them rather than random particle reassignment.

## Stage 3 — Existing-video transformation

- browser-decodable video import;
- transformed video render modes;
- temporal coherence between frames;
- original and transformed media in the same composition;
- video as texture, mask or analysis input where supported.

Outcome: existing footage becomes a first-class source that can remain original or be transformed into the same rendering families while preserving stable motion between frames.

## Stage 4 — Procedural sources

- primitive geometry;
- flow-based forms;
- noise-driven forms;
- several organic/example presets;
- renderer reuse across imported and generated sources.

Outcome: users can create renderable source material inside the tool rather than relying only on imported files, while named organic forms remain presets rather than special-case architecture.

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

## Stage 6 — Audio/data modulation

- waveform and amplitude analysis;
- frequency-band analysis;
- parameter mapping;
- optional beat/onset assistance as reliability permits;
- editable assisted/automatic workflows built on the same modulation system.

Outcome: audio or data can drive visual parameters such as motion, density, color, effects, camera, or morph progress, enabling music-video and visualizer workflows without making audio mandatory.

## Stage 7 — Export hardening and optional desktop support

Web export will be improved first. A desktop wrapper is considered only for concrete browser limitations such as long-duration, large-media, codec or high-resolution export workloads.

Outcome: projects can be rendered more reliably as practical finished media; desktop support is introduced only where it solves demonstrated browser limits rather than becoming a separate product architecture.

## Later exploration

Potential areas include deeper 3D workflows, point clouds, formula/node editing, custom shaders, interactive exports and additional data/control inputs.

Outcome: advanced workflows can expand without changing the source/representation/renderer/motion architecture used by the simpler product paths.

## Localization rule across all stages

Every newly shipped user-facing control, status, help string, validation message, and workflow label must have English and Japanese locale coverage in the same implementation change. User-authored project content is not automatically translated. Persistent project data remains language-neutral.

Roadmap items may change as implementation and real usage reveal better priorities. Shipped behavior and repository issues take precedence over this document when they differ.
