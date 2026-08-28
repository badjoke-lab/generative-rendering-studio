# Browser Deployment

The browser application is the primary product. Deployment must publish the same browser build that passed repository CI and the manual checks in `docs/DEVELOPMENT_PREVIEW_CHECKLIST.md`.

## Build contract

The repository does not currently contain a `pnpm-lock.yaml`, so installs cannot use frozen-lockfile mode yet. Until a lockfile is deliberately generated, reviewed, and committed, the reproducible release contract is tied to the exact tested commit, declared package versions, Node/pnpm versions, and CI-produced artifact rather than to a frozen lockfile.

From the repository root:

```sh
pnpm install --no-frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

The production web bundle is emitted by Vite under:

```text
apps/web/dist
```

A hosting provider should therefore use the repository root as the working directory, use the repository-declared pnpm version, install with `--no-frozen-lockfile` until a lockfile exists, run `pnpm build`, and publish `apps/web/dist` as a static site.

Repository CI uses the same install contract and uploads the resulting `apps/web/dist` directory as a commit-addressed artifact named `browser-candidate-<commit-sha>`. The artifact is the preferred manual-smoke candidate because it is produced in the same run that performs typecheck, tests, and production build.

Adding a committed lockfile is a separate dependency-management improvement. When it is introduced, CI and this document must move to `pnpm install --frozen-lockfile` in the same change.

## Hosting requirements

The current Public Alpha does not require a server-side rendering service or rendering worker. The rendering and current export paths run in the user's browser/device.

The static host must provide:

- HTTPS;
- normal static asset delivery for the Vite build;
- correct fallback to `index.html` if client-side routes are introduced;
- no automatic rewriting or processing of user media;
- no requirement that imported source files be uploaded to an application server.

Provider-specific settings are deployment details. They must not be encoded into project files, renderer IDs, source IDs, or the rendering core.

The production Vite build uses a relative base (`./`). This keeps the same built artifact valid both at a hostname root and below a path prefix such as a GitHub Pages project site. Deployment must not rewrite the generated HTML merely to repair host-specific asset paths.

## GitHub Pages deployment

The repository retains the historical workflow filename `.github/workflows/deploy-development-preview.yml`. It now deploys the current browser release and remains deliberately downstream of repository CI rather than becoming a second independent build path.

When a `main` CI run completes successfully, the deployment workflow:

1. downloads the exact `browser-candidate-<commit-sha>` artifact from that successful CI run;
2. verifies that the candidate contains `index.html`, its asset directory, and path-prefix-portable relative asset references;
3. uploads that exact directory as the GitHub Pages artifact without rebuilding or rewriting it;
4. deploys it through the `github-pages` environment.

This preserves the exact-candidate rule: the bytes deployed are the bytes generated and browser-tested by the green `main` CI run.

The expected repository-project URL is:

```text
https://badjoke-lab.github.io/generative-rendering-studio/
```

If repository Pages is not yet enabled for GitHub Actions, the deployment job may fail at the Pages API boundary even though the browser candidate itself is valid. In that case, enable GitHub Pages with **Build and deployment -> Source: GitHub Actions** in repository settings and rerun the deployment workflow. No application rebuild or source change is required solely for that repository setting.

## Cloudflare Pages example

A compatible Cloudflare Pages project can use:

- production branch: `main`;
- build command: `pnpm install --no-frozen-lockfile && pnpm build` while no lockfile is committed;
- build output directory: `apps/web/dist`;
- package manager: the repository-declared pnpm version.

A codename-based preview hostname may be used before final branding is selected. Changing the hostname or public product name must not require project-schema migration.

For public browser releases, prefer deployment of the already tested CI artifact where the provider permits direct static artifact deployment. A provider-side rebuild must be treated as a distinct candidate if its resolved dependencies or bytes differ.

## Release order

1. merge the intended browser candidate to `main` with green CI;
2. use the commit-addressed `browser-candidate-<commit-sha>` artifact from that green CI run as the exact manual-smoke candidate;
3. serve that static artifact over HTTP/HTTPS without modifying its contents and perform the real-browser checks in `docs/DEVELOPMENT_PREVIEW_CHECKLIST.md`;
4. publish only after the critical manual checks pass;
5. ensure the deployed build is produced from the same tested commit and dependency-install contract;
6. if the deployed build or dependency resolution differs from the smoke-tested candidate, repeat the affected checks.

## Current public scope

The current release is the Public Alpha. It includes the completed Stage 1–3 browser paths plus the shipped portion of Stage 4 procedural sources: Sphere, Torus, Grid, Spiral, Wave, Ribbon, Vortex, and Noise. Unshipped later roadmap controls must not be presented as working features before their implementation is ready.

Desktop/standalone packaging is not part of the current browser release. It remains optional and may be introduced later only if measured browser limitations justify it, while reusing the same project model and rendering core.
