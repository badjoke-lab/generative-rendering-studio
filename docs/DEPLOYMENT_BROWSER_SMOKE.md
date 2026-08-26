# Automated Browser Smoke Contract

The Development Preview candidate is tested in real headless Chromium with Playwright after the production Vite build is created.

The browser smoke suite must cover the repeatable parts of the public preview workflow: supported still-source import, text creation, locale persistence, renderer switching, Source A/B Morph controls, a still-file download, short animation recording when the runner exposes canvas recording, and narrow-viewport survival.

Playwright traces and screenshots are retained on failure. Human verification remains required for subjective visual quality, downloaded-media playback inspection, and a second browser family where practical.
