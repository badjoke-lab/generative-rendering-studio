# Generative Rendering Studio

Browser-first generative rendering studio for transforming images, vector graphics, text, video, procedural geometry, audio and data into alternative visual representations and motion.

This repository is under active development. The current working codename is **GRS**; public branding may change later without changing the core project format or architecture.

## Public documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Development roadmap](docs/ROADMAP.md)
- [Public architecture](docs/ARCHITECTURE.md)
- [UI contract](docs/UI_CONTRACT.md)
- [Agent instructions](AGENTS.md)

## Current development focus

The publicly deployed **Public Alpha** currently covers still-image/SVG/text rendering, Original/Glyph/Point/Particle looks, source-to-source Morph, browser-safe still/short-animation output where supported, Stage 3 existing-video transformation, Stage 4 procedural sources, and initial Stage 5 Motion/keyframe work.

Browser-decodable MP4/WebM can drive Original/Glyph/Point/Particle previews with video transport and temporal-coherence hardening, with an optional original-video underlay beneath transformed output. Current-frame PNG/WebP export preserves that composition when enabled. A synchronized auxiliary video can also be used as a **Texture Video** for source-space color, a **Mask Video** for visibility, or an **Analysis Video** whose frame brightness drives transformed element size. These auxiliary roles follow normalized main-video progress and remain local to the browser/device.

Stage 3 and Stage 4 are complete on main. Stage 4 includes Sphere, Torus, Grid, Spiral, Wave, Ribbon, Vortex, Noise, Bloom, Filament, and Cluster as renderer-neutral procedural Point Fields. **Stage 5 Studio workflow is now in progress on main:** Motion is explicit and Static by default, with user-selected Pulse/Drift plus strength/speed controls and short Motion animation export. A first optional keyframe/parameter-automation slice can drive Motion Strength between start/end keyframes and scrub or play it through the existing transport. The simpler still-image path remains available without enabling the timeline. Broader Stage 5 composition work remains ongoing, while Stage 6 audio/data modulation remains later work.

The project is browser-first and designed around local processing. Public claims track verified shipped behavior rather than unreleased internal plans.

## Inspiration / References

Visual references that informed exploration of this tool. GRS is an independent implementation; these links are attribution/reference and are not upstream code dependencies.

- Praveen Kumar (`@praveenisomer`): https://x.com/praveenisomer/status/2092222962153697540
- Ann Nguyen (`@ann_nnng`): https://x.com/ann_nnng/status/2092263948108407278

If an official project page or source repository for either reference is confirmed, prefer that primary project/source link here alongside or instead of the X post.
