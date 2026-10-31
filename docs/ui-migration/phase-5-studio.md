# Phase 5: Studio

Screens (app chrome only): `ScenePanel` (1087), `SceneAiSection` (487), `BrandSection` (331), `NewStudioDialog` (97), `TargetPicker` (144), `LookGrid` (23), `library` (52), `TransparentExport` (60), `TransparentTimeline` (63), `LayerHandles` (116), `SceneLayer` (154).

## Do NOT touch
`src/studio/scenes/*` (56 files), `fxStyle`, `styles`, `presets`, `brandKits`, `renderScenes`: they render the exported video using brand kits and fixed palettes. Theming them would change user videos.

## Kit components to use
`Tabs`, `Card` (`interactive`, `selected` for template/look tiles), `SettingRow`, `SectionHeader`, `Field`, `TextInput`, `TextArea`, `ColorField`, `FontPicker`, `PositionPad`, `Slider`, `Segmented`, `Select`, `Switch`, `Modal`, `Badge`, `EmptyState`, `Spinner`, `ProgressBar`, `ListItem`.

## Steps
1. `NewStudioDialog` and `TargetPicker`: `Modal` + `Card` tiles (selected state via `Card selected`); `LookGrid` swatches in `Card interactive`.
2. `ScenePanel`: section groups -> `SectionHeader`; rows -> `SettingRow`; scene list -> `ListItem`; per-scene controls reuse the Inspector patterns from Phase 4 so both look identical.
3. `SceneAiSection`: prompts -> `TextArea`, generate -> `Button`, status -> `Spinner`/`Badge`, errors -> danger notice.
4. `BrandSection`: color/font/logo fields -> `ColorField`, `FontPicker`, `Field`.
5. `TransparentExport` and `TransparentTimeline`: `Modal`, `ProgressBar`, tokens only for the timeline.
6. `LayerHandles`, `SceneLayer` editing chrome: handles/outline use `--accent`; the layer content itself is untouched.

## Done when
Create a Studio project, edit scenes, change brand, export transparent: all screens match the kit in both themes, and an exported video is pixel-identical to before (compare one export).

## Risks
Studio preview surfaces mix app chrome and video content; keep a clear boundary. Template tile thumbnails must not inherit app theme colors.
