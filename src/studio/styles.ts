import { canCrossfade, type Transition, type TimelineItem } from '../editor/model';
import { SCENES } from './scenes';
import type { CameraMove } from './scenes/SceneBase';

/** A whole-video look: how items change, how long scenes last, how the camera drifts. Brand colours and fonts stay the kit's. */
export interface VideoStyle {
    id: string;
    label: string;
    hint: string;
    /** Transitions in turn, item after item. */
    transitions: Exclude<Transition, { type: 'cut' }>[];
    /** Scene length as a share of each scene's default length. */
    pace: number;
    camera: CameraMove;
}

export const STYLES: VideoStyle[] = [
    { id: 'minimal', label: 'Minimal', hint: 'Soft crossfades, calm pace', transitions: [{ type: 'crossfade', duration: 0.5 }], pace: 1, camera: 'none' },
    {
        id: 'bold',
        label: 'Bold',
        hint: 'Pushes and zooms, quick pace',
        transitions: [
            { type: 'push', duration: 0.45, direction: 'left' },
            { type: 'zoom', duration: 0.45 },
            { type: 'push', duration: 0.45, direction: 'up' },
        ],
        pace: 0.8,
        camera: 'none',
    },
    { id: 'smooth', label: 'Smooth', hint: 'Slides with a slow push in', transitions: [{ type: 'slide', duration: 0.6, direction: 'left' }], pace: 1, camera: 'push' },
    { id: 'cinematic', label: 'Cinematic', hint: 'Dips to black, slow drifting camera', transitions: [{ type: 'dip', duration: 0.9, color: '#000000' }], pace: 1.25, camera: 'push' },
    {
        id: 'energetic',
        label: 'Energetic',
        hint: 'Zooms and pushes, fast pace',
        transitions: [
            { type: 'zoom', duration: 0.35 },
            { type: 'push', duration: 0.35, direction: 'up' },
            { type: 'push', duration: 0.35, direction: 'left' },
        ],
        pace: 0.65,
        camera: 'none',
    },
    { id: 'snappy', label: 'Snappy', hint: 'Quick wipes, brisk pace', transitions: [{ type: 'wipe', duration: 0.3, direction: 'left' }], pace: 0.75, camera: 'none' },
    { id: 'dreamy', label: 'Dreamy', hint: 'Soft blurs, slow pan', transitions: [{ type: 'blur', duration: 0.8 }], pace: 1.2, camera: 'pan-left' },
    {
        id: 'editorial',
        label: 'Editorial',
        hint: 'Alternating wipes, slow pull out',
        transitions: [
            { type: 'wipe', duration: 0.55, direction: 'left' },
            { type: 'wipe', duration: 0.55, direction: 'right' },
        ],
        pace: 1,
        camera: 'pull',
    },
];

/** The timeline in a style: every possible transition, scene lengths and camera moves. Sounds on transitions are kept. */
export function applyStyle(items: TimelineItem[], style: VideoStyle): TimelineItem[] {
    let turn = 0;
    return items.map((item, index) => {
        const sound = item.transition?.sound;
        const transition = canCrossfade(items, index) ? { ...style.transitions[turn++ % style.transitions.length], ...(sound ? { sound } : {}) } : item.transition;
        if (item.kind !== 'scene') return { ...item, transition };
        const definition = SCENES[item.scene];
        const duration = definition ? Math.round(definition.defaultDuration * style.pace * 10) / 10 : item.duration;
        return { ...item, transition, duration, props: { ...item.props, camera: style.camera } };
    });
}
