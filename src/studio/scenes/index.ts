import type { ComponentType } from 'react';
import { DeviceShowcase } from './DeviceShowcase';
import { EndCard } from './EndCard';
import { FeatureCallout } from './FeatureCallout';
import { kineticBeat, KineticStatement } from './KineticStatement';
import { LOGO_HITS, LogoSting } from './LogoSting';
import { LowerThird } from './LowerThird';
import { StatCounter } from './StatCounter';
import { TitleReveal } from './TitleReveal';
import { BeforeAfter } from './BeforeAfter';
import { CodeTyping } from './CodeTyping';
import { Comparison } from './Comparison';
import { FEATURE_ICONS, FeatureGrid } from './FeatureGrid';
import { LogoWall } from './LogoWall';
import { LottieScene } from './LottieScene';
import { CustomScene } from './CustomScene';
import { Roadmap } from './Roadmap';
import { Team } from './Team';
import { VideoClip } from './VideoClip';
import { Waveform } from './Waveform';
import { Showcase3D } from './Showcase3D';
import { LAYER_BASE } from './layers';
import { ELEMENTS } from './elements';
import { withMotionBlur } from './motionBlur';
import { withCamera, withHeldEnd } from './SceneBase';
import { Pricing } from './Pricing';
import { ScreenshotShowcase } from './ScreenshotShowcase';
import { Testimonial } from './Testimonial';

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
export const SCENE_RENDER_VERSION = 7;

/** Composition id of the whole timeline as one transparent layer (studio-renderer/entry). */
export const TIMELINE_COMPOSITION = 'TransparentTimeline';

/** A setting of one entry in a list field. */
export type ListItemField =
    | { name: string; label: string; type: 'text' }
    | { name: string; label: string; type: 'number'; step?: number }
    | { name: string; label: string; type: 'choice'; options: { value: string; label: string }[] }
    | { name: string; label: string; type: 'image' };

/** One setting in the scene panel. Brand, recording and assets are injected, not fields. */
export type SceneField =
    | { name: string; label: string; type: 'color' | 'boolean' }
    /** `multiline` edits it in a text box (code, long quotes); `user` ones only the user sets (the AI never writes them). */
    | { name: string; label: string; type: 'text'; multiline?: boolean; user?: boolean }
    | { name: string; label: string; type: 'number'; step?: number }
    | { name: string; label: string; type: 'choice'; options: { value: string; label: string }[] }
    /** Entries edited as rows (lines, stats, chart points), stored as an array of objects; 'layers' edits them with the layer editor. */
    | { name: string; label: string; type: 'list'; item: ListItemField[]; newItem: Record<string, unknown>; min?: number; max: number; editor?: 'layers' }
    /** A part of the recording, { start, end } in source seconds. */
    | { name: string; label: string; type: 'segment' }
    /** A rectangle on the recording, normalized 0–1; picked on the preview or suggested from clicks. */
    | { name: string; label: string; type: 'rect'; segment: string }
    /** A picture the user adds (copied into `<project>/images/`), stored as its project path; 'lottie' takes a Lottie .json or a Rive .riv. */
    | { name: string; label: string; type: 'image'; accept?: 'image' | 'lottie' | 'video' | 'audio' };

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
/** Export-only camera blur on fast movement (see withMotionBlur). */
const BLUR_FIELD: SceneField = { name: 'motionBlur', label: 'Motion blur (in exports)', type: 'boolean' };

const yesNo = [
    { value: 'yes', label: '✓' },
    { value: 'no', label: '✗' },
    { value: 'partial', label: '–' },
];

export const SCENES: Record<string, SceneDefinition> = {
    LogoSting: {
        label: 'Logo sting',
        component: withMotionBlur(LogoSting as unknown as ComponentType<Record<string, unknown>>),
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
            BLUR_FIELD,
        ],
        defaultProps: { style: 'pop', wordmark: '', tagline: '', burst: true },
        defaultDuration: 3,
        beat: (props) => (LOGO_HITS[props.style as keyof typeof LOGO_HITS] ?? LOGO_HITS.pop) / SCENE_FPS,
        beatLabel: 'Logo hit',
    },
    TitleReveal: {
        label: 'Title reveal',
        component: withMotionBlur(TitleReveal as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'subtitle', label: 'Subtitle', type: 'text' },
            BLUR_FIELD,
        ],
        defaultProps: { eyebrow: 'Introducing', title: 'Your product', subtitle: 'One line about what it does' },
        defaultDuration: 4,
        beat: 0.45,
        beatLabel: 'Title lands',
        use: 'both',
    },
    KineticStatement: {
        label: 'Kinetic statement',
        component: withMotionBlur(KineticStatement as unknown as ComponentType<Record<string, unknown>>),
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
            BLUR_FIELD,
        ],
        defaultProps: { lines: [{ text: 'Stop recording demos.' }, { text: 'Start shipping them.' }], emphasis: 'shipping', style: 'punch' },
        defaultDuration: 3.5,
        beat: (props) => kineticBeat(props),
        beatLabel: 'Key word',
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
    ScreenshotShowcase: {
        label: 'Screenshot showcase',
        component: withMotionBlur(ScreenshotShowcase as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'image', label: 'Screenshot', type: 'image' },
            {
                name: 'device',
                label: 'Frame',
                type: 'choice',
                options: [
                    { value: 'phone', label: 'Phone' },
                    { value: 'tablet', label: 'Tablet' },
                    { value: 'laptop', label: 'Laptop' },
                    { value: 'browser', label: 'Browser' },
                ],
            },
            {
                name: 'placement',
                label: 'Layout',
                type: 'choice',
                options: [
                    { value: 'side', label: 'Beside' },
                    { value: 'center', label: 'Above' },
                ],
            },
            { name: 'headline', label: 'Headline', type: 'text' },
            { name: 'detail', label: 'Detail', type: 'text' },
            { name: 'url', label: 'Address bar (browser)', type: 'text' },
            { name: 'scroll', label: 'Scroll a tall screenshot', type: 'boolean' },
            BLUR_FIELD,
        ],
        defaultProps: { image: '', device: 'phone', placement: 'side', headline: 'Everything in your pocket', detail: 'One line about this screen.', url: '', scroll: false },
        defaultDuration: 4.5,
        beat: 0.5,
        beatLabel: 'Device lands',
    },
    FeatureGrid: {
        label: 'Feature grid',
        component: FeatureGrid as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            {
                name: 'items',
                label: 'Features',
                type: 'list',
                item: [
                    { name: 'icon', label: 'Icon', type: 'choice', options: Object.keys(FEATURE_ICONS).map((id) => ({ value: id, label: id[0].toUpperCase() + id.slice(1) })) },
                    { name: 'title', label: 'Title', type: 'text' },
                    { name: 'text', label: 'Text', type: 'text' },
                ],
                newItem: { icon: 'sparkles', title: 'Another feature', text: 'What it does for you.' },
                min: 2,
                max: 6,
            },
        ],
        defaultProps: {
            heading: 'Everything you need',
            items: [
                { icon: 'zap', title: 'Fast', text: 'Starts in a second.' },
                { icon: 'shield', title: 'Private', text: 'Your data stays yours.' },
                { icon: 'users', title: 'Together', text: 'Built for teams.' },
            ],
        },
        defaultDuration: 4.5,
        beat: 0.4,
        beatLabel: 'First card',
    },
    Testimonial: {
        label: 'Testimonial',
        component: Testimonial as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'quote', label: 'Quote', type: 'text', multiline: true },
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'role', label: 'Role', type: 'text' },
            { name: 'avatar', label: 'Photo', type: 'image' },
            { name: 'rating', label: 'Stars (0–5)', type: 'number', step: 1 },
        ],
        defaultProps: { quote: 'This changed how our team works. We can’t imagine going back.', name: 'Customer name', role: 'Role, Company', avatar: '', rating: 5 },
        defaultDuration: 5,
        beat: (props) => (12 + Math.max(0, Math.min(5, Math.round(Number(props.rating) || 0)) - 1) * 3) / 30,
        beatLabel: 'Stars fill',
    },
    Pricing: {
        label: 'Pricing',
        component: Pricing as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            {
                name: 'tiers',
                label: 'Plans',
                type: 'list',
                item: [
                    { name: 'name', label: 'Plan', type: 'text' },
                    { name: 'price', label: 'Price', type: 'text' },
                    { name: 'period', label: 'Per (e.g. /month)', type: 'text' },
                    { name: 'features', label: 'Features, separated by ;', type: 'text' },
                    {
                        name: 'highlight',
                        label: 'Highlight',
                        type: 'choice',
                        options: [
                            { value: 'no', label: 'Normal' },
                            { value: 'yes', label: 'Highlighted' },
                        ],
                    },
                ],
                newItem: { name: 'Plan', price: '$0', period: '/month', features: 'Feature one; Feature two', highlight: 'no' },
                min: 1,
                max: 3,
            },
        ],
        defaultProps: {
            heading: 'Simple pricing',
            tiers: [
                { name: 'Free', price: '$0', period: '/month', features: 'Core features; 1 project', highlight: 'no' },
                { name: 'Pro', price: '$12', period: '/month', features: 'Everything in Free; Unlimited projects; Priority support', highlight: 'yes' },
            ],
        },
        defaultDuration: 5,
        beat: (props) => (34 + Math.max(1, Array.isArray(props.tiers) ? props.tiers.length : 1) * 6) / 30,
        beatLabel: 'Popular plan lifts',
    },
    BeforeAfter: {
        label: 'Before / after',
        component: BeforeAfter as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'before', label: 'Before', type: 'image' },
            { name: 'after', label: 'After', type: 'image' },
            { name: 'beforeLabel', label: 'Before label', type: 'text' },
            { name: 'afterLabel', label: 'After label', type: 'text' },
            {
                name: 'direction',
                label: 'Wipe',
                type: 'choice',
                options: [
                    { value: 'horizontal', label: 'Across' },
                    { value: 'vertical', label: 'Down' },
                ],
            },
        ],
        defaultProps: { heading: '', before: '', after: '', beforeLabel: 'Before', afterLabel: 'After', direction: 'horizontal' },
        defaultDuration: 4.5,
        beat: 0.4,
        beatLabel: 'Divider moves',
    },
    LogoWall: {
        label: 'Logo wall',
        component: LogoWall as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'logos', label: 'Logos', type: 'list', item: [{ name: 'logo', label: 'Logo', type: 'image' }], newItem: { logo: '' }, min: 1, max: 12 },
            {
                name: 'style',
                label: 'Layout',
                type: 'choice',
                options: [
                    { value: 'grid', label: 'Grid' },
                    { value: 'marquee', label: 'Moving rows' },
                ],
            },
            { name: 'mono', label: 'One colour (white)', type: 'boolean' },
        ],
        defaultProps: { heading: 'Trusted by teams at', logos: [{ logo: '' }, { logo: '' }, { logo: '' }], style: 'grid', mono: true },
        defaultDuration: 4,
        beat: 0.3,
        beatLabel: 'Logos appear',
        use: 'both',
    },
    CodeTyping: {
        label: 'Code typing',
        component: CodeTyping as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'fileName', label: 'File name', type: 'text' },
            { name: 'code', label: 'Code', type: 'text', multiline: true },
            { name: 'speed', label: 'Typing speed (characters a second)', type: 'number', step: 5 },
        ],
        defaultProps: {
            heading: 'Three lines to get started',
            fileName: 'app.ts',
            code: "import { create } from 'yourproduct';\n\nconst app = create({ key: 'demo' });\nawait app.start(); // that's it",
            speed: 40,
        },
        defaultDuration: 5,
        beat: (props) => 10 / 30 + String(props.code ?? '').length / Math.max(5, Number(props.speed) || 40),
        beatLabel: 'Typing ends',
    },
    Comparison: {
        label: 'Comparison',
        component: Comparison as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'us', label: 'Our column', type: 'text' },
            { name: 'them', label: 'Their column', type: 'text' },
            {
                name: 'rows',
                label: 'Rows',
                type: 'list',
                item: [
                    { name: 'feature', label: 'Feature', type: 'text' },
                    { name: 'us', label: 'Us', type: 'choice', options: yesNo },
                    { name: 'them', label: 'Them', type: 'choice', options: yesNo },
                ],
                newItem: { feature: 'Another feature', us: 'yes', them: 'no' },
                min: 1,
                max: 6,
            },
        ],
        defaultProps: {
            heading: 'Why teams switch',
            us: 'Us',
            them: 'Others',
            rows: [
                { feature: 'Works offline', us: 'yes', them: 'no' },
                { feature: 'Set up in a minute', us: 'yes', them: 'partial' },
                { feature: 'No per-seat fees', us: 'yes', them: 'no' },
            ],
        },
        defaultDuration: 5,
        beat: 0.55,
        beatLabel: 'First tick',
    },
    Lottie: {
        label: 'Lottie / Rive animation',
        component: LottieScene as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'animation', label: 'Animation (Lottie .json or Rive .riv)', type: 'image', accept: 'lottie' },
            { name: 'loop', label: 'Loop', type: 'boolean' },
            { name: 'size', label: 'Size (0.15–1.2 of the frame)', type: 'number', step: 0.05 },
            {
                name: 'position',
                label: 'Position',
                type: 'choice',
                options: [
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Centre' },
                    { value: 'right', label: 'Right' },
                ],
            },
            { name: 'caption', label: 'Caption', type: 'text' },
            {
                name: 'tint',
                label: 'Colour (Lottie)',
                type: 'choice',
                options: [
                    { value: 'auto', label: 'Auto (black → text colour)' },
                    { value: 'accent', label: 'Accent' },
                    { value: 'original', label: 'As drawn' },
                ],
            },
            { name: 'artboard', label: 'Rive artboard (blank: the default)', type: 'text', user: true },
            { name: 'play', label: 'Rive animation or state machine (blank: the first)', type: 'text', user: true },
            { name: 'inputs', label: 'Rive inputs, e.g. speed=2, on=true', type: 'text', user: true },
        ],
        defaultProps: { animation: '', loop: true, size: 0.6, position: 'center', caption: '', tint: 'auto', artboard: '', play: '', inputs: '' },
        defaultDuration: 3,
        use: 'both',
    },
    Custom: {
        label: 'Custom (layers)',
        component: withMotionBlur(CustomScene as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            {
                name: 'layers',
                label: 'Layers',
                type: 'list',
                editor: 'layers',
                max: 12,
                newItem: { ...LAYER_BASE },
                item: [
                    { name: 'id', label: 'Id', type: 'number', step: 1 },
                    { name: 'kind', label: 'Kind', type: 'choice', options: [{ value: 'text', label: 'Text' }, { value: 'shape', label: 'Shape' }, { value: 'icon', label: 'Icon' }, { value: 'element', label: 'Animated element' }, { value: 'logo', label: 'Logo' }, { value: 'image', label: 'Image' }] },
                    { name: 'text', label: 'Text', type: 'text' },
                    { name: 'style', label: 'Text style', type: 'choice', options: [{ value: 'headline', label: 'Headline' }, { value: 'title', label: 'Title' }, { value: 'body', label: 'Body' }, { value: 'label', label: 'Label' }] },
                    { name: 'color', label: 'Colour', type: 'choice', options: [{ value: 'text', label: 'Text' }, { value: 'accent', label: 'Accent' }, { value: 'muted', label: 'Muted' }, { value: 'surface', label: 'Surface' }, { value: 'bg', label: 'Background' }, { value: 'white', label: 'White' }, { value: 'black', label: 'Black' }] },
                    { name: 'align', label: 'Align', type: 'choice', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }] },
                    { name: 'shape', label: 'Shape', type: 'choice', options: [{ value: 'rect', label: 'Square' }, { value: 'rounded', label: 'Rounded' }, { value: 'circle', label: 'Circle' }, { value: 'pill', label: 'Pill' }, { value: 'line', label: 'Line' }] },
                    { name: 'icon', label: 'Icon', type: 'choice', options: Object.keys(FEATURE_ICONS).map((value) => ({ value, label: value })) },
                    { name: 'element', label: 'Element', type: 'choice', options: ELEMENTS.map((value) => ({ value, label: value })) },
                    { name: 'image', label: 'Image', type: 'image' },
                    { name: 'x', label: 'Left %', type: 'number', step: 1 },
                    { name: 'y', label: 'Top %', type: 'number', step: 1 },
                    { name: 'w', label: 'Width %', type: 'number', step: 1 },
                    { name: 'h', label: 'Height %', type: 'number', step: 1 },
                    { name: 'rotate', label: 'Rotation°', type: 'number', step: 1 },
                    { name: 'enter', label: 'Entrance', type: 'choice', options: [{ value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'rise', label: 'Rise' }, { value: 'pop', label: 'Pop' }, { value: 'slide', label: 'Slide' }, { value: 'wipe', label: 'Wipe' }, { value: 'blur', label: 'Blur' }, { value: 'type', label: 'Type' }, { value: 'words', label: 'Words' }] },
                    { name: 'at', label: 'Comes in at (s)', type: 'number', step: 0.1 },
                ],
            },
            BLUR_FIELD,
        ],
        defaultProps: {
            layers: [
                { ...LAYER_BASE, text: 'NEW', style: 'label', color: 'accent', x: 35, y: 28, w: 30, h: 6, enter: 'fade' },
                { ...LAYER_BASE, text: 'Your big idea', style: 'headline', x: 10, y: 36, w: 80, h: 18 },
                { ...LAYER_BASE, kind: 'shape', shape: 'line', color: 'accent', x: 40, y: 58, w: 20, h: 1, enter: 'wipe', at: 0.4 },
                { ...LAYER_BASE, text: 'Place anything, animate it with keyframes', style: 'body', color: 'muted', x: 15, y: 63, w: 70, h: 8, enter: 'fade', at: 0.5 },
            ],
        },
        defaultDuration: 4,
        use: 'both',
    },
    Roadmap: {
        label: 'Roadmap',
        component: withMotionBlur(Roadmap as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            {
                name: 'milestones',
                label: 'Milestones',
                type: 'list',
                min: 2,
                max: 5,
                newItem: { when: '', title: 'Next step', status: 'next' },
                item: [
                    { name: 'when', label: 'When (Q3, June…)', type: 'text' },
                    { name: 'title', label: 'Milestone', type: 'text' },
                    { name: 'status', label: 'Status', type: 'choice', options: [{ value: 'done', label: 'Done' }, { value: 'now', label: 'Now' }, { value: 'next', label: 'Next' }] },
                ],
            },
            BLUR_FIELD,
        ],
        defaultProps: {
            heading: 'Where we’re headed',
            milestones: [
                { when: 'Spring', title: 'Private beta', status: 'done' },
                { when: 'Summer', title: 'Public launch', status: 'now' },
                { when: 'Autumn', title: 'Teams', status: 'next' },
                { when: 'Winter', title: 'Mobile apps', status: 'next' },
            ],
        },
        defaultDuration: 5,
        beat: 0.9,
        beatLabel: 'Line drawn',
    },
    Team: {
        label: 'Team',
        component: withMotionBlur(Team as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            {
                name: 'people',
                label: 'People',
                type: 'list',
                min: 1,
                max: 6,
                newItem: { name: 'Name', role: '', photo: '' },
                item: [
                    { name: 'name', label: 'Name', type: 'text' },
                    { name: 'role', label: 'Role', type: 'text' },
                    { name: 'photo', label: 'Photo', type: 'image' },
                ],
            },
            BLUR_FIELD,
        ],
        defaultProps: {
            heading: 'Made by',
            people: [
                { name: 'Alex Kim', role: 'Design', photo: '' },
                { name: 'Sam Rivera', role: 'Engineering', photo: '' },
                { name: 'Jo Patel', role: 'Product', photo: '' },
            ],
        },
        defaultDuration: 4,
    },
    VideoClip: {
        label: 'Video clip (b-roll)',
        component: VideoClip as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'video', label: 'Video (MP4, MOV, WebM; its sound goes on the Sounds lane)', type: 'image', accept: 'video' },
            { name: 'from', label: 'Start at (seconds into the video)', type: 'number', step: 0.1 },
            { name: 'framing', label: 'Framing', type: 'choice', options: [{ value: 'full', label: 'Full frame' }, { value: 'card', label: 'Card' }] },
            { name: 'caption', label: 'Caption', type: 'text' },
        ],
        defaultProps: { video: '', from: 0, framing: 'full', caption: '' },
        defaultDuration: 4,
    },
    Waveform: {
        label: 'Audio waveform',
        component: Waveform as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'audio', label: 'Audio (M4A, MP3, WAV; its sound goes on the Voice lane)', type: 'image', accept: 'audio' },
            { name: 'from', label: 'Start at (seconds into the audio)', type: 'number', step: 0.1 },
            { name: 'look', label: 'Look', type: 'choice', options: [{ value: 'bars', label: 'Bars' }, { value: 'mirror', label: 'Mirrored' }, { value: 'circle', label: 'Circle' }] },
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'subtitle', label: 'Subtitle', type: 'text' },
        ],
        defaultProps: { audio: '', from: 0, look: 'mirror', title: 'Listen in', subtitle: '' },
        defaultDuration: 5,
    },
    Showcase3D: {
        label: '3D showcase',
        component: Showcase3D as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            {
                name: 'subject',
                label: 'Show',
                type: 'choice',
                options: [
                    { value: 'phone', label: 'Phone' },
                    { value: 'laptop', label: 'Laptop' },
                    { value: 'logo', label: 'Logo' },
                ],
            },
            { name: 'image', label: 'Screenshot (phone or laptop)', type: 'image' },
            {
                name: 'motion',
                label: 'Motion',
                type: 'choice',
                options: [
                    { value: 'spin', label: 'Spin in' },
                    { value: 'tilt', label: 'Tilt up' },
                    { value: 'orbit', label: 'Orbit' },
                ],
            },
            { name: 'headline', label: 'Headline', type: 'text' },
            { name: 'detail', label: 'Detail', type: 'text' },
        ],
        defaultProps: { subject: 'phone', image: '', motion: 'spin', headline: 'Built for your pocket', detail: '' },
        defaultDuration: 4.5,
    },
};

const CAMERA_FIELD: SceneField = {
    name: 'camera',
    label: 'Camera move',
    type: 'choice',
    options: [
        { value: 'none', label: 'None' },
        { value: 'push', label: 'Slow push in' },
        { value: 'pull', label: 'Slow pull out' },
        { value: 'pan-left', label: 'Pan left' },
        { value: 'pan-right', label: 'Pan right' },
    ],
};

for (const definition of Object.values(SCENES)) {
    // Overlays sit over the video; moving them would move the video's frame with them.
    if ((definition.use ?? 'scene') !== 'overlay') {
        definition.fields.push(CAMERA_FIELD);
        definition.component = withCamera(definition.component);
    }
    definition.component = withHeldEnd(definition.component);
}

/** Scenes that show part of the screen recording, so a Studio video (no recording) can't use them. */
export const needsRecording = (id: string) => SCENES[id]?.fields.some((f) => f.type === 'segment') ?? false;
export const canBeScene = (id: string) => (SCENES[id]?.use ?? 'scene') !== 'overlay';
export const canBeOverlay = (id: string) => SCENES[id]?.use === 'overlay' || SCENES[id]?.use === 'both';

export const sceneLabel = (id: string) => SCENES[id]?.label ?? id;
