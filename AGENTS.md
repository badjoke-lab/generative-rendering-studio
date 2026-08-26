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

Always read the current version from the branch being changed. Do not rely on an earlier copy from chat, a previous task, or a prior commit when the repository document has changed.

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
- keep UI locale and translated strings out of persistent project schemas, migrations, and renderer/source identifiers;
- do not replace WebGL2 baseline support with a WebGPU-only implementation unless repository policy changes explicitly.

## User-experience rule

Internal concepts may be complex, but the default user workflow should remain simple. Avoid exposing low-level implementation terminology when a user-facing concept such as Source, Look, Motion, React, Layers or Export is sufficient.

The approved UI direction and interaction contract are defined in `docs/UI_CONTRACT.md`. Do not invent a materially different application shell, navigation model, inspector structure, workflow, or language behavior without first updating that contract deliberately.

## Localization rule

The shipped UI supports English (`en`) and Japanese (`ja`).

- Do not add new user-facing strings directly into feature components when they can be represented by translation keys.
- Add English and Japanese locale entries in the same change as every newly shipped control, message, label, status, validation string, or help string.
- Keep the locale resources structurally synchronized.
- English is the fallback when a translation is missing or the browser locale is unsupported.
- Explicit user locale choice is persisted locally and overrides automatic browser detection.
- Do not automatically translate user-authored project content.
- Changing UI language must not mutate the active project or change serialized project compatibility.

## Development discipline

- Make changes against the current repository state, not chat memory.
- Re-read the latest relevant public spec/roadmap/architecture/UI contract before starting a materially new feature and after those contracts are changed during an active branch.
- Treat the current branch versions of those documents as the implementation contract for that branch.
- Update public docs before or together with implementation when public behavior or development policy changes.
- Update public docs when shipped public behavior changes.
- Keep planned and shipped behavior clearly distinguished.
- Add or update tests for deterministic sampling, project serialization, renderer contracts, locale fallback/selection, and other affected behavior where applicable.
- Do not claim a visual feature is complete solely because it technically renders; visual stability and quality are part of acceptance.

## Roadmap discipline

Implement the current stage without prematurely coupling later-stage features into it. Shared interfaces may prepare for later stages, but unused complexity should not be added only because a later feature is listed in the roadmap.

UI for later roadmap stages may be represented in design documentation, but controls in the working application must not appear functional before their underlying behavior exists.

The localization baseline defined in `docs/ROADMAP.md` must be completed before Stage 2 adds further visible morph controls. Later stages must extend the same localization layer rather than creating stage-specific language handling.

## Naming

`GRS` / `Generative Rendering Studio` is a working codename. The repository must remain capable of adopting a different public product name without core-schema migration.
