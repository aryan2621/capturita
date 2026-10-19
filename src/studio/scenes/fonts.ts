// Fonts scenes may use. Each scene imports this file, so the studio renderer (its own browser,
// without the app's stylesheet) loads the same fonts as the preview.
import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/jetbrains-mono';

export type SceneFont = 'inter' | 'serif' | 'mono';

/** The bundled fonts brand kits choose from, with the CSS stack scenes set. */
export const SCENE_FONTS: { value: SceneFont; label: string; stack: string }[] = [
    { value: 'inter', label: 'Inter', stack: "'Inter Variable', system-ui, sans-serif" },
    { value: 'serif', label: 'Source Serif 4', stack: "'Source Serif 4 Variable', Georgia, serif" },
    { value: 'mono', label: 'JetBrains Mono', stack: "'JetBrains Mono Variable', ui-monospace, monospace" },
];

export const fontStack = (font: SceneFont) => (SCENE_FONTS.find((f) => f.value === font) ?? SCENE_FONTS[0]).stack;
