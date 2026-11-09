import { canCrossfade, type Transition, type TimelineItem } from '../editor/model';
import { SCENES } from './scenes';
import type { AtmosphereKind, PaletteKind, TypeKind } from './scenes/atmosphere';

/** A whole-video look: how items change, how long scenes last,  Brand colours and fonts stay the kit's. */
export interface VideoStyle {
    id: string;
    label: string;
    hint: string;
    /** Transitions in turn, item after item. */
    transitions: Exclude<Transition, { type: 'cut' }>[];
    /** Scene length as a share of each scene's default length. */
    pace: number;
    /** 'push' leans the camera in over each scene; 'still' locks it. */
    camera?: 'still' | 'push';
    /** A light leak flares at the end of each scene, over the cut. */
    leak?: boolean;
    /** Blur fast movement like a camera shutter in exports. */
    blur?: boolean;
    /** Light and grain over the scene; filmic when unset. */
    atmosphere?: AtmosphereKind | 'off';
    /** Fonts that replace the kit's; the kit's own when unset. */
    type?: TypeKind;
    /** Colours derived from the kit's; the kit's own when unset. */
    palette?: PaletteKind;
    /** Entrance laid over each scene's own; the scene's own when unset. */
    enter?: 'snap' | 'ease';
}

export const STYLES: VideoStyle[] = [
    { id: 'apple-clean', label: 'Apple clean', hint: 'Clean light, locked camera, soft fades', transitions: [{ type: 'glide', duration: 0.6 }], pace: 1, camera: 'still', atmosphere: 'off', type: 'grotesk' },
    { id: 'neon-tech', label: 'Neon tech', hint: 'Glow, mono type, quick whips', transitions: [{ type: 'whip', duration: 0.4, direction: 'left' }], pace: 0.8, atmosphere: 'neon', type: 'mono', palette: 'duotone', enter: 'snap', blur: true },
    { id: 'brutalist', label: 'Brutalist', hint: 'Heavy type, mono colour, hard wipes', transitions: [{ type: 'wipe', duration: 0.4, direction: 'left' }], pace: 0.7, atmosphere: 'print', type: 'heavy', palette: 'mono', enter: 'snap' },
    { id: 'film', label: 'Film', hint: 'Serif, grain, dips to black', transitions: [{ type: 'dip', duration: 0.8, color: '#000000' }], pace: 1.2, atmosphere: 'filmic', type: 'serif', leak: true },
    { id: 'vapor', label: 'Vapor', hint: 'Hazy glow, inverted colours, soft blurs', transitions: [{ type: 'blur', duration: 0.8 }], leak: true, pace: 1.15, atmosphere: 'haze', type: 'heavy', palette: 'inverted', enter: 'ease' },
    { id: 'minimal', label: 'Minimal', hint: 'Soft crossfades, calm pace', transitions: [{ type: 'glide', duration: 0.6 }], pace: 1 },
    {
        id: 'bold',
        label: 'Bold',
        hint: 'Pushes, quick pace',
        transitions: [{ type: 'push', duration: 0.5, direction: 'left' }],
        pace: 0.8,
        blur: true,
    },
    { id: 'smooth', label: 'Smooth', hint: 'Slides with a slow push in', transitions: [{ type: 'slide', duration: 0.7, direction: 'left' }], pace: 1 },
    { id: 'cinematic', label: 'Cinematic', hint: 'Dips to black, slow drifting camera', transitions: [{ type: 'dip', duration: 0.9, color: '#000000' }], pace: 1.25, blur: true, leak: true },
    {
        id: 'energetic',
        label: 'Energetic',
        hint: 'Fast whips, fast pace',
        transitions: [{ type: 'whip', duration: 0.4, direction: 'left' }],
        pace: 0.65,
        blur: true,
    },
    { id: 'snappy', label: 'Snappy', hint: 'Quick wipes, brisk pace', transitions: [{ type: 'whip', duration: 0.35, direction: 'left' }], pace: 0.75 },
    { id: 'dreamy', label: 'Dreamy', hint: 'Soft blurs, slow pan', transitions: [{ type: 'blur', duration: 0.8 }], pace: 1.2, leak: true },
    {
        id: 'editorial',
        label: 'Editorial',
        hint: 'Steady wipes, calm pace',
        transitions: [{ type: 'wipe', duration: 0.6, direction: 'left' }],
        pace: 1,
    },
];

/** Where each scene's camera push leans in, in turn, so the framing changes from shot to shot. */
const FOCI = ['50% 50%', '38% 56%', '62% 44%'];

/** The timeline in a style: the style's transition on every join, scene lengths and camera moves. Sounds on transitions are kept. */
export function applyStyle(items: TimelineItem[], style: VideoStyle): TimelineItem[] {
    const joins = items.map((_, index) => index).filter((index) => canCrossfade(items, index));
    return items.map((item, index) => {
        const sound = item.transition?.sound;
        const join = joins.indexOf(index);
        const transition = join < 0 ? item.transition : { ...style.transitions[join % style.transitions.length], ...(sound ? { sound } : {}) };
        if (item.kind !== 'scene') return { ...item, transition };
        const definition = SCENES[item.scene];
        const duration = definition ? Math.round(definition.defaultDuration * style.pace * 10) / 10 : item.duration;
        const blur = style.blur !== false && definition?.fields.some((field) => field.name === 'motionBlur') ? { motionBlur: true } : {};
        return { ...item, transition, duration, props: { ...item.props, camera: style.camera ?? 'push', focus: FOCI[index % FOCI.length], leak: style.leak ?? false, atmosphere: style.atmosphere ?? 'filmic', type: style.type ?? 'brand', palette: style.palette ?? 'brand', enter: style.enter ?? 'spring', ...blur } };
    });
}

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/** A style mixing the parts of random presets: its own transitions, pace and camera, another's light, type and palette. */
export function shuffleStyle(): VideoStyle {
    const [a, b, c] = [pick(STYLES), pick(STYLES), pick(STYLES)];
    return { id: 'shuffle', label: 'Shuffle', hint: `${a.label} motion, ${b.label} light, ${c.label} type`, transitions: a.transitions, pace: a.pace, camera: a.camera, blur: a.blur, leak: a.leak, atmosphere: b.atmosphere, palette: b.palette, type: c.type, enter: c.enter };
}
