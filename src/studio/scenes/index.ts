import type { ComponentType } from 'react';
import { DeviceShowcase } from './DeviceShowcase';
import { EndCard } from './EndCard';
import { FeatureCallout } from './FeatureCallout';
import { KineticStatement } from './KineticStatement';
import { LOGO_HITS, LogoSting } from './LogoSting';
import { LowerThird } from './LowerThird';
import { StatCounter } from './StatCounter';
import { TitleReveal } from './TitleReveal';

/** Seconds into a scene of its beat, or undefined if it has none. */
export function sceneBeat(scene: string, props: Record<string, unknown>): number | undefined {
    const definition = SCENES[scene];
    const beat = definition?.beat;
    return typeof beat === 'function' ? beat({ ...definition.defaultProps, ...props }) : beat;
}

/** Every scene plays at this rate, in the preview and in helper renders. */
export const SCENE_FPS = 30;

/**
 * Part of every rendered scene file's name. Bump it when a scene's look changes, so exports
 * render it again instead of reusing files made with the old code. Scenes must set line-height
 * explicitly: the preview (WebKit) and the renderer (Chrome) disagree on `normal`.
 */
export const SCENE_RENDER_VERSION = 4;

/** Composition id of the whole timeline as one transparent layer (studio-renderer/entry). */
export const TIMELINE_COMPOSITION = 'TransparentTimeline';

/** A setting of one entry in a list field. */
export type ListItemField =
    | { name: string; label: string; type: 'text' }
    | { name: string; label: string; type: 'number'; step?: number }
    | { name: string; label: string; type: 'choice'; options: { value: string; label: string }[] };

/** One setting in the scene panel. Brand, recording and assets are injected, not fields. */
export type SceneField =
    | { name: string; label: string; type: 'text' | 'color' | 'boolean' }
    | { name: string; label: string; type: 'number'; step?: number }
    | { name: string; label: string; type: 'choice'; options: { value: string; label: string }[] }
    /** Entries edited as rows (lines, stats, chart points), stored as an array of objects. */
    | { name: string; label: string; type: 'list'; item: ListItemField[]; newItem: Record<string, unknown>; min?: number; max: number }
    /** A part of the recording, { start, end } in source seconds. */
    | { name: string; label: string; type: 'segment' }
    /** A rectangle on the recording, normalized 0–1; picked on the preview or suggested from clicks. */
    | { name: string; label: string; type: 'rect'; segment: string };

export interface SceneDefinition {
    label: string;
    fields: SceneField[];
    // Each scene takes its own props; the timeline stores them as plain JSON.
    component: ComponentType<Record<string, unknown>>;
    defaultProps: Record<string, unknown>;
    /** Seconds a new scene plays for. */
    defaultDuration: number;
    /**
     * Where it can go: a full-screen scene in the timeline, an overlay drawn over it (rendered
     * with a transparent background), or either. Defaults to 'scene'.
     */
    use?: 'scene' | 'overlay' | 'both';
    /** Seconds in where the scene lands its moment (logo hit, count end, button press); a sound can play there. */
    beat?: number | ((props: Record<string, unknown>) => number);
    /** What the beat is, for the sound picker. */
    beatLabel?: string;
}

/**
 * The scenes the app can place on its timeline, by composition id. studio-renderer/entry
 * registers the same components, so the preview and exported files draw the same thing.
 */
export const SCENES: Record<string, SceneDefinition> = {
    LogoSting: {
        label: 'Logo sting',
        component: LogoSting as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            {
                name: 'style',
                label: 'Reveal',
                type: 'choice',
                options: [
                    { value: 'pop', label: 'Pop' },
                    { value: 'wipe', label: 'Wipe' },
                    { value: 'draw', label: 'Ring' },
                    { value: 'glow', label: 'Glow' },
                ],
            },
            { name: 'wordmark', label: 'Name beside the logo (if the logo has none)', type: 'text' },
            { name: 'tagline', label: 'Tagline', type: 'text' },
            { name: 'burst', label: 'Accent burst', type: 'boolean' },
        ],
        defaultProps: { style: 'pop', wordmark: '', tagline: '', burst: true },
        defaultDuration: 3,
        beat: (props) => (LOGO_HITS[props.style as keyof typeof LOGO_HITS] ?? LOGO_HITS.pop) / SCENE_FPS,
        beatLabel: 'Logo hit',
    },
    TitleReveal: {
        label: 'Title reveal',
        component: TitleReveal as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'subtitle', label: 'Subtitle', type: 'text' },
        ],
        defaultProps: { eyebrow: 'Introducing', title: 'Your product', subtitle: 'One line about what it does' },
        defaultDuration: 4,
        use: 'both',
    },
    KineticStatement: {
        label: 'Kinetic statement',
        component: KineticStatement as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'lines', label: 'Lines', type: 'list', item: [{ name: 'text', label: 'Line', type: 'text' }], newItem: { text: 'Another line' }, min: 1, max: 4 },
            { name: 'emphasis', label: 'Accent words (comma separated)', type: 'text' },
            {
                name: 'style',
                label: 'Motion',
                type: 'choice',
                options: [
                    { value: 'punch', label: 'Punch' },
                    { value: 'stack', label: 'Stack' },
                    { value: 'slot', label: 'Slot' },
                    { value: 'sweep', label: 'Sweep' },
                ],
            },
        ],
        defaultProps: { lines: [{ text: 'Stop recording demos.' }, { text: 'Start shipping them.' }], emphasis: 'shipping', style: 'punch' },
        defaultDuration: 3.5,
        use: 'both',
    },
    DeviceShowcase: {
        label: 'Device showcase',
        component: DeviceShowcase as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            {
                name: 'device',
                label: 'Device',
                type: 'choice',
                options: [
                    { value: 'macbook', label: 'Laptop' },
                    { value: 'browser', label: 'Browser' },
                    { value: 'window', label: 'Window' },
                ],
            },
            { name: 'segment', label: 'Recording', type: 'segment' },
            {
                name: 'placement',
                label: 'Headline',
                type: 'choice',
                options: [
                    { value: 'side', label: 'Beside' },
                    { value: 'below', label: 'Below' },
                    { value: 'none', label: 'None' },
                ],
            },
            { name: 'headline', label: 'Headline text', type: 'text' },
            { name: 'detail', label: 'Detail', type: 'text' },
            { name: 'url', label: 'Address bar', type: 'text' },
        ],
        defaultProps: { device: 'macbook', segment: { start: 0, end: 5 }, placement: 'side', headline: 'Built for the way you work', detail: '', url: 'yourproduct.com' },
        defaultDuration: 5,
    },
    FeatureCallout: {
        label: 'Feature callout',
        component: FeatureCallout as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'segment', label: 'Recording', type: 'segment' },
            {
                name: 'motion',
                label: 'Recording plays',
                type: 'choice',
                options: [
                    { value: 'still', label: 'Still frame' },
                    { value: 'play', label: 'Plays' },
                ],
            },
            { name: 'target', label: 'Target', type: 'rect', segment: 'segment' },
            { name: 'label', label: 'Label', type: 'text' },
            { name: 'detail', label: 'Detail', type: 'text' },
        ],
        defaultProps: { segment: { start: 0, end: 2 }, motion: 'still', target: { x: 0.4, y: 0.4, width: 0.2, height: 0.15 }, label: 'New: one-click export', detail: 'Exactly what this button does, in a line.' },
        defaultDuration: 4,
    },
    StatCounter: {
        label: 'Stat counter',
        component: StatCounter as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            {
                name: 'stats',
                label: 'Numbers',
                type: 'list',
                item: [
                    { name: 'value', label: 'Value', type: 'number' },
                    { name: 'label', label: 'Label', type: 'text' },
                    { name: 'prefix', label: 'Before', type: 'text' },
                    { name: 'suffix', label: 'After', type: 'text' },
                    {
                        name: 'format',
                        label: 'Format',
                        type: 'choice',
                        options: [
                            { value: 'int', label: '1,234' },
                            { value: 'compact', label: '1.2K' },
                            { value: 'percent', label: '%' },
                            { value: 'currency', label: '$' },
                        ],
                    },
                ],
                newItem: { value: 100, label: 'Label', prefix: '', suffix: '', format: 'int' },
                min: 1,
                max: 3,
            },
            {
                name: 'chart',
                label: 'Chart',
                type: 'choice',
                options: [
                    { value: 'none', label: 'None' },
                    { value: 'bars', label: 'Bars' },
                    { value: 'line', label: 'Line' },
                    { value: 'progress', label: 'Progress' },
                ],
            },
            {
                name: 'chartData',
                label: 'Chart points',
                type: 'list',
                item: [
                    { name: 'label', label: 'Label', type: 'text' },
                    { name: 'value', label: 'Value', type: 'number' },
                ],
                newItem: { label: 'Next', value: 50 },
                max: 8,
            },
        ],
        defaultProps: {
            heading: '',
            stats: [
                { value: 12000, label: 'Teams on board', prefix: '', suffix: '+', format: 'compact' },
                { value: 98, label: 'Would recommend', prefix: '', suffix: '', format: 'percent' },
                { value: 3, label: 'Minutes to first video', prefix: '', suffix: '', format: 'int' },
            ],
            chart: 'none',
            chartData: [
                { label: 'Jan', value: 20 },
                { label: 'Feb', value: 34 },
                { label: 'Mar', value: 51 },
                { label: 'Apr', value: 78 },
                { label: 'May', value: 96 },
            ],
        },
        defaultDuration: 4,
        beat: 1.9,
        beatLabel: 'Count ends',
    },
    LowerThird: {
        label: 'Lower third',
        component: LowerThird as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'title', label: 'Title', type: 'text' },
            {
                name: 'side',
                label: 'Side',
                type: 'choice',
                options: [
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' },
                ],
            },
            { name: 'logo', label: 'Brand logo', type: 'boolean' },
        ],
        defaultProps: { name: 'Your name', title: 'Founder, Your product', side: 'left', logo: true },
        defaultDuration: 4,
        use: 'overlay',
    },
    EndCard: {
        label: 'End card',
        component: EndCard as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'headline', label: 'Headline', type: 'text' },
            { name: 'cta', label: 'Button', type: 'text' },
            { name: 'url', label: 'Address', type: 'text' },
            { name: 'showQr', label: 'QR code for the address', type: 'boolean' },
            {
                name: 'socials',
                label: 'Socials',
                type: 'list',
                item: [
                    {
                        name: 'network',
                        label: 'Network',
                        type: 'choice',
                        options: [
                            { value: 'x', label: 'X' },
                            { value: 'github', label: 'GitHub' },
                            { value: 'linkedin', label: 'LinkedIn' },
                            { value: 'youtube', label: 'YouTube' },
                            { value: 'instagram', label: 'Instagram' },
                        ],
                    },
                    { name: 'handle', label: 'Handle', type: 'text' },
                ],
                newItem: { network: 'x', handle: '@yourproduct' },
                max: 4,
            },
        ],
        defaultProps: { headline: 'Try it free today', cta: 'Get started', url: 'yourproduct.com', showQr: true, socials: [{ network: 'x', handle: '@yourproduct' }] },
        defaultDuration: 5,
        beat: 1.53,
        beatLabel: 'Button press',
    },
};

export const canBeScene = (id: string) => (SCENES[id]?.use ?? 'scene') !== 'overlay';
export const canBeOverlay = (id: string) => SCENES[id]?.use === 'overlay' || SCENES[id]?.use === 'both';

export const sceneLabel = (id: string) => SCENES[id]?.label ?? id;
