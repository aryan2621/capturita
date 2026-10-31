# Phase 2: Main window shell and library

Screens: `MainWindow` (313 lines), `RecordingsList` (382), `PermissionsBanner` (38), `ProFeatureGate` (28), `TooltipLayer` (94), `main.tsx` (Toaster from `sonner`, theme init, `LicenseProvider`).

## Kit components to use
`SidebarItem`, `ListItem`, `Card`, `Badge`, `EmptyState`, `Divider`, `Tabs`, `IconButton`, `Button`, `TextInput` (library search), `Select` (sort), `MenuButton` (row actions), `Tooltip`, `Spinner`.

## Steps
1. Layout: sidebar/panel surfaces use `--panel`, content `--bg`, borders `--line`. Replace hand-rolled sidebar rows with `SidebarItem`.
2. Library (`RecordingsList`, `EmptyLibrary`-style empty state): rows -> `ListItem`, thumbnails in `Card`, badges for duration/status -> `Badge`, search -> `TextInput`, sort -> `Select`, empty state -> `EmptyState`.
3. `PermissionsBanner`: warning/danger banner using kit tones (`--warning-soft/--warning-fg`).
4. `ProFeatureGate`: use kit `Card` + `Button`. Keep its logic (reads `LicenseProvider`).
5. Tooltips: decide between the existing `TooltipLayer` (global `data-tooltip` style) and kit `Tooltip`. Prefer one; if keeping `TooltipLayer`, restyle with the kit tokens (`tooltipSurface` is exported by the kit).
6. Toasts: already switched to the kit toast in Phase 1 (facade). Here only verify placement and look over the library and recorder, and that no `sonner` styling remains in this area.

## Done when
Main window, library, empty state, banners, and gate look correct in light and dark; keyboard navigation and hover/selected states match the kit; `npm run build` passes; screenshots compared to baseline.

## Risks
Library thumbnails and selection states are the densest part: check multi-select and long names.
