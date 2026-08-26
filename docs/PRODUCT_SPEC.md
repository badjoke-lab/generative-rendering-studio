# Public Product Specification

## Purpose

Generative Rendering Studio is a browser-first visual creation tool. It is intended to let users import or generate visual sources, choose alternative render representations, animate or morph them, combine them, and export finished visual work.

The project is not limited to ASCII art, particles, music videos, or one procedural preset.

## Core user flow

`Add a source -> choose how it looks -> choose how it moves -> combine if needed -> export`

## Interface languages

The initial product UI supports English and Japanese.

- English is the fallback locale for unsupported browser languages.
- Japanese may be selected automatically when the browser preference is Japanese.
- Users can explicitly switch language in the application.
- An explicit language choice is stored locally and reused on later visits.
- Switching UI language changes interface labels, help text, errors, and other application chrome only. It does not translate user-authored project content or alter the project schema.
- Project files, source IDs, renderer IDs, migrations, and other persistent contracts remain language-neutral.

The product must avoid partially mixed English/Japanese UI states for shipped controls. Newly shipped public controls require both locale entries.

## Source categories

Planned and progressively implemented source categories include:

- raster images;
- SVG;
- text;
- video;
- audio as soundtrack or modulation input;
- 3D assets;
- procedural geometry;
- structured data and live inputs where practical.

Imported media should remain usable in its original form. A source may also be transformed into a shape, texture, mask, color source, displacement source, or motion/modulation driver where supported.

## Render representations

The initial render family is:

- Original / Raster
- Glyph / ASCII
- Points
- Particles

Later renderer families may include lines, contours, networks, wireframes, surfaces, sprites and hybrid combinations.

Glyph rendering is not restricted to ASCII. User-defined character sets and project-specific text, including Japanese, are intended use cases.

## Motion and transformation

The system is designed around reusable motion modes rather than renderer-specific effects. These include static presentation, keyframed motion, procedural motion, noise/flow, spring-like motion, morphing, and audio/data-reactive modulation as they become available.

Morphing between different sources is a first-class feature. The goal is coherent movement between shapes rather than random particle reassignment.

## Existing video

Video support is intended to preserve the usefulness of existing footage. A video may remain visible normally or, where implemented, be transformed frame-by-frame into glyph, point, particle or contour-style representations while maintaining temporal stability.

## Procedural content

Procedural geometry is part of the same source system. Primitive, flow-based and organic presets are examples rather than special architecture-level cases. Compatible procedural sources should be renderable with the same renderer families as imported media.

## Audio

Audio is optional. It may be used as:

- soundtrack;
- analysis input;
- modulation input.

Audio-reactive visuals are one workflow, not the product definition.

## Timeline and composition

Still-image workflows should remain simple and should not require a timeline. Animation and video workflows will progressively gain layers, timing, keyframes, masks, effects, morph tracks and parameter automation.

## Privacy direction

The product is designed around local processing in the user's browser/device. Public privacy claims will only describe behavior that is actually implemented and verified.

Locale preference should also remain local unless a future account-sync feature is deliberately introduced and documented.

## Product form

The primary product is the browser application. A PWA is planned after the web experience is stable. A desktop wrapper may be added later for workloads that are not reliably handled by browsers, while sharing the same project model and rendering core.
