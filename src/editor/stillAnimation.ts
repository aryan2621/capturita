import { invoke } from '@tauri-apps/api/core';
import { CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, StreamTarget, type StreamTargetChunk } from 'mediabunny';
import type { Project } from '../lib/api';
import { correctColorSpace } from './encoderRange';
import type { Tilt } from './frameEffects';
import type { Edit } from './model';
import { drawFrame, preloadBackground, type FrameSource } from './render';

export type StillMotion = 'sway' | 'float';

export const STILL_MOTIONS: { value: StillMotion; label: string }[] = [
    { value: 'sway', label: 'Sway' },
    { value: 'float', label: 'Float' },
];

const SECONDS = 4;
const FPS = 30;
const WRITE_CHUNK = 4 * 1024 * 1024;

const tiltAt = (motion: StillMotion, t: number): Tilt => {
    const angle = t * Math.PI * 2;
    return motion === 'sway' ? { x: 3 + 3 * Math.sin(angle * 2), y: 14 * Math.sin(angle) } : { x: 8 * Math.sin(angle), y: 8 * Math.cos(angle) };
};

const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export async function exportStillAnimation(options: {
    project: Project;
    edit: Edit;
    image: FrameSource;
    motion: StillMotion;
    width: number;
    height: number;
    name: string;
    onProgress: (fraction: number) => void;
}): Promise<string> {
    const { project, edit, image, motion, name, onProgress } = options;
    const width = even(options.width);
    const height = even(options.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create a drawing surface');
    await preloadBackground(project, edit.background);

    const path = await invoke<string>('export_open', { name });
    const output = new Output({
        format: new Mp4OutputFormat({ fastStart: false }),
        target: new StreamTarget(new WritableStream<StreamTargetChunk>({ write: (chunk) => invoke('export_write', chunk.data, { headers: { position: String(chunk.position) } }) }), {
            chunked: true,
            chunkSize: WRITE_CHUNK,
        }),
    });
    const video = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_HIGH, onEncodedPacket: (_packet, meta) => correctColorSpace(meta) });
    output.addVideoTrack(video, { frameRate: FPS });
    try {
        await output.start();
        const frames = SECONDS * FPS;
        for (let i = 0; i < frames; i++) {
            drawFrame(ctx, width, height, { edit: { ...edit, tilt: tiltAt(motion, i / frames) }, project, screen: image, camera: null, cameraActive: false, cursor: null, time: 0 });
            await video.add(i / FPS, 1 / FPS);
            onProgress((i + 1) / frames);
        }
        await output.finalize();
        await invoke('export_close', { keep: true });
        return path;
    } catch (error) {
        if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel().catch(() => {});
        await invoke('export_close', { keep: false }).catch(() => {});
        throw error;
    }
}
