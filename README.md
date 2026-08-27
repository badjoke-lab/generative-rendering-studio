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

The publicly deployed Development Preview already covers still-image/SVG/text rendering, Original/Glyph/Point/Particle looks, source-to-source Morph, and browser-safe still/short-animation output where supported.

Current development is on **Stage 3 existing-video transformation**. Browser-decodable MP4/WebM can now drive Original/Glyph/Point/Particle previews with video transport, deterministic sampling/identity hardening, and an optional original-video underlay beneath transformed output. Current-frame PNG/WebP export also preserves that video composition when enabled. Remaining Stage 3 work is tracked in the public roadmap rather than being implied as shipped.

The project is browser-first and designed around local processing. Public claims track verified shipped behavior rather than unreleased internal plans.

## Inspiration / References

Visual references that informed exploration of this tool. GRS is an independent implementation; these links are attribution/reference and are not upstream code dependencies.

- Praveen Kumar (`@praveenisomer`): https://x.com/praveenisomer/status/2092222962153697540
- Ann Nguyen (`@ann_nnng`): https://x.com/ann_nnng/status/2092263948108407278

If an official project page or source repository for either reference is confirmed, prefer that primary project/source link here alongside or instead of the X post.
