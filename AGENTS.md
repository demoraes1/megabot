# Repository Guidelines
## Project Structure & Module Organization
Electron main process code sits in `src/main/` (entry `main.js`, window management, IPC, browser lifecycle). Automation modules in `src/automation/` (profiles, PIX keys, script injection) and shared browser helpers in `src/browser-logic/`. Renderer assets under `src/renderer/` with `index.html`, `app.js`, Tailwind sources (`input.css`, `tailwind-compiled.css`). Platform setup lives in `src/infrastructure/` (Chromium downloader, proxy manager). Packaged Chromium binaries should be kept under `browser/Chrome-bin/`; runtime profiles and config JSON land in `profiles/`.

## Build, Test, and Development Commands
- `npm install` - sync Node dependencies.
- `npm run dev` - launch Electron with dev flags; use while iterating on renderer or automation flows.
- `npm run start` - run production-like desktop build using existing bundles.
- `npm run build` - produce distributables via `electron-builder` into `dist/`.
- `npm run build-css` - start Tailwind watcher (`input.css` -> `tailwind-compiled.css`); keep running in a separate terminal during UI work.
- `npm run build-css-prod` - emit minified Tailwind for packaging.

## Coding Style & Naming Conventions
Use 2-space indentation and CommonJS modules (`require`/`module.exports`). Favor single quotes in JavaScript and keep Portuguese comments consistent with surrounding files. Renderer components are plain JS; group related DOM helpers under cohesive modules instead of long files. Name new automation scripts with kebab-case (e.g., `payment-sync.js`) and keep profile JSON keys lowercase with hyphen separators.

## Testing Guidelines
There is no automated harness yet; validate flows by running `npm run dev` against a fresh profile in `profiles/`. When adding features, script deterministic checks inside `src/automation/scripts/` and document manual steps in the PR. If you introduce automated tests, colocate them under `src/**/__tests__/` and wire the runner through a new npm script.

## Commit & Pull Request Guidelines
Follow the existing history style: prefix with semantic version bumps (`v1.1.16 ...`) plus a concise Portuguese summary. Each PR should include a feature overview, manual verification notes (commands run, profiles used), and UI screenshots when renderer changes are involved. Link related issues and call out breaking changes or new config keys explicitly.

## Profiles & Configuration Tips
Treat `profiles/` as runtime data; avoid committing generated profile folders. Update `src/config/app-settings.json` and `monitores-config.json` through helper APIs rather than editing at runtime, and document default values in your PR when they change.


