import { fitText } from '@remotion/layout-utils';
import { fontFamily, type SceneFont } from './fonts';

/**
 * The largest font size (up to `max`) at which the text's longest line fits `width`. Measured
 * with the real font once useFontsReady (in BrandTexture) has let the render through.
 */
export function fitSize(text: string, width: number, font: SceneFont, max: number, weight = '800') {
    const lines = text.split('\n').filter((line) => line.trim());
    if (!lines.length || width <= 0) return max;
    const sizes = lines.map((line) => fitText({ text: line, withinWidth: width, fontFamily: fontFamily(font), fontWeight: weight }).fontSize);
    return Math.min(max, ...sizes);
}
