# UI migration to the ChatGPT-style theme

Goal: move the Capturita desktop app onto the neutral ChatGPT look (black/white accent, `--bg/--panel/--raised/--line` tokens, one component kit) without changing behavior.

## The kit (`~/Downloads/files`)
Landing site: already migrated, out of scope. Only the app kit (top-level `index.css`, `ui.tsx`, `UiPreview.tsx`) is used here; ignore the nested `mnt/.../landing` copy.
| Kit | Files | For |
|---|---|---|
| App kit | `index.css` (117 lines), `ui.tsx` (1354 lines, 40+ components), `UiPreview.tsx` (159) | Desktop app `src/` |

Kit API stays the same as the app's current `src/components/ui.tsx` (730 lines: Button, IconButton, Select, Switch, Segmented, Slider, Modal, Popover, ...). New in the kit: TextInput, TextArea, Field, SettingRow, SectionHeader, Card, Badge, Tooltip, Tabs, Toast, Spinner, EmptyState, Divider, ListItem, SidebarItem. So most of the work is replacing hand-rolled markup in screens with these, not rewriting logic.

## Inventory (screens and pages)
**Desktop app (React in Tauri), 23 files import `components/ui`** (the app only):
- Windows (2): `MainWindow` (313 lines: recorder + library), `EditorView` (1645).
- Main-window parts: `RecorderPanel` (714), `RecordingsList` (382), `PermissionsBanner`, `ProFeatureGate`, `TooltipLayer`.
- Dialogs/overlays (7): `SettingsDialog` (920), `SetupFlow` (333), `ExportDialog` (652), `NewStudioDialog`, `ShortcutsSheet`, `TargetPicker`, `TransparentExport`.
- Editor panels: `Inspector` (1213, 6 tabs), `Timeline` (1012), `CaptionsPanel`, `AiPanel`, `MusicPanel`, `AudioClipsPanel`, `HidePanel`, plus canvas handles/overlays (`CropOverlay`, `TextHandle`, `ZoomFocusHandle`, `HideHandle`).
- Studio: `ScenePanel` (1087), `SceneAiSection`, `BrandSection`, `LookGrid`, `library`, `LayerHandles`, `SceneLayer`.
- Out of theme scope: `studio/scenes/*` (56 files) render the exported video and use their own brand colors. Do not apply the app theme there.
- Native Swift helper (`recorder/Sources/CapturitaRecorder`: ControlBar 185 lines, CameraBubble 129, AreaPicker 112): not React, but it must match the new look (decided). Own phase (6).


## Phases (do in order; each ends with a working, committed app)
0. [Foundations](phase-0-foundations.md): branch, diff kit vs current, decisions.
1. [Tokens and kit swap](phase-1-tokens-and-kit.md): `index.css` + `ui.tsx`, nothing else changes visually except color.
2. [Main window shell](phase-2-main-window.md): MainWindow, library, banners, tooltips.
3. [Recorder, setup, settings, license](phase-3-recorder-setup-settings.md)
4. [Editor](phase-4-editor.md): EditorView, Timeline, Inspector, panels, export.
5. [Studio](phase-5-studio.md)
6. [Native recorder helper](phase-6-native-helper.md): ControlBar, CameraBubble, AreaPicker in Swift.
7. [QA and cleanup](phase-7-qa-cleanup.md)

## Decisions (made)
- Toasts: switch from `sonner` to the kit toast (116 call sites in 19 files; see phase 1 for the facade that avoids editing each call).
- Record button and recording indicators stay red (`--record`).
- Native helper (control bar, camera bubble, area picker) matches the new look.
- Editor/Studio stage follows the kit (`--stage`), not a separate dark override.

## Guardrails: what to keep in mind when copying a ChatGPT look
Research note: public sources on ChatGPT's UI are thin (one third-party style reference, [Refero](https://styles.refero.design/style/52a007ed-ad1b-46a6-bd44-b76f91df6d0c): system fonts, 14/16/18/24px sizes, weights 400 to 600, 10px sidebar item radius, near-black `#0d0d0d` text). The rest below is design judgment and facts from this codebase; contrast numbers are my calculations, so re-check them with a tool.
1. **Inspired by, not impersonating.** Do not use OpenAI's proprietary font, logo, name, or icons. Keep the system font stack and Capturita's own logo/app icon.
2. **Two densities.** ChatGPT is a roomy chat UI. Use roomy sizes for Library, Setup, Settings; use the kit's `sm`/`md` dense sizes (13px text, about 28 to 32px controls) for Inspector, Timeline, panels. Pick the density per surface once; do not mix inside a panel.
3. **A monochrome accent loses emphasis.** Selected, active tool, focus, and recording must be distinguishable without color alone (inverse fill, weight, outline). Keep color only for meaning: record red, timeline lanes, success/warning/danger.
4. **Contrast.** Light `--subtle` (#8f8f8f on white) is about 3.2:1, below the 4.5:1 needed for body-size text: use it only for placeholder/disabled/large text or darken it. Light `--muted` (#5d5d5d) is about 6.6:1 and dark `--subtle` on `--bg` about 4.9:1 (fine).
5. **Focus rings.** With a black/white accent, rings must use `--fg` with an offset and stay visible on video overlays and in dark mode. Test keyboard focus in every dialog.
6. **Dark layering.** ChatGPT's dark uses tiny surface steps (`#212121` / `#303030`) and alpha borders. Check that panel edges are still visible on a dim display; keep `--stage` darker than panels so video reads as the focus.
7. **One radius scale.** Pill for primary actions and toasts, about 10 to 12px for rows and fields, larger for dialogs. Define it once; no ad-hoc radii.
8. **Motion.** 100 to 200ms ease-out, respect `prefers-reduced-motion`, no animation that shifts layout during playback or timeline drag.
9. **Desktop, not web.** Keep Tauri drag regions on the title bar, `user-select: none` on chrome, default cursor on buttons, native context menus, thin scrollbars.
10. **Performance.** Avoid `backdrop-filter` blur over the playing video preview. Vibrancy belongs in the native helper (`NSVisualEffectView`).
11. **One icon style.** Same stroke (about 1.5 to 1.6 at 16px) and size across the app; the kit only ships a few inline icons.
12. **Copy tone.** Plain sentence-case labels; avoid ALL-CAPS section headings.
13. **WKWebView.** Tailwind 4 needs Safari 16.4+. The app requires macOS 15, so this is fine; still test `color-mix` and shadows in the real app, not only the browser.
14. **Brand identity.** With a monochrome accent the brand color disappears; decide where Capturita's identity lives (logo, empty states, onboarding).

## Rules for every phase
- Reuse kit components; do not copy the kit's styles into screens. No new one-off buttons or inputs.
- Preserve behavior, keyboard shortcuts, and `data-theme` light/dark. Check both themes.
- Keep timeline lane colors (`--lane-*`) and recording red (`--record`); they are semantic, not decoration.
- One phase per PR/commit series; run `npm run build` (and `cd src-tauri && cargo check` if Rust was touched) before moving on.
- Not verified yet: how the kit looks inside the real screens. Each phase ends with a screenshot pass in light and dark.
