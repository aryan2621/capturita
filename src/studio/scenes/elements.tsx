import { Easing, interpolate, random } from 'remotion';
import { clamp } from './SceneBase';
import type { BrandColors } from './assets';

export const ELEMENTS = ['check', 'arrow', 'underline', 'ring', 'sparkles', 'burst', 'confetti'] as const;
export type ElementName = (typeof ELEMENTS)[number];

const draw = (local: number, from: number, frames: number) => interpolate(local, [from, from + frames], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

/** A stroke that draws itself as `p` goes 0 → 1 (pathLength normalises every path to 1). */
const stroke = (p: number, color: string, width: number) => ({ fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p });

/**
 * A built-in animated element filling its box, animated from `local` (frames since it came in):
 * drawn strokes (check, arrow, underline, ring), twinkling sparkles, a one-off burst, or confetti.
 */
export function ElementView({ element, color, colors, local, fps, width, height }: { element: string; color: string; colors: BrandColors; local: number; fps: number; width: number; height: number }) {
    const svg = { width: '100%', height: '100%', overflow: 'visible' } as const;
    // Drawn strokes stretch to the box by their points, so the line keeps one width.
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const line = Math.max(2, Math.min(w, h) * 0.06);
    const fit = (d: string, vw: number, vh: number) => {
        let i = 0;
        return d.replace(/-?\d+(\.\d+)?/g, (n) => String((Number(n) * (i++ % 2 === 0 ? w / vw : h / vh)).toFixed(1)));
    };
    switch (element as ElementName) {
        case 'check': {
            const ring = draw(local, 0, 14);
            const tick = draw(local, 10, 12);
            return (
                <svg viewBox='0 0 100 100' style={svg} preserveAspectRatio='xMidYMid meet'>
                    <circle cx={50} cy={50} r={44} {...stroke(ring, color, 6)} transform='rotate(-90 50 50)' />
                    <path d='M30 52 L44 66 L71 37' {...stroke(tick, color, 8)} />
                </svg>
            );
        }
        case 'arrow': {
            const body = draw(local, 0, 16);
            const head = draw(local, 14, 6);
            return (
                <svg viewBox={`0 0 ${w} ${h}`} style={svg}>
                    <path d={fit('M4 50 C 30 10, 60 6, 92 24', 100, 60)} {...stroke(body, color, line)} />
                    <path d={fit('M78 12 L93 24 L76 32', 100, 60)} {...stroke(head, color, line)} />
                </svg>
            );
        }
        case 'underline':
            return (
                <svg viewBox={`0 0 ${w} ${h}`} style={svg}>
                    <path d={fit('M2 12 C 20 4, 35 16, 52 9 S 85 6, 98 10', 100, 20)} {...stroke(draw(local, 0, 14), color, Math.max(2, h * 0.3))} />
                </svg>
            );
        case 'ring':
            return (
                <svg viewBox={`0 0 ${w} ${h}`} style={svg}>
                    <path d={fit('M60 6 C 92 6, 99 30, 90 44 C 78 60, 20 60, 6 42 C -4 26, 20 4, 54 6 L 66 9', 100, 60)} {...stroke(draw(local, 0, 18), color, line * 0.6)} />
                </svg>
            );
        case 'sparkles': {
            const stars = [
                { x: 30, y: 40, s: 1, d: 0 },
                { x: 72, y: 26, s: 0.6, d: 8 },
                { x: 66, y: 74, s: 0.45, d: 15 },
            ];
            return (
                <svg viewBox='0 0 100 100' style={svg}>
                    {stars.map((star, i) => {
                        // Grows in, then twinkles on a slow loop.
                        const grow = draw(local, star.d, 10);
                        const twinkle = 0.75 + 0.25 * Math.sin(((local - star.d) / fps) * Math.PI * 2 * 0.8 + i);
                        const s = star.s * grow * twinkle * 26;
                        return <path key={i} d='M0 -1 C 0.1 -0.1, 0.1 -0.1, 1 0 C 0.1 0.1, 0.1 0.1, 0 1 C -0.1 0.1, -0.1 0.1, -1 0 C -0.1 -0.1, -0.1 -0.1, 0 -1 Z' fill={color} transform={`translate(${star.x} ${star.y}) scale(${s}) rotate(${local * 1.5})`} />;
                    })}
                </svg>
            );
        }
        case 'burst': {
            const p = interpolate(local, [0, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
            return (
                <svg viewBox='0 0 100 100' style={svg}>
                    {Array.from({ length: 12 }, (_, i) => {
                        const a = (i / 12) * Math.PI * 2;
                        const r0 = 14 + p * 22;
                        const r1 = 18 + p * 32;
                        return <line key={i} x1={50 + Math.cos(a) * r0} y1={50 + Math.sin(a) * r0} x2={50 + Math.cos(a) * r1} y2={50 + Math.sin(a) * r1} stroke={color} strokeWidth={6 * (1 - p) + 1} strokeLinecap='round' opacity={1 - p} />;
                    })}
                </svg>
            );
        }
        case 'confetti': {
            const palette = [color, colors.accent, colors.text, colors.muted];
            const t = local / fps;
            return (
                <svg viewBox='0 0 100 100' style={svg} preserveAspectRatio='none'>
                    {Array.from({ length: 48 }, (_, i) => {
                        // Seeded, so every render of a frame is the same: shot up from the bottom centre, then falls.
                        const vx = (random(`vx${i}`) - 0.5) * 90;
                        const vy = -(70 + random(`vy${i}`) * 70);
                        const x = 50 + vx * t;
                        const y = 100 + vy * t + 75 * t * t;
                        const spin = random(`r${i}`) * 360 + t * (200 + random(`s${i}`) * 400);
                        return <rect key={i} x={-1.2} y={-0.6} width={2.4} height={1.2} fill={palette[i % palette.length]} transform={`translate(${x} ${y}) rotate(${spin})`} opacity={interpolate(t, [2.2, 3], [1, 0], clamp)} />;
                    })}
                </svg>
            );
        }
        default:
            return null;
    }
}
