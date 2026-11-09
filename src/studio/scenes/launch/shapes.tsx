// Abstract shape-animation scenes (see catalog-shapes.ts; the rest live in shapes2.tsx). Geometry is the hero, the headline lockup is part of the composition.
import type { CSSProperties, ReactNode } from 'react';
import { Headline, Kicker, Rule, Stage, Sub, easeOut, seeded, useKit, type Kit, type LaunchProps } from './kit';

export const TAU = Math.PI * 2;
import { clamp01, lerp } from '../../../lib/math';
import { smoothPath } from '../../../lib/curve';
export { clamp01, lerp };
export const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
/** A #rrggbb brand colour at some opacity. */
export const al = (colour: string, a: number) => `${colour}${Math.round(clamp01(a) * 255).toString(16).padStart(2, '0')}`;
export const glow = (k: Kit, colour: string, r = 3): CSSProperties => ({ filter: `drop-shadow(0 0 ${k.u * r}px ${colour})` });
export const shortSide = (k: Kit) => Math.min(k.width, k.height);

/** Full-frame SVG in pixel units so shapes can be sized from the short side. */
export const Canvas = ({ k, children, style }: { k: Kit; children: ReactNode; style?: CSSProperties }) => (
    <svg width={k.width} height={k.height} viewBox={`0 0 ${k.width} ${k.height}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', ...style }}>{children}</svg>
);

/** A soft accent light behind the shapes. */
export const Aura = ({ k, x, y, r, a = 0.25, scale = 1 }: { k: Kit; x: number; y: number; r: number; a?: number; scale?: number }) => (
    <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${al(k.c.accent, a)}, transparent 68%)`, transform: `scale(${scale})`, pointerEvents: 'none' }} />
);

/** An expanding ring that fades: the "hit" flash. */
export const Shock = ({ k, x, y, r0, r1, t0, t1 = t0 + 0.8, width = 0.35, a = 0.7 }: { k: Kit; x: number; y: number; r0: number; r1: number; t0: number; t1?: number; width?: number; a?: number }) => {
    const t = k.ramp(t0, t1);
    return t <= 0 || t >= 1 ? null : <circle cx={x} cy={y} r={lerp(r0, r1, easeOut(t))} fill="none" stroke={k.c.accent} strokeWidth={k.u * width * (1 - t * 0.7)} opacity={a * (1 - t)} />;
};

type Place = 'side' | 'sideLeft' | 'center' | 'top' | 'bottom';
/** Eyebrow, headline and subtitle placed as part of the composition: beside the shape in wide frames, below it in tall ones. */
export function Lockup({ k, p, t0 = 1, place = 'side', maxW, size = 5.2 }: { k: Kit; p: LaunchProps; t0?: number; place?: Place; maxW?: number; size?: number }) {
    const side = (place === 'side' || place === 'sideLeft') && !k.stacked;
    const spot: CSSProperties = side
        ? { top: 0, bottom: 0, justifyContent: 'center', ...(place === 'side' ? { left: '54%', width: '38%' } : { left: '7%', width: '40%' }) }
        : place === 'center' ? { inset: 0, justifyContent: 'center' } : place === 'top' ? { top: '8%', left: 0, right: 0 } : { bottom: '7%', left: 0, right: 0 };
    const part = (i: number): CSSProperties => {
        const a = k.pop(t0 + i * 0.12, 14);
        return { opacity: Math.min(1, a * 1.4), transform: `translateY(${(1 - a) * k.u * 3}px)`, textAlign: 'inherit', maxWidth: maxW ?? '100%' };
    };
    return (
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: side ? 'flex-start' : 'center', textAlign: side ? 'left' : 'center', gap: k.u * 2.2, padding: `0 ${k.u * 2}px`, ...spot }}>
            <Kicker k={k} style={part(0)}>{p.eyebrow}</Kicker>
            {p.headline && <Headline k={k} size={size} style={{ ...part(1), textShadow: `0 ${k.u * 0.6}px ${k.u * 3}px ${al(k.c.bg, 0.55)}` }}>{p.headline}</Headline>}
            {(p.eyebrow || p.headline) && <Rule k={k} width={side ? 12 : 16} progress={k.pop(t0 + 0.25)} />}
            <Sub k={k} style={part(2)}>{p.subtitle}</Sub>
        </div>
    );
}

// ---------------------------------------------------------------------------------------------

function blobPath(cx: number, cy: number, R: number, radii: number[], rot: number) {
    return smoothPath(radii.map((r, i) => polar(cx, cy, R * r, rot + (i / radii.length) * TAU)), true);
}

const BLOBS = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0.72, 1.12, 0.78, 1.04, 0.7, 1.14, 0.8],
    [0.78, 1.16, 0.74, 1.1, 0.8, 1.18, 0.72, 1.12],
    [1, 0.96, 1.02, 0.95, 1, 0.97, 1.03, 0.95],
];

export function ShapeBlob(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const side = !k.stacked;
    const cx = side ? k.width * 0.3 : k.width / 2;
    const cy = side ? k.height / 2 : k.height * 0.36;
    const R = M * (side ? 0.3 : 0.27);
    /** Radii blended through the three morphs on springs, so each snap overshoots; `lag` makes echoes follow the lead. */
    const radii = (lag: number) => {
        const [a, b, c] = [k.pop(0.5 + lag, 9), k.pop(1.2 + lag, 9), k.pop(1.9 + lag, 9)];
        return BLOBS[0].map((r, i) => r + (BLOBS[1][i] - r) * a + (BLOBS[2][i] - BLOBS[1][i]) * b + (BLOBS[3][i] - BLOBS[2][i]) * c + 0.015 * Math.sin(k.s * 1.7 + i * 1.3));
    };
    const born = k.pop(0, 12);
    const rot = k.s * 0.1;
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={R * 2.2} a={0.28} scale={born} />
            <Canvas k={k}>
                <defs>
                    <radialGradient id="sb-fill" cx="35%" cy="30%" r="80%">
                        <stop offset="0" stopColor={k.c.text} stopOpacity="0.5" />
                        <stop offset="0.45" stopColor={k.c.accent} />
                        <stop offset="1" stopColor={k.c.accent} stopOpacity="0.8" />
                    </radialGradient>
                </defs>
                <path d={blobPath(cx, cy, R * 1.4 * born, radii(0.16), -rot * 0.6)} fill={al(k.c.accent, 0.1)} />
                <path d={blobPath(cx, cy, R * 1.17 * born, radii(0.08), rot * 0.5)} fill="none" stroke={al(k.c.accent, 0.5)} strokeWidth={k.u * 0.25} />
                <g style={{ filter: `drop-shadow(0 ${k.u * 3}px ${k.u * 5}px ${al(k.c.bg, 0.8)}) drop-shadow(0 0 ${k.u * 5}px ${al(k.c.accent, 0.5)})` }}>
                    <path d={blobPath(cx, cy, R * born, radii(0), rot)} fill="url(#sb-fill)" />
                </g>
                {[0, 1, 2].map((i) => {
                    const a = k.pop(1.2 + i * 0.12, 10);
                    const [x, y] = polar(cx, cy, R * (1.38 + i * 0.1), -0.9 + i * 2.1 + k.s * (0.25 - i * 0.07));
                    return <circle key={i} cx={x} cy={y} r={M * (0.012 + i * 0.006) * a} fill={i === 1 ? k.c.text : k.c.accent} opacity={0.9} style={glow(k, k.c.accent, 1.5)} />;
                })}
                <Shock k={k} x={cx} y={cy} r0={R} r1={R * 1.9} t0={1.2} />
            </Canvas>
            <Lockup k={k} p={p} t0={1.5} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

export function ShapeOrbit(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const side = !k.stacked;
    const cx = side ? k.width * 0.3 : k.width / 2;
    const cy = side ? k.height / 2 : k.height * 0.36;
    const TARGET = -0.55;
    /** Angle at time `t`: fast spin that decelerates onto the same alignment, planets landing in a line. */
    const angle = (i: number, t: number) => TARGET + (i % 2 ? -1 : 1) * TAU * (2 + i) * (1 - easeOut((t - 0.2) / 2.9));
    const born = k.pop(0, 12);
    const core = M * 0.05 * (1 + 0.4 * Math.exp(-Math.max(0, k.s - 3.1) * 3) * Math.sin(Math.max(0, k.s - 3.1) * 14 + 1.5));
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={M * 0.62} a={0.22} scale={born} />
            <Canvas k={k}>
                <defs>
                    <radialGradient id="so-core" cx="35%" cy="30%" r="80%">
                        <stop offset="0" stopColor={k.c.text} stopOpacity="0.8" />
                        <stop offset="0.5" stopColor={k.c.accent} />
                        <stop offset="1" stopColor={k.c.accent} stopOpacity="0.75" />
                    </radialGradient>
                </defs>
                <g transform={`rotate(-18 ${cx} ${cy})`}>
                    {[0, 1, 2].map((i) => {
                        const rx = M * (0.16 + 0.12 * i) * k.pop(0.15 + i * 0.15, 11);
                        const ry = rx * 0.42;
                        const pr = M * (0.03 - i * 0.006);
                        const col = [k.c.accent, k.c.text, k.c.muted][i];
                        const at = (t: number): [number, number] => [cx + Math.cos(angle(i, t)) * rx, cy + Math.sin(angle(i, t)) * ry];
                        const [px, py] = at(k.s);
                        return (
                            <g key={i}>
                                <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={al(k.c.muted, 0.3)} strokeWidth={k.u * 0.2} />
                                {Array.from({ length: 12 }, (_, j) => {
                                    const [x, y] = at(k.s - (j + 1) * 0.03);
                                    return <circle key={j} cx={x} cy={y} r={pr * (1 - (j + 1) / 14)} fill={col} opacity={0.5 * (1 - j / 12)} />;
                                })}
                                <circle cx={px} cy={py} r={pr * k.pop(0.3 + i * 0.15, 10)} fill={col} style={glow(k, col, 2 + 3 * Math.exp(-Math.abs(k.s - 3.1) * 3))} />
                            </g>
                        );
                    })}
                </g>
                <circle cx={cx} cy={cy} r={core * born} fill="url(#so-core)" style={glow(k, k.c.accent, 5)} />
                <Shock k={k} x={cx} y={cy} r0={core} r1={M * 0.5} t0={3.1} t1={4.2} />
            </Canvas>
            <Lockup k={k} p={p} t0={2.5} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

export function ShapeRings(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const [cx, cy] = [k.width / 2, k.height / 2];
    const RINGS = 7;
    const inner = M * (k.stacked ? 0.36 : 0.3);
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={M * 0.9} a={0.2} scale={k.pop(0, 14)} />
            <Canvas k={k}>
                <defs>
                    <radialGradient id="sr-disc"><stop offset="0" stopColor={k.c.bg} stopOpacity="0.8" /><stop offset="1" stopColor={k.c.bg} stopOpacity="0" /></radialGradient>
                </defs>
                <circle cx={cx} cy={cy} r={inner * 1.1 * k.pop(0, 12)} fill="url(#sr-disc)" />
                {Array.from({ length: RINGS }, (_, i) => {
                    const r = M * (k.stacked ? 0.36 : 0.3) + M * 0.085 * i;
                    const rad = r * k.pop(0.1 + i * 0.07, 11) * (1 + 0.012 * Math.sin(k.s * 2.2 - i * 0.6));
                    const dashed = i % 2 === 1;
                    return (
                        <circle key={i} cx={cx} cy={cy} r={rad} fill={i === 2 ? al(k.c.accent, 0.05) : 'none'} stroke={i === 1 ? k.c.accent : al(k.c.muted, 0.55 - i * 0.05)} strokeWidth={k.u * (i === 1 ? 0.45 : i % 3 === 0 ? 0.35 : 0.18)}
                            strokeDasharray={dashed ? `${k.u * 1.6} ${k.u * 1.3}` : undefined} strokeDashoffset={dashed ? k.s * k.u * (i % 4 === 1 ? 5 : -5) : undefined} style={i === 1 ? glow(k, k.c.accent, 2) : undefined} />
                    );
                })}
                {[0, 1, 2, 3, 4].map((i) => {
                    const ring = 1 + (i % 4) * 1.6;
                    const [x, y] = polar(cx, cy, (M * (k.stacked ? 0.36 : 0.3) + M * 0.085 * Math.round(ring)) * k.pop(0.6 + i * 0.08, 10), seeded(i + 4) * TAU + k.s * (i % 2 ? 0.12 : -0.1));
                    return <circle key={i} cx={x} cy={y} r={M * (0.007 + 0.006 * (i % 3))} fill={i % 2 ? k.c.text : k.c.accent} style={glow(k, k.c.accent, 1.6)} />;
                })}
                {[0, 0.18, 0.36].map((d, i) => <Shock key={i} k={k} x={cx} y={cy} r0={inner * 0.5} r1={M * 1.1} t0={0.9 + d} t1={2.2 + d} width={0.5 - i * 0.12} a={0.65 - i * 0.2} />)}
            </Canvas>
            <Lockup k={k} p={p} t0={1.1} place="center" maxW={inner * 1.75} size={4.4} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

export function ShapeWaves(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const HIT = 1;
    const splash = 1 + 1.6 * Math.exp(-Math.max(0, k.s - HIT) * 2.2);
    const wave = (i: number, top: number) => {
        const amp = M * (0.02 + 0.009 * i) * splash;
        const wl = k.width / (1.2 + 0.35 * i);
        const ph = k.s * (0.9 + 0.35 * i) * (i % 2 ? -1 : 1) + i * 1.3;
        const step = k.width / 48;
        let d = `M-10,${k.height + 20}`;
        for (let x = -10; x <= k.width + step; x += step) d += `L${x},${top + amp * Math.sin((x / wl) * TAU + ph) + amp * 0.4 * Math.sin((x / wl) * TAU * 2.3 - ph * 1.4)}`;
        return `${d}L${k.width + 20},${k.height + 20}Z`;
    };
    const fills = [al(k.c.muted, 0.16), al(k.c.surface, 0.9), al(k.c.accent, 0.22), al(k.c.accent, 0.55), k.c.accent];
    const tops = [0.52, 0.58, 0.64, 0.7, 0.77];
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height * 0.55} r={M * 0.8} a={0.35} scale={k.pop(0.2, 12)} />
            <Canvas k={k}>
                {fills.map((f, i) => {
                    const rise = k.pop(0.1 + i * 0.1, 10);
                    const top = lerp(k.height + M * 0.1, k.height * tops[i], rise);
                    return <path key={i} d={wave(i, top)} fill={f} stroke={i > 2 ? al(k.c.text, 0.35) : 'none'} strokeWidth={k.u * 0.2} style={i === 4 ? { filter: `drop-shadow(0 ${-k.u * 1.5}px ${k.u * 3}px ${al(k.c.accent, 0.5)})` } : undefined} />;
                })}
                {Array.from({ length: 10 }, (_, i) => {
                    const t = k.s - HIT - seeded(i) * 0.1;
                    if (t < 0 || t > 1.6) return null;
                    const x = k.width * (0.3 + 0.4 * seeded(i + 20)) + (seeded(i + 40) - 0.5) * M * 0.2 * t;
                    const y = k.height * tops[3] - (M * (0.5 + 0.5 * seeded(i + 60))) * t + M * 0.45 * t * t;
                    return <circle key={i} cx={x} cy={y} r={M * (0.006 + 0.01 * seeded(i + 80))} fill={i % 3 ? k.c.accent : k.c.text} opacity={1 - t / 1.6} />;
                })}
            </Canvas>
            <Lockup k={k} p={p} t0={1.2} place="top" size={6} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

const RANK = [0, 2, 4, 1, 3];
const FALL = 0.5;
/** Fraction of the drop height at time `t` for a ball that falls in FALL seconds and keeps 45% of its speed per bounce. */
function bounce(t: number) {
    if (t <= 0) return 1;
    if (t < FALL) return 1 - (t / FALL) ** 2;
    let rest = t - FALL;
    for (let n = 1; n < 7; n++) {
        const half = FALL * 0.45 ** n;
        if (rest < 2 * half) return 0.45 ** (2 * n) * (1 - ((rest - half) / half) ** 2);
        rest -= 2 * half;
    }
    return 0;
}

export function ShapeBalls(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const floor = k.height * (k.stacked ? 0.64 : 0.7);
    const gap = Math.min(M * 0.2, k.width * 0.17);
    const radii = [0.05, 0.062, 0.078, 0.062, 0.05].map((r) => r * M);
    const draw = k.ramp(0.1, 0.9);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={floor} r={M * 0.7} a={0.18} />
            <Canvas k={k}>
                <defs>
                    <radialGradient id="sbl-a" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor={k.c.text} stopOpacity="0.7" /><stop offset="0.5" stopColor={k.c.accent} /><stop offset="1" stopColor={k.c.accent} stopOpacity="0.8" /></radialGradient>
                    <radialGradient id="sbl-s" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor={k.c.muted} stopOpacity="0.9" /><stop offset="1" stopColor={k.c.surface} /></radialGradient>
                    <linearGradient id="sbl-f"><stop offset="0" stopColor={k.c.accent} stopOpacity="0" /><stop offset="0.5" stopColor={k.c.accent} stopOpacity="0.8" /><stop offset="1" stopColor={k.c.accent} stopOpacity="0" /></linearGradient>
                </defs>
                <rect x={k.width / 2 - gap * 3.2 * draw} y={floor} width={gap * 6.4 * draw} height={k.u * 0.25} fill="url(#sbl-f)" />
                {radii.map((r, i) => {
                    const x = k.width / 2 + (i - 2) * gap;
                    const land = 0.15 + RANK[i] * 0.17 + FALL;
                    const off = bounce(k.s - (land - FALL)) * floor;
                    const squash = clamp01(1 - off / (r * 0.5));
                    const hero = i === 2;
                    const ring = k.ramp(land, land + 0.6);
                    return (
                        <g key={i}>
                            <ellipse cx={x} cy={floor + r * 0.1} rx={r * (1.1 - 0.5 * clamp01(off / M))} ry={r * 0.18} fill="#000" opacity={0.4 * (1 - clamp01(off / (M * 0.6)))} />
                            {ring > 0 && ring < 1 && <ellipse cx={x} cy={floor} rx={r * (1 + ring * 2)} ry={r * (0.15 + ring * 0.25)} fill="none" stroke={k.c.accent} strokeWidth={k.u * 0.25} opacity={0.6 * (1 - ring)} />}
                            <g transform={`translate(${x} ${floor - off}) scale(${1 + 0.22 * squash} ${1 - 0.28 * squash})`} style={hero ? glow(k, k.c.accent, 4) : undefined}>
                                <circle cx={0} cy={-r} r={r} fill={hero ? 'url(#sbl-a)' : 'url(#sbl-s)'} stroke={hero ? 'none' : al(k.c.muted, 0.5)} strokeWidth={k.u * 0.2} />
                            </g>
                        </g>
                    );
                })}
            </Canvas>
            <Lockup k={k} p={p} t0={1.5} place="top" size={6} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

/** An SVG path that draws itself: `p` 0 → 1. */
const Draw = ({ d, p, ...rest }: { d: string; p: number; stroke: string; strokeWidth: number } & Record<string, unknown>) =>
    p <= 0 ? null : <path d={d} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(p)} strokeLinejoin="round" {...rest} />;

export function ShapeFrame(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const [fw, fh] = k.stacked ? [k.width * 0.82, k.height * 0.42] : [k.width * 0.64, k.height * 0.6];
    const [x, y] = [(k.width - fw) / 2, (k.height - fh) / 2];
    const rect = (pad: number) => `M${x - pad},${y - pad}h${fw + pad * 2}v${fh + pad * 2}h${-(fw + pad * 2)}z`;
    const pad = k.u * 4;
    const dr = (t0: number, t1: number) => easeOut(k.ramp(t0, t1));
    const flash = Math.exp(-Math.max(0, k.s - 1.5) * 4) * (k.s >= 1.5 ? 1 : 0);
    const [cx, cy] = [k.width / 2, k.height / 2];
    const diamond = `M${cx},${cy - M * 0.8}L${cx + M * 0.8},${cy}L${cx},${cy + M * 0.8}L${cx - M * 0.8},${cy}Z`;
    const corners: [number, number, number, number][] = [[x, y, 1, 1], [x + fw, y, -1, 1], [x + fw, y + fh, -1, -1], [x, y + fh, 1, -1]];
    const arm = M * 0.07;
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={M * 0.7} a={0.16 + flash * 0.2} />
            <Canvas k={k}>
                <Draw d={diamond} p={dr(0.1, 1.5)} stroke={al(k.c.muted, 0.18)} strokeWidth={k.u * 0.2} />
                {corners.map(([cxx, cyy, sx, sy], i) => <Draw key={i} d={`M${cxx - sx * pad},${cyy - sy * pad}L${cxx - sx * M * 0.35},${cyy - sy * M * 0.35}`} p={dr(0.6 + i * 0.1, 1.6)} stroke={al(k.c.muted, 0.25)} strokeWidth={k.u * 0.2} />)}
                <Draw d={rect(pad)} p={dr(0.3, 1.5)} stroke={al(k.c.muted, 0.4)} strokeWidth={k.u * 0.2} />
                <rect x={x} y={y} width={fw} height={fh} fill={al(k.c.accent, 0.06 * k.ramp(1.4, 2))} />
                <g style={glow(k, k.c.accent, 1.5 + flash * 5)}>
                    <Draw d={rect(0)} p={dr(0.15, 1.3)} stroke={k.c.accent} strokeWidth={k.u * (0.35 + flash * 0.5)} />
                    {k.s > 1.5 && <path d={rect(0)} fill="none" pathLength={1} stroke={k.c.text} strokeWidth={k.u * 0.5} strokeLinecap="round" strokeDasharray="0.06 0.94" strokeDashoffset={-((k.s - 1.5) * 0.28) % 1} />}
                </g>
                {corners.map(([cxx, cyy, sx, sy], i) => {
                    const a = dr(0.9 + i * 0.1, 1.5 + i * 0.05);
                    return <Draw key={i} d={`M${cxx + sx * arm * 1.8},${cyy}L${cxx},${cyy}L${cxx},${cyy + sy * arm * 1.8}`} p={a} stroke={k.c.text} strokeWidth={k.u * 0.8} strokeLinecap="round" />;
                })}
                {corners.map(([cxx, cyy], i) => <circle key={i} cx={cxx} cy={cyy} r={k.u * 1 * k.pop(1.3 + i * 0.07, 9)} fill={k.c.accent} style={glow(k, k.c.accent, 2)} />)}
            </Canvas>
            <Lockup k={k} p={p} t0={1.5} place="center" maxW={fw * 0.78} size={5.4} />
        </Stage>
    );
}
