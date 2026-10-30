import { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

/** The music's beats inside this scene, in seconds from its start (the scene's `beats` prop; empty without music). */
export const BeatContext = createContext<number[]>([]);

/** The beats a scene's props carry, ignoring anything that isn't a list of numbers. */
export function beatsOf(props: Record<string, unknown>): number[] {
    return Array.isArray(props.beats) ? props.beats.filter((b): b is number => typeof b === 'number') : [];
}

/** The latest beat at or before `seconds`, or undefined before the first. `beats` must be sorted. */
export function lastBeat(beats: number[], seconds: number): number | undefined {
    let found: number | undefined;
    for (const b of beats) {
        if (b > seconds) break;
        found = b;
    }
    return found;
}

/** The beat nearest `seconds`, moved by at most `reach` seconds; `seconds` itself when none is that close. */
export function snapToBeat(beats: number[], seconds: number, reach = 0.15): number {
    let best = seconds;
    let gap = reach;
    for (const b of beats) if (Math.abs(b - seconds) <= gap) (best = b), (gap = Math.abs(b - seconds));
    return best;
}

/** 1 on a beat, easing to 0 over `decay` seconds; 0 before the first beat or with no music. */
export function beatPulse(beats: number[], seconds: number, decay: number): number {
    const last = lastBeat(beats, seconds);
    return last === undefined ? 0 : Math.exp(-(seconds - last) / decay);
}

export function useBeatPulse(decay = 0.25): number {
    const beats = useContext(BeatContext);
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    return beatPulse(beats, frame / fps, decay);
}

/** An entrance start time (seconds) moved onto the nearest beat, if one is within `reach`. */
export function useBeatSnap() {
    const beats = useContext(BeatContext);
    return (seconds: number, reach = 0.15) => snapToBeat(beats, seconds, reach);
}
