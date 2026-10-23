import type { CursorData, Project } from '../lib/api';
import type { CursorAnimation, ScreenAnimation } from './motion';

/**
 * Everything the user changes in the editor. Saved as edit.json next to the recording;
 * the recorded files themselves are never modified.
 */
export interface Edit {
    version: 2;
    /**
     * The timeline, in order: kept parts of the recording (source-time ranges; gaps between them
     * are cuts) and generated motion scenes. There is always at least one recording clip.
     */
    items: TimelineItem[];
    background: Background;
    /** Space around the screen, as a fraction of the shorter side of the frame. */
    padding: number;
    /** Corner radius of the screen, as a fraction of the frame width. */
    radius: number;
    /** 0 (none) to 1 (strong). */
    shadow: number;
    /** Visible part of the screen, normalized to the recorded area. */
    crop: NormalizedRect;
    aspect: Aspect;
    camera: CameraLayout;
    cursor: CursorStyle;
    /** How the zoom camera moves, and motion blur. */
    motion: Motion;
    zooms: Zoom[];
    /** Zoom amount used for auto-zoom and newly added zooms. */
    zoomScale: number;
    texts: TextOverlay[];
    /** Generated pieces drawn over everything else (lower thirds, labels), in drawing order. */
    overlays: OverlayClip[];
    /** Parts of the screen hidden for privacy (pixelated, blurred or covered). */
    hides: HideRegion[];
    captions: Captions;
    audio: AudioMix;
    /** The brand kit motion scenes use (an id from the app-wide kits), or absent for the default look. */
    brandKit?: string;
    /** When a custom thumbnail was set (thumb.jpg in the project), or absent for the automatic one. */
    thumbnail?: number;
}

export type HideStyle = 'pixelate' | 'blur' | 'solid';

export const HIDE_STYLES: { value: HideStyle; label: string; hint: string }[] = [
    { value: 'pixelate', label: 'Pixelate', hint: 'Large blocks: the usual "censored" look' },
    { value: 'blur', label: 'Blur', hint: 'Soft blur; fine for faces and photos' },
    { value: 'solid', label: 'Solid', hint: 'A plain box. The only fully safe choice for passwords and keys' },
];

/**
 * A part of the recording hidden for privacy. Times are source times, like zooms; the box is
 * normalized to the whole recorded screen (like the crop), so it stays on the content while
 * zooming and cropping.
 */
export interface HideRegion extends NormalizedRect {
    id: string;
    start: number;
    end: number;
    style: HideStyle;
}

/** One spoken word with its timing (source seconds). */
export interface CaptionWord {
    start: number;
    end: number;
    text: string;
}

/**
 * One caption on screen; `words` drive the word highlight. Times are source times, or, with
 * `voice` set, seconds into that voiceover clip's file (so the caption moves with the clip).
 */
export interface Caption {
    id: string;
    start: number;
    end: number;
    text: string;
    words: CaptionWord[];
    /** Id of the voiceover clip this caption transcribes. */
    voice?: string;
}

/** How the word being spoken stands out. */
export type CaptionHighlightStyle = 'color' | 'box' | 'underline' | 'pop';

export const CAPTION_HIGHLIGHT_STYLES: { value: CaptionHighlightStyle; label: string; hint: string }[] = [
    { value: 'color', label: 'Colour', hint: 'The word changes colour' },
    { value: 'box', label: 'Box', hint: 'A coloured box behind the word' },
    { value: 'underline', label: 'Line', hint: 'A coloured line under the word' },
    { value: 'pop', label: 'Pop', hint: 'The word changes colour and grows a little' },
];

export type CaptionBackground = 'box' | 'shadow' | 'none';

export interface CaptionStyle {
    font: FontKey;
    /** Font size as a fraction of the frame's shorter side. */
    size: number;
    color: string;
    bold: boolean;
    background: CaptionBackground;
    position: 'bottom' | 'top';
    /** Colour of the word being spoken, or null for no highlight. */
    highlight: string | null;
    highlightStyle: CaptionHighlightStyle;
}

export interface Captions {
    /** Burn the captions into the video. */
    visible: boolean;
    /** Language spoken ("auto" detects it). */
    language: string;
    style: CaptionStyle;
    items: Caption[];
    /** "um"/"uh" left out of the captions, kept with their timings so they can be cut out. */
    fillers?: CaptionWord[];
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
    font: 'system',
    size: 0.05,
    color: '#ffffff',
    bold: true,
    background: 'box',
    position: 'bottom',
    highlight: '#ffd200',
    highlightStyle: 'color',
};

/** One-click caption looks; each sets the whole style. */
export const CAPTION_PRESETS: { label: string; hint: string; style: CaptionStyle }[] = [
    { label: 'Clean', hint: 'White words in a dark box', style: DEFAULT_CAPTION_STYLE },
    { label: 'Bold pop', hint: 'Big words; the spoken one grows in colour', style: { ...DEFAULT_CAPTION_STYLE, font: 'rounded', size: 0.065, background: 'shadow', highlightStyle: 'pop' } },
    { label: 'Boxed', hint: 'A coloured box behind the spoken word', style: { ...DEFAULT_CAPTION_STYLE, font: 'avenir', size: 0.055, background: 'none', highlight: '#6c8cff', highlightStyle: 'box' } },
    { label: 'Subtle', hint: 'Small plain words, no highlight', style: { ...DEFAULT_CAPTION_STYLE, size: 0.04, bold: false, background: 'shadow', highlight: null } },
];

/** Text shown over the video. Times are source times, like zooms. */
export interface TextOverlay {
    id: string;
    start: number;
    end: number;
    text: string;
    /** Centre of the text, normalized to the output frame. */
    x: number;
    y: number;
    /** Font size as a fraction of the frame height. */
    size: number;
    color: string;
    bold: boolean;
    background: 'none' | 'box';
    font: FontKey;
    /** How the text enters and leaves. */
    animation: TextAnimation;
}

export type TextAnimation = 'none' | 'fade' | 'rise' | 'pop' | 'slide' | 'blur' | 'typewriter' | 'words';

export const TEXT_ANIMATIONS: { value: TextAnimation; label: string; hint: string }[] = [
    { value: 'none', label: 'None', hint: 'Appears and disappears instantly' },
    { value: 'fade', label: 'Fade', hint: 'Fades in and out' },
    { value: 'rise', label: 'Rise', hint: 'Fades in while rising a little' },
    { value: 'pop', label: 'Pop', hint: 'Springs in from smaller' },
    { value: 'slide', label: 'Slide', hint: 'Slides in from the left' },
    { value: 'blur', label: 'Blur', hint: 'Comes into focus from a blur' },
    { value: 'typewriter', label: 'Type', hint: 'Types out letter by letter' },
    { value: 'words', label: 'Words', hint: 'Reveals one word at a time' },
];

export type FontKey = 'system' | 'rounded' | 'serif' | 'mono' | 'avenir' | 'futura' | 'georgia' | 'marker';

/** macOS fonts for text overlays, with fallbacks. The same stacks are used for preview and export. */
export const FONTS: { value: FontKey; label: string; stack: string }[] = [
    { value: 'system', label: 'SF Pro', stack: '-apple-system, "SF Pro Display", system-ui, sans-serif' },
    { value: 'rounded', label: 'SF Rounded', stack: 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif' },
    { value: 'serif', label: 'New York', stack: 'ui-serif, "New York", Georgia, serif' },
    { value: 'mono', label: 'SF Mono', stack: 'ui-monospace, "SF Mono", Menlo, monospace' },
    { value: 'avenir', label: 'Avenir Next', stack: '"Avenir Next", Avenir, sans-serif' },
    { value: 'futura', label: 'Futura', stack: 'Futura, "Century Gothic", sans-serif' },
    { value: 'georgia', label: 'Georgia', stack: 'Georgia, serif' },
    { value: 'marker', label: 'Marker Felt', stack: '"Marker Felt", "Comic Sans MS", cursive' },
];

export const fontStack = (font: FontKey) => (FONTS.find((f) => f.value === font) ?? FONTS[0]).stack;

export interface TrackLevel {
    /** 0 to 2 (200%). */
    volume: number;
    muted: boolean;
}

export interface AudioMix {
    system: TrackLevel;
    microphone: TrackLevel;
    /** Seconds of fade at the start and end of the whole video. */
    fadeIn: number;
    fadeOut: number;
    /** Background music, played along the edited timeline. */
    music: MusicTrack | null;
    /** Narration placed at output times (the Voiceover lane). */
    voiceovers: AudioClip[];
    /** Sound effects placed at output times (the SFX lane). */
    effects: AudioClip[];
    /** Lane mutes: the clips stay, but neither the preview nor the export plays them. */
    voiceMuted?: boolean;
    effectsMuted?: boolean;
    /** Lowers the music while someone speaks. */
    ducking: Ducking;
}

/**
 * A sound file placed on the output timeline (a voiceover or a sound effect). The file is a copy
 * inside the project's `audio/` folder; `offset` and `duration` pick the part that plays.
 */
export interface AudioClip {
    id: string;
    /** Path inside the project folder (audio/voice-….m4a). */
    file: string;
    /** The original file name, for display. */
    name: string;
    /** Output second the clip starts at. */
    start: number;
    /** Seconds into the file the clip starts from. */
    offset: number;
    duration: number;
    /** Length of the whole file, so trimming can't run past it. */
    length: number;
    /** 0 to 2 (200%). */
    volume: number;
    /** Seconds of fade at the clip's start and end. */
    fadeIn: number;
    fadeOut: number;
}

export interface Ducking {
    enabled: boolean;
    /** How far the music drops while someone speaks, in dB (negative). */
    amount: number;
    /** Seconds the music takes to go down, and to come back up. */
    attack: number;
    release: number;
    /** Also duck under the recording's microphone, not only voiceovers. */
    underRecording: boolean;
}

export const DEFAULT_DUCKING: Ducking = { enabled: true, amount: -12, attack: 0.08, release: 0.4, underRecording: false };

/** A sound played automatically: at a transition's midpoint, or at a scene's beat. */
export interface SoundCue {
    /** Path inside the project folder (audio/sfx-….wav). */
    file: string;
    name: string;
    /** 0 to 2. */
    volume: number;
}

/** A song copied into the project folder. */
export interface MusicTrack extends TrackLevel {
    /** File name inside the project folder (music.mp3, …). */
    file: string;
    /** The original file name, for display. */
    name: string;
    /** Start this many seconds into the song. */
    offset: number;
    /** Repeat the song if the video is longer. */
    loop: boolean;
    /** Beat times in the song (seconds), found when it was added (beats.ts). */
    beats?: number[];
    /** Length of the song, seconds. */
    length?: number;
}

export const DEFAULT_MUSIC_VOLUME = 0.35;

/** A stretch of the recording shown zoomed in. Times are source times, so cuts don't move it. */
export interface Zoom {
    id: string;
    start: number;
    end: number;
    /** 1.2 to 4. */
    scale: number;
    /** Follow the cursor, or stay on a fixed point. */
    mode: 'follow' | 'fixed';
    /** Fixed focus point, normalized to the (cropped) screen. */
    x: number;
    y: number;
    /** Created by auto-zoom (replaced when auto-zoom runs again). */
    auto: boolean;
    /** Cut straight in and out instead of animating. */
    instant?: boolean;
}

export interface Motion {
    /** Feel of zooms and pans. */
    screen: ScreenAnimation;
    /** 0 (off) to 1: blur along fast camera and cursor movement. */
    blur: number;
}

/** Kinds of transition that blend two items over a stretch of time (everything but a cut). */
export type TransitionKind = 'crossfade' | 'slide' | 'push' | 'wipe' | 'zoom' | 'blur' | 'dip';
/** The way motion runs on screen (slide, push, wipe). */
export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

export const TRANSITION_KINDS: TransitionKind[] = ['crossfade', 'slide', 'push', 'wipe', 'zoom', 'blur', 'dip'];
export const DIRECTED_TRANSITIONS: TransitionKind[] = ['slide', 'push', 'wipe'];
export const TRANSITION_LABELS: Record<string, string> = { cut: 'Cut', crossfade: 'Crossfade', slide: 'Slide', push: 'Push', wipe: 'Wipe', zoom: 'Zoom through', blur: 'Blur', dip: 'Dip to colour' };

/** How a timeline item enters from the one before it. */
export type Transition = { type: 'cut'; sound?: SoundCue } | { type: TransitionKind; duration: number; direction?: TransitionDirection; color?: string; sound?: SoundCue };

/** A kept part of the recording, as a source-time range. */
export interface Clip {
    kind: 'recording';
    id: string;
    start: number;
    end: number;
    speed: number;
    transition?: Transition;
}

/** A generated motion scene: a composition from the scene registry (src/studio/scenes) and its props. */
export interface SceneClip {
    kind: 'scene';
    id: string;
    /** Composition id in the scene registry. */
    scene: string;
    props: Record<string, unknown>;
    /** Seconds on the timeline. */
    duration: number;
    transition?: Transition;
    /** Played at the scene's beat (its definition's `beat`). */
    sound?: SoundCue;
    /** The props the AI last wrote; a prop that differs from it was changed by hand, and AI edits keep it. */
    ai?: Record<string, unknown>;
}

export type TimelineItem = Clip | SceneClip;

/**
 * A scene drawn over the timeline instead of replacing it. Times are output seconds; overlays
 * don't change the timeline's length and may overlap each other.
 */
export interface OverlayClip {
    id: string;
    /** Composition id in the scene registry (one that can be an overlay). */
    scene: string;
    props: Record<string, unknown>;
    start: number;
    duration: number;
    /** Played at the scene's beat (its definition's `beat`). */
    sound?: SoundCue;
    /** The props the AI last wrote; a prop that differs from it was changed by hand, and AI edits keep it. */
    ai?: Record<string, unknown>;
}

/** An overlay on screen at some output time. */
export interface OverlayPosition {
    item: OverlayClip;
    /** Seconds into the overlay. */
    time: number;
}

/** Overlays on screen at an output time, bottom to top. */
export const overlaysAt = (overlays: OverlayClip[], outputTime: number): OverlayPosition[] =>
    overlays.filter((o) => outputTime >= o.start && outputTime < o.start + o.duration).map((item) => ({ item, time: outputTime - item.start }));

export interface NormalizedRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type Aspect = 'auto' | '16:9' | '9:16' | '1:1' | '4:5';

export type Background =
    | { type: 'gradient'; from: string; to: string; angle: number }
    | { type: 'color'; color: string }
    /** An image copied into the project folder, cover-fitted and optionally blurred (0–1). */
    | { type: 'image'; file: string; name: string; blur: number };

export type CameraCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface CameraLayout {
    visible: boolean;
    corner: CameraCorner;
    /** Diameter as a fraction of the shorter side of the frame. */
    size: number;
    shape: 'circle' | 'rounded';
    /** Get smaller while the screen is zoomed in, so it covers less of what matters. */
    shrinkOnZoom: boolean;
}

export type CursorShape = 'arrow' | 'hand' | 'dot';
export type ClickStyle = 'ripple' | 'pulse' | 'none';

export interface CursorStyle {
    visible: boolean;
    shape: CursorShape;
    /** Multiplier on the natural cursor size. */
    size: number;
    /** How the recorded movement is smoothed. */
    animation: CursorAnimation;
    /** Fade the cursor out when it hasn't moved for `idleDelay` seconds. */
    hideIdle: boolean;
    idleDelay: number;
    /** Colour of the click ripple or pulse. */
    clickColor: string;
    /** What appears where the mouse was clicked. */
    clickStyle: ClickStyle;
    /** The cursor dips briefly on each click, like a button being pressed. */
    pressEffect: boolean;
    clickSound: boolean;
    /** A soft tick, or a two-part mechanical mouse click (both synthesized). */
    clickSoundType: ClickSoundType;
    /** 0 to 1. */
    clickVolume: number;
}

export type ClickSoundType = 'tick' | 'mouse';

export const ASPECTS: { value: Aspect; label: string }[] = [
    { value: 'auto', label: 'Original' },
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '1:1', label: '1:1' },
    { value: '4:5', label: '4:5' },
];

export const GRADIENTS: Background[] = [
    { type: 'gradient', from: '#7c5cff', to: '#ff6ec4', angle: 135 },
    { type: 'gradient', from: '#0f2027', to: '#2c5364', angle: 160 },
    { type: 'gradient', from: '#f7971e', to: '#ffd200', angle: 135 },
    { type: 'gradient', from: '#11998e', to: '#38ef7d', angle: 135 },
    { type: 'gradient', from: '#fc466b', to: '#3f5efb', angle: 120 },
    { type: 'gradient', from: '#232526', to: '#414345', angle: 180 },
    { type: 'gradient', from: '#e0eafc', to: '#cfdef3', angle: 135 },
    { type: 'gradient', from: '#1a2a6c', to: '#fdbb2d', angle: 135 },
    { type: 'gradient', from: '#d97757', to: '#f2c6a0', angle: 135 },
    { type: 'gradient', from: '#141e30', to: '#243b55', angle: 150 },
    { type: 'gradient', from: '#ff9a9e', to: '#fecfef', angle: 135 },
    { type: 'gradient', from: '#a1c4fd', to: '#c2e9fb', angle: 135 },
];

export const SOLID_COLORS = ['#f5f1ea', '#ffffff', '#1f1e1d', '#000000', '#d97757', '#2f5d50'];

/** Click ripple colours offered in the cursor settings; the first is the default. */
export const CLICK_COLORS = ['#d97757', '#ffffff', '#1f1f1f', '#7c5cff', '#2f9bff', '#30c46c'];

export const MIN_CLIP = 0.2;
export const MIN_ZOOM = 0.5;
export const DEFAULT_ZOOM_SCALE = 1.8;

export const newId = () => Math.random().toString(36).slice(2, 10);

export function defaultEdit(project: Project): Edit {
    return {
        version: 2,
        // A Studio video has no recording; it's created with starter scenes (see studioStarter).
        items: project.kind === 'studio' ? [] : [{ kind: 'recording', id: newId(), start: 0, end: sourceDuration(project), speed: 1 }],
        background: GRADIENTS[0],
        padding: 0.06,
        radius: 0.012,
        shadow: 0.5,
        crop: { x: 0, y: 0, width: 1, height: 1 },
        aspect: project.kind === 'studio' ? '16:9' : 'auto',
        camera: { visible: true, corner: 'bottom-left', size: 0.24, shape: 'circle', shrinkOnZoom: true },
        cursor: {
            visible: true,
            shape: 'arrow',
            size: 1,
            animation: 'mellow',
            hideIdle: false,
            idleDelay: 2,
            clickStyle: 'ripple',
            clickColor: CLICK_COLORS[0],
            pressEffect: true,
            clickSound: false,
            clickSoundType: 'tick',
            clickVolume: 0.6,
        },
        motion: { screen: 'smooth', blur: 0.5 },
        zooms: [],
        zoomScale: DEFAULT_ZOOM_SCALE,
        texts: [],
        overlays: [],
        hides: [],
        captions: { visible: true, language: 'auto', style: DEFAULT_CAPTION_STYLE, items: [] },
        audio: { system: { volume: 1, muted: false }, microphone: { volume: 1, muted: false }, fadeIn: 0, fadeOut: 0, music: null, voiceovers: [], effects: [], ducking: DEFAULT_DUCKING },
    };
}

/** Fills in anything missing from an older or partial edit.json. */
export function normalizeEdit(project: Project, raw: unknown): Edit {
    const base = defaultEdit(project);
    if (!raw || typeof raw !== 'object') return base;
    const edit = { ...base, ...(raw as Partial<Edit>) };
    edit.camera = { ...base.camera, ...edit.camera };
    edit.cursor = { ...base.cursor, ...edit.cursor };
    // Edits saved before click styles existed had an on/off `clickEffect`.
    const legacy = (raw as { cursor?: { clickEffect?: boolean; clickStyle?: ClickStyle } }).cursor;
    if (legacy && legacy.clickStyle === undefined && legacy.clickEffect === false) edit.cursor.clickStyle = 'none';
    delete (edit.cursor as Partial<{ clickEffect: boolean }>).clickEffect;
    // Edits saved before cursor animations had a 0–1 `smoothing`.
    const smoothing = (raw as { cursor?: { smoothing?: number; animation?: CursorAnimation } }).cursor;
    if (smoothing && smoothing.animation === undefined && smoothing.smoothing === 0) edit.cursor.animation = 'off';
    delete (edit.cursor as Partial<{ smoothing: number }>).smoothing;
    edit.motion = { ...base.motion, ...edit.motion };
    edit.zoomScale = edit.zoomScale || DEFAULT_ZOOM_SCALE;
    edit.texts = Array.isArray(edit.texts)
        ? edit.texts.filter((t) => t.end - t.start >= MIN_ZOOM / 2).map((t) => ({ ...t, font: t.font ?? 'system', animation: t.animation ?? 'rise' }))
        : [];
    edit.overlays = (Array.isArray(edit.overlays) ? edit.overlays : []).flatMap((raw): OverlayClip[] => {
        const o = raw as Partial<OverlayClip> | null;
        if (!o || typeof o.scene !== 'string' || !(Number(o.duration) >= MIN_CLIP)) return [];
        const props = o.props && typeof o.props === 'object' ? o.props : {};
        const sound = normalizeCue(o.sound);
        const ai = o.ai && typeof o.ai === 'object' ? { ai: o.ai } : {};
        return [{ id: o.id ?? newId(), scene: o.scene, props, start: Math.max(0, Number(o.start) || 0), duration: Number(o.duration), ...(sound ? { sound } : {}), ...ai }];
    });
    edit.hides = Array.isArray(edit.hides) ? edit.hides.filter((h) => h.end - h.start >= MIN_ZOOM / 2) : [];
    edit.captions = {
        ...base.captions,
        ...edit.captions,
        style: { ...base.captions.style, ...edit.captions?.style },
        items: Array.isArray(edit.captions?.items) ? edit.captions.items : [],
    };
    edit.audio = {
        ...base.audio,
        ...edit.audio,
        system: { ...base.audio.system, ...edit.audio?.system },
        microphone: { ...base.audio.microphone, ...edit.audio?.microphone },
        music: edit.audio?.music ?? null,
        voiceovers: normalizeAudioClips(edit.audio?.voiceovers),
        effects: normalizeAudioClips(edit.audio?.effects),
        ducking: { ...DEFAULT_DUCKING, ...edit.audio?.ducking },
    };
    edit.crop = { ...base.crop, ...edit.crop };
    edit.zooms = Array.isArray(edit.zooms) ? edit.zooms.filter((z) => z.end - z.start >= MIN_ZOOM / 2) : [];
    // Version 1 had only recording clips, in `clips`.
    const duration = sourceDuration(project);
    const rawItems = (raw as { items?: unknown; clips?: unknown }).items ?? (raw as { clips?: unknown }).clips;
    edit.items = (Array.isArray(rawItems) ? rawItems : []).flatMap((item) => normalizeItem(item, duration));
    if (!edit.items.some(isRecording)) edit.items = [...base.items, ...edit.items];
    delete (edit as Partial<{ clips: unknown }>).clips;
    edit.version = 2;
    return edit;
}

const isAudioFile = (file: unknown): file is string => typeof file === 'string' && file.startsWith('audio/') && !file.includes('..');

function normalizeCue(raw: unknown): SoundCue | undefined {
    const cue = raw as Partial<SoundCue> | null | undefined;
    if (!cue || !isAudioFile(cue.file)) return undefined;
    return { file: cue.file, name: typeof cue.name === 'string' ? cue.name : cue.file, volume: Math.max(0, Math.min(2, Number(cue.volume) || 1)) };
}

function normalizeAudioClips(raw: unknown): AudioClip[] {
    return (Array.isArray(raw) ? raw : []).flatMap((raw): AudioClip[] => {
        const c = raw as Partial<AudioClip> | null;
        if (!c || !isAudioFile(c.file) || !(Number(c.duration) > 0.05)) return [];
        const offset = Math.max(0, Number(c.offset) || 0);
        const length = Math.max(offset + Number(c.duration), Number(c.length) || 0);
        return [
            {
                id: c.id ?? newId(),
                file: c.file,
                name: typeof c.name === 'string' ? c.name : c.file,
                start: Math.max(0, Number(c.start) || 0),
                offset,
                duration: Number(c.duration),
                length,
                volume: Math.max(0, Math.min(2, c.volume ?? 1)),
                fadeIn: Math.max(0, Number(c.fadeIn) || 0),
                fadeOut: Math.max(0, Number(c.fadeOut) || 0),
            },
        ];
    });
}

/** Every project audio file the mix plays besides the recording and music (clips and cues). */
export function audioFiles(edit: Pick<Edit, 'items' | 'overlays' | 'audio'>): string[] {
    const files = new Set<string>();
    for (const clip of [...edit.audio.voiceovers, ...edit.audio.effects]) files.add(clip.file);
    for (const item of edit.items) {
        if (item.transition?.sound) files.add(item.transition.sound.file);
        if (item.kind === 'scene' && item.sound) files.add(item.sound.file);
    }
    for (const overlay of edit.overlays) if (overlay.sound) files.add(overlay.sound.file);
    return [...files].sort();
}

function normalizeItem(raw: unknown, duration: number): TimelineItem[] {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Partial<Omit<Clip, 'kind'>> & Partial<Omit<SceneClip, 'kind'>> & { kind?: string };
    const saved = item.transition as Partial<{ type: string; duration: number; direction: string; color: unknown; sound: unknown }> | undefined;
    const cue = normalizeCue(saved?.sound);
    const sound = cue ? { sound: cue } : {};
    const transition: Transition | undefined =
        saved?.type === 'cut'
            ? { type: 'cut', ...sound }
            : saved && TRANSITION_KINDS.includes(saved.type as TransitionKind) && Number(saved.duration) > 0
            ? {
                  ...sound,
                  type: saved.type as TransitionKind,
                  duration: Number(saved.duration),
                  ...(saved.direction && ['left', 'right', 'up', 'down'].includes(saved.direction) ? { direction: saved.direction as TransitionDirection } : {}),
                  ...(typeof saved.color === 'string' ? { color: saved.color } : {}),
              }
            : undefined;
    if (item.kind === 'scene') {
        if (typeof item.scene !== 'string' || !(Number(item.duration) >= MIN_CLIP)) return [];
        const props = item.props && typeof item.props === 'object' ? item.props : {};
        const beatSound = normalizeCue(item.sound);
        const ai = item.ai && typeof item.ai === 'object' ? { ai: item.ai } : {};
        return [{ kind: 'scene', id: item.id ?? newId(), scene: item.scene, props, duration: Number(item.duration), transition, ...(beatSound ? { sound: beatSound } : {}), ...ai }];
    }
    const start = Math.max(0, Number(item.start) || 0);
    const end = Math.min(duration, Number(item.end) || 0);
    if (end - start < MIN_CLIP / 2) return [];
    return [{ kind: 'recording', id: item.id ?? newId(), start, end, speed: item.speed || 1, transition }];
}

export function sourceDuration(project: Project) {
    return project.duration;
}

// ---- Timeline math: output time (what the viewer sees) ↔ items and source time (the recording) ----

export const isRecording = (item: TimelineItem): item is Clip => item.kind === 'recording';

export const clipLength = (clip: Clip) => (clip.end - clip.start) / clip.speed;

export const itemLength = (item: TimelineItem) => (item.kind === 'scene' ? item.duration : clipLength(item));

export const DEFAULT_CROSSFADE = 0.5;
export const MAX_CROSSFADE = 2;

/**
 * Transitions (other than cuts) need a scene on at least one side: the preview has one recording
 * video, so two parts of the recording can't be on screen at once.
 */
export const canCrossfade = (items: TimelineItem[], index: number) => index > 0 && index < items.length && !(isRecording(items[index]) && isRecording(items[index - 1]));

/**
 * Seconds item `index` overlaps the one before it (its crossfade). At most half of either item,
 * so two transitions never meet.
 */
export function overlapAt(items: TimelineItem[], index: number) {
    const item = items[index];
    const transition = item?.transition;
    if (!transition || transition.type === 'cut' || !canCrossfade(items, index)) return 0;
    return Math.max(0, Math.min(transition.duration, itemLength(item) / 2, itemLength(items[index - 1]) / 2));
}

/** Output time at which each item starts (crossfades pull an item back over the previous one). */
export function itemStarts(items: TimelineItem[]) {
    const starts: number[] = [];
    let end = 0;
    items.forEach((item, index) => {
        const start = Math.max(0, end - overlapAt(items, index));
        starts.push(start);
        end = start + itemLength(item);
    });
    return starts;
}

export function totalDuration(items: TimelineItem[]) {
    const starts = itemStarts(items);
    return items.reduce((max, item, index) => Math.max(max, starts[index] + itemLength(item)), 0);
}

/** A scene on screen at some output time. */
export interface ScenePosition {
    index: number;
    item: SceneClip;
    /** Seconds into the scene. */
    time: number;
    /** 0 to 1; below 1 during a crossfade. */
    opacity: number;
    /** How it's drawn during a transition (identity otherwise). */
    fx: LayerFx;
}

/**
 * How one layer (the recording or a scene) is drawn during a transition. Offsets are fractions
 * of the frame's width and height, `clip` insets are fractions of the frame per edge, `blur` is
 * a fraction of the frame's short side. The same values drive the preview and the export.
 */
export interface LayerFx {
    opacity: number;
    x: number;
    y: number;
    scale: number;
    clip: { top: number; right: number; bottom: number; left: number } | null;
    blur: number;
}

export const IDENTITY_FX: LayerFx = { opacity: 1, x: 0, y: 0, scale: 1, clip: null, blur: 0 };
export const isIdentityFx = (fx: LayerFx) => fx.opacity >= 1 && fx.x === 0 && fx.y === 0 && fx.scale === 1 && !fx.clip && fx.blur <= 0;

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const DIRECTION_VECTOR: Record<TransitionDirection, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/**
 * The outgoing and incoming layers' looks at progress `mix` (0 → 1) through a transition.
 * `incomingOnTop` says which is drawn above: the recording is always the bottom layer, so when
 * it's the incoming item, effects that need the top layer apply to the outgoing scene instead.
 * Also returns a colour wash drawn over both (dip to colour).
 */
export function transitionFx(transition: Exclude<Transition, { type: 'cut' }>, mix: number, incomingOnTop: boolean): { outgoing: LayerFx; incoming: LayerFx; dip: { color: string; opacity: number } | null } {
    const p = clamp01(mix);
    const e = easeInOutCubic(p);
    const [dx, dy] = DIRECTION_VECTOR[transition.direction ?? 'left'];
    const fade = (opacity: number): LayerFx => ({ ...IDENTITY_FX, opacity });
    switch (transition.type) {
        case 'slide': {
            // The top layer moves: in from the far edge when it's incoming, out the near edge when it's outgoing.
            if (incomingOnTop) return { outgoing: IDENTITY_FX, incoming: { ...IDENTITY_FX, x: -dx * (1 - e), y: -dy * (1 - e) }, dip: null };
            return { outgoing: { ...IDENTITY_FX, x: dx * e, y: dy * e }, incoming: IDENTITY_FX, dip: null };
        }
        case 'push':
            return { outgoing: { ...IDENTITY_FX, x: dx * e, y: dy * e }, incoming: { ...IDENTITY_FX, x: -dx * (1 - e), y: -dy * (1 - e) }, dip: null };
        case 'wipe': {
            // A hard edge travels in the direction of motion; the top layer is cut along it. Moving
            // left, the incoming item is hidden left of the edge, the outgoing one right of it.
            const inset = (share: number, fromTrailing: boolean) => {
                const clip = { top: 0, right: 0, bottom: 0, left: 0 };
                const side = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'top' : 'bottom';
                const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const;
                clip[fromTrailing ? opposite[side] : side] = share;
                return clip;
            };
            if (incomingOnTop) return { outgoing: IDENTITY_FX, incoming: { ...IDENTITY_FX, clip: inset(1 - e, false) }, dip: null };
            return { outgoing: { ...IDENTITY_FX, clip: inset(e, true) }, incoming: IDENTITY_FX, dip: null };
        }
        case 'zoom': {
            // Through the outgoing item: it grows and fades as the incoming one settles from slightly small.
            const outgoing: LayerFx = { ...IDENTITY_FX, scale: 1 + 0.5 * e, opacity: incomingOnTop ? 1 : 1 - e };
            const incoming: LayerFx = { ...IDENTITY_FX, scale: 0.85 + 0.15 * e, opacity: incomingOnTop ? e : 1 };
            return { outgoing, incoming, dip: null };
        }
        case 'blur': {
            const blur = Math.sin(Math.PI * p) * 0.03;
            // Blur softens the frame's edges too; growing a little keeps them outside the frame.
            const scale = 1 + blur * 4;
            return { outgoing: { ...IDENTITY_FX, blur, scale, opacity: incomingOnTop ? 1 : 1 - p }, incoming: { ...IDENTITY_FX, blur, scale, opacity: incomingOnTop ? p : 1 }, dip: null };
        }
        case 'dip': {
            // Out to the colour over the first half, in from it over the second.
            const wash = 1 - Math.abs(2 * p - 1);
            return { outgoing: fade(p < 0.5 ? 1 : 0), incoming: fade(p < 0.5 ? 0 : 1), dip: { color: transition.color ?? '#000000', opacity: easeInOutCubic(wash) } };
        }
        default:
            return { outgoing: fade(incomingOnTop ? 1 : 1 - p), incoming: fade(incomingOnTop ? p : 1), dip: null };
    }
}

export interface Position {
    /** The item under the playhead; during a crossfade, the incoming one. */
    index: number;
    item: TimelineItem;
    /**
     * The recording clip whose frame is shown. While only scenes are on screen, the clip the
     * video waits in: the next one (so it can continue without seeking), else the previous one.
     */
    clipIndex: number;
    clip: Clip;
    /** Source time of the recording frame. */
    source: number;
    /** Whether the recording is on screen (scenes may be drawn over it). */
    recording: boolean;
    /** Scenes on screen, bottom to top. */
    scenes: ScenePosition[];
    /** How the recording is drawn (identity outside transitions). */
    recordingFx: LayerFx;
    /** A colour wash over the items (dip to colour), drawn under overlays. */
    dip: { color: string; opacity: number } | null;
}

const NO_CLIP: Clip = { kind: 'recording', id: '', start: 0, end: 0, speed: 1 };

export function positionAt(items: TimelineItem[], outputTime: number): Position {
    const starts = itemStarts(items);
    const t = Math.max(0, outputTime);
    let index = 0;
    for (let i = items.length - 1; i > 0; i--) {
        if (t >= starts[i]) {
            index = i;
            break;
        }
    }
    const item = items[index];
    const overlap = overlapAt(items, index);
    const fading = overlap > 0 && t < starts[index] + overlap;
    const mix = fading ? (t - starts[index]) / overlap : 1;
    const previous = fading ? index - 1 : -1;
    // Layers bottom to top: the recording, the outgoing scene, the incoming scene. A scene fades
    // over whatever is under it, so an outgoing scene fades out over an incoming recording.
    const scenes: ScenePosition[] = [];
    const before = items[previous];
    const looks = fading && item.transition && item.transition.type !== 'cut' ? transitionFx(item.transition, mix, item.kind === 'scene') : null;
    if (before?.kind === 'scene') {
        const fx = looks?.outgoing ?? IDENTITY_FX;
        scenes.push({ index: previous, item: before, time: t - starts[previous], opacity: fx.opacity, fx });
    }
    if (item.kind === 'scene') {
        const fx = looks?.incoming ?? IDENTITY_FX;
        scenes.push({ index, item, time: t - starts[index], opacity: fx.opacity, fx });
    }
    const dip = looks?.dip ?? null;

    const shown = isRecording(item) ? index : before && isRecording(before) ? previous : -1;
    if (shown >= 0) {
        const clip = items[shown] as Clip;
        const source = Math.min(clip.end, clip.start + Math.max(0, t - starts[shown]) * clip.speed);
        const recordingFx = looks ? (shown === index ? looks.incoming : looks.outgoing) : IDENTITY_FX;
        return { index, item, clipIndex: shown, clip, source, recording: true, scenes, recordingFx, dip };
    }
    let waiting = items.findIndex((it, i) => i > index && isRecording(it));
    let atEnd = false;
    if (waiting < 0) {
        atEnd = true;
        for (let i = index - 1; i >= 0 && waiting < 0; i--) if (isRecording(items[i])) waiting = i;
    }
    // A Studio video has no recording clip at all: point at an empty one.
    const clip = (items[waiting] as Clip | undefined) ?? NO_CLIP;
    return { index, item, clipIndex: waiting, clip, source: atEnd ? clip.end : clip.start, recording: false, scenes, recordingFx: IDENTITY_FX, dip };
}

/** The items with `holdEnd` set on scenes a transition takes off screen, so they don't also fade out. */
export function withHeldEnds(items: TimelineItem[]): TimelineItem[] {
    return items.map((item, i) => {
        const next = items[i + 1]?.transition;
        return item.kind === 'scene' && next && next.type !== 'cut' ? { ...item, props: { ...item.props, holdEnd: true } } : item;
    });
}

/** Output time of a source time inside the recording clip at `index`. */
export function outputTimeOf(items: TimelineItem[], index: number, source: number) {
    const clip = items[index] as Clip;
    return itemStarts(items)[index] + (source - clip.start) / clip.speed;
}

export function splitAt(items: TimelineItem[], outputTime: number): { items: TimelineItem[]; selected: string } | null {
    const { index, item, source } = positionAt(items, outputTime);
    if (!isRecording(item) || source - item.start < MIN_CLIP || item.end - source < MIN_CLIP) return null;
    const left = { ...item, end: source };
    const right: Clip = { ...item, id: newId(), start: source, transition: undefined };
    return { items: [...items.slice(0, index), left, right, ...items.slice(index + 1)], selected: right.id };
}

/**
 * Cuts out everything between two output times, even across several items. Scenes are removed
 * only when wholly inside the range. Returns null if no recording would be left.
 */
export function removeRange(items: TimelineItem[], from: number, to: number): TimelineItem[] | null {
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    const starts = itemStarts(items);
    const result: TimelineItem[] = [];
    items.forEach((item, index) => {
        const itemFrom = starts[index];
        const itemTo = itemFrom + itemLength(item);
        if (!isRecording(item)) {
            if (itemFrom < a || itemTo > b) result.push(item);
            return;
        }
        const cutFrom = Math.max(a, itemFrom);
        const cutTo = Math.min(b, itemTo);
        if (cutTo <= cutFrom) {
            result.push(item);
            return;
        }
        const sourceFrom = item.start + (cutFrom - itemFrom) * item.speed;
        const sourceTo = item.start + (cutTo - itemFrom) * item.speed;
        const keepLeft = sourceFrom - item.start >= MIN_CLIP / 2;
        if (keepLeft) result.push({ ...item, end: sourceFrom });
        if (item.end - sourceTo >= MIN_CLIP / 2) result.push({ ...item, id: keepLeft ? newId() : item.id, start: sourceTo, transition: keepLeft ? undefined : item.transition });
    });
    // A Studio video has no recording to keep, only at least one scene.
    return result.some(isRecording) || (!items.some(isRecording) && result.length > 0) ? result : null;
}

/** Removes an item, unless it's the last recording clip or the only item. */
export function removeItem(items: TimelineItem[], id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || items.length <= 1 || (isRecording(item) && items.filter(isRecording).length <= 1)) return items;
    return items.filter((i) => i.id !== id);
}

/**
 * Limits for dragging a recording clip's edge: it can't pass the neighbouring recording clips
 * (in source time) or get shorter than MIN_CLIP.
 */
export function edgeLimits(items: TimelineItem[], index: number, edge: 'start' | 'end', duration: number) {
    const clip = items[index] as Clip;
    if (edge === 'start') {
        const before = items.slice(0, index).filter(isRecording).pop();
        return { min: before ? before.end : 0, max: clip.end - MIN_CLIP };
    }
    const after = items.slice(index + 1).find(isRecording);
    return { min: clip.start + MIN_CLIP, max: after ? after.start : duration };
}

/**
 * Puts a scene on the timeline at an output time: splits the recording clip there, or goes
 * before/after the item under the playhead when near its edge. It and the item after it
 * crossfade.
 */
export function insertScene(items: TimelineItem[], outputTime: number, scene: SceneClip): TimelineItem[] {
    const crossfade: Transition = { type: 'crossfade', duration: DEFAULT_CROSSFADE };
    const withScene = (list: TimelineItem[], at: number) => {
        const next = list[at];
        return [...list.slice(0, at), { ...scene, transition: at > 0 ? crossfade : undefined }, ...(next ? [{ ...next, transition: crossfade }] : []), ...list.slice(at + 1)];
    };
    const split = splitAt(items, outputTime);
    if (split) return withScene(split.items, split.items.findIndex((i) => i.id === split.selected));
    const { index } = positionAt(items, outputTime);
    const start = itemStarts(items)[index];
    return withScene(items, outputTime - start < itemLength(items[index]) / 2 ? index : index + 1);
}

/** Moves an item one place earlier (-1) or later (1). */
export function moveItem(items: TimelineItem[], id: string, step: -1 | 1) {
    const index = items.findIndex((i) => i.id === id);
    const target = index + step;
    if (index < 0 || target < 0 || target >= items.length) return items;
    const result = [...items];
    [result[index], result[target]] = [result[target], result[index]];
    return result;
}

export function aspectRatio(edit: Edit, project: Project) {
    if (edit.aspect === 'auto') {
        const { width, height } = project.tracks.screen;
        return (width * edit.crop.width) / (height * edit.crop.height);
    }
    const [w, h] = edit.aspect.split(':').map(Number);
    return w / h;
}

// ---- Zoom ----

/** Auto-zoom starts this long before the first click, so the camera has arrived by the click. */
export const ZOOM_LEAD_IN = 0.5;
/** …and stays this long after the last click, so the result of the click can be seen. */
export const ZOOM_HOLD = 1.8;
/** Clicks closer together than this (and close on screen) share one zoom. */
const CLICK_GROUP_GAP = 2.5;
/** Zooms closer than this are joined: the camera pans from one to the next instead of zooming out. */
const ZOOM_MERGE_GAP = 1;
/** Clicks of one zoom must fit in this share of the zoomed-in view. */
const GROUP_FIT = 0.8;

/**
 * Zoom regions around groups of clicks, like a person editing the video would add them. Clicks
 * are grouped when they are close in time and close enough on screen to be seen in one zoomed
 * view; a click elsewhere starts a new zoom.
 */
export function autoZooms(cursor: CursorData, duration: number, scale = DEFAULT_ZOOM_SCALE): Zoom[] {
    const view = (1 / scale) * GROUP_FIT;
    const clicks = cursor.clicks
        .filter(([, x, y, button]) => button !== 'right' && x >= -0.01 && x <= 1.01 && y >= -0.01 && y <= 1.01)
        .map(([t, x, y]) => ({ t, x, y }))
        .sort((a, b) => a.t - b.t);
    const groups: { first: number; last: number; minX: number; maxX: number; minY: number; maxY: number }[] = [];
    for (const { t, x, y } of clicks) {
        const g = groups[groups.length - 1];
        const fits = g && Math.max(g.maxX, x) - Math.min(g.minX, x) <= view && Math.max(g.maxY, y) - Math.min(g.minY, y) <= view;
        if (g && t - g.last < CLICK_GROUP_GAP && fits) {
            g.last = t;
            g.minX = Math.min(g.minX, x);
            g.maxX = Math.max(g.maxX, x);
            g.minY = Math.min(g.minY, y);
            g.maxY = Math.max(g.maxY, y);
        } else {
            groups.push({ first: t, last: t, minX: x, maxX: x, minY: y, maxY: y });
        }
    }
    const zooms: Zoom[] = [];
    for (const g of groups) {
        const start = Math.max(0, g.first - ZOOM_LEAD_IN);
        const end = Math.min(duration, g.last + ZOOM_HOLD);
        const previous = zooms[zooms.length - 1];
        // Rather than zooming out for a moment, stay in and pan over to the next place.
        if (previous && start - previous.end < ZOOM_MERGE_GAP) {
            previous.end = end;
            continue;
        }
        const x = Math.min(1, Math.max(0, (g.minX + g.maxX) / 2));
        const y = Math.min(1, Math.max(0, (g.minY + g.maxY) / 2));
        if (end - start >= MIN_ZOOM) zooms.push({ id: newId(), start, end, scale, mode: 'follow', x, y, auto: true });
    }
    return zooms;
}

const smoothstep = (x: number) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
};

export interface TimedItem {
    id: string;
    start: number;
    end: number;
}

/** Pieces of each timed item (zoom, text) as they appear on the edited timeline; an item can span a cut. */
export function timedSegments<T extends TimedItem>(timeline: TimelineItem[], items: T[]) {
    const starts = itemStarts(timeline);
    const segments: { item: T; clipIndex: number; from: number; to: number; startsItem: boolean; endsItem: boolean }[] = [];
    for (const zoom of items) {
        timeline.forEach((clip, clipIndex) => {
            if (!isRecording(clip)) return;
            const a = Math.max(zoom.start, clip.start);
            const b = Math.min(zoom.end, clip.end);
            if (b <= a) return;
            segments.push({
                item: zoom,
                clipIndex,
                from: starts[clipIndex] + (a - clip.start) / clip.speed,
                to: starts[clipIndex] + (b - clip.start) / clip.speed,
                startsItem: a === zoom.start,
                endsItem: b === zoom.end,
            });
        });
    }
    return segments;
}

// ---- Text ----

export const TEXT_FADE = 0.3;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
/** Overshoots slightly before settling, for a springy "pop". */
const easeOutBack = (x: number) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;

/** Where a text is in its animation at time `t` (source seconds). */
export interface TextFrame {
    /** Overall opacity. */
    alpha: number;
    /** Offset as a fraction of the font size (x) and of the font size (y). */
    dx: number;
    dy: number;
    scale: number;
    /** Blur radius as a fraction of the font size. */
    blur: number;
    /** 0 → 1: share of characters (typewriter) or words (words) revealed. */
    reveal: number;
    /** Typewriter caret is shown while typing. */
    caret: boolean;
}

/** Time to type or reveal a text: proportional to its length, but at most 60% of its duration. */
function revealDuration(text: TextOverlay) {
    const units = text.animation === 'words' ? text.text.split(/\s+/).filter(Boolean).length : text.text.length;
    const perUnit = text.animation === 'words' ? 0.18 : 0.045;
    return Math.min(units * perUnit, (text.end - text.start) * 0.6, 3);
}

export function textFrame(text: TextOverlay, t: number): TextFrame {
    const frame: TextFrame = { alpha: 0, dx: 0, dy: 0, scale: 1, blur: 0, reveal: 1, caret: false };
    if (t < text.start || t > text.end) return frame;
    const length = text.end - text.start;
    const fade = Math.min(TEXT_FADE, length / 2);
    const enter = clamp01((t - text.start) / fade);
    const exit = clamp01((text.end - t) / fade);
    const both = Math.min(smoothstep(enter), smoothstep(exit));
    frame.alpha = both;
    switch (text.animation) {
        case 'none':
            frame.alpha = 1;
            break;
        case 'fade':
            break;
        case 'rise':
            frame.dy = (1 - both) * 0.25;
            break;
        case 'pop': {
            const pop = clamp01((t - text.start) / Math.min(0.45, length / 2));
            frame.alpha = Math.min(clamp01(pop * 2), smoothstep(exit));
            frame.scale = enter < 1 ? 0.6 + 0.4 * easeOutBack(pop) : 1 - (1 - exit) * 0.08;
            break;
        }
        case 'slide': {
            const slide = clamp01((t - text.start) / Math.min(0.5, length / 2));
            frame.dx = -(1 - easeOutCubic(slide)) * 1.2;
            frame.alpha = Math.min(clamp01(slide * 1.6), smoothstep(exit));
            break;
        }
        case 'blur':
            frame.blur = (1 - both) * 0.35;
            break;
        case 'typewriter':
        case 'words': {
            const duration = revealDuration(text);
            frame.reveal = duration > 0 ? clamp01((t - text.start) / duration) : 1;
            frame.alpha = smoothstep(exit);
            frame.caret = text.animation === 'typewriter' && frame.reveal < 1;
            break;
        }
    }
    return frame;
}

/** 0 → 1 → 0 visibility of a text over its lifetime (used for hit-testing and the timeline). */
export function textAmount(text: TextOverlay, t: number) {
    return textFrame(text, t).alpha;
}

// ---- Snapping ----

/**
 * Snaps `value` to the nearest target within `threshold` (all in output seconds).
 * Returns the value and the target it snapped to, if any.
 */
export function snapTo(value: number, targets: number[], threshold: number): { value: number; snapped: number | null } {
    let best: number | null = null;
    for (const target of targets) {
        if (Math.abs(target - value) <= threshold && (best === null || Math.abs(target - value) < Math.abs(best - value))) best = target;
    }
    return best === null ? { value, snapped: null } : { value: best, snapped: best };
}

// ---- Hide regions ----

export const hideActive = (hide: HideRegion, t: number) => t >= hide.start && t <= hide.end;

// ---- Captions ----

/** Longest caption line, in characters, before starting a new caption. */
const CAPTION_CHARS = 42;
/** A pause longer than this starts a new caption. */
const CAPTION_GAP = 0.7;
const CAPTION_MAX_SECONDS = 5;
/** Hesitations dropped from captions. */
export const FILLER = /^(u+[hm]+|e+r+m*|hm+|mm+)[,.!?]*$/i;

/**
 * Groups transcribed words into captions the way subtitles are usually cut: at most ~two short
 * lines, a new caption after a pause or the end of a sentence, never longer than a few seconds.
 */
export function groupCaptions(words: CaptionWord[], removeFillers = true): Caption[] {
    const captions: Caption[] = [];
    let current: CaptionWord[] = [];
    const flush = () => {
        if (current.length === 0) return;
        captions.push({
            id: newId(),
            start: current[0].start,
            end: current[current.length - 1].end,
            text: current.map((w) => w.text).join(' '),
            words: current,
        });
        current = [];
    };
    for (const word of words) {
        const text = word.text.trim();
        if (!text || (removeFillers && FILLER.test(text))) continue;
        const last = current[current.length - 1];
        if (last) {
            const length = current.reduce((n, w) => n + w.text.length + 1, 0) + text.length;
            const sentenceEnded = /[.!?]$/.test(last.text) && current.length >= 3;
            if (word.start - last.end > CAPTION_GAP || length > CAPTION_CHARS || sentenceEnded || word.end - current[0].start > CAPTION_MAX_SECONDS) flush();
        }
        current.push({ ...word, text });
    }
    flush();
    return captions;
}

/**
 * After the text of a caption is edited, spreads its new words over the caption's time in
 * proportion to their length, so the word highlight still roughly follows the speech.
 */
export function retimeCaption(caption: Caption, text: string): Caption {
    const tokens = text.split(/\s+/).filter(Boolean);
    const total = tokens.reduce((n, t) => n + t.length, 0) || 1;
    const duration = caption.end - caption.start;
    let t = caption.start;
    const words = tokens.map((token) => {
        const length = (token.length / total) * duration;
        const word = { start: t, end: t + length, text: token };
        t += length;
        return word;
    });
    return { ...caption, text, words };
}

/** The caption on screen at source time t, if any. */
export const captionAt = (captions: Caption[], t: number) => captions.find((c) => t >= c.start && t < c.end) ?? null;

/** What placing captions on the output timeline needs. */
export type CaptionTimeline = { items: TimelineItem[]; captions: Pick<Captions, 'items'>; audio: Pick<AudioMix, 'voiceovers'> };

/** Captions of the recording's own sound (source times), leaving out voiceover captions. */
export const recordingCaptions = (captions: Caption[]) => captions.filter((c) => !c.voice);

/**
 * The caption on screen at output time t, and the time to highlight its words at (in the
 * caption's own timebase). Voiceover captions win over the recording's; the recording's show
 * only while the recording is on screen (not under a full-screen scene).
 */
export function captionAtOutput(edit: CaptionTimeline, t: number): { caption: Caption; time: number } | null {
    const items = edit.captions.items;
    for (let i = edit.audio.voiceovers.length - 1; i >= 0; i--) {
        const clip = edit.audio.voiceovers[i];
        if (t < clip.start || t >= clip.start + clip.duration) continue;
        const time = clip.offset + (t - clip.start);
        const caption = items.find((c) => c.voice === clip.id && time >= c.start && time < c.end);
        if (caption) return { caption, time };
    }
    const position = positionAt(edit.items, t);
    if (!position.recording) return null;
    const caption = items.find((c) => !c.voice && position.source >= c.start && position.source < c.end);
    return caption ? { caption, time: position.source } : null;
}

/** Drops voiceover captions whose clip is no longer in the mix. */
export function dropOrphanVoiceCaptions<T extends { captions: Captions; audio: Pick<AudioMix, 'voiceovers'> }>(edit: T): T {
    const ids = new Set(edit.audio.voiceovers.map((c) => c.id));
    const items = edit.captions.items.filter((c) => !c.voice || ids.has(c.voice));
    return items.length === edit.captions.items.length ? edit : { ...edit, captions: { ...edit.captions, items } };
}

/** Every caption as it appears on the output timeline (cut and trimmed), sorted by time. */
export function captionSpans(edit: CaptionTimeline): { item: Caption; from: number; to: number }[] {
    const spans: { item: Caption; from: number; to: number }[] = timedSegments(edit.items, recordingCaptions(edit.captions.items));
    for (const caption of edit.captions.items) {
        const clip = caption.voice ? edit.audio.voiceovers.find((c) => c.id === caption.voice) : undefined;
        if (!clip) continue;
        const a = Math.max(caption.start, clip.offset);
        const b = Math.min(caption.end, clip.offset + clip.duration);
        if (b > a) spans.push({ item: caption, from: clip.start + (a - clip.offset), to: clip.start + (b - clip.offset) });
    }
    return spans.sort((a, b) => a.from - b.from);
}

const srtTime = (seconds: number) => {
    const ms = Math.max(0, Math.round(seconds * 1000));
    const pad = (n: number, width = 2) => n.toString().padStart(width, '0');
    return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

/** Captions as an .srt file on the edited timeline (cuts, speed and voiceovers applied). */
export function toSrt(edit: CaptionTimeline) {
    const cues = captionSpans(edit).filter((s) => s.to - s.from >= 0.2 && s.item.text.trim());
    return cues.map((s, i) => `${i + 1}\n${srtTime(s.from)} --> ${srtTime(s.to)}\n${s.item.text.trim()}\n`).join('\n');
}

// ---- Edits in source time (used by AI editing) ----

/** Removes source time a..b from the kept clips. Returns the items unchanged if no recording would be left. */
export function cutSource(items: TimelineItem[], a: number, b: number): TimelineItem[] {
    const out: TimelineItem[] = [];
    for (const clip of items) {
        if (!isRecording(clip) || b <= clip.start || a >= clip.end) {
            out.push(clip);
            continue;
        }
        const keepLeft = a - clip.start >= MIN_CLIP / 2;
        if (keepLeft) out.push({ ...clip, end: a });
        if (clip.end - b >= MIN_CLIP / 2) out.push({ ...clip, id: keepLeft ? newId() : clip.id, start: b, transition: keepLeft ? undefined : clip.transition });
    }
    return out.some(isRecording) ? out : items;
}

/** Plays source time a..b at `speed`, splitting the clips around it. */
export function speedSource(items: TimelineItem[], a: number, b: number, speed: number): TimelineItem[] {
    const out: TimelineItem[] = [];
    for (const clip of items) {
        if (!isRecording(clip) || b <= clip.start || a >= clip.end) {
            out.push(clip);
            continue;
        }
        const from = Math.max(a, clip.start);
        const to = Math.min(b, clip.end);
        const keepLeft = from - clip.start >= MIN_CLIP / 2;
        if (keepLeft) out.push({ ...clip, end: from });
        out.push({ ...clip, id: keepLeft ? newId() : clip.id, start: keepLeft ? from : clip.start, end: clip.end - to < MIN_CLIP / 2 ? clip.end : to, speed, transition: keepLeft ? undefined : clip.transition });
        if (clip.end - to >= MIN_CLIP / 2) out.push({ ...clip, id: newId(), start: to, transition: undefined });
    }
    return out;
}
