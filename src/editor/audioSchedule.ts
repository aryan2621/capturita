import type { Track } from '../lib/api';
import { createClickSound } from './clickSound';
import { sceneBeat } from '../studio/scenes';
import { itemStarts, overlapAt, positionAt, totalDuration, type AudioClip, type AudioMix, type ClickSoundType, type OverlayClip, type SoundCue, type TimelineItem, type TrackLevel } from './model';
import { timeStretch } from './timeStretch';

export type TrackKind = 'system' | 'microphone';

export interface AudioTrack {
    kind: TrackKind;
    track: Track;
    buffer: AudioBuffer;
}

export interface ClickSounds {
    enabled: boolean;
    type: ClickSoundType;
    /** 0 to 1. */
    volume: number;
    /** Source times of the recorded clicks. */
    times: number[];
}

export interface ScheduleOptions {
    tracks: AudioTrack[];
    items: TimelineItem[];
    mix: AudioMix;
    clicks: ClickSounds;
    /** Cache of pitch-preserved copies of sped-up/slowed clips, reused across calls. */
    stretched: Map<string, AudioBuffer>;
    /** The click sound for this context (the synthesized tick is created if empty). */
    clickBuffer: { current: AudioBuffer | null };
    /** Decoded background music (settings are in `mix.music`). */
    music?: AudioBuffer | null;
    /** Overlays, for the sounds at their beats. */
    overlays?: OverlayClip[];
    /** Decoded voiceovers, sound effects and cue sounds, by project file (see `audioFiles`). */
    clips?: Map<string, AudioBuffer>;
}

export interface Scheduled {
    sources: AudioBufferSourceNode[];
    /** Carries the fades; disconnect it to silence everything scheduled. */
    master: GainNode;
    trackGains: Map<TrackKind, GainNode>;
    /** Background music volume, adjustable while playing. */
    musicGain: GainNode | null;
}

/** Shortest ramp at a clip's edges, so starting or stopping mid-waveform never clicks. */
const EDGE = 0.005;
/** Ducking works on the voice's level in windows this long. */
const DUCK_WINDOW = 0.05;
/** RMS above this (about -34 dBFS) counts as speech. */
const SPEECH_LEVEL = 0.02;

export const gainOf = (level: TrackLevel) => (level.muted ? 0 : level.volume);

/**
 * Schedules the whole edited timeline from output time `start`, beginning at context time `at`.
 * Shared by live playback (AudioContext) and export (OfflineAudioContext) so both sound the same:
 * kept clips of every track (sped-up clips are time-stretched to keep their pitch), the click
 * sound, each track's volume/mute, and fades at the start and end of the video.
 */
export function scheduleTimeline(context: BaseAudioContext, destination: AudioNode, options: ScheduleOptions, at: number, start: number): Scheduled {
    const { tracks, items, mix, clicks, stretched } = options;
    const length = totalDuration(items);
    const starts = itemStarts(items);
    const sources: AudioBufferSourceNode[] = [];

    const master = context.createGain();
    master.connect(destination);
    scheduleFades(master, mix, at, start, length);

    const trackGains = new Map<TrackKind, GainNode>();
    for (const { kind } of tracks) {
        const gain = context.createGain();
        gain.gain.value = gainOf(mix[kind]);
        gain.connect(master);
        trackGains.set(kind, gain);
    }

    // Scenes are silent for now; only recording clips are scheduled. Starting inside a scene, the
    // first clip to schedule is the one after it.
    const position = positionAt(items, start);
    const first = position.recording ? position.clipIndex : position.index;
    const firstSource = position.recording ? position.source : -Infinity;
    for (let index = first; index < items.length; index++) {
        const clip = items[index];
        if (clip.kind !== 'recording') continue;
        const segmentStart = index === first ? Math.max(clip.start, firstSource) : clip.start;
        for (const { kind, track, buffer } of tracks) {
            // The part of this clip that the track actually covers, in source time.
            const covered = Math.max(clip.start, track.offset);
            const a = Math.max(segmentStart, track.offset);
            const b = Math.min(clip.end, track.offset + buffer.duration);
            if (b - a <= 0.001) continue;
            const node = context.createBufferSource();
            node.connect(trackGains.get(kind)!);
            const when = Math.max(context.currentTime, at + (starts[index] + (a - clip.start) / clip.speed - start));
            if (clip.speed === 1) {
                node.buffer = buffer;
                node.start(when, a - track.offset, b - a);
            } else {
                // Play a time-stretched copy at normal rate so the pitch stays the same.
                const key = `${track.file}:${covered}:${b}:${clip.speed}`;
                let copy = stretched.get(key);
                if (!copy) {
                    copy = timeStretch(context, buffer, covered - track.offset, b - track.offset, clip.speed);
                    stretched.set(key, copy);
                }
                node.buffer = copy;
                node.start(when, (a - covered) / clip.speed);
            }
            sources.push(node);
        }
    }

    // Music runs along the output timeline, so cuts and speed changes don't affect it.
    let musicGain: GainNode | null = null;
    const music = mix.music;
    if (music && options.music && start < length) {
        const buffer = options.music;
        musicGain = context.createGain();
        musicGain.gain.value = gainOf(music);
        musicGain.connect(master);
        const node = context.createBufferSource();
        node.buffer = buffer;
        if (mix.ducking.enabled && mix.ducking.amount < 0 && mix.voiceovers.length + (mix.ducking.underRecording ? 1 : 0) > 0) {
            // The duck sits between the song and its volume, so volume changes while playing keep it.
            const duck = context.createGain();
            duck.connect(musicGain);
            node.connect(duck);
            scheduleCurve(duck.gain, duckCurve(options, length), DUCK_WINDOW, at, start);
        } else {
            node.connect(musicGain);
        }
        const into = music.offset + start;
        const remaining = length - start;
        if (music.loop) {
            node.loop = true;
            node.start(at, into % buffer.duration);
            node.stop(at + remaining);
        } else if (into < buffer.duration) {
            node.start(at, into, Math.min(remaining, buffer.duration - into));
        }
        sources.push(node);
    }

    // Voiceovers and sound effects at output times, each with its own volume and fades.
    const clipBuffers = options.clips ?? new Map<string, AudioBuffer>();
    for (const clip of [...mix.voiceovers, ...mix.effects]) {
        const buffer = clipBuffers.get(clip.file);
        if (buffer) scheduleClip(context, master, buffer, clip, at, start, sources);
    }
    // Automatic sounds: a transition's centred on its midpoint, a scene's at its beat.
    for (const cue of soundCues(items, options.overlays ?? [])) {
        const buffer = clipBuffers.get(cue.sound.file);
        if (!buffer) continue;
        const begin = Math.max(0, cue.centred ? cue.time - buffer.duration / 2 : cue.time);
        if (begin >= length) continue;
        const duration = Math.min(buffer.duration, length - begin);
        scheduleClip(
            context,
            master,
            buffer,
            { id: '', file: cue.sound.file, name: cue.sound.name, start: begin, offset: 0, duration, length: buffer.duration, volume: cue.sound.volume, fadeIn: 0, fadeOut: 0 },
            at,
            start,
            sources
        );
    }

    if (clicks.enabled && clicks.volume > 0 && clicks.times.length > 0) {
        options.clickBuffer.current ??= createClickSound(context);
        const gain = context.createGain();
        gain.gain.value = clicks.volume;
        gain.connect(master);
        for (let index = first; index < items.length; index++) {
            const clip = items[index];
            if (clip.kind !== 'recording') continue;
            const from = index === first ? Math.max(clip.start, firstSource) : clip.start;
            for (const t of clicks.times) {
                if (t < from || t >= clip.end) continue;
                const when = at + (starts[index] + (t - clip.start) / clip.speed - start);
                if (when < context.currentTime) continue;
                const node = context.createBufferSource();
                node.buffer = options.clickBuffer.current;
                node.connect(gain);
                node.start(when);
                sources.push(node);
            }
        }
    }

    return { sources, master, trackGains, musicGain };
}

/** Output times of the automatic sounds: transitions (centred on the cut) and scene beats. */
export function soundCues(items: TimelineItem[], overlays: OverlayClip[]): { sound: SoundCue; time: number; centred: boolean }[] {
    const starts = itemStarts(items);
    const cues: { sound: SoundCue; time: number; centred: boolean }[] = [];
    items.forEach((item, index) => {
        if (index > 0 && item.transition?.sound) cues.push({ sound: item.transition.sound, time: starts[index] + overlapAt(items, index) / 2, centred: true });
        const beat = item.kind === 'scene' ? sceneBeat(item.scene, item.props) : undefined;
        if (item.kind === 'scene' && item.sound && beat !== undefined && beat < item.duration) cues.push({ sound: item.sound, time: starts[index] + beat, centred: false });
    });
    for (const overlay of overlays) {
        const beat = sceneBeat(overlay.scene, overlay.props);
        if (overlay.sound && beat !== undefined && beat < overlay.duration) cues.push({ sound: overlay.sound, time: overlay.start + beat, centred: false });
    }
    return cues;
}

/** Plays the part of `clip` after output time `start`, through a gain carrying its volume and fades. */
function scheduleClip(context: BaseAudioContext, destination: AudioNode, buffer: AudioBuffer, clip: AudioClip, at: number, start: number, sources: AudioBufferSourceNode[]) {
    const end = clip.start + Math.min(clip.duration, buffer.duration - clip.offset);
    if (end <= start || end - clip.start <= 0.001) return;
    const length = end - clip.start;
    const fadeIn = Math.min(Math.max(EDGE, clip.fadeIn), length / 2);
    const fadeOut = Math.min(Math.max(EDGE, clip.fadeOut), length / 2);
    const gain = context.createGain();
    gain.connect(destination);
    const level = (t: number) => clip.volume * Math.max(0, Math.min(1, (t - clip.start) / fadeIn, (end - t) / fadeOut));
    const from = Math.max(start, clip.start);
    const when = at + (from - start);
    gain.gain.setValueAtTime(level(from), when);
    for (const t of [clip.start + fadeIn, end - fadeOut, end]) if (t > from) gain.gain.linearRampToValueAtTime(level(t), at + (t - start));
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(gain);
    node.start(Math.max(context.currentTime, when), clip.offset + (from - clip.start), end - from);
    sources.push(node);
}

/** RMS of each `DUCK_WINDOW` of a buffer (all channels), cached per buffer. */
const levelCache = new WeakMap<AudioBuffer, Float32Array>();
function levels(buffer: AudioBuffer) {
    let cached = levelCache.get(buffer);
    if (cached) return cached;
    const size = Math.max(1, Math.round(DUCK_WINDOW * buffer.sampleRate));
    cached = new Float32Array(Math.ceil(buffer.length / size));
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    for (let w = 0; w < cached.length; w++) {
        let sum = 0;
        const a = w * size;
        const b = Math.min(buffer.length, a + size);
        for (const data of channels) for (let i = a; i < b; i++) sum += data[i] * data[i];
        cached[w] = Math.sqrt(sum / Math.max(1, (b - a) * channels.length));
    }
    levelCache.set(buffer, cached);
    return cached;
}

const levelAt = (buffer: AudioBuffer, seconds: number) => {
    const values = levels(buffer);
    const index = Math.floor(seconds / DUCK_WINDOW);
    return index >= 0 && index < values.length ? values[index] : 0;
};

/**
 * The music's gain over the output timeline, one value per `DUCK_WINDOW`: 1 normally, down by
 * `ducking.amount` dB while a voiceover (or, optionally, the recording's microphone) is speaking,
 * moving with one-pole attack and release. Preview and export both apply this exact curve.
 */
export function duckCurve(options: Pick<ScheduleOptions, 'tracks' | 'items' | 'mix' | 'clips'>, length: number): Float32Array {
    const { mix, items } = options;
    const { amount, attack, release, underRecording } = mix.ducking;
    const count = Math.ceil(length / DUCK_WINDOW) + 1;
    const curve = new Float32Array(count);
    const voices = mix.voiceovers.flatMap((clip) => {
        const buffer = options.clips?.get(clip.file);
        return buffer && clip.volume > 0 ? [{ clip, buffer }] : [];
    });
    const mic = underRecording && !mix.microphone.muted ? options.tracks.find((t) => t.kind === 'microphone') : undefined;
    const up = 1 - Math.exp(-DUCK_WINDOW / Math.max(0.01, attack));
    const down = 1 - Math.exp(-DUCK_WINDOW / Math.max(0.01, release));
    let envelope = 0;
    for (let w = 0; w < count; w++) {
        const t = w * DUCK_WINDOW;
        let speaking = voices.some(({ clip, buffer }) => t >= clip.start && t < clip.start + clip.duration && levelAt(buffer, clip.offset + (t - clip.start)) * clip.volume > SPEECH_LEVEL);
        if (!speaking && mic) {
            const position = positionAt(items, t);
            speaking = position.recording && levelAt(mic.buffer, position.source - mic.track.offset) * mix.microphone.volume > SPEECH_LEVEL;
        }
        envelope += ((speaking ? 1 : 0) - envelope) * (speaking ? up : down);
        // Rounded so long stretches settle on exactly the same value and need no automation.
        curve[w] = Math.pow(10, (amount * Math.round(envelope * 500)) / 500 / 20);
    }
    return curve;
}

/** Applies a curve sampled every `step` seconds of output time, from output time `start`. */
function scheduleCurve(param: AudioParam, curve: Float32Array, step: number, at: number, start: number) {
    const first = Math.min(curve.length - 1, Math.max(0, Math.floor(start / step)));
    param.setValueAtTime(curve[first], at);
    for (let w = first + 1; w < curve.length; w++) {
        // Only the corners of the curve: where it starts or stops changing.
        if (curve[w] === curve[w - 1] && (w + 1 >= curve.length || curve[w + 1] === curve[w])) continue;
        param.linearRampToValueAtTime(curve[w], at + (w * step - start));
    }
}

/** Fade in at the start and out at the end of the whole edited video, as a gain automation. */
function scheduleFades(gain: GainNode, mix: AudioMix, at: number, start: number, length: number) {
    const { fadeIn, fadeOut } = mix;
    const level = (t: number) => Math.max(0, Math.min(1, fadeIn > 0 ? t / fadeIn : 1, fadeOut > 0 ? (length - t) / fadeOut : 1));
    gain.gain.setValueAtTime(level(start), at);
    const points = [fadeIn, length - fadeOut, length].filter((t) => t > start).sort((a, b) => a - b);
    for (const t of points) gain.gain.linearRampToValueAtTime(level(t), at + (t - start));
}

/** Fetches and decodes an audio file (music, a voiceover, a sound effect). */
export async function loadAudioFile(context: BaseAudioContext, url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
}

export const loadMusic = loadAudioFile;

/** Decodes every file in `files` that `into` doesn't hold yet. Files that fail are left out. */
export async function loadAudioFiles(context: BaseAudioContext, files: string[], url: (file: string) => string, into = new Map<string, AudioBuffer>(), onError?: (file: string, error: unknown) => void) {
    await Promise.all(
        files
            .filter((file) => !into.has(file))
            .map((file) =>
                loadAudioFile(context, url(file))
                    .then((buffer) => void into.set(file, buffer))
                    .catch((error) => onError?.(file, error))
            )
    );
    return into;
}

/** Fetches and decodes the recording's audio tracks. */
export async function loadAudioTracks(
    context: BaseAudioContext,
    tracks: { kind: TrackKind; track: Track | null }[],
    url: (track: Track) => string
): Promise<AudioTrack[]> {
    const present = tracks.filter((t): t is { kind: TrackKind; track: Track } => !!t.track);
    return Promise.all(
        present.map(async ({ kind, track }) => {
            const response = await fetch(url(track));
            if (!response.ok) throw new Error(`${track.file}: HTTP ${response.status}`);
            return { kind, track, buffer: await context.decodeAudioData(await response.arrayBuffer()) };
        })
    );
}
