import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { fileUrl, type Project } from '../lib/api';
import type { Segment, TargetRect } from './scenes/assets';

const MIN_SIZE = 0.02;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Covers the preview with the recording's frame at the start of a scene's segment, so a callout
 * target can be drawn on it: drag on empty space to draw a box, drag the box to move it, drag its
 * corner to resize. The rect is normalized to the recorded area, like cursor positions.
 */
export function TargetPicker({
    project,
    previewFile,
    segment,
    rect,
    width,
    height,
    onChange,
    onDone,
}: {
    project: Project;
    previewFile: string | null;
    segment: Segment;
    rect: TargetRect;
    width: number;
    height: number;
    onChange: (rect: TargetRect) => void;
    onDone: () => void;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const screen = project.tracks.screen;
    const time = Math.max(0, segment.start - screen.offset);
    // The frame, fitted inside the preview.
    const scale = Math.min(width / screen.width, height / screen.height);
    const box = { width: screen.width * scale, height: screen.height * scale };
    const left = (width - box.width) / 2;
    const top = (height - box.height) / 2;

    useEffect(() => {
        if (video.current && video.current.readyState >= 1) video.current.currentTime = time;
    }, [time]);

    const drag = (event: ReactPointerEvent<HTMLDivElement>, mode: 'draw' | 'move' | 'resize') => {
        event.preventDefault();
        event.stopPropagation();
        const surface = event.currentTarget.closest('[data-target-surface]') as HTMLElement;
        const bounds = surface.getBoundingClientRect();
        const point = (e: PointerEvent | ReactPointerEvent) => ({ x: clamp01((e.clientX - bounds.left) / bounds.width), y: clamp01((e.clientY - bounds.top) / bounds.height) });
        const start = point(event);
        const initial = { ...rect };
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        const move = (e: PointerEvent) => {
            const p = point(e);
            if (mode === 'draw') {
                onChange({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), width: Math.max(MIN_SIZE, Math.abs(p.x - start.x)), height: Math.max(MIN_SIZE, Math.abs(p.y - start.y)) });
            } else if (mode === 'move') {
                onChange({ ...initial, x: Math.min(1 - initial.width, Math.max(0, initial.x + p.x - start.x)), y: Math.min(1 - initial.height, Math.max(0, initial.y + p.y - start.y)) });
            } else {
                onChange({ ...initial, width: Math.max(MIN_SIZE, p.x - initial.x), height: Math.max(MIN_SIZE, p.y - initial.y) });
            }
        };
        const up = () => {
            target.removeEventListener('pointermove', move);
            target.removeEventListener('pointerup', up);
        };
        target.addEventListener('pointermove', move);
        target.addEventListener('pointerup', up);
    };

    return (
        <div className='absolute inset-0 z-10 overflow-hidden rounded-lg bg-black'>
            <div data-target-surface className='absolute cursor-crosshair' style={{ left, top, width: box.width, height: box.height }} onPointerDown={(e) => drag(e, 'draw')}>
                <video
                    ref={video}
                    src={fileUrl(project, previewFile ?? screen.file)}
                    muted
                    playsInline
                    preload='auto'
                    onLoadedMetadata={(e) => (e.currentTarget.currentTime = time)}
                    className='pointer-events-none h-full w-full'
                />
                <div
                    className='absolute cursor-move rounded-md border-2 border-accent bg-accent/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]'
                    style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}
                    onPointerDown={(e) => drag(e, 'move')}
                >
                    <div className='absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-accent bg-panel' onPointerDown={(e) => drag(e, 'resize')} />
                </div>
            </div>
            <div className='absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-3 rounded-full bg-panel/95 py-1.5 pl-3 pr-1.5 text-xs text-muted shadow'>
                Drag to draw the target, or move and resize the box
                <button onClick={onDone} className='rounded-full bg-accent px-3 py-1 font-medium text-accent-fg'>
                    Done
                </button>
            </div>
        </div>
    );
}
