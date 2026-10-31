# Phase 7: QA and cleanup

## Cleanup
- Delete tokens, classes, and helper components no longer referenced (grep each name before deleting). Remove duplicated one-off styles left over from phases 2 to 6.
- Remove the `sonner` dependency (`package.json`, lockfile) and any leftover `Toaster` code; decide on tooltips (`TooltipLayer` vs kit `Tooltip`) and keep one.
- Remove the dev-only `UiPreview` route (or keep behind a dev flag).

## QA checklist (light and dark, minimum and large window)
- App: record flow, permissions banner, library (empty, search, sort, select), settings (every section), license activation (activate, seat limit, revoked, offline), editor (each Inspector tab, each panel, timeline lanes, handles), export, shortcuts sheet, Studio (new project, scenes, brand, transparent export).
- Accessibility: visible focus rings, contrast of `--muted`/`--subtle` text on `--bg`/`--panel`, keyboard operation of Modal/Popover/Tabs, `prefers-reduced-motion`.
- Exports: one exported video and one transparent export are unchanged versus before the migration.
- Native helper (control bar, camera bubble, area picker) matches the new look in light and dark and follows the theme setting (phase 6).
- Guardrails from the README: contrast (`--subtle` in light), focus rings on video and in dark, one radius scale, reduced motion, no backdrop blur over the playing preview.
- Toasts: success, error (stays longer, announced as an alert), warning, info; cap of 3 visible; works from non-component code.

## Done when
No unused tokens/components remain, checklists pass, screenshots updated, and a final summary of deviations from the kit is added here.
