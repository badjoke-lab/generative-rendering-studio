# AGENTS.md

This file defines the working rules for coding agents and automated contributors in this repository.

## Read before changing code

Read these public repository documents in this order:

1. `README.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/ROADMAP.md`
4. `docs/ARCHITECTURE.md`
5. `docs/UI_CONTRACT.md`
6. the relevant source files and tests for the area being changed

Repository issues and merged code may refine the current implementation state. Do not assume a planned roadmap item is already implemented.

## Public-repository boundary

This is a public repository. Do not add private strategy, internal source-of-truth documents, unpublished competitive analysis, rejected naming research, private operational details, secrets, credentials, or any material supplied from a private source unless it has been explicitly approved for public release.

If private context is available during a task, use it only to guide implementation. Write only the minimum public-safe derivative needed in this repository.

## Architecture rules

Preserve the separation:

`Source -> shared representation -> Renderer -> Motion/Modulation -> Effects/Composite -> Output`

In particular:

- do not couple source parsers to a specific renderer;
- do not hard-code named procedural presets into core architecture;
- do not make audio mandatory for visual rendering;
- keep imported media usable in its original form;
- keep browser-first behavior as the baseline;
- keep brand/product naming out of persistent core schemas and renderer/source identifiers;
- do not replace WebGL2 baseline support with a WebGPU-only implementation unless repository policy changes explicitly.

## User-experience rule

Internal concepts may be complex, but the default user workflow should remain simple. Avoid exposing low-level implementation terminology when a user-facing concept such as Source, Look, Motion, React, Layers or Export is sufficient.

The approved UI direction and interaction contract are defined in `docs/UI_CONTRACT.md`. Do not invent a materially different application shell, navigation model, inspector structure, or workflow without first updating that contract deliberately.

## Development discipline

- Make changes against the current repository state, not chat memory.
- Re-read the relevant public spec/roadmap/architecture/UI contract before starting a materially new feature.
- Update public docs when shipped public behavior changes.
- Keep planned and shipped behavior clearly distinguished.
- Add or update tests for deterministic sampling, project serialization, renderer contracts and other affected behavior where applicable.
- Do not claim a visual feature is complete solely because it technically renders; visual stability and quality are part of acceptance.

## Roadmap discipline

Implement the current stage without prematurely coupling later-stage features into it. Shared interfaces may prepare for later stages, but unused complexity should not be added only because a later feature is listed in the roadmap.

UI for later roadmap stages may be represented in design documentation, but controls in the working application must not appear functional before their underlying behavior exists.

## Naming

`GRS` / `Generative Rendering Studio` is a working codename. The repository must remain capable of adopting a different public product name without core-schema migration.
