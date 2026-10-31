# Phase 0: Foundations

Purpose: remove surprises before touching screens.

## Steps
1. Create a branch (e.g. `ui-chatgpt-theme`). The working tree has unrelated WIP (see `git status`); commit or stash it first so migration diffs stay clean.
2. Diff the kit against the app, per file:
   - `diff ~/Downloads/files/ui.tsx src/components/ui.tsx` and list what the kit changes in existing components (props, sizes, variants), not only what it adds.
   - `diff ~/Downloads/files/index.css src/index.css`: compare token names and values (current app is warm dark with `--accent: #d97757`; kit is neutral `--accent: #0d0d0d` / `#ececec`).
3. Confirm the kit's dependencies exist: `cx` helper (kit asks you to reuse the project's), React 19, Tailwind 4 (`@tailwindcss/vite` 4.3.3 present). Confirm the app kit `ui.tsx` has no router import (only the landing kit did).
4. Theme wiring: `src/lib/theme.ts` already sets `document.documentElement.dataset.theme` and syncs native windows. Kit supports `data-theme` and `.dark`. No change expected; verify.
5. Make a baseline: screenshots of every screen in light and dark (list in README) into `docs/ui-migration/baseline/` (gitignored or kept local).
6. Record kit-vs-current gaps you will keep: lane colors (`--lane-zoom/text/audio/cut/hide/caption`), `--record`, any tokens the app uses that the kit lacks (grep `var(--` in `src` for names missing from the kit CSS).

## Decisions (already made)
Switch to kit toast; record stays red; native helper matches the new look; editor stage follows the kit. Still to settle here: tokens the kit lacks that the app needs (from the grep in step 6), and the radius and density rules from the README guardrails.

## Done when
Branch exists, baseline screenshots exist, a written list of token/component gaps is added to this file, decisions answered.

## Gap list (step 2, 3, 6; generated 2026-10-31)

### Tokens (`index.css`)
- Same names, new values: `--bg --panel --panel-2 --raised --stage --line --line-strong --fg --muted --subtle --accent --accent-hover --accent-fg --record(-hover) --danger/warning/success (+ -soft, -fg)`. Kit is neutral (`--accent` #0d0d0d light / #ececec dark); app is warm (`#d97757`, `#b4583a` light).
- Kit lacks, app uses (keep): `--lane-zoom/text/audio/cut/hide/caption/scene/voice/sfx` and their `--color-lane-*` @theme aliases, `--scrollbar`, `--shadow-lg` (+ `--shadow-panel`). `--fill` is set inline by the slider, so nothing to add.
- Kit lacks: font imports and tokens (app: Inter, Source Serif 4, JetBrains Mono; kit: system stack), body rules (14px, `user-select: none`, `#root` height), scrollbar styling, `:focus-visible` ring and the input-focus-outline fix, `@layer base` form font inheritance.
- Theme selectors differ: app dark is the `:root` default, light is `[data-theme='light']`. Kit light is the default, dark is `[data-theme='dark']` or `.dark`. Pick one before merging (`theme.ts` sets `data-theme`; check it sets it for both values).
- Slider: kit thumb 16px, accent-bordered, `--bg` fill, 4px track tinted from `--fg`; app thumb 14px white with shadow, track `--line-strong`.
- Light-theme `--accent-fg` is not in the app's light block (inherits dark `#1f1e1d`); check kit light sets white.

### Components (`ui.tsx`)
- Kit imports only `react` and `react-dom` (no router). Good.
- `cx` is a private helper at `src/components/ui.tsx:12`. The kit expects the project's. Keep it, delete the kit's copy if it has one.
- Kit-only: Badge, Card, Divider, EmptyState, Field, ListItem, SectionHeader, SettingRow, SidebarItem, Spinner, Tabs, TextArea, TextInput, Tooltip, ToastProvider/useToast. (Toast decision: replace the app's current toast; locate it via `rg -n toast src/main.tsx`.)
- Shared (diff props/sizes in Phase 1): Button, Checkbox, ColorField, FontPicker, IconButton, Kbd, MenuButton, Modal, Popover, PositionPad, ProgressBar, RadioList, RangeInput, Segmented, Select, Slider, Switch, TimeField, ToggleButton.
- Density gap: kit Select/inputs are `h-8`/`h-9`; app is `h-7`/`h-8` (sm/md). Decide per README guardrails.
- App has no exports the kit lacks, so nothing app-only to preserve in `ui.tsx`.
- Kit also exports types `Variant`, `ButtonSize` (app has them non-exported).

### Decisions (settled 2026-10-31, defaults)
- Integration branch `ui-migration` (from origin/main 72081ad), worked in worktree `../capturita-ui-migration`. Supersedes the earlier "stay on main" default.
- Baseline screenshots: done by the user.
- Theme: follow the kit (light base, `[data-theme='dark']`/`.dark` for dark); `theme.ts` must set `data-theme` for both values (verify in Phase 1).
- Keep from the app: `--lane-*` and `--color-lane-*`, `--record(-hover)`, `--scrollbar`, `--shadow-lg`/`--shadow-panel`, fonts only if they stay within README guardrail 1 (kit system stack wins by default).
- Density (guardrail 2): roomy `md`/`lg` for Library, Setup, Settings; kit `sm` for Inspector, Timeline, panels.
- Radius (guardrail 7): kit scale; pill for primary actions and toasts, ~10-12px rows/fields, larger for dialogs.
- Contrast: darken light `--subtle` or restrict it to placeholder/disabled text.
- Keep the app's `cx`; kit toast replaces the current one.

## Status (2026-10-31)
- [x] 1. Branch: `ui-migration` created from origin/main and pushed.
- [x] 2. Diff kit vs app (CSS and ui.tsx exports). Props/sizes of the 19 shared components not diffed line by line: moved to Phase 1 step 2.
- [x] 3. Dependencies: only `react`/`react-dom` imports in kit, no router. React 19 / Tailwind 4 versions not re-verified; `npm run build` in Phase 1 proves them.
- [x] 4. Theme wiring: `src/lib/theme.ts` sets `data-theme` to `light` or `dark`, which matches the kit selectors. No change needed.
- [ ] 5. Baseline screenshots: left because the user is taking them (needs the running app). Goes in `docs/ui-migration/baseline/`.
- [x] 6. Token gaps recorded above.
- [x] Decisions settled (defaults).
