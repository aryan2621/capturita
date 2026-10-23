import { invoke } from '@tauri-apps/api/core';
import {
    ALL_FORMATS,
    AudioBufferSource,
    BlobSource,
    CanvasSink,
    CanvasSource,
    Input,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
    QUALITY_LOW,
    QUALITY_MEDIUM,
    QUALITY_VERY_HIGH,
    StreamTarget,
    UrlSource,
    VideoSampleSink,
    type StreamTargetChunk,
    type VideoSample,
    type WrappedCanvas,
} from 'mediabunny';
import { api, errorMessage, fileUrl, type CursorData, type Project, type VideoTrack } from '../lib/api';
import { loadAudioFiles, loadAudioTracks, loadMusic, scheduleTimeline } from './audioSchedule';
import { loadClickSound } from './clickSound';
import { aspectRatio, audioFiles, isIdentityFx, overlaysAt, positionAt, totalDuration, type Edit, type LayerFx } from './model';
import { drawCaptions, drawDip, drawFrame, drawLayer, fillBackground, preloadBackground, type FrameSource } from './render';
import { renderScenes, renderTransparent, sceneFrames, type SceneFiles, type TransparentSource } from '../studio/renderScenes';
import { SCENE_FPS } from '../studio/scenes';
import { GifEncoder } from './gif';
import { correctColorSpace } from './encoderRange';

export type Resolution = 480 | 720 | 1080 | 2160;
export type Quality = 'studio' | 'high' | 'medium' | 'small';
/** `mov`: the scenes and overlays alone as transparent ProRes 4444, for another editor. */
export type ExportFormat = 'mp4' | 'gif' | 'mov';

export interface ExportSettings {
    format: ExportFormat;
    /** Pixel size of the frame's shorter side. */
    resolution: Resolution;
    fps: 15 | 24 | 30 | 60;
    /** Video bitrate (MP4 only). */
    quality: Quality;
}

const BITRATES = { studio: QUALITY_VERY_HIGH, high: QUALITY_HIGH, medium: QUALITY_MEDIUM, small: QUALITY_LOW } as const;

export interface ExportProgress {
    /** `browser`: the one-time Chrome Headless Shell download, with `progress` as its own 0–1. */
    phase: 'browser' | 'scenes' | 'audio' | 'video' | 'finishing';
    /** 0 to 1 over the whole export. */
    progress: number;
}

const SAMPLE_RATE = 48_000;
const AUDIO_BITRATE = 192_000;
/** Audio is added in slices a little ahead of the video so the file stays interleaved. */
const AUDIO_SLICE = 1;
/** Rendering the audio mix is quick; count it as this share of the progress bar. */
const AUDIO_SHARE = 0.1;
/** Share of the progress bar for rendering motion scenes, when the timeline has any. */
const SCENES_SHARE = 0.35;
const WRITE_CHUNK = 8 * 1024 * 1024;

export class ExportCancelled extends Error {
    constructor() {
        super('Export cancelled');
    }
}

/** Output frame size: the shorter side is `resolution`, both sides even (as H.264 requires). */
export function exportSize(edit: Edit, project: Project, resolution: Resolution) {
    const aspect = aspectRatio(edit, project);
    const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
    return aspect >= 1 ? { width: even(resolution * aspect), height: resolution } : { width: resolution, height: even(resolution / aspect) };
}

/**
 * Renders the edited video to an MP4 in ~/Movies/Capturita/Exports and returns its path.
 * Frames are decoded from the recording with WebCodecs, drawn with the same renderer as the
 * editor preview, and encoded with the hardware H.264 encoder; audio is mixed offline with the
 * same scheduler as playback and encoded to AAC.
 */
/** The name an export gets unless the user types another: the source and when it was recorded. */
export function defaultExportName(project: Project) {
    const date = new Date(project.createdAt).toISOString().slice(0, 16).replace('T', ' ').replace(':', '.');
    return `${project.source.name} ${date}`;
}

/**
 * Renders a transparent ProRes 4444 `.mov` of one scene or overlay, or of the whole timeline's
 * scenes and overlays (the recording left empty), saves it in ~/Movies/Capturita/Exports and
 * returns its path. Scenes always play at SCENE_FPS.
 */
export async function exportTransparent(options: {
    project: Project;
    edit: Edit;
    source: TransparentSource;
    resolution: Resolution;
    /** Without extension; a number is added if the name is taken. */
    fileName?: string;
    onProgress: (progress: ExportProgress) => void;
    signal: AbortSignal;
}): Promise<string> {
    const { project, edit, onProgress, signal } = options;
    const { width, height } = exportSize(edit, project, options.resolution);
    onProgress({ phase: 'scenes', progress: 0 });
    let rendered: string;
    try {
        rendered = await renderTransparent(project, edit, options.source, width, height, (p, download) => onProgress(download === undefined ? { phase: 'scenes', progress: p * 0.98 } : { phase: 'browser', progress: download }), signal);
    } catch (error) {
        if (signal.aborted) throw new ExportCancelled();
        throw new Error(errorMessage(error));
    }
    if (signal.aborted) throw new ExportCancelled();
    onProgress({ phase: 'finishing', progress: 0.99 });
    const name = options.fileName?.trim().replace(/\.(mp4|gif|mov)$/i, '').trim() || defaultExportName(project);
    return invoke<string>('export_rendered', { name, from: rendered });
}

export async function exportVideo(options: {
    project: Project;
    edit: Edit;
    cursor: CursorData | null;
    settings: ExportSettings;
    /** The MP4's name without extension; a number is added if the name is taken. */
    fileName?: string;
    onProgress: (progress: ExportProgress) => void;
    signal: AbortSignal;
}): Promise<string> {
    const { project, edit, cursor, settings, onProgress, signal } = options;
    if (settings.format === 'mov') return exportTransparent({ project, edit, source: { kind: 'timeline' }, resolution: settings.resolution, fileName: options.fileName, onProgress, signal });
    const { screen, camera } = project.tracks;
    const total = totalDuration(edit.items);
    const { width, height } = exportSize(edit, project, settings.resolution);
    const checkCancelled = () => {
        if (signal.aborted) throw new ExportCancelled();
    };
    const gif = settings.format === 'gif';
    const hasScenes = edit.items.some((item) => item.kind === 'scene') || edit.overlays.length > 0;
    const scenesShare = hasScenes ? SCENES_SHARE : 0;
    const report = (phase: ExportProgress['phase'], progress: number) => onProgress({ phase, progress: scenesShare + (1 - scenesShare) * progress });

    // 0. Render motion scenes and overlays to files at the export size (unchanged ones are reused).
    let sceneFiles: SceneFiles = { scenes: new Map(), overlays: new Map() };
    if (hasScenes) {
        onProgress({ phase: 'scenes', progress: 0 });
        try {
            sceneFiles = await renderScenes(project, edit, width, height, (p, download) => onProgress(download === undefined ? { phase: 'scenes', progress: p * scenesShare } : { phase: 'browser', progress: download }), signal);
        } catch (error) {
            checkCancelled();
            throw new Error(errorMessage(error));
        }
        checkCancelled();
    }

    const path = await invoke<string>('export_open', {
        name: options.fileName?.trim().replace(/\.(mp4|gif)$/i, '').trim() || defaultExportName(project),
        ext: settings.format,
    });
    const inputs: Input[] = [];
    let output: Output | null = null;

    try {
        // 1. Mix the audio offline (GIFs are silent).
        report('audio', 0);
        const mixed = gif ? null : await renderAudio(project, edit, cursor, total);
        checkCancelled();

        // 2. Set up the MP4 (or GIF) file, streamed to disk in chunks.
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: gif });
        if (!ctx) throw new Error('Could not create a drawing surface for the export');
        await preloadBackground(project, edit.background);
        let videoSource: CanvasSource | null = null;
        let audioSource: AudioBufferSource | null = null;
        let gifEncoder: GifEncoder | null = null;
        if (gif) {
            let position = 0;
            gifEncoder = new GifEncoder(width, height, async (bytes) => {
                await invoke('export_write', bytes, { headers: { position: String(position) } });
                position += bytes.length;
            });
        } else {
            const writable = new WritableStream<StreamTargetChunk>({
                write: (chunk) => invoke('export_write', chunk.data, { headers: { position: String(chunk.position) } }),
            });
            output = new Output({
                format: new Mp4OutputFormat({ fastStart: false }),
                target: new StreamTarget(writable, { chunked: true, chunkSize: WRITE_CHUNK }),
            });
            videoSource = new CanvasSource(canvas, {
                codec: 'avc',
                bitrate: BITRATES[settings.quality] ?? QUALITY_HIGH,
                // The muxer reads the colour space (and so the file's range tag) from this metadata.
                onEncodedPacket: (_packet, meta) => correctColorSpace(meta),
            });
            output.addVideoTrack(videoSource, { frameRate: settings.fps });
            audioSource = mixed ? new AudioBufferSource({ codec: 'aac', bitrate: AUDIO_BITRATE }) : null;
            if (audioSource) output.addAudioTrack(audioSource);
            await output.start();
        }

        // 3. Decoders for the screen and camera tracks.
        // Read the recording in ranges; if that fails, fall back to loading the whole file.
        const open = async (track: VideoTrack) => {
            const url = fileUrl(project, track.file);
            const tryOpen = async (source: UrlSource | BlobSource) => {
                const input = new Input({ formats: ALL_FORMATS, source });
                inputs.push(input);
                const videoTrack = await input.getPrimaryVideoTrack();
                if (!videoTrack) throw new Error(`${track.file} has no video`);
                return new VideoSampleSink(videoTrack);
            };
            try {
                return await tryOpen(new UrlSource(url));
            } catch (error) {
                api.log(`[export] range reads failed for ${track.file} (${error}); loading the whole file`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`${track.file}: HTTP ${response.status}`);
                return tryOpen(new BlobSource(await response.blob()));
            }
        };
        // A Studio video has no screen recording to decode.
        const screenSink = screen.file ? await open(screen) : null;
        const cameraSink = camera && edit.camera.visible ? await open(camera) : null;

        // Every output frame's position in the recording (cuts and speed applied).
        const frameCount = Math.max(1, Math.round(total * settings.fps));
        const timeline = Array.from({ length: frameCount }, (_, i) => positionAt(edit.items, i / settings.fps));
        const positions = timeline.map((position) => position.source);
        const localTimes = (track: VideoTrack) =>
            positions.map((source) => Math.min(Math.max(0, source - track.offset), Math.max(0, track.duration - 0.001)));
        const screenFrames = screenSink ? screenSink.samplesAtTimestamps(localTimes(screen))[Symbol.asyncIterator]() : null;
        const cameraFrames = cameraSink && camera ? cameraSink.samplesAtTimestamps(localTimes(camera))[Symbol.asyncIterator]() : null;

        // Each scene's rendered file, read in order at the frames the timeline shows it. A scene
        // frame is picked exactly as the preview picks it: the frame its Player is seeked to.
        const sceneFrameStreams = new Map<string, AsyncIterator<VideoSample | null>>();
        for (const [itemId, file] of sceneFiles.scenes) {
            const times: number[] = [];
            for (const position of timeline) {
                const scene = position.scenes.find((s) => s.item.id === itemId);
                if (!scene) continue;
                const frame = Math.min(sceneFrames(scene.item.duration) - 1, Math.max(0, Math.floor(scene.time * SCENE_FPS)));
                times.push((frame + 0.5) / SCENE_FPS);
            }
            if (times.length === 0) continue;
            const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(fileUrl(project, file)) });
            inputs.push(input);
            const track = await input.getPrimaryVideoTrack();
            if (!track) throw new Error(`The rendered scene ${file} has no video`);
            sceneFrameStreams.set(itemId, new VideoSampleSink(track).samplesAtTimestamps(times)[Symbol.asyncIterator]());
        }
        // Each overlay's file, read the same way at the output frames it covers. WebKit draws
        // nothing for decoded I420A (VP9 with alpha) frames, so they go through CanvasSink, which
        // converts them to transparent canvases itself.
        const overlayTimes = timeline.map((_, i) => overlaysAt(edit.overlays, i / settings.fps));
        const overlayFrameStreams = new Map<string, AsyncIterator<WrappedCanvas | null>>();
        for (const [overlayId, file] of sceneFiles.overlays) {
            const times: number[] = [];
            for (const active of overlayTimes) {
                const overlay = active.find((o) => o.item.id === overlayId);
                if (!overlay) continue;
                const frame = Math.min(sceneFrames(overlay.item.duration) - 1, Math.max(0, Math.floor(overlay.time * SCENE_FPS)));
                times.push((frame + 0.5) / SCENE_FPS);
            }
            if (times.length === 0) continue;
            const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(fileUrl(project, file)) });
            inputs.push(input);
            const track = await input.getPrimaryVideoTrack();
            if (!track) throw new Error(`The rendered overlay ${file} has no video`);
            overlayFrameStreams.set(overlayId, new CanvasSink(track, { alpha: true }).canvasesAtTimestamps(times)[Symbol.asyncIterator]());
        }
        // WebKit ignores the source rectangle when drawing a VideoFrame (it always draws the whole
        // frame), which broke crop, zoom and the camera's square crop. Copy each frame onto a canvas
        // first; drawing from a canvas honours the source rectangle.
        const screenCanvas = document.createElement('canvas');
        // The recording is drawn here during transitions, then moved or faded onto the frame.
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = width;
        layerCanvas.height = height;
        const layerCtx = layerCanvas.getContext('2d')!;
        const cameraCanvas = document.createElement('canvas');
        const asSource = (sample: VideoSample | null | undefined, canvas: HTMLCanvasElement): FrameSource | null => {
            if (!sample) return null;
            const frameWidth = sample.displayWidth;
            const frameHeight = sample.displayHeight;
            if (canvas.width !== frameWidth) canvas.width = frameWidth;
            if (canvas.height !== frameHeight) canvas.height = frameHeight;
            canvas.getContext('2d')?.drawImage(sample.toCanvasImageSource(), 0, 0, frameWidth, frameHeight);
            return { image: canvas, width: frameWidth, height: frameHeight };
        };

        // 4. Draw and encode every frame, feeding audio just ahead of it.
        let audioAddedUntil = 0;
        const addAudioUntil = async (until: number) => {
            if (!audioSource || !mixed) return;
            while (audioAddedUntil < Math.min(until, total)) {
                const end = Math.min(total, audioAddedUntil + AUDIO_SLICE);
                await audioSource.add(sliceAudio(mixed, audioAddedUntil, end));
                audioAddedUntil = end;
            }
        };

        for (let i = 0; i < frameCount; i++) {
            checkCancelled();
            const time = i / settings.fps;
            await addAudioUntil(time + AUDIO_SLICE);
            const screenSample = screenFrames ? await nextSample(screenFrames) : null;
            const cameraSample = cameraFrames ? await nextSample(cameraFrames) : null;
            const cameraLocal = camera ? positions[i] - camera.offset : -1;
            const position = timeline[i];
            const sceneSamples: { sample: VideoSample | null; fx: LayerFx }[] = [];
            for (const scene of position.scenes) {
                const stream = sceneFrameStreams.get(scene.item.id);
                if (!stream) continue;
                const sample = await nextSample(stream);
                sceneSamples.push({ sample, fx: scene.fx });
            }
            const overlayCanvases: WrappedCanvas[] = [];
            for (const overlay of overlayTimes[i]) {
                const stream = overlayFrameStreams.get(overlay.item.id);
                const result = stream ? await stream.next() : null;
                if (result && !result.done && result.value) overlayCanvases.push(result.value);
            }
            try {
                // Same layering as the preview: the recording (or just the background when only
                // scenes are on screen), each scene with its transition look, a dip's colour wash,
                // then the overlays. A recording in a transition is drawn on its own canvas first.
                const transitioning = position.recording && !isIdentityFx(position.recordingFx);
                if (!position.recording || transitioning) fillBackground(ctx, edit.background, width, height, project);
                if (position.recording) drawFrame(transitioning ? layerCtx : ctx, width, height, {
                    edit,
                    project,
                    screen: asSource(screenSample, screenCanvas),
                    camera: asSource(cameraSample, cameraCanvas),
                    cameraActive: !!camera && cameraLocal >= 0 && cameraLocal < camera.duration,
                    cursor,
                    time: positions[i],
                });
                if (transitioning) drawLayer(ctx, layerCanvas, position.recordingFx, width, height);
                for (const { sample, fx } of sceneSamples) if (sample) drawLayer(ctx, sample.toCanvasImageSource(), fx, width, height);
                drawDip(ctx, position.dip, width, height);
                // Overlays on top of everything, in list order.
                for (const { canvas: overlay } of overlayCanvases) ctx.drawImage(overlay, 0, 0, width, height);
                // Captions follow output time, over scenes and overlays.
                drawCaptions(ctx, edit, time, width, height);
                if (gifEncoder) await gifEncoder.addFrame(ctx.getImageData(0, 0, width, height).data, 1 / settings.fps);
                else await videoSource!.add(time, 1 / settings.fps);
            } finally {
                screenSample?.close();
                cameraSample?.close();
                sceneSamples.forEach(({ sample }) => sample?.close());
            }
            if (i % 10 === 0) report('video', AUDIO_SHARE + (1 - AUDIO_SHARE) * (i / frameCount));
        }
        await addAudioUntil(total);

        // 5. Finish the file.
        report('finishing', 1);
        if (gifEncoder) await gifEncoder.finish();
        else await output!.finalize();
        await invoke('export_close', { keep: true });
        return path;
    } catch (error) {
        if (output && output.state !== 'finalized' && output.state !== 'canceled') await output.cancel().catch(() => {});
        await invoke('export_close', { keep: false }).catch(() => {});
        throw error;
    } finally {
        inputs.forEach((input) => input.dispose());
    }
}

async function nextSample(frames: AsyncIterator<VideoSample | null>) {
    const result = await frames.next();
    return result.done ? null : result.value;
}

/** Mixes every audio source of the edited timeline into one buffer, or null if it's silent. */
async function renderAudio(project: Project, edit: Edit, cursor: CursorData | null, total: number): Promise<AudioBuffer | null> {
    const clickTimes = cursor?.clicks.map(([t]) => t) ?? [];
    const hasClicks = edit.cursor.clickSound && clickTimes.length > 0;
    const music = edit.audio.music;
    const files = audioFiles(edit);
    if (!project.tracks.systemAudio && !project.tracks.microphone && !hasClicks && !music && files.length === 0) return null;

    const context = new OfflineAudioContext(2, Math.max(1, Math.ceil(total * SAMPLE_RATE)), SAMPLE_RATE);
    const tracks = await loadAudioTracks(
        context,
        [
            { kind: 'system', track: project.tracks.systemAudio },
            { kind: 'microphone', track: project.tracks.microphone },
        ],
        (track) => fileUrl(project, track.file)
    );
    scheduleTimeline(
        context,
        context.destination,
        {
            tracks,
            items: edit.items,
            mix: edit.audio,
            clicks: { enabled: edit.cursor.clickSound, type: edit.cursor.clickSoundType, volume: edit.cursor.clickVolume, times: clickTimes },
            stretched: new Map(),
            clickBuffer: { current: hasClicks ? (await loadClickSound(context, edit.cursor.clickSoundType)).buffer : null },
            music: music ? await loadMusic(context, fileUrl(project, music.file)) : null,
            overlays: edit.overlays,
            clips: await loadAudioFiles(context, files, (file) => fileUrl(project, file), undefined, (file, error) => {
                throw new Error(`Could not load ${file}: ${errorMessage(error)}`);
            }),
        },
        0,
        0
    );
    return context.startRendering();
}

/** Copies a time range of a buffer into a new one. */
function sliceAudio(buffer: AudioBuffer, from: number, to: number) {
    const start = Math.floor(from * buffer.sampleRate);
    const end = Math.min(buffer.length, Math.floor(to * buffer.sampleRate));
    const slice = new AudioBuffer({ length: Math.max(1, end - start), numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        slice.copyToChannel(buffer.getChannelData(channel).subarray(start, end), channel);
    }
    return slice;
}
