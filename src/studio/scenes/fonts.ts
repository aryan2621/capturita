// Fonts scenes may use. Each scene imports this file, so the studio renderer (its own browser,
// without the app's stylesheet) loads the same fonts as the preview.
import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/outfit';
import '@fontsource-variable/sora';
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/geist-mono';
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';

export type SceneFont =
    | 'inter'
    | 'serif'
    | 'mono'
    | 'space-grotesk'
    | 'manrope'
    | 'dm-sans'
    | 'plus-jakarta'
    | 'outfit'
    | 'sora'
    | 'playfair'
    | 'fraunces'
    | 'bricolage'
    | 'geist-mono';

/** The bundled fonts brand kits choose from, with the CSS stack scenes set. */
export const SCENE_FONTS: { value: SceneFont; label: string; stack: string }[] = [
    { value: 'inter', label: 'Inter', stack: "'Inter Variable', system-ui, sans-serif" },
    { value: 'serif', label: 'Source Serif 4', stack: "'Source Serif 4 Variable', Georgia, serif" },
    { value: 'mono', label: 'JetBrains Mono', stack: "'JetBrains Mono Variable', ui-monospace, monospace" },
    { value: 'space-grotesk', label: 'Space Grotesk', stack: "'Space Grotesk Variable', system-ui, sans-serif" },
    { value: 'manrope', label: 'Manrope', stack: "'Manrope Variable', system-ui, sans-serif" },
    { value: 'dm-sans', label: 'DM Sans', stack: "'DM Sans Variable', system-ui, sans-serif" },
    { value: 'plus-jakarta', label: 'Plus Jakarta Sans', stack: "'Plus Jakarta Sans Variable', system-ui, sans-serif" },
    { value: 'outfit', label: 'Outfit', stack: "'Outfit Variable', system-ui, sans-serif" },
    { value: 'sora', label: 'Sora', stack: "'Sora Variable', system-ui, sans-serif" },
    { value: 'bricolage', label: 'Bricolage Grotesque', stack: "'Bricolage Grotesque Variable', system-ui, sans-serif" },
    { value: 'playfair', label: 'Playfair Display', stack: "'Playfair Display Variable', Georgia, serif" },
    { value: 'fraunces', label: 'Fraunces', stack: "'Fraunces Variable', Georgia, serif" },
    { value: 'geist-mono', label: 'Geist Mono', stack: "'Geist Mono Variable', ui-monospace, monospace" },
];

/** The CSS family name (first in the stack), for loading and measuring. */
export const fontFamily = (font: SceneFont) => fontStack(font).split(',')[0].replace(/'/g, '');

/**
 * Holds the render until the given fonts have loaded, so text measured with fitText (and every
 * exported frame) uses the real font rather than a fallback. Gives up after 3 s.
 */
export function useFontsReady(fonts: SceneFont[]) {
    const key = [...new Set(fonts)].join(',');
    const [handle] = useState(() => delayRender(`Loading fonts ${key}`));
    useEffect(() => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            continueRender(handle);
        };
        const families = key.split(',').map((f) => fontFamily(f as SceneFont));
        Promise.all(families.flatMap((family) => ['400', '700', '800'].map((weight) => document.fonts.load(`${weight} 40px '${family}'`)))).then(finish, finish);
        const timeout = setTimeout(finish, 3000);
        return () => {
            clearTimeout(timeout);
            finish();
        };
    }, [handle, key]);
}

export const fontStack = (font: SceneFont) => (SCENE_FONTS.find((f) => f.value === font) ?? SCENE_FONTS[0]).stack;
