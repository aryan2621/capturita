# Phase 3: Recorder, setup flow, settings, license UI

Screens: `RecorderPanel` (714), `SetupFlow` (333), `SettingsDialog` (920, includes the License section and GoogleSection), `PermissionsBanner` (if not finished).

## Kit components to use
`Button` (variants `primary`, `secondary`, `record`, `danger`), `Segmented` (mode pickers), `Select`, `Switch`, `SettingRow`, `SectionHeader`, `Field`, `TextInput`, `Card`, `Modal`, `Kbd`, `ProgressBar`, `Badge`, `Tabs`, `ToggleButton`.

## Steps
1. `RecorderPanel`: source/mode pickers -> `Segmented`; toggles (mic, camera, system audio) -> `Switch` or `ToggleButton`; start button -> `Button variant="record"`. Keep countdown and device-selection logic untouched.
2. `SetupFlow`: step list and permission rows -> `Card` + `Badge` (granted/missing); primary actions -> `Button`; progress -> `ProgressBar`.
3. `SettingsDialog`: wrap in kit `Modal`; every row becomes `SettingRow`; groups get `SectionHeader`; countdown/theme choices -> `Segmented`; shortcuts -> `Kbd`.
4. License section (new licensing UI, see handoff): use `Field` + `TextInput` for the key, `Badge` for state (Pro / not activated / revoked), `Button` for Activate/Remove. Add the seat-limit and offline-expired messages as danger/warning notices using kit tones.
5. Remove local one-off styles that the kit now covers; do not leave both.

## Done when
Recording flow, first-run setup, every settings section, and license activation render correctly in light and dark; shortcuts and focus order unchanged; build passes.

## Risks
`SettingsDialog` is large (920 lines): migrate section by section and commit per section. License text depends on the licensing work, so coordinate with that handoff.
