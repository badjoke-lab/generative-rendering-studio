# Public UI Contract

This document defines the public UI structure that implementation work should follow. The current visual direction is based on the approved dashboard, studio, and workflow-reference mockups.

## Design language

- dark charcoal / near-black application shell;
- restrained purple accent for primary actions, active states, focus, and selected controls;
- white primary text and muted gray secondary text;
- rounded panels with subtle borders rather than heavy shadows;
- dense desktop creative-tool layout without exposing low-level rendering terminology by default;
- previews remain visually dominant over chrome and controls.

The working codename `GRS` may appear in development UI, but all branding must remain replaceable through the brand package.

## Screen 1 — Dashboard / Home

The dashboard is the default entry surface.

Required regions:
- persistent left navigation;
- primary actions for creating a new project and opening an existing project;
- quick-start entry points for image, text, and procedural/generative sources where implemented;
- recent-project cards with thumbnail, title, basic format metadata, and recency;
- optional tutorial/help entry points;
- drag-and-drop entry when the browser supports the corresponding source type.

The dashboard must not imply cloud upload or account-dependent rendering unless that behavior is actually implemented.

## Screen 2 — Studio / Editor

The studio is the primary production surface.

### Top-level navigation
The editor exposes the conceptual modes:
- Compose
- Timeline
- Export

These may initially share one application route and progressively reveal functionality as roadmap stages ship.

### Left rail
The left side contains source/assets and scene/layer context.

Target source categories include:
- Image
- Video
- Text
- SVG
- 3D
- Other / procedural sources

Only implemented categories should be interactive. Unimplemented roadmap categories must not masquerade as working controls.

Layer/scene items should provide:
- visibility;
- selection;
- ordering where supported;
- opacity/composite metadata when supported.

### Center canvas
The canvas is the dominant area and must provide:
- live render preview;
- current output dimensions and frame-rate context when relevant;
- fit / 1:1 / full-style viewing controls as applicable;
- direct manipulation tools only where implemented;
- transport controls for time-based scenes.

The preview must remain usable at reduced size and should not be obscured by large modal control surfaces during ordinary adjustment.

### Right inspector
The inspector is contextual. The primary public sections are:
- Source
- Renderer / Look
- Motion
- Effects

The current renderer family is represented as mode choices such as:
- Original
- Glyph
- Point
- Particle

Renderer parameters should appear only when meaningful for the selected renderer.

For Glyph, the inspector may expose:
- character set;
- density;
- glyph size;
- color/background;
- inversion;
- edge/sampling emphasis;
- depth/noise/glow-style controls when implemented.

Do not expose shader, buffer, field, correspondence-solver, or backend jargon in the default inspector.

## Screen 3 — Workflow states

The approved workflow-reference mockup is not a literal multi-screen layout. It is a behavioral checklist for states that the studio must eventually support.

These states are:
1. project dashboard;
2. new project / empty canvas;
3. source import;
4. renderer selection;
5. renderer parameter adjustment;
6. glyph-specific configuration;
7. source-to-source morph setup;
8. timeline and keyframes;
9. audio-reactive mapping;
10. effects / post-processing;
11. export settings;
12. clean work preview / presentation.

Implementation may place these states inside the same studio shell rather than separate pages.

## Interaction contract

Default workflow:

`Dashboard -> New/Open Project -> Add Source -> Select Renderer -> Adjust Look -> Add Motion/Morph as needed -> Compose/Timeline -> Preview -> Export`

Still-image users must be able to stop after renderer adjustment and export without learning the timeline.

Animation/video users can progressively enter Motion and Timeline functionality.

Audio-reactive behavior must be optional and must never be required to create a visual.

## Responsive behavior

Desktop/laptop is the primary authoring target for the full studio.

At narrower widths:
- left navigation may collapse to icons or a drawer;
- the right inspector may become a drawer/panel;
- the canvas retains priority;
- timeline controls may collapse or become horizontally scrollable;
- no control may silently disappear if it is required to complete the active workflow.

Mobile may support lightweight viewing, project opening, or limited editing before full authoring is proven usable; do not claim full mobile parity before it exists.

## Roadmap activation

Stage 0 may implement only the shell, canvas, brand isolation, and basic preview plumbing.

Stage 1 activates image/SVG/text sources and Original/Glyph/Point/Particle controls.

Stage 2 activates morph-related UI.

Stage 3 activates video-source and temporal-transformation UI.

Stage 4 activates procedural-source UI.

Stage 5 activates the full timeline/layer/keyframe workflow.

Stage 6 activates audio/data modulation UI.

Stage 7 hardens export and may expose desktop-specific export options.

## Acceptance rule

A feature is not complete merely because the backend or renderer exists. The corresponding user path must be understandable in this UI structure, visually stable, and consistent with the approved design language.
