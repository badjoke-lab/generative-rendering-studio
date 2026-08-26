# Browser Deployment

The browser application is the primary product. Deployment must publish the same browser build that passed repository CI and the manual checks in `docs/DEVELOPMENT_PREVIEW_CHECKLIST.md`.

## Build contract

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

The production web bundle is emitted by Vite under:

```text
apps/web/dist
```

A hosting provider should therefore use the repository root as the working directory, run `pnpm build`, and publish `apps/web/dist` as a static site.

## Hosting requirements

The Development Preview does not require a server-side rendering service or rendering worker. The rendering and current export paths run in the user's browser/device.

The static host must provide:

- HTTPS;
- normal static asset delivery for the Vite build;
- correct fallback to `index.html` if client-side routes are introduced;
- no automatic rewriting or processing of user media;
- no requirement that imported source files be uploaded to an application server.

Provider-specific settings are deployment details. They must not be encoded into project files, renderer IDs, source IDs, or the rendering core.

## Cloudflare Pages example

A compatible Cloudflare Pages project can use:

- production branch: `main`;
- build command: `pnpm build`;
- build output directory: `apps/web/dist`;
- package manager: the repository-declared pnpm version.

A codename-based preview hostname may be used before final branding is selected. Changing the hostname or public product name must not require project-schema migration.

## Release order

1. merge the intended browser candidate to `main` with green CI;
2. produce the exact static build intended for deployment;
3. perform the real-browser checks in `docs/DEVELOPMENT_PREVIEW_CHECKLIST.md` on that candidate;
4. publish only after the critical manual checks pass;
5. if the deployed build differs from the smoke-tested candidate, repeat the affected checks.

## Development Preview scope

The first public Development Preview exposes the completed Stage 1 and Stage 2 browser paths only. Later roadmap controls must not be presented as working features before their implementation is ready.

Desktop/standalone packaging is not part of the Development Preview. It remains optional and may be introduced later only if measured browser limitations justify it, while reusing the same project model and rendering core.
