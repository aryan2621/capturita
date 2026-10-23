// Layers of the Custom scene: what they are, where they sit at a moment, and the presets the
// panel adds. Shared by the preview handles and the renderer, so keep app code out of it.
import type { BrandColors } from './assets';

export type LayerKind = 'text' | 'image' | 'shape' | 'logo' | 'icon' | 'element';
export type LayerColor = keyof BrandColors | 'white' | 'black';
export type LayerEnter = 'none' | 'fade' | 'rise' | 'pop' | 'slide' | 'wipe' | 'blur' | 'type' | 'words';
export type LayerEase = 'smooth' | 'linear' | 'in' | 'out' | 'overshoot';
/** Frame shapes a layer can have its own layout for. */
export type LayerAspect = 'wide' | 'square' | 'tall';
export type LayerBox = { x: number; y: number; w: number; h: number };

/** Where a layer is at one moment, set by a keyframe. */
export interface LayerKey {
    /** Seconds into the scene. */
    t: number;
    x: number;
    y: number;
    scale: number;
    rotate: number;
    opacity: number;
    /** How it moves into this keyframe from the one before (smooth when unset). */
    ease?: LayerEase;
}

/** One layer. Its box is in percent of the frame (top-left corner, then size), so it fits every aspect. */
export interface Layer {
    /** Unique within the scene; lets AI edits keep a layer's keyframes and picture when rows move. */
    id?: number;
    kind: LayerKind;
    text: string;
    /** Text size and weight: headline, title, body or label. */
    style: 'headline' | 'title' | 'body' | 'label';
    color: LayerColor;
    align: 'left' | 'center' | 'right';
    shape: 'rect' | 'rounded' | 'circle' | 'pill' | 'line';
    icon: string;
    /** A built-in animated element (elements.tsx). */
    element: string;
    image: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rotate: number;
    enter: LayerEnter;
    /** Seconds into the scene when it comes in. */
    at: number;
    /** Keyframes, sorted by time; when present they set position, scale, rotation and opacity. */
    keys?: LayerKey[];
    /** Its own box in frames of this shape; keyframe positions shift with it unless the shape has its own keyframes. */
    boxes?: Partial<Record<LayerAspect, LayerBox & { keys?: LayerKey[] }>>;
    /** Neighbouring layers sharing a group move together on the preview. */
    group?: number;
}

export const LAYER_BASE: Layer = { kind: 'text', text: 'Text', style: 'title', color: 'text', align: 'center', shape: 'rounded', icon: 'sparkles', element: 'check', image: '', x: 20, y: 40, w: 60, h: 20, rotate: 0, enter: 'rise', at: 0 };

/** Ready-made layers the panel adds. */
export const LAYER_PRESETS: { label: string; layer: Partial<Layer> }[] = [
    { label: 'Headline', layer: { kind: 'text', text: 'Big idea', style: 'headline', x: 10, y: 35, w: 80, h: 20, enter: 'rise' } },
    { label: 'Subtitle', layer: { kind: 'text', text: 'One line about it', style: 'body', color: 'muted', x: 15, y: 58, w: 70, h: 10, enter: 'fade', at: 0.3 } },
    { label: 'Label', layer: { kind: 'text', text: 'NEW', style: 'label', color: 'accent', x: 40, y: 26, w: 20, h: 6, enter: 'fade' } },
    { label: 'Badge', layer: { kind: 'shape', shape: 'pill', color: 'accent', x: 38, y: 24, w: 24, h: 9, enter: 'pop' } },
    { label: 'Box', layer: { kind: 'shape', shape: 'rounded', color: 'surface', x: 15, y: 20, w: 70, h: 60, enter: 'fade' } },
    { label: 'Circle', layer: { kind: 'shape', shape: 'circle', color: 'accent', x: 42, y: 37, w: 16, h: 26, enter: 'pop' } },
    { label: 'Line', layer: { kind: 'shape', shape: 'line', color: 'accent', x: 35, y: 60, w: 30, h: 2, enter: 'wipe' } },
    { label: 'Icon', layer: { kind: 'icon', icon: 'sparkles', color: 'accent', x: 44, y: 18, w: 12, h: 20, enter: 'pop' } },
    { label: 'Checkmark', layer: { kind: 'element', element: 'check', color: 'accent', x: 44, y: 38, w: 12, h: 22, enter: 'none' } },
    { label: 'Arrow', layer: { kind: 'element', element: 'arrow', color: 'accent', x: 55, y: 55, w: 18, h: 14, enter: 'none' } },
    { label: 'Underline', layer: { kind: 'element', element: 'underline', color: 'accent', x: 30, y: 56, w: 40, h: 5, enter: 'none' } },
    { label: 'Hand-drawn ring', layer: { kind: 'element', element: 'ring', color: 'accent', x: 25, y: 30, w: 50, h: 35, enter: 'none' } },
    { label: 'Sparkles', layer: { kind: 'element', element: 'sparkles', color: 'accent', x: 70, y: 18, w: 14, h: 22, enter: 'none' } },
    { label: 'Burst', layer: { kind: 'element', element: 'burst', color: 'accent', x: 35, y: 25, w: 30, h: 50, enter: 'none' } },
    { label: 'Confetti', layer: { kind: 'element', element: 'confetti', color: 'accent', x: 0, y: 0, w: 100, h: 100, enter: 'none' } },
    { label: 'Logo', layer: { kind: 'logo', x: 35, y: 30, w: 30, h: 20, enter: 'pop' } },
    { label: 'Image', layer: { kind: 'image', x: 20, y: 15, w: 60, h: 70, enter: 'rise' } },
];

export const LAYER_EASES: Record<LayerEase, (p: number) => number> = {
    smooth: (p) => p * p * (3 - 2 * p),
    linear: (p) => p,
    in: (p) => p * p * p,
    out: (p) => 1 - (1 - p) ** 3,
    overshoot: (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2,
};

export const layerAspect = (width: number, height: number): LayerAspect => (width / height > 1.2 ? 'wide' : width / height < 0.75 ? 'tall' : 'square');

/** A copy of `layer` moved by (dx, dy) percent everywhere: its box, keyframes and per-aspect boxes. */
export function nudge(layer: Layer, dx: number, dy: number): Layer {
    return {
        ...layer,
        x: layer.x + dx,
        y: layer.y + dy,
        keys: layer.keys?.map((k) => ({ ...k, x: k.x + dx, y: k.y + dy })),
        boxes: layer.boxes && Object.fromEntries(Object.entries(layer.boxes).map(([a, b]) => [a, { ...b, x: b.x + dx, y: b.y + dy, keys: b.keys?.map((k) => ({ ...k, x: k.x + dx, y: k.y + dy })) }])),
    };
}

/** The layer as laid out in frames of this shape: its own box there when it has one. */
export function layerFor(layer: Layer, aspect: LayerAspect): Layer {
    const box = layer.boxes?.[aspect];
    if (!box) return layer;
    const { boxes } = layer;
    const { keys, ...rect } = box;
    if (keys) return { ...layer, ...rect, keys, boxes };
    return { ...nudge(layer, box.x - layer.x, box.y - layer.y), ...rect, boxes };
}

/** Stores an edit made to `shown` (= layerFor(stored, aspect)): into the aspect's own box when it has one. */
export function layerFrom(stored: Layer, aspect: LayerAspect, shown: Layer): Layer {
    const own = stored.boxes?.[aspect];
    if (!own) return shown;
    const box = { x: shown.x, y: shown.y, w: shown.w, h: shown.h };
    // Keyframes changed in a shape with its own box become that shape's own, so the other shapes keep their motion.
    if (own.keys || JSON.stringify(shown.keys) !== JSON.stringify(layerFor(stored, aspect).keys))
        return { ...shown, x: stored.x, y: stored.y, w: stored.w, h: stored.h, keys: stored.keys, boxes: { ...stored.boxes, [aspect]: { ...box, keys: shown.keys } } };
    const back = nudge({ ...shown, boxes: undefined }, stored.x - box.x, stored.y - box.y);
    return { ...back, w: stored.w, h: stored.h, boxes: { ...stored.boxes, [aspect]: box } };
}

export type LayerPose = Omit<LayerKey, 't' | 'ease'>;

/** A layer's position, scale, rotation and opacity `t` seconds into the scene, before its entrance. */
export function layerPose(layer: Layer, t: number): LayerPose {
    const keys = layer.keys ?? [];
    if (!keys.length) return { x: layer.x, y: layer.y, scale: 1, rotate: layer.rotate, opacity: 1 };
    const { t: _, ease: _e, ...first } = keys[0];
    if (t <= keys[0].t) return first;
    for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1];
        const b = keys[i];
        if (t > b.t) continue;
        const p = LAYER_EASES[b.ease ?? 'smooth']((t - a.t) / Math.max(1e-6, b.t - a.t));
        const mix = (k: 'x' | 'y' | 'scale' | 'rotate' | 'opacity') => a[k] + (b[k] - a[k]) * p;
        return { x: mix('x'), y: mix('y'), scale: mix('scale'), rotate: mix('rotate'), opacity: mix('opacity') };
    }
    const { t: __, ease: __e, ...last } = keys[keys.length - 1];
    return last;
}

/** Where a posed layer shows, in percent of a width × height frame: scaled about its centre, then the bounds of its turned box. */
export function visualBox(layer: Layer, pose: LayerPose, width: number, height: number): LayerBox {
    const a = (pose.rotate * Math.PI) / 180;
    const hw = (layer.w * pose.scale * width) / 200;
    const hh = (layer.h * pose.scale * height) / 200;
    const bx = Math.abs(Math.cos(a)) * hw + Math.abs(Math.sin(a)) * hh;
    const by = Math.abs(Math.sin(a)) * hw + Math.abs(Math.cos(a)) * hh;
    const w = (bx * 200) / width;
    const h = (by * 200) / height;
    return { x: pose.x + layer.w / 2 - w / 2, y: pose.y + layer.h / 2 - h / 2, w, h };
}

/** A copy of `layer` with a keyframe at `t` holding `pose` (replacing one within half a frame). */
export function withKey(layer: Layer, t: number, pose: LayerPose): Layer {
    const old = layer.keys?.find((k) => Math.abs(k.t - t) <= 1 / 60);
    const keys = (layer.keys ?? []).filter((k) => k !== old);
    return { ...layer, keys: [...keys, { ...(old?.ease && { ease: old.ease }), t, ...pose }].sort((a, b) => a.t - b.t) };
}
