# Renderer Refactor Rollout

The goal is to migrate the legacy `app.js` monolith into smaller modules without changing behaviour. Work through the phases in order and request execution for each phase explicitly.

## Phase 0 - Preparation
- Create `src/renderer/app/` subtree and scaffold shared utility files with stubs.
- Update `index.html` to load the new entry point (keep old script temporarily commented).
- Add a temporary `app/bootstrap/checklist.md` for notes while the migration is in progress.

## Phase 1 - Core Bootstrap
- Move `initializeApplication` and DOM bootstrap bindings into `app/bootstrap/main.js`.
- Wrap notification and confirm helpers into `app/ui/feedback.js` and re-export via bootstrap.
- Ensure `window` attachments still expose the same API surface for other scripts.

## Phase 2 - Settings And Persistence
- Extract settings load/save, debounce, and localStorage helpers into `app/data/settings.js`.
- Provide a single `SettingsService` object consumed by bootstrap and other modules.
- Verify that auto-save, toggles, and default values still work.

## Phase 3 - UI Shell
- Split tab system, popups, counters, and link management UI into `app/ui/` modules.
- Keep DOM selectors in one place (`app/ui/selectors.js`) to reduce duplication.
- After wiring, confirm all buttons, popups, and counters behave as before.

## Phase 4 - Automation Flows
- Move link navigation, script injection, and "criar contas" flow into `app/automation/`.
- Add a coordinator module that receives dependencies (settings, ui helpers) from bootstrap.
- Smoke test navigation and automation menus.

## Phase 5 - Profiles Module
- Extract profile data loading, filtering, and card rendering into `app/profiles/`.
- Implement a small event bus or callbacks so UI updates after actions (start, delete).
- Ensure delete progress bar, filters, and status indicators remain functional.

## Phase 6 - Infrastructure Helpers
- Relocate Chrome download workflow into `app/chrome/` and monitor logic into `app/monitors/`.
- Provide plain functions imported by bootstrap instead of keeping everything global.

## Phase 7 - Cleanup
- Remove leftover globals from `window` and document the new API surface in `docs/`.
- Delete temporary checklist or convert it into documentation if still useful.
- Run a final manual regression using `npm run dev`.

Request each phase when you are ready so we can implement and validate step by step.
