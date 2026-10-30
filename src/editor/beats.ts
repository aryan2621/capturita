import { itemLength, totalDuration, itemStarts, overlapAt, type MusicTrack, type TimelineItem } from './model';

const HOP = 512;
/** How hard a gap away from the period is penalised; 100 follows about ±15% tempo drift. */
const TIGHTNESS = 100;

/**
 * Beat times (seconds into the song): onsets from the rise in loudness per short window, the
 * tempo from their autocorrelation (70–180 BPM, leaning to 120), then the chain of onsets that best
 * keeps near that tempo (it may speed up or slow down).
 */
export function detectBeats(buffer: AudioBuffer): number[] {
    const rate = buffer.sampleRate;
    const frames = Math.floor(buffer.length / HOP);
    if (frames < 16) return [];
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    const energy = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
        let sum = 0;
        for (const data of channels) for (let i = f * HOP; i < (f + 1) * HOP; i++) sum += data[i] * data[i];
        energy[f] = Math.log(1e-9 + sum / (HOP * channels.length));
    }
    const onset = new Float32Array(frames);
    for (let f = 1; f < frames; f++) onset[f] = Math.max(0, energy[f] - energy[f - 1]);

    const perSecond = rate / HOP;
    const minLag = Math.round((60 / 180) * perSecond);
    const maxLag = Math.round((60 / 70) * perSecond);
    let lag = 0;
    let best = -Infinity;
    const scores = new Float32Array(maxLag + 2);
    for (let l = minLag; l <= maxLag + 1; l++) {
        let sum = 0;
        for (let f = l; f < frames; f++) sum += onset[f] * onset[f - l];
        // Tempo octaves score alike; a soft preference for ~120 BPM picks the usual one.
        const bpm = (60 * perSecond) / l;
        const score = (sum / (frames - l)) * Math.exp(-0.5 * Math.log2(bpm / 120) ** 2);
        scores[l] = score;
        if (l <= maxLag && score > best) {
            best = score;
            lag = l;
        }
    }
    if (!lag) return [];
    // A whole number of windows is too coarse at fast tempos (it drifts over a song): fit a parabola through the peak.
    const [a, b, c] = [scores[lag - 1], scores[lag], scores[lag + 1]];
    const bend = a - 2 * b + c;
    const period = lag + (lag > minLag && bend < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / bend)) : 0);

    // Beats by dynamic programming (Ellis 2007): each beat is an onset plus the best earlier beat, with a
    // penalty for gaps away from the period, so the chain follows a tempo that drifts or changes.
    let mean = 0;
    for (let f = 0; f < frames; f++) mean += onset[f] / frames;
    let spread = 0;
    for (let f = 0; f < frames; f++) spread += (onset[f] - mean) ** 2 / frames;
    const norm = Math.sqrt(spread) || 1;
    // The local period, every second, from the onsets' autocorrelation over 8 s around it; it leans to the
    // song's period so a quiet stretch keeps it, and a real tempo change moves it.
    const block = Math.round(perSecond);
    const half = Math.round(4 * perSecond);
    const local = Array.from({ length: Math.ceil(frames / block) }, (_, b) => {
        const from = Math.max(0, b * block - half);
        const to = Math.min(frames, b * block + half);
        let at = period;
        let top = 0;
        for (let l = minLag; l <= maxLag && l < to - from; l++) {
            let sum = 0;
            for (let f = from + l; f < to; f++) sum += onset[f] * onset[f - l];
            const score = (sum / (to - from - l)) * Math.exp(-0.5 * Math.log2(l / period) ** 2 / 0.25);
            if (score > top) (top = score), (at = l);
        }
        return at;
    });
    const score = new Float64Array(frames);
    const prev = new Int32Array(frames).fill(-1);
    for (let f = 0; f < frames; f++) {
        let best = 0;
        const here = local[Math.floor(f / block)];
        for (let p = Math.max(0, Math.floor(f - 2 * here)); p <= f - Math.round(here / 2); p++) {
            const s = score[p] - TIGHTNESS * Math.log((f - p) / here) ** 2;
            if (prev[f] < 0 || s > best) (best = s), (prev[f] = p);
        }
        score[f] = onset[f] / norm + (prev[f] < 0 ? 0 : best);
    }
    // The chain ends on the best-scoring frame in the last period.
    let end = frames - 1;
    for (let f = Math.max(0, frames - Math.round(period)); f < frames; f++) if (score[f] > score[end]) end = f;
    const beats: number[] = [];
    for (let f = end; f >= 0; f = prev[f]) beats.push((f * HOP) / rate);
    return beats.reverse();
}

/** The song's beats in output time, over a timeline `total` seconds long (repeating when it loops). */
export function beatsOnTimeline(music: MusicTrack | null, total: number): number[] {
    const beats = music?.beats;
    if (!beats?.length || !music) return [];
    const out: number[] = [];
    const length = music.loop ? (music.length ?? 0) : 0;
    for (let lap = 0; ; lap++) {
        const shift = lap * length - music.offset;
        for (const beat of beats) {
            const t = beat + shift;
            if (t >= 0 && t <= total) out.push(t);
        }
        if (!length || shift + length > total) break;
    }
    return out.sort((a, b) => a - b);
}

/**
 * Lengthens or shortens each scene so the change to the next item (the middle of a transition)
 * lands on the nearest beat, keeping every scene at least a second long. Recording clips keep their length.
 */
export function fitScenesToBeats(items: TimelineItem[], beats: number[]): TimelineItem[] {
    if (!beats.length) return items;
    return withSceneBeats(retimeToBeats(items, beats), beats);
}

/** Re-fits scenes to the music after something (a style) changed their lengths, so cuts and `props.beats` follow. */
export function fitToMusic(items: TimelineItem[], music: MusicTrack | null): TimelineItem[] {
    return fitScenesToBeats(items, beatsOnTimeline(music, totalDuration(items) + 5));
}

/** Gives each scene the beats inside it, in seconds from its own start, as `props.beats`. */
export function withSceneBeats(items: TimelineItem[], beats: number[]): TimelineItem[] {
    const starts = itemStarts(items);
    return items.map((item, i) => {
        if (item.kind !== 'scene') return item;
        const inside = beats.filter((b) => b >= starts[i] && b < starts[i] + itemLength(item)).map((b) => Math.round((b - starts[i]) * 1000) / 1000);
        return { ...item, props: { ...item.props, beats: inside } };
    });
}

function retimeToBeats(items: TimelineItem[], beats: number[]): TimelineItem[] {
    let out = items;
    for (let i = 0; i < out.length - 1; i++) {
        const item = out[i];
        if (item.kind !== 'scene') continue;
        const start = itemStarts(out)[i];
        const change = start + itemLength(item) - overlapAt(out, i + 1) / 2;
        const target = beats.filter((b) => b - start >= 1).reduce<number | null>((near, b) => (near === null || Math.abs(b - change) < Math.abs(near - change) ? b : near), null);
        if (target === null) continue;
        const duration = Math.round((item.duration + target - change) * 1000) / 1000;
        out = out.map((x, j) => (j === i ? { ...item, duration } : x));
    }
    return out;
}
