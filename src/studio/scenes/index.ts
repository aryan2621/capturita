import type { ComponentType } from 'react';
import { DeviceShowcase } from './DeviceShowcase';
import { EndCard } from './EndCard';
import { FeatureCallout } from './FeatureCallout';
import { kineticBeat, KineticStatement } from './KineticStatement';
import { CodeToUi, codeToUiBeat } from './CodeToUi';
import { NetworkField } from './NetworkField';
import { TEXT_3D_BEAT, Text3D } from './Text3D';
import { FEATURE_ORBIT_BEAT, FeatureOrbit } from './FeatureOrbit';
import { UiCard, uiCardBeat } from './UiCard';
import { BIG_NUMBER_BEAT, BigNumber } from './BigNumber';
import { CHART_BEAT, Chart } from './Chart';
import { CHANGELOG_BEAT, Changelog } from './Changelog';
import { SOCIAL_PROOF_BEAT, SocialProof } from './SocialProof';
import { LOCATIONS_BEAT, Locations } from './Locations';
import { COUNTDOWN_BEAT, Countdown } from './Countdown';
import { ElementAnimation, ImageAnimation, PROGRESS_BEAT, ProgressAnimation, TextAnimation, textAnimationBeat } from './Animations';
import { CHAT_BEAT, Chat } from './Chat';
import { FAQ_BEAT, Faq } from './Faq';
import { NOTIFICATIONS_BEAT, Notifications } from './Notifications';
import { INTEGRATIONS_BEAT, Integrations } from './Integrations';
import { CURSOR_CLICK, CursorDemo } from './CursorDemo';
import { KineticType, kineticTypeBeat } from './KineticType';
import { LOGO_HITS, LogoSting } from './LogoSting';
import { LowerThird } from './LowerThird';
import { StatCounter } from './StatCounter';
import { TitleReveal } from './TitleReveal';
import { BeforeAfter } from './BeforeAfter';
import { CodeTyping } from './CodeTyping';
import { Comparison } from './Comparison';
import { FEATURE_ICONS, FeatureGrid } from './FeatureGrid';
import { HowItWorks } from './HowItWorks';
import { UiCollage } from './UiCollage';
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
import { withCalm, withHeldEnd } from './SceneBase';
import { withAtmosphere, withLook } from './atmosphere';
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
export const SCENE_RENDER_VERSION = 13;

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
    /** 'animation' ones are listed in the Animation tab of the add menu, not with the scenes. */
    group?: 'animation';
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
                    { value: 'squash', label: 'Squash' },
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
            { name: 'glow', label: 'Glow on the title', type: 'boolean' },
            { name: 'aberration', label: 'Colour fringe on the title', type: 'boolean' },
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
        group: 'animation',
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
    KineticType: {
        label: 'Kinetic type',
        component: withMotionBlur(KineticType as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'text', label: 'Text (one line per row)', type: 'text', multiline: true },
            { name: 'emphasis', label: 'Accent words (comma separated)', type: 'text' },
            {
                name: 'mode',
                label: 'Motion',
                type: 'choice',
                options: [
                    { value: 'mask-slide', label: 'Mask slide' },
                    { value: 'scale-slam', label: 'Scale slam' },
                    { value: 'split-letters', label: 'Split letters' },
                    { value: 'word-swap', label: 'Word swap' },
                    { value: 'marquee', label: 'Marquee' },
                ],
            },
            { name: 'swaps', label: 'Swapped words (word swap, comma separated)', type: 'text' },
            BLUR_FIELD,
        ],
        defaultProps: { text: 'Record it once.\nShip it everywhere.', emphasis: 'everywhere', mode: 'mask-slide', swaps: 'demos, tutorials, launches' },
        defaultDuration: 3.5,
        beat: (props) => kineticTypeBeat(props),
        beatLabel: 'Key word',
        use: 'both',
    },
    BigNumber: {
        label: 'Big number',
        // No motion blur: it smears the ticking digits into ghosts.
        component: BigNumber as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'value', label: 'Figure (e.g. 10x, $4.2M, 98%)', type: 'text' },
            { name: 'label', label: 'Label', type: 'text' },
            { name: 'glow', label: 'Glow', type: 'boolean' },
        ],
        defaultProps: { value: '10x', label: 'faster than recording by hand', glow: false },
        defaultDuration: 3.5,
        beat: BIG_NUMBER_BEAT + 4 / SCENE_FPS,
        beatLabel: 'Count lands',
        use: 'both',
    },
    Chart: {
        label: 'Chart',
        component: Chart as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            {
                name: 'kind',
                label: 'Style',
                type: 'choice',
                options: [
                    { value: 'bars', label: 'Bars' },
                    { value: 'line', label: 'Line' },
                ],
            },
            { name: 'unit', label: 'Unit after each value (%, k, x)', type: 'text' },
            { name: 'points', label: 'Points', type: 'list', item: [{ name: 'label', label: 'Label', type: 'text' }, { name: 'value', label: 'Value', type: 'number' }], newItem: { label: 'Q5', value: 50 }, min: 2, max: 8 },
        ],
        defaultProps: { heading: 'Growth, quarter by quarter', kind: 'bars', unit: 'k', points: [{ label: 'Q1', value: 12 }, { label: 'Q2', value: 21 }, { label: 'Q3', value: 34 }, { label: 'Q4', value: 58 }] },
        defaultDuration: 4.5,
        beat: CHART_BEAT + 8 / SCENE_FPS,
        beatLabel: 'Chart lands',
        use: 'both',
    },
    Changelog: {
        label: 'Changelog',
        component: Changelog as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'entries', label: 'Entries', type: 'list', item: [{ name: 'version', label: 'Version', type: 'text' }, { name: 'text', label: 'What changed', type: 'text' }], newItem: { version: 'v1.1', text: 'A new thing' }, min: 2, max: 5 },
        ],
        defaultProps: { heading: "What's new", entries: [{ version: 'v2.0', text: 'A faster editor' }, { version: 'v2.1', text: 'Shared spaces' }, { version: 'v2.2', text: 'Offline mode' }] },
        defaultDuration: 4.5,
        beat: CHANGELOG_BEAT,
        beatLabel: 'Last entry lands',
        use: 'both',
    },
    SocialProof: {
        label: 'Social proof',
        component: SocialProof as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'rating', label: 'Rating (0–5)', type: 'number', step: 0.1 },
            { name: 'reviews', label: 'Review count line', type: 'text' },
            { name: 'badge', label: 'Badge (optional)', type: 'text' },
        ],
        defaultProps: { rating: 4.8, reviews: 'from 2,400 reviews', badge: '#1 Product of the Day' },
        defaultDuration: 4,
        beat: SOCIAL_PROOF_BEAT,
        beatLabel: 'Last star',
        use: 'both',
    },
    Locations: {
        label: 'Locations map',
        component: Locations as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'places', label: 'Pins', type: 'list', item: [{ name: 'name', label: 'Place', type: 'text' }, { name: 'x', label: 'X (0–100)', type: 'number' }, { name: 'y', label: 'Y (0–100)', type: 'number' }], newItem: { name: 'City', x: 50, y: 50 }, min: 1, max: 8 },
        ],
        defaultProps: { heading: 'Used in 40 countries', places: [{ name: 'San Francisco', x: 14, y: 38 }, { name: 'London', x: 46, y: 26 }, { name: 'Bangalore', x: 70, y: 56 }, { name: 'Sydney', x: 88, y: 82 }] },
        defaultDuration: 4.5,
        beat: LOCATIONS_BEAT,
        beatLabel: 'Last pin',
        use: 'both',
    },
    Countdown: {
        label: 'Countdown',
        component: Countdown as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'label', label: 'Heading', type: 'text' },
            { name: 'days', label: 'Days', type: 'number' },
            { name: 'hours', label: 'Hours', type: 'number' },
            { name: 'minutes', label: 'Minutes', type: 'number' },
            { name: 'seconds', label: 'Seconds', type: 'number' },
            { name: 'note', label: 'Line under the clock', type: 'text' },
        ],
        defaultProps: { label: 'Launching soon', days: 3, hours: 4, minutes: 12, seconds: 30, note: 'Live on 12 November' },
        defaultDuration: 4,
        beat: COUNTDOWN_BEAT,
        beatLabel: 'Clock lands',
        use: 'both',
    },
    Faq: {
        label: 'FAQ',
        component: Faq as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'items', label: 'Questions', type: 'list', item: [{ name: 'q', label: 'Question', type: 'text' }, { name: 'a', label: 'Answer', type: 'text' }], newItem: { q: 'A question?', a: 'A short answer.' }, min: 2, max: 4 },
        ],
        defaultProps: { heading: 'Good to know', items: [{ q: 'Is it free?', a: 'Yes, for personal use.' }, { q: 'Does it work offline?', a: 'Everything runs on your Mac.' }, { q: 'Can I export to GIF?', a: 'Yes: MP4, GIF and ProRes.' }] },
        defaultDuration: 5,
        beat: FAQ_BEAT,
        beatLabel: 'Last answer',
        use: 'both',
    },
    Chat: {
        label: 'Chat',
        component: Chat as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'messages', label: 'Messages', type: 'list', item: [{ name: 'from', label: 'From', type: 'choice', options: [{ value: 'user', label: 'User' }, { value: 'bot', label: 'Reply' }] }, { name: 'text', label: 'Message', type: 'text' }], newItem: { from: 'bot', text: 'A message.' }, min: 2, max: 5 },
        ],
        defaultProps: { heading: 'Just ask', messages: [{ from: 'user', text: 'Summarise yesterday’s meeting' }, { from: 'bot', text: 'Three decisions, two owners, one open question.' }, { from: 'user', text: 'Send it to the team' }, { from: 'bot', text: 'Done. Shared in #product.' }] },
        defaultDuration: 5,
        beat: CHAT_BEAT,
        beatLabel: 'Last message',
        use: 'both',
    },
    Notifications: {
        label: 'Notifications',
        component: Notifications as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'items', label: 'Notifications', type: 'list', item: [{ name: 'title', label: 'Title', type: 'text' }, { name: 'text', label: 'Text', type: 'text' }], newItem: { title: 'Title', text: 'A short line.' }, min: 2, max: 4 },
        ],
        defaultProps: { heading: 'Stay in the loop', items: [{ title: 'New comment', text: 'Priya replied to your draft' }, { title: 'Export finished', text: 'launch-video.mp4 is ready' }, { title: 'Invite accepted', text: 'Sam joined the workspace' }] },
        defaultDuration: 4.5,
        beat: NOTIFICATIONS_BEAT,
        beatLabel: 'Last notification',
        use: 'both',
    },
    TextAnimation: {
        label: 'Text animation',
        component: TextAnimation as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'text', label: 'Text', type: 'text', multiline: true },
            { name: 'style', label: 'Animation', type: 'choice', options: [{ value: 'words', label: 'Words' }, { value: 'letters', label: 'Letters' }, { value: 'typewriter', label: 'Typewriter' }, { value: 'blur', label: 'Blur' }, { value: 'rise', label: 'Rise' }, { value: 'wipe', label: 'Wipe' }, { value: 'highlight', label: 'Highlight' }] },
            { name: 'size', label: 'Size', type: 'choice', options: [{ value: 's', label: 'Small' }, { value: 'm', label: 'Medium' }, { value: 'l', label: 'Large' }] },
            { name: 'position', label: 'Position', type: 'choice', options: [{ value: 'top', label: 'Top' }, { value: 'center', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }] },
            { name: 'color', label: 'Colour (blank = brand text)', type: 'color' },
        ],
        defaultProps: { text: 'Make it move', style: 'words', size: 'm', position: 'center', color: '' },
        defaultDuration: 3,
        beat: textAnimationBeat,
        beatLabel: 'Text has landed',
        use: 'both',
        group: 'animation',
    },
    ImageAnimation: {
        label: 'Image animation',
        component: ImageAnimation as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'image', label: 'Image', type: 'image' },
            { name: 'style', label: 'Animation', type: 'choice', options: [{ value: 'rise', label: 'Rise' }, { value: 'fade', label: 'Fade' }, { value: 'reveal', label: 'Reveal' }, { value: 'slide', label: 'Slide' }] },
            { name: 'frame', label: 'Frame', type: 'choice', options: [{ value: 'card', label: 'Card' }, { value: 'none', label: 'None' }] },
        ],
        defaultProps: { image: '', style: 'rise', frame: 'card' },
        defaultDuration: 4,
        beat: 0.6,
        beatLabel: 'Image lands',
        use: 'both',
        group: 'animation',
    },
    ElementAnimation: {
        label: 'Animated element',
        component: ElementAnimation as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'element', label: 'Element', type: 'choice', options: [{ value: 'check', label: 'Check' }, { value: 'arrow', label: 'Arrow' }, { value: 'underline', label: 'Underline' }, { value: 'ring', label: 'Ring' }, { value: 'sparkles', label: 'Sparkles' }, { value: 'burst', label: 'Burst' }, { value: 'confetti', label: 'Confetti' }] },
            { name: 'color', label: 'Colour (blank = brand accent)', type: 'color' },
            { name: 'size', label: 'Size', type: 'choice', options: [{ value: 's', label: 'Small' }, { value: 'm', label: 'Medium' }, { value: 'l', label: 'Large' }] },
            { name: 'position', label: 'Position', type: 'choice', options: [{ value: 'center', label: 'Middle' }, { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
        ],
        defaultProps: { element: 'check', color: '', size: 'm', position: 'center' },
        defaultDuration: 2.5,
        beat: 0.5,
        beatLabel: 'Element lands',
        use: 'both',
        group: 'animation',
    },
    ProgressAnimation: {
        label: 'Progress',
        component: ProgressAnimation as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'style', label: 'Style', type: 'choice', options: [{ value: 'ring', label: 'Ring' }, { value: 'bar', label: 'Bar' }] },
            { name: 'value', label: 'Value (0–100)', type: 'number', step: 1 },
            { name: 'label', label: 'Label', type: 'text' },
        ],
        defaultProps: { style: 'ring', value: 87, label: 'Faster than before' },
        defaultDuration: 3.5,
        beat: PROGRESS_BEAT,
        beatLabel: 'Fill completes',
        use: 'both',
        group: 'animation',
    },
    Integrations: {
        label: 'Integrations',
        component: Integrations as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'center', label: 'Your product', type: 'text' },
            { name: 'items', label: 'Tools it connects to', type: 'list', item: [{ name: 'text', label: 'Name', type: 'text' }], newItem: { text: 'Tool' }, min: 3, max: 8 },
        ],
        defaultProps: { center: 'Acme', items: [{ text: 'Slack' }, { text: 'Notion' }, { text: 'GitHub' }, { text: 'Linear' }, { text: 'Figma' }] },
        defaultDuration: 4.5,
        beat: INTEGRATIONS_BEAT,
        beatLabel: 'Last connection',
        use: 'both',
    },
    CursorDemo: {
        label: 'Cursor demo',
        component: CursorDemo as unknown as ComponentType<Record<string, unknown>>,
        fields: [
            { name: 'title', label: 'Card heading', type: 'text' },
            { name: 'typed', label: 'Text typed in the field', type: 'text' },
            { name: 'button', label: 'Button', type: 'text' },
            { name: 'result', label: 'Result after the click', type: 'text' },
        ],
        defaultProps: { title: 'New project', typed: 'Launch video', button: 'Create', result: 'Project created' },
        defaultDuration: 5,
        beat: CURSOR_CLICK,
        beatLabel: 'Click',
        use: 'scene',
    },
    UiCard: {
        label: 'App window',
        component: withMotionBlur(UiCard as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'title', label: 'Window title', type: 'text' },
            { name: 'toggles', label: 'Switches', type: 'list', item: [{ name: 'text', label: 'Label', type: 'text' }], newItem: { text: 'Another setting' }, min: 1, max: 3 },
            { name: 'rows', label: 'List rows', type: 'list', item: [{ name: 'text', label: 'Row', type: 'text' }], newItem: { text: 'Another item' }, min: 0, max: 3 },
            { name: 'toast', label: 'Toast (empty for none)', type: 'text' },
            BLUR_FIELD,
        ],
        defaultProps: {
            title: 'Weekly report',
            toggles: [{ text: 'Auto-save' }, { text: 'Share with team' }, { text: 'Notifications' }],
            rows: [{ text: 'Design review' }, { text: 'Ship the new onboarding' }, { text: 'Write the docs' }],
            toast: 'All changes saved',
        },
        defaultDuration: 4.5,
        beat: (props) => uiCardBeat(props),
        beatLabel: 'Last click',
        use: 'both',
    },
    FeatureOrbit: {
        label: 'Feature orbit',
        component: withMotionBlur(FeatureOrbit as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'features', label: 'Features', type: 'list', item: [{ name: 'text', label: 'Feature', type: 'text' }], newItem: { text: 'Another feature' }, min: 3, max: 8 },
            BLUR_FIELD,
        ],
        defaultProps: {
            heading: 'Everything in one place',
            features: [{ text: 'Screen recording' }, { text: 'Auto zoom' }, { text: 'Captions' }, { text: 'Music' }, { text: 'Export anywhere' }, { text: 'Brand kits' }],
        },
        defaultDuration: 5,
        beat: FEATURE_ORBIT_BEAT,
        beatLabel: 'Ring opens',
        use: 'both',
    },
    DeviceShowcase: {
        label: 'Device showcase',
        component: withMotionBlur(DeviceShowcase as unknown as ComponentType<Record<string, unknown>>),
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
            { name: 'clickZoom', label: 'Zoom in on clicks', type: 'boolean' },
            BLUR_FIELD,
        ],
        defaultProps: { device: 'macbook', segment: { start: 0, end: 5 }, placement: 'side', headline: 'Built for the way you work', detail: '', url: 'yourproduct.com', clickZoom: true },
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
        component: withMotionBlur(StatCounter as unknown as ComponentType<Record<string, unknown>>),
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
            BLUR_FIELD,
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
        group: 'animation',
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
            {
                name: 'style',
                label: 'Style',
                type: 'choice',
                options: [
                    { value: 'bar', label: 'Card with bar' },
                    { value: 'minimal', label: 'Minimal (text only)' },
                    { value: 'pill', label: 'Pill' },
                ],
            },
            { name: 'logo', label: 'Brand logo', type: 'boolean' },
        ],
        defaultProps: { name: 'Your name', title: 'Founder, Your product', side: 'left', style: 'bar', logo: true },
        defaultDuration: 4,
        use: 'overlay',
    },
    EndCard: {
        label: 'End card',
        component: withMotionBlur(EndCard as unknown as ComponentType<Record<string, unknown>>),
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
            BLUR_FIELD,
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
            { name: 'cursor', label: 'Cursor clicks the focus point', type: 'boolean' },
            { name: 'zoom', label: 'Zoom in on the focus point', type: 'boolean' },
            { name: 'focusX', label: 'Focus point across (%)', type: 'number', step: 5 },
            { name: 'focusY', label: 'Focus point down (%)', type: 'number', step: 5 },
            BLUR_FIELD,
        ],
        defaultProps: { image: '', device: 'phone', placement: 'side', headline: 'Everything in your pocket', detail: 'One line about this screen.', url: '', scroll: false, cursor: false, zoom: false, focusX: 50, focusY: 40 },
        defaultDuration: 4.5,
        beat: 0.5,
        beatLabel: 'Device lands',
    },
    FeatureGrid: {
        label: 'Feature grid',
        component: withMotionBlur(FeatureGrid as unknown as ComponentType<Record<string, unknown>>),
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
            BLUR_FIELD,
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
    HowItWorks: {
        label: 'How it works',
        component: withMotionBlur(HowItWorks as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            {
                name: 'steps',
                label: 'Steps',
                type: 'list',
                item: [
                    { name: 'title', label: 'Title', type: 'text' },
                    { name: 'text', label: 'Text', type: 'text' },
                ],
                newItem: { title: 'Another step', text: 'What happens next.' },
                min: 2,
                max: 4,
            },
            BLUR_FIELD,
        ],
        defaultProps: {
            heading: 'How it works',
            steps: [
                { title: 'Connect', text: 'Link your tools in a minute.' },
                { title: 'Choose', text: 'Pick what you want to track.' },
                { title: 'Done', text: 'Results arrive on their own.' },
            ],
        },
        defaultDuration: 5,
        beat: 0.4,
        beatLabel: 'First step',
    },
    UiCollage: {
        label: 'Screen collage',
        component: withMotionBlur(UiCollage as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'headline', label: 'Headline', type: 'text' },
            { name: 'images', label: 'Screenshots', type: 'list', item: [{ name: 'image', label: 'Screenshot', type: 'image' }], newItem: { image: '' }, min: 3, max: 5 },
            BLUR_FIELD,
        ],
        defaultProps: { headline: 'Every screen, one product', images: [{ image: '' }, { image: '' }, { image: '' }] },
        defaultDuration: 4.5,
        beat: 0.4,
        beatLabel: 'First card',
    },
    Testimonial: {
        label: 'Testimonial',
        component: withMotionBlur(Testimonial as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'quote', label: 'Quote', type: 'text', multiline: true },
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'role', label: 'Role', type: 'text' },
            { name: 'avatar', label: 'Photo', type: 'image' },
            { name: 'rating', label: 'Stars (0–5)', type: 'number', step: 1 },
            BLUR_FIELD,
        ],
        defaultProps: { quote: 'This changed how our team works. We can’t imagine going back.', name: 'Customer name', role: 'Role, Company', avatar: '', rating: 5 },
        defaultDuration: 5,
        beat: (props) => (12 + Math.max(0, Math.min(5, Math.round(Number(props.rating) || 0)) - 1) * 3) / 30,
        beatLabel: 'Stars fill',
    },
    Pricing: {
        label: 'Pricing',
        component: withMotionBlur(Pricing as unknown as ComponentType<Record<string, unknown>>),
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
            BLUR_FIELD,
        ],
        defaultProps: {
            heading: 'Simple pricing',
            tiers: [
                { name: 'Free', price: '$0', period: '/month', features: 'Core features; 1 project', highlight: 'no' },
                { name: 'Pro', price: '$12', period: '/month', features: 'Everything in Free; Unlimited projects; Priority support', highlight: 'yes' },
                { name: 'Team', price: '$29', period: '/seat', features: 'Everything in Pro; Shared brand kits; Admin controls', highlight: 'no' },
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
    CodeToUi: {
        label: 'Code to app window',
        component: withMotionBlur(CodeToUi as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'fileName', label: 'File name', type: 'text' },
            { name: 'code', label: 'Code', type: 'text', multiline: true },
            { name: 'speed', label: 'Typing speed (characters a second)', type: 'number', step: 5 },
            { name: 'title', label: 'Window title', type: 'text' },
            { name: 'toggles', label: 'Switches', type: 'list', item: [{ name: 'text', label: 'Label', type: 'text' }], newItem: { text: 'Another setting' }, min: 1, max: 3 },
            { name: 'rows', label: 'List rows', type: 'list', item: [{ name: 'text', label: 'Row', type: 'text' }], newItem: { text: 'Another item' }, min: 0, max: 3 },
            { name: 'toast', label: 'Toast (empty for none)', type: 'text' },
            BLUR_FIELD,
        ],
        defaultProps: {
            heading: 'One config, a whole app',
            fileName: 'app.ts',
            code: "const app = create({\n  autosave: true,\n  share: 'team',\n});\nawait app.start();",
            speed: 40,
            title: 'Weekly report',
            toggles: [{ text: 'Auto-save' }, { text: 'Share with team' }, { text: 'Notifications' }],
            rows: [{ text: 'Design review' }, { text: 'Ship the new onboarding' }, { text: 'Write the docs' }],
            toast: 'All changes saved',
        },
        defaultDuration: 8.5,
        beat: (props) => codeToUiBeat(props),
        beatLabel: 'Last click',
    },
    NetworkField: {
        label: 'Network field',
        component: withMotionBlur(NetworkField as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'heading', label: 'Heading', type: 'text' },
            { name: 'subtitle', label: 'Subtitle', type: 'text' },
            { name: 'density', label: 'Points (12-60)', type: 'number', step: 4 },
            BLUR_FIELD,
        ],
        defaultProps: { heading: 'Everything connected', subtitle: 'One place for the whole team', density: 36 },
        defaultDuration: 4,
        beat: 0.3,
        beatLabel: 'Heading lands',
        use: 'both',
    },
    Text3D: {
        label: '3D text',
        component: withMotionBlur(Text3D as unknown as ComponentType<Record<string, unknown>>),
        fields: [
            { name: 'text', label: 'Text (one line per row, up to 3)', type: 'text', multiline: true },
            { name: 'subtitle', label: 'Subtitle', type: 'text' },
            BLUR_FIELD,
        ],
        defaultProps: { text: 'Built to ship', subtitle: 'From first draft to final cut' },
        defaultDuration: 4,
        beat: TEXT_3D_BEAT,
        beatLabel: 'Text lands',
        use: 'both',
    },
    Comparison: {
        label: 'Comparison',
        component: withMotionBlur(Comparison as unknown as ComponentType<Record<string, unknown>>),
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
            BLUR_FIELD,
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
        group: 'animation',
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

const ATMOSPHERE_FIELD: SceneField = {
    name: 'atmosphere',
    label: 'Light and grain',
    type: 'choice',
    options: [
        { value: 'filmic', label: 'Film (vignette, soft light, grain)' },
        { value: 'neon', label: 'Neon (strong glow)' },
        { value: 'haze', label: 'Haze (lifted, soft)' },
        { value: 'print', label: 'Print (heavy grain)' },
        { value: 'off', label: 'Clean' },
    ],
};

const TYPE_FIELD: SceneField = {
    name: 'type',
    label: 'Type style',
    type: 'choice',
    options: [
        { value: 'brand', label: 'Brand kit fonts' },
        { value: 'grotesk', label: 'Tight grotesk' },
        { value: 'serif', label: 'Editorial serif' },
        { value: 'mono', label: 'Mono tech' },
        { value: 'heavy', label: 'Heavy display' },
    ],
};

const ENTER_FIELD: SceneField = {
    name: 'enter',
    label: 'Entrance',
    type: 'choice',
    options: [
        { value: 'spring', label: "Scene's own" },
        { value: 'snap', label: 'Snap (quick punch in)' },
        { value: 'ease', label: 'Ease (fade and rise)' },
    ],
};

const PALETTE_FIELD: SceneField = {
    name: 'palette',
    label: 'Palette',
    type: 'choice',
    options: [
        { value: 'brand', label: 'Brand colours' },
        { value: 'duotone', label: 'Duotone' },
        { value: 'inverted', label: 'Inverted' },
        { value: 'mono', label: 'Mono with accent' },
    ],
};


const CALM_FIELD: SceneField = { name: 'calm', label: 'Still background (no drifting light or grain)', type: 'boolean' };

for (const definition of Object.values(SCENES)) {
    // Overlays sit over the video; moving them would move the video's frame with them.
    if ((definition.use ?? 'scene') !== 'overlay') {
        definition.fields.push(ATMOSPHERE_FIELD, CALM_FIELD, TYPE_FIELD, PALETTE_FIELD, ENTER_FIELD);
        definition.defaultProps = { ...definition.defaultProps, calm: true };
        // The camera moves the scene; the atmosphere stays on the screen over it.
        definition.component = withCalm(withAtmosphere(withLook(definition.component)));
    }
    definition.component = withHeldEnd(definition.component);
}

/** Scenes that show part of the screen recording, so a Studio video (no recording) can't use them. */
export const needsRecording = (id: string) => SCENES[id]?.fields.some((f) => f.type === 'segment') ?? false;
export const canBeScene = (id: string) => (SCENES[id]?.use ?? 'scene') !== 'overlay';
export const canBeOverlay = (id: string) => SCENES[id]?.use === 'overlay' || SCENES[id]?.use === 'both';

export const sceneLabel = (id: string) => SCENES[id]?.label ?? id;
