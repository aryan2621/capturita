import type { ReactNode } from 'react';
import { Easing, interpolate, random, spring } from 'remotion';
import { clamp } from './SceneBase';
import type { BrandColors } from './assets';

export const ELEMENTS = ['check', 'arrow', 'underline', 'ring', 'sparkles', 'burst', 'confetti'] as const;
export type ElementName = (typeof ELEMENTS)[number];

/** What each element draws from: its colour, the frames since it came in, and its box in pixels. */
interface Ctx {
    color: string;
    colors: BrandColors;
    local: number;
    fps: number;
    w: number;
    h: number;
}

const draw = (local: number, from: number, frames: number) => interpolate(local, [from, from + frames], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
const out = (local: number, from: number, frames: number) => interpolate(local, [from, from + frames], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
/** A spring that overshoots: 0 → 1 (peaking near 1.2) from frame `from`. */
const pop = ({ local, fps }: Ctx, from: number, damping = 9) => spring({ frame: local - from, fps, config: { damping, stiffness: 190 } });
/** Any CSS colour (the user's pick may be short hex or a name) at some opacity. */
const fade = (colour: string, a: number) => `color-mix(in srgb, ${colour} ${Math.round(Math.max(0, Math.min(1, a)) * 100)}%, transparent)`;

/** A stroke that draws itself as `p` goes 0 → 1 (pathLength normalises every path to 1). */
const stroke = (p: number, color: string, width: number) => ({ fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p });

/** Soft light around whatever it wraps. */
const Glow = ({ color, r, children }: { color: string; r: number; children: ReactNode }) => <g style={{ filter: `drop-shadow(0 0 ${r}px ${fade(color, 0.8)})` }}>{children}</g>;

// Strokes stretch to the box by their points, so a line keeps one width at any size.
const fitTo = (w: number, h: number) => (d: string, vw: number, vh: number) => {
    let i = 0;
    return d.replace(/-?\d+(\.\d+)?/g, (n) => String((Number(n) * (i++ % 2 === 0 ? w / vw : h / vh)).toFixed(1)));
};
const lineWidth = (w: number, h: number) => Math.max(2, Math.min(w, h) * 0.06);

const Svg = ({ w, h, children, square }: { w: number; h: number; children: ReactNode; square?: boolean }) => (
    <svg viewBox={square ? '0 0 100 100' : `0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>{children}</svg>
);

function Check(c: Ctx) {
    const { color, local } = c;
    const tickPop = pop(c, 11);
    return (
        <Svg w={c.w} h={c.h} square>
            <circle cx={50} cy={50} r={44} fill={fade(color, 0.14 * out(local, 4, 12))} />
            <Glow color={color} r={3}>
                <circle cx={50} cy={50} r={44} {...stroke(draw(local, 0, 12), color, 6)} transform="rotate(-90 50 50)" />
                <g transform={`translate(50 50) scale(${0.85 + 0.15 * Math.min(1.4, tickPop)}) translate(-50 -50)`}>
                    <path d="M30 52 L44 66 L71 37" {...stroke(draw(local, 8, 10), color, 8)} />
                </g>
            </Glow>
        </Svg>
    );
}

function Arrow(c: Ctx) {
    const { color, local, w, h } = c;
    const fit = fitTo(w, h);
    const line = lineWidth(w, h);
    return (
        <Svg w={w} h={h}>
            <Glow color={color} r={line * 0.9}>
                <path d={fit('M4 50 C 30 10, 60 6, 92 24', 100, 60)} {...stroke(draw(local, 0, 14), color, line)} />
                <path d={fit('M78 12 L93 24 L76 32', 100, 60)} {...stroke(draw(local, 12, 6), color, line)} />
            </Glow>
        </Svg>
    );
}

function Underline({ color, local, w, h }: Ctx) {
    const fit = fitTo(w, h);
    const p = draw(local, 0, 12);
    return (
        <Svg w={w} h={h}>
            <Glow color={color} r={h * 0.4}>
                <path d={fit('M2 12 C 20 4, 35 16, 52 9 S 85 6, 98 10', 100, 20)} {...stroke(p, color, Math.max(2, h * 0.3))} />
            </Glow>
            {p > 0 && p < 1 && <circle cx={w * (0.02 + 0.96 * p)} cy={h * 0.5} r={h * 0.3} fill={fade('#ffffff', 0.9)} />}
        </Svg>
    );
}

/** A hand-drawn loop around something, drawn twice a little apart like a marker pass. */
function Ring({ color, local, w, h }: Ctx) {
    const fit = fitTo(w, h);
    const width = lineWidth(w, h) * 0.6;
    const loop = fit('M60 6 C 92 6, 99 30, 90 44 C 78 60, 20 60, 6 42 C -4 26, 20 4, 54 6 L 66 9', 100, 60);
    return (
        <Svg w={w} h={h}>
            <Glow color={color} r={width}>
                <path d={loop} {...stroke(draw(local, 0, 16), color, width)} />
                <path d={loop} {...stroke(draw(local, 6, 16), fade(color, 0.45), width * 0.6)} transform={`translate(${w * 0.012} ${h * 0.03}) rotate(1.5 ${w / 2} ${h / 2})`} />
            </Glow>
        </Svg>
    );
}

const STARS = [
    { x: 30, y: 42, s: 1, d: 0 },
    { x: 72, y: 26, s: 0.62, d: 5 },
    { x: 68, y: 72, s: 0.48, d: 10 },
    { x: 14, y: 20, s: 0.3, d: 8 },
    { x: 86, y: 52, s: 0.26, d: 13 },
];
const STAR = 'M0 -1 C 0.1 -0.1, 0.1 -0.1, 1 0 C 0.1 0.1, 0.1 0.1, 0 1 C -0.1 0.1, -0.1 0.1, -1 0 C -0.1 -0.1, -0.1 -0.1, 0 -1 Z';

/** Stars that grow in past full size, then twinkle gently. */
function Sparkles(c: Ctx) {
    const { color, colors, local, fps } = c;
    return (
        <Svg w={c.w} h={c.h} square>
            <Glow color={color} r={2.5}>
                {STARS.map((star, i) => {
                    const twinkle = 0.85 + 0.15 * Math.sin(((local - star.d) / fps) * Math.PI * 2 * 0.8 + i);
                    const s = star.s * Math.max(0, pop(c, star.d, 8)) * twinkle * 26;
                    return <path key={i} d={STAR} fill={i === 0 ? colors.text : color} transform={`translate(${star.x} ${star.y}) scale(${s}) rotate(${local * 1.2 + i * 20})`} />;
                })}
            </Glow>
        </Svg>
    );
}

/** Rays flung outward, long and short alternating, thinning as they go. */
function Burst({ color, colors, local }: Ctx) {
    const p = out(local, 0, 18);
    return (
        <Svg w={100} h={100} square>
            <Glow color={color} r={2}>
                {Array.from({ length: 16 }, (_, i) => {
                    const a = (i / 16) * Math.PI * 2;
                    const long = i % 2 === 0;
                    const r0 = 14 + p * (long ? 22 : 14);
                    const r1 = 18 + p * (long ? 32 : 20);
                    return <line key={i} x1={50 + Math.cos(a) * r0} y1={50 + Math.sin(a) * r0} x2={50 + Math.cos(a) * r1} y2={50 + Math.sin(a) * r1} stroke={long ? color : colors.text} strokeWidth={(long ? 6 : 3) * (1 - p) + 1} strokeLinecap="round" opacity={1 - p} />;
                })}
            </Glow>
        </Svg>
    );
}

const PIECES = 64;

/** Seeded confetti shot up from the bottom centre, slowed by drag, fluttering as it falls. */
function Confetti({ color, colors, local, fps }: Ctx) {
    const palette = [color, colors.accent, colors.text, colors.muted];
    const t = local / fps;
    return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
            {Array.from({ length: PIECES }, (_, i) => {
                const vx = (random(`vx${i}`) - 0.5) * 100;
                const vy = -(75 + random(`vy${i}`) * 75);
                const drag = 1 - Math.exp(-t * 2.2);
                const x = 50 + (vx * drag) / 2.2;
                const y = 100 + (vy * drag) / 2.2 + 55 * t * t;
                const spin = random(`r${i}`) * 360 + t * (200 + random(`s${i}`) * 500);
                const flutter = Math.cos(t * (6 + random(`f${i}`) * 6) + i);
                const size = 0.8 + random(`z${i}`) * 0.9;
                return <rect key={i} x={-1.2 * size} y={-0.6 * size} width={2.4 * size} height={1.2 * size} fill={palette[i % palette.length]} transform={`translate(${x} ${y}) rotate(${spin}) scale(1 ${flutter})`} opacity={interpolate(t, [2.2, 3], [1, 0], clamp)} />;
            })}
        </svg>
    );
}

const VIEWS: Record<ElementName, (c: Ctx) => ReactNode> = { check: Check, arrow: Arrow, underline: Underline, ring: Ring, sparkles: Sparkles, burst: Burst, confetti: Confetti };

/**
 * A built-in animated element filling its box, animated from `local` (frames since it came in):
 * drawn strokes (check, arrow, underline, ring), growing sparkles, a one-off burst, or confetti.
 */
export function ElementView({ element, color, colors, local, fps, width, height }: { element: string; color: string; colors: BrandColors; local: number; fps: number; width: number; height: number }) {
    const View = VIEWS[element as ElementName];
    return View ? <>{View({ color, colors, local, fps, w: Math.max(1, width), h: Math.max(1, height) })}</> : null;
}
