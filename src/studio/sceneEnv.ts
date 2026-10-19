import { convertFileSrc } from '@tauri-apps/api/core';
import type { CursorData, Project } from '../lib/api';
import { positionAt, type SceneClip, type TimelineItem } from '../editor/model';
import { SCENES } from './scenes';
import type { Brand, RecordingInfo, SceneAssets, SceneEnv, Segment, TargetRect } from './scenes/assets';

export const recordingInfo = (project: Project): RecordingInfo => {
    const { file, offset, width, height } = project.tracks.screen;
    return { file, offset, width, height };
};

/** Project files as the preview loads them; the 1080p copy stands in for the screen video. */
export const previewAssets = (project: Project, previewFile: string | null): SceneAssets => ({
    base: convertFileSrc(project.path),
    alias: previewFile ? { [project.tracks.screen.file]: previewFile } : undefined,
});

/** A timeline scene or an overlay: which composition, with which stored props. */
type ScenePiece = Pick<SceneClip, 'scene' | 'props'>;

/** Everything a scene draws from: its stored props over its defaults, plus the injected env. Overlays draw on a transparent background. */
export function sceneInputProps(item: ScenePiece, env: SceneEnv, overlay = false) {
    return { ...sceneLookProps(item, env.brand, env.recording, overlay), assets: env.assets };
}

/** The same props without `assets` (where files are served from doesn't change a scene's look). */
export function sceneLookProps(item: ScenePiece, brand: Brand, recording: RecordingInfo, overlay = false) {
    return { ...SCENES[item.scene]?.defaultProps, ...item.props, ...(overlay ? { transparent: true } : {}), brand, recording };
}

/** Seconds of source the recording covers. */
export const recordingRange = (project: Project) => ({ start: project.tracks.screen.offset, end: project.tracks.screen.offset + project.tracks.screen.duration });

/**
 * A box around the click nearest the segment (the first click inside it, else the closest in
 * time), sized like a button or field. Null when the recording has no clicks.
 */
export function suggestTarget(cursor: CursorData | null, project: Project, segment: Segment): TargetRect | null {
    const clicks = cursor?.clicks ?? [];
    if (clicks.length === 0) return null;
    const inside = clicks.filter(([t]) => t >= segment.start && t <= segment.end).sort((a, b) => a[0] - b[0]);
    const middle = (segment.start + segment.end) / 2;
    const [, x, y] = inside[0] ?? [...clicks].sort((a, b) => Math.abs(a[0] - middle) - Math.abs(b[0] - middle))[0];
    // About 320 × 180 points of the recorded area, at most 60% of it.
    const area = project.source.area;
    const width = Math.min(0.6, 320 / Math.max(1, area.width));
    const height = Math.min(0.6, 180 / Math.max(1, area.height));
    const clamp = (v: number, size: number) => Math.min(1 - size, Math.max(0, v - size / 2));
    return { x: clamp(x, width), y: clamp(y, height), width, height };
}

/**
 * Props for a new scene at the playhead: its defaults, with recording segments set to the clip
 * there (from the playhead on) and targets suggested from the nearest click.
 */
export function initialSceneProps(id: string, items: TimelineItem[], time: number, project: Project, cursor: CursorData | null) {
    const definition = SCENES[id];
    const props: Record<string, unknown> = { ...definition.defaultProps };
    const { clip, source } = positionAt(items, time);
    const callout = definition.fields.some((field) => field.type === 'rect');
    let segment: Segment = { start: source, end: Math.min(clip.end, source + definition.defaultDuration) };
    if (segment.end - segment.start < 1) segment = { start: Math.max(clip.start, clip.end - definition.defaultDuration), end: clip.end };
    // A callout is about a click: start a moment before the next one in this clip, if any.
    const click = callout ? cursor?.clicks.find(([t]) => t >= source && t <= clip.end) : undefined;
    if (click) segment = { start: Math.max(clip.start, click[0] - 0.6), end: Math.min(clip.end, click[0] + 1.4) };
    for (const field of definition.fields) {
        if (field.type === 'segment') props[field.name] = segment;
        if (field.type === 'rect') props[field.name] = suggestTarget(cursor, project, segment) ?? props[field.name];
    }
    return props;
}
