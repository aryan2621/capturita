import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Project } from '../lib/api';
import { overlaysAt, positionAt, totalDuration, withHeldEnds, type Edit } from '../editor/model';
import { projectBrand } from './brandKits';
import type { Brand } from './scenes/assets';
import { recordingInfo, sceneLookProps } from './sceneEnv';
import { SCENE_FPS, SCENE_RENDER_VERSION, SCENES, TIMELINE_COMPOSITION } from './scenes';

/** Frames a scene item plays for (the same count the preview's Player uses). */
export const sceneFrames = (duration: number) => Math.max(1, Math.round(duration * SCENE_FPS));

async function sha256(text: string) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Rendered files (relative to the project folder) by scene item id and by overlay id. */
export interface SceneFiles {
    scenes: Map<string, string>;
    overlays: Map<string, string>;
}

interface SceneJob {
    composition: string;
    props: Record<string, unknown>;
    frames: number;
    fps: number;
    width: number;
    height: number;
    alpha: boolean;
    out: string;
    /** Render only this frame, as a JPEG (`out` ends in .jpg). */
    still?: number;
    /**
     * Inclusive frame ranges that have something on screen (transparent timeline only). The
     * renderer runs Chrome on these and writes empty frames for the rest.
     */
    ranges?: [number, number][];
}

/** `download` is set while Chrome Headless Shell downloads (first export only), 0–1. */
type RenderProgress = (progress: number, download?: number) => void;

/** Renders the jobs whose files don't exist yet (studio.rs skips the rest). */
async function runJobs(project: Project, jobs: SceneJob[], onProgress: RenderProgress, signal: AbortSignal) {
    const unlisten = await listen<number>('studio-render-progress', (event) => onProgress(event.payload));
    const unlistenDownload = await listen<number>('studio-browser-download', (event) => onProgress(0, event.payload));
    const cancel = () => void invoke('studio_render_cancel');
    signal.addEventListener('abort', cancel);
    try {
        await invoke('studio_render', { jobs, project: project.path });
    } finally {
        signal.removeEventListener('abort', cancel);
        unlisten();
        unlistenDownload();
    }
}

/**
 * Renders the timeline's scenes and overlays to video files at the export size. Scenes are
 * opaque H.264; overlays are VP9 WebM with alpha (yuva420p), drawn over the frame. Files are
 * named by everything that affects their pixels (props, the project's brand kit, the recording
 * they show, size, renderer version; overlays in their own namespace), so an unchanged piece is
 * rendered once and reused by later exports.
 */
export async function renderScenes(
    project: Project,
    edit: Pick<Edit, 'items' | 'overlays' | 'brandKit'>,
    width: number,
    height: number,
    onProgress: RenderProgress,
    signal: AbortSignal,
): Promise<SceneFiles> {
    const files: SceneFiles = { scenes: new Map(), overlays: new Map() };
    const jobs: SceneJob[] = [];
    const scenes = withHeldEnds(edit.items).filter((item) => item.kind === 'scene');
    if (scenes.length === 0 && edit.overlays.length === 0) return files;
    const brand = await projectBrand(project, edit.brandKit);
    const recording = recordingInfo(project);
    const add = async (target: Map<string, string>, id: string, item: { scene: string; props: Record<string, unknown>; duration: number }, overlay: boolean) => {
        if (!SCENES[item.scene]) throw new Error(`Unknown motion scene “${item.scene}”`);
        const job = { composition: item.scene, props: sceneLookProps(item, brand, recording, overlay), frames: sceneFrames(item.duration), fps: SCENE_FPS, width, height };
        // Scene hashes keep their old inputs, so files rendered before overlays existed stay valid.
        const hash = (await sha256(JSON.stringify(overlay ? { kind: 'overlay', version: SCENE_RENDER_VERSION, ...job } : { version: SCENE_RENDER_VERSION, ...job }))).slice(0, 20);
        const file = overlay ? `scenes/overlay-${hash}.webm` : `scenes/${hash}.mp4`;
        target.set(id, file);
        if (!jobs.some((j) => j.out.endsWith(file))) jobs.push({ ...job, alpha: overlay, out: `${project.path}/${file}` });
    };
    for (const item of scenes) await add(files.scenes, item.id, item, false);
    for (const overlay of edit.overlays) await add(files.overlays, overlay.id, overlay, true);
    await runJobs(project, jobs, onProgress, signal);
    return files;
}

/**
 * One picture of each scene, late in it when everything has settled, for looking at (not for
 * export). Returns the picture files (absolute paths), one per item, cached like scene files.
 */
export async function renderStills(
    project: Project,
    items: { scene: string; props: Record<string, unknown>; duration: number }[],
    brand: Brand,
    width: number,
    height: number,
    onProgress: RenderProgress,
    signal: AbortSignal,
): Promise<string[]> {
    const recording = recordingInfo(project);
    const jobs: SceneJob[] = [];
    const outs: string[] = [];
    for (const item of items) {
        if (!SCENES[item.scene]) throw new Error(`Unknown motion scene “${item.scene}”`);
        const frames = sceneFrames(item.duration);
        const job = { composition: item.scene, props: sceneLookProps(item, brand, recording), frames, fps: SCENE_FPS, width, height, still: Math.min(frames - 1, Math.floor(frames * 0.7)) };
        const hash = (await sha256(JSON.stringify({ kind: 'still', version: SCENE_RENDER_VERSION, ...job }))).slice(0, 20);
        const out = `${project.path}/scenes/still-${hash}.jpg`;
        outs.push(out);
        if (!jobs.some((j) => j.out === out)) jobs.push({ ...job, alpha: false, out });
    }
    await runJobs(project, jobs, onProgress, signal);
    return outs;
}

/**
 * The frames of the timeline where a scene, a dip or an overlay is on screen, as inclusive
 * ranges; the frame choice matches TransparentTimeline's (`frame / SCENE_FPS`).
 */
export function visibleRanges(edit: Pick<Edit, 'items' | 'overlays'>, frames: number): [number, number][] {
    const ranges: [number, number][] = [];
    for (let frame = 0; frame < frames; frame++) {
        const t = frame / SCENE_FPS;
        const position = positionAt(edit.items, t);
        const visible = position.scenes.length > 0 || (position.dip?.opacity ?? 0) > 0 || overlaysAt(edit.overlays, t).length > 0;
        if (!visible) continue;
        const last = ranges[ranges.length - 1];
        if (last && last[1] === frame - 1) last[1] = frame;
        else ranges.push([frame, frame]);
    }
    return ranges;
}

/** What a transparent export holds: one scene item or overlay (by id), or the whole timeline. */
export type TransparentSource = { kind: 'scene' | 'overlay'; id: string } | { kind: 'timeline' };

/**
 * Renders a transparent ProRes 4444 `.mov` (straight alpha) for use in another editor and returns
 * its path in the project's scenes folder (cached like other scene files). A scene or overlay is
 * drawn on a transparent background; the whole timeline draws its scenes (with their transitions)
 * and overlays, and leaves the recording's parts empty.
 */
export async function renderTransparent(
    project: Project,
    edit: Pick<Edit, 'items' | 'overlays' | 'brandKit'>,
    source: TransparentSource,
    width: number,
    height: number,
    onProgress: RenderProgress,
    signal: AbortSignal,
): Promise<string> {
    const brand = await projectBrand(project, edit.brandKit);
    const recording = recordingInfo(project);
    let job: Omit<SceneJob, 'alpha' | 'out' | 'ranges'>;
    let ranges: [number, number][] | undefined;
    if (source.kind === 'timeline') {
        if (!edit.items.some((item) => item.kind === 'scene') && edit.overlays.length === 0) throw new Error('A transparent export holds only motion scenes and overlays, and this timeline has none.');
        const items = withHeldEnds(edit.items).map((item) => (item.kind === 'scene' ? { ...item, props: sceneLookProps(item, brand, recording) } : item));
        const overlays = edit.overlays.map((overlay) => ({ ...overlay, props: sceneLookProps(overlay, brand, recording, true) }));
        job = { composition: TIMELINE_COMPOSITION, props: { items, overlays }, frames: sceneFrames(totalDuration(edit.items)), fps: SCENE_FPS, width, height };
        // Only the parts with scenes or overlays go through Chrome (left out of the hash: same pixels).
        const visible = visibleRanges(edit, job.frames);
        if (!(visible.length === 1 && visible[0][0] === 0 && visible[0][1] === job.frames - 1)) ranges = visible;
    } else {
        const item = source.kind === 'scene' ? edit.items.find((i) => i.id === source.id) : edit.overlays.find((o) => o.id === source.id);
        if (!item || !('scene' in item) || !SCENES[item.scene]) throw new Error('That scene is no longer on the timeline.');
        job = { composition: item.scene, props: sceneLookProps(item, brand, recording, true), frames: sceneFrames(item.duration), fps: SCENE_FPS, width, height };
    }
    const hash = (await sha256(JSON.stringify({ kind: 'transparent', version: SCENE_RENDER_VERSION, ...job }))).slice(0, 20);
    const out = `${project.path}/scenes/alpha-${hash}.mov`;
    await runJobs(project, [{ ...job, alpha: true, out, ...(ranges ? { ranges } : {}) }], onProgress, signal);
    return out;
}
