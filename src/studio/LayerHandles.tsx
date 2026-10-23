import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { LAYER_BASE, layerAspect, layerFor, layerFrom, layerPose, visualBox, withKey, type Layer } from './scenes/layers';

type Guide = { axis: 'x' | 'y'; at: number };

/** The offset that brings the nearest of `edges` onto one of `targets` within `tolerance`, and where it lands. */
function snap(edges: number[], targets: number[], tolerance: number) {
    let best: { offset: number; at: number } | null = null;
    for (const edge of edges) for (const target of targets) if (Math.abs(target - edge) <= tolerance && (!best || Math.abs(target - edge) < Math.abs(best.offset))) best = { offset: target - edge, at: target };
    return best;
}

/**
 * Outlines over the preview for a Custom scene's layers on screen: click one to select it, drag
 * it to move, drag the corner to resize. A layer with keyframes moves by its keyframe at the
 * playhead (made if missing), so dragging at two times animates it. Edges and centres snap to
 * the frame and the other layers (hold Option to place freely); a layer's group moves with it.
 * Edits land in the layer's own layout for this frame shape when it has one.
 */
export function LayerHandles({
    layers,
    selected,
    time,
    width,
    height,
    onSelect,
    onChange,
}: {
    layers: Layer[];
    selected: number | null;
    /** Seconds into the scene. */
    time: number;
    width: number;
    height: number;
    onSelect: (index: number) => void;
    onChange: (layers: Layer[]) => void;
}) {
    const [guides, setGuides] = useState<Guide[]>([]);
    const aspect = layerAspect(width, height);
    const shown = layers.map((raw) => layerFor({ ...LAYER_BASE, ...raw }, aspect));
    const drag = (event: ReactPointerEvent<HTMLDivElement>, index: number, mode: 'move' | 'resize') => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(index);
        const layer = shown[index];
        const pose = layerPose(layer, time);
        // Its group: the run of neighbours sharing its group (as the panel links them).
        const group = [index];
        for (let i = index - 1; layer.group !== undefined && shown[i]?.group === layer.group; i--) group.push(i);
        for (let i = index + 1; layer.group !== undefined && shown[i]?.group === layer.group; i++) group.push(i);
        const others = shown.filter((l, i) => !group.includes(i) && time >= l.at).map((l) => visualBox(l, layerPose(l, time), width, height));
        const xs = [0, 50, 100, ...others.flatMap((b) => [b.x, b.x + b.w / 2, b.x + b.w])];
        const ys = [0, 50, 100, ...others.flatMap((b) => [b.y, b.y + b.h / 2, b.y + b.h])];
        const own = visualBox(layer, pose, width, height);
        // A scaled or turned box's corner doesn't follow the pointer while resizing, so only plain boxes snap then.
        const snaps = mode === 'move' || (pose.scale === 1 && pose.rotate === 0);
        const start = { x: event.clientX, y: event.clientY };
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        const move = (e: PointerEvent) => {
            let dx = ((e.clientX - start.x) / width) * 100;
            let dy = ((e.clientY - start.y) / height) * 100;
            const found: Guide[] = [];
            if (!e.altKey && snaps) {
                const edges = (at: number, size: number) => (mode === 'resize' ? [at + size] : [at, at + size / 2, at + size]);
                const sx = snap(edges(own.x + dx, own.w), xs, (6 / width) * 100);
                const sy = snap(edges(own.y + dy, own.h), ys, (6 / height) * 100);
                if (sx) (dx += sx.offset), found.push({ axis: 'x', at: sx.at });
                if (sy) (dy += sy.offset), found.push({ axis: 'y', at: sy.at });
            }
            setGuides(found);
            const round = (v: number) => Math.round(v * 10) / 10;
            const next = new Map<number, Layer>();
            if (mode === 'resize') next.set(index, { ...layer, w: Math.max(1, round(layer.w + dx / pose.scale)), h: Math.max(1, round(layer.h + dy / pose.scale)) });
            else
                for (const i of group) {
                    const l = shown[i];
                    const p = layerPose(l, time);
                    next.set(i, l.keys?.length ? withKey(l, time, { ...p, x: round(p.x + dx), y: round(p.y + dy) }) : { ...l, x: round(l.x + dx), y: round(l.y + dy) });
                }
            onChange(layers.map((raw, i) => (next.has(i) ? layerFrom({ ...LAYER_BASE, ...raw }, aspect, next.get(i)!) : raw)));
        };
        const up = () => {
            setGuides([]);
            target.removeEventListener('pointermove', move);
            target.removeEventListener('pointerup', up);
        };
        target.addEventListener('pointermove', move);
        target.addEventListener('pointerup', up);
    };

    return (
        <div className='pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg'>
            {guides.map((g) => (
                <div key={g.axis} className='absolute bg-accent' style={g.axis === 'x' ? { left: `${g.at}%`, top: 0, bottom: 0, width: 1 } : { top: `${g.at}%`, left: 0, right: 0, height: 1 }} />
            ))}
            {shown.map((layer, index) => {
                if (time < layer.at) return null;
                const pose = layerPose(layer, time);
                const active = index === selected;
                const grouped = !active && selected !== null && layer.group !== undefined && shown[selected]?.group === layer.group;
                return (
                    <div
                        key={index}
                        className={`pointer-events-auto absolute cursor-move rounded-sm border ${active ? 'border-2 border-accent' : grouped ? 'border-accent' : 'border-dashed border-white/40 hover:border-white/80'}`}
                        style={{ left: `${pose.x}%`, top: `${pose.y}%`, width: `${layer.w}%`, height: `${layer.h}%`, transform: `rotate(${pose.rotate}deg) scale(${pose.scale})` }}
                        onPointerDown={(e) => drag(e, index, 'move')}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {active && <div className='absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-accent bg-panel' onPointerDown={(e) => drag(e, index, 'resize')} />}
                    </div>
                );
            })}
        </div>
    );
}
