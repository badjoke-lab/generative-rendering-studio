# Public Development Roadmap

This roadmap is the public development guide for the repository. It describes intended implementation stages at a level suitable for public collaboration. Detailed internal release gates and strategy are maintained outside this public repository.

## Stage 0 — Foundation

- browser application shell;
- modular source / representation / renderer boundaries;
- brand configuration isolated from the core;
- versioned project model;
- WebGL2 rendering foundation;
- tests and CI baseline.

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

## Stage 2 — Source-to-source morphing

- two-source scenes;
- coherent A-to-B assignment;
- easing and duration controls;
- deterministic project seed;
- animation preview;
- short browser-safe output where reliable.

## Stage 3 — Existing-video transformation

- browser-decodable video import;
- transformed video render modes;
- temporal coherence between frames;
- original and transformed media in the same composition;
- video as texture, mask or analysis input where supported.

## Stage 4 — Procedural sources

- primitive geometry;
- flow-based forms;
- noise-driven forms;
- several organic/example presets;
- renderer reuse across imported and generated sources.

## Stage 5 — Studio workflow

- layers;
- timeline;
- keyframes;
- camera controls;
- masks and blend modes;
- effects;
- morph tracks;
- parameter automation.

## Stage 6 — Audio/data modulation

- waveform and amplitude analysis;
- frequency-band analysis;
- parameter mapping;
- optional beat/onset assistance as reliability permits;
- editable assisted/automatic workflows built on the same modulation system.

## Stage 7 — Export hardening and optional desktop support

Web export will be improved first. A desktop wrapper is considered only for concrete browser limitations such as long-duration, large-media, codec or high-resolution export workloads.

## Later exploration

Potential areas include deeper 3D workflows, point clouds, formula/node editing, custom shaders, interactive exports and additional data/control inputs.

Roadmap items may change as implementation and real usage reveal better priorities. Shipped behavior and repository issues take precedence over this document when they differ.
