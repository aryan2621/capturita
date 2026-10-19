import type { LayerFx } from '../editor/model';

// Kept free of app code: the studio renderer bundles this file too (TransparentTimeline).
/** A transition look as CSS, matching how the export draws it on its canvas (see drawLayer). */
export function fxStyle(fx: LayerFx | undefined, shortSide: number) {
    if (!fx) return { transform: '', clipPath: '', filter: '' };
    const { clip } = fx;
    return {
        transform: fx.x || fx.y || fx.scale !== 1 ? `translate(${fx.x * 100}%, ${fx.y * 100}%) scale(${fx.scale})` : '',
        clipPath: clip ? `inset(${clip.top * 100}% ${clip.right * 100}% ${clip.bottom * 100}% ${clip.left * 100}%)` : '',
        filter: fx.blur > 0 ? `blur(${(fx.blur * shortSide).toFixed(2)}px)` : '',
    };
}
