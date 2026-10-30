import { diagonalPoints, layerFilter, STREAK, type Dip, type LayerFx } from '../editor/model';

// Kept free of app code: the studio renderer bundles this file too (TransparentTimeline).
/** A transition look as CSS, matching how the export draws it on its canvas (see drawLayer). */
export function fxStyle(fx: LayerFx | undefined, shortSide: number) {
    if (!fx) return { transform: '', inner: '', clipPath: '', filter: '' };
    const { clip, mask } = fx;
    const clipPath = mask
        ? mask.shape === 'circle'
            ? `circle(${(mask.progress * 70.71).toFixed(2)}% at 50% 50%)`
            : `polygon(${diagonalPoints(mask.progress).map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(', ')})`
        : clip
          ? `inset(${clip.top * 100}% ${clip.right * 100}% ${clip.bottom * 100}% ${clip.left * 100}%)`
          : '';
    // A directional blur: the element is stretched along its axis and its content squashed back inside
    // (`inner`), so the round blur filter becomes a streak. drawLayer does the same with a scratch canvas.
    const streak = fx.blur > 0 ? fx.blurAxis?.toUpperCase() : undefined;
    return {
        transform: fx.x || fx.y || fx.scale !== 1 || streak ? `translate(${fx.x * 100}%, ${fx.y * 100}%) scale(${fx.scale})${streak ? ` scale${streak}(${STREAK})` : ''}` : '',
        inner: streak ? `scale${streak}(${1 / STREAK})` : '',
        clipPath,
        filter: layerFilter(fx, shortSide),
    };
}

/** A dip's wash as CSS, matching drawDip: the whole frame, or a circle from the centre. */
export function dipStyle(dip: Dip) {
    return { background: dip.color, opacity: dip.opacity, clipPath: dip.radius === undefined ? '' : `circle(${(dip.radius * 70.71).toFixed(2)}% at 50% 50%)` };
}
