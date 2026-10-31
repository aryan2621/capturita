# Phase 4: Editor

Screens: `windows/EditorView` (1645 lines), `Timeline` (1012), `Inspector` (1213, 6 tabs), panels: `CaptionsPanel` (479), `AiPanel` (303), `MusicPanel` (246), `AudioClipsPanel` (494), `HidePanel` (98); `ExportDialog` (652), `ShortcutsSheet` (88); canvas overlays `CropOverlay`, `TextHandle`, `ZoomFocusHandle`, `HideHandle`.

## Kit components to use
`Tabs` (Inspector), `SettingRow`, `SectionHeader`, `Field`, `Slider`, `RangeInput`, `ColorField`, `TimeField`, `FontPicker`, `PositionPad`, `Segmented`, `Switch`, `Select`, `ToggleButton`, `Popover`, `MenuButton`, `Modal`, `ProgressBar`, `Tooltip`, `Kbd`, `IconButton`, `Badge`, `TextArea`.

## Steps (commit after each)
1. Editor frame: toolbar, preview "stage" (`--stage`, follows the kit in both themes: decided), panel surfaces (`--panel`, `--line`). Toolbar buttons -> `IconButton`/`Button`.
2. Inspector: tab bar -> `Tabs`; each control row -> `SettingRow`/`Field`; sliders/colors/fonts/positions -> kit components (they already exist in the app's current `ui.tsx`, so this is mostly prop alignment).
3. Panels: Captions, AI, Music, AudioClips, Hide: lists -> `ListItem`, empty states -> `EmptyState`, inputs -> `TextInput`/`TextArea`, progress -> `ProgressBar`.
4. Timeline: keep lane colors (`--lane-*`). Restyle ruler, playhead, clips with `--line`, `--fg`, `--muted`. This is custom canvas-like UI; apply tokens only, no kit components.
5. Overlays/handles: use `--accent`/white handles on dark video; make sure they stay visible on any footage.
6. `ExportDialog`: kit `Modal`, `Segmented` for format/resolution, `ProgressBar`, `Button`.
7. `ShortcutsSheet`: `Modal` + `Kbd`.

## Done when
Every editor tab and panel, export, shortcuts, and handles work and look correct in both themes; undo/redo and playback unaffected; build passes; screenshots compared.

## Risks
- Timeline and Inspector are the biggest files; a layout shift from kit control heights can break dense panels. Check at the minimum window size.
- Handles drawn over video must stay readable on light and dark footage.
