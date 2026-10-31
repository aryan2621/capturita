# Phase 6: Native recorder helper (Swift)

Files (`recorder/Sources/CapturitaRecorder`): `ControlBar.swift` (185 lines), `CameraBubble.swift` (129), `AreaPicker.swift` (112). Build with `npm run build:recorder` (`scripts/build-recorder.sh`). Theme already reaches the helper: `src/lib/theme.ts` sends `setAppearance` (`light`, `dark`, `system`), and `main.swift` sets `NSApp.appearance`.

## What to match
- The control bar (a pill with `NSVisualEffectView`, monospaced time, red dot, red stop button) should read like the kit: neutral surface, `--line`-style hairline border, pill radius, sentence-case labels, record red `#e5484d` light / `#ef5a5f` dark (not `.systemRed`), paused state uses the kit warning color instead of `.systemYellow`.
- Camera bubble: border currently white at 90% alpha. Use a hairline in the kit's line color plus a subtle shadow that works on any video background.
- Area picker overlay: dim layer at 45% black and a white outline are fine on arbitrary screens; align label font/size with the kit (system 13 to 14px, weight 500 to 600) and keep the dimension label readable.

## Steps
1. Add one small Swift file (e.g. `Theme.swift`) with dynamic `NSColor`s (light/dark) for fg, muted, line, record, warning. Reuse it in the three files; no hard-coded colors left.
2. Replace `.systemRed`/`.systemYellow` usage in `ControlBar.swift` (record dot, stop button tint) with those colors.
3. Adjust border, radius, and spacing in `ControlBar` and `CameraBubble` to the kit scale (pill for the bar, circle for the bubble).
4. Keep `NSVisualEffectView` vibrancy (do not use CSS-style blur here); verify legibility over bright and dark screen content.
5. Keep behavior untouched: IPC commands, positions, shortcuts.
6. Rebuild the helper, record a short clip, and check in light and dark system modes plus each app theme choice (`light`, `dark`, `system`).

## Done when
Control bar, camera bubble, and area picker match the app's new look in both themes, record stays red, recording still starts/pauses/stops, and `npm run build:recorder` succeeds.

## Risks
- Native views are not covered by the web screenshot baseline; capture native screenshots separately.
- The control bar overlays arbitrary content: check contrast on white, black, and busy backgrounds.
