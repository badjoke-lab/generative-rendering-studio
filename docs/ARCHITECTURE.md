# Public Architecture

## Design goals

- browser-first;
- local-first where possible;
- modular source / representation / renderer / motion / effects / export layers;
- brand-neutral project data;
- locale-neutral project data;
- deterministic rendering where practical;
- progressive enhancement rather than a single mandatory GPU backend.

## Initial stack

- TypeScript
- React
- WebGL2 baseline renderer
- WebGPU as a later optional acceleration/backend path
- GLSL, and WGSL when the WebGPU backend is introduced
- Web Workers for non-UI CPU work
- Web Audio API
- WebCodecs where supported and useful
- IndexedDB / browser file APIs as appropriate

## Core module boundaries

Suggested repository structure:

```text
apps/
  web/
    src/
      i18n/
        locales/
          en.ts
          ja.ts
packages/
  core/
    source/
    geometry/
    render/
    motion/
    morph/
    project/
    export/
  ui/
  presets/
  brand/
shaders/
  webgl2/
  webgpu/
tests/
```

Sources produce shared geometry/field representations. Renderers consume those representations. Procedural generators should therefore not contain renderer-specific rendering code.

## Localization architecture

User-interface localization belongs to the presentation layer and must not alter core project contracts.

Initial locale support:
- English (`en`);
- Japanese (`ja`).

The initial implementation may use a lightweight typed TypeScript localization layer rather than a large dependency. It should provide:
- stable translation keys;
- `en` and `ja` locale dictionaries with matching key coverage;
- browser locale detection for first use;
- a persisted explicit locale preference;
- English fallback for unsupported or missing translations;
- a shared locale hook/context used by UI components.

User-facing strings should be retrieved through the localization layer instead of being hard-coded inside feature components. Project-authored text, source data, renderer/source identifiers, project schema values, migrations, and serialized files remain locale-neutral and are not automatically translated.

If later requirements include many languages, complex pluralization, external translation tooling, or server-side locale behavior, the localization implementation may migrate to a dedicated i18n framework without changing the project format.

## Shared representations

The architecture is designed around reusable point, curve and surface-style representations. Individual renderers may consume only the attributes they need, such as position, color, density, depth, normal, velocity or glyph selection.

## GPU rendering

Dense glyph/particle rendering should use GPU-friendly buffers, shader-driven attributes and instanced rendering rather than one DOM element per visual element.

Glyph rendering should use an atlas built from glyphs needed by the active project where practical.

## Morphing

Morphing should use stable correspondence between source and target representations. The implementation may evolve from simple spatial matching toward region, edge and feature-aware assignment while preserving deterministic project behavior.

## Video

Transformed video must aim for temporal coherence. Independent random resampling for every frame is not considered a satisfactory final video pipeline.

## Project format

The project format must be versioned, brand-neutral, and locale-neutral. Public branding and translated UI text must not be embedded into serialized renderer/source identifiers or migration contracts.

## Export

Preview rendering and final export timing are separate concerns. Final export may render deterministic frames offline even when preview cannot run at the requested output frame rate in real time.
