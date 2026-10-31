# Phase 1: Tokens and component kit

Purpose: swap the foundation so every screen already looks closer to the target, with no screen edits yet.

## Files
- `src/index.css` (225 lines) <- kit `index.css`
- `src/components/ui.tsx` (730 lines) <- kit `ui.tsx` (1354 lines)
- Preview only: add kit `UiPreview.tsx` as a dev-only route or story to eyeball every component.

## Steps
1. `index.css`: take the kit's light/dark token blocks and `@theme inline` map. Keep app-only content the kit lacks: `--lane-*` colors, scrollbar/selection rules, fonts, any editor-specific variables found in Phase 0. Do not delete tokens until Phase 7 (screens may still reference them).
2. `ui.tsx`: replace with the kit file, then restore anything the app has that the kit does not (check the Phase 0 diff; `TooltipLayer`-related exports, custom props used by callers). Keep export names identical so the 23 importing files compile unchanged.
3. If a kit component changed a prop name or default (size, variant), add the old behavior as a compatible alias in `ui.tsx` rather than editing 23 files now.
4. Compile: `npm run build`. Fix type errors in `ui.tsx` only.
5. Open `UiPreview` in light and dark; compare with the baseline. Fix token gaps.
6. Fonts: kit uses the system stack; confirm no custom font was lost.
7. Toast facade (needed for the sonner switch). `sonner` has 116 call sites in 19 files (65 `toast.error`, 29 `success`, 12 `info`, 3 `warning`, 4 plain `toast(`). The kit toast is a hook (`useToast`) with tones neutral/success/danger only. To avoid hand-editing 116 calls:
   - Mount the kit `ToastProvider` in `main.tsx` in place of `ThemedToaster`.
   - Add `src/lib/toast.ts` exporting `toast`, `toast.success`, `toast.error`, `toast.info`, `toast.warning` with the same call shape. The provider registers its `show` into a module variable so the facade also works outside components.
   - Mapping: success -> success, error -> danger, info/plain -> neutral, warning -> add a `warning` tone to the kit toast (uses `--warning`).
   - Fix kit gaps: errors get `role="alert"` and a longer duration (about 8s), cap visible toasts at 3, pause the timer on hover, keep the `action` button.
   - Mechanical change: in the 19 files replace `import { toast } from 'sonner'` with the facade. Remove `sonner` from `package.json` in Phase 7.

## Out of scope
Rewriting screen markup (phases 2 to 5). Removing old tokens (phase 7).

## Done when
App builds, every existing screen opens without layout breakage (colors will change), `UiPreview` renders in both themes, commit "Adopt ChatGPT tokens and ui kit".

## Risks
- Kit components with different default sizes can shift layouts in the dense editor panels: check `Inspector` and `Timeline` right after the swap.
- Anything styled with raw hex instead of tokens will look wrong (grep `#[0-9a-f]{6}` in `src` outside `studio/scenes`).

## Status (2026-10-31)
- [ ] 1. `src/index.css` rewritten from kit, then reverted so the Phase 0 baseline shows the old look. Re-apply from `/private/tmp/claude-502/-Users-rishabh-verma-Desktop-Personal-capturita/2651a3c1-acc7-4da8-81b8-debb882e2e06/scratchpad/index.phase1.css` after the baseline exists. Content: kept `--lane-*`, `--scrollbar`, `--shadow-lg`, serif/mono fonts, base rules. Inter dropped from the sans stack (kit system stack). Not yet compiled or eyeballed.
- [ ] 2. `ui.tsx` swap: left, not started. Reason: the kit is 1354 lines against 730; it needs a per-component prop/size diff first so the 23 importing files compile unchanged. Old file backed up outside the repo.
- [ ] 3. Compatibility aliases: left, depends on step 2.
- [ ] 4. `npm run build`: left, depends on steps 2 and 3. CSS-only change not built yet either.
- [ ] 5. `UiPreview` in both themes: left, needs a running build and the user's baseline screenshots to compare.
- [x] 6. Fonts: only Inter lost from the UI stack. `font-serif`/`font-mono` are used (ScenePanel, NewStudioDialog) so they stay. Studio scenes import their own fonts in `studio/scenes/fonts.ts`.
- [ ] 7. Toast facade (`src/lib/toast.ts`, 116 sonner call sites in 19 files, warning tone, `role="alert"`, hover pause, cap of 3): left, needs the kit `ToastProvider` from step 2 first.
