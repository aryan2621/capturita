// Shared parts for the build and insight launch scenes: the scene frame (panel + lockup + hit flash), list rows, wires and chart grid.
import type { CSSProperties, ReactNode } from 'react';
import { useVideoConfig } from 'remotion';
import { HitFx, variantFor } from '../hitFx';
import { Aura, Lockup, al, clamp01, lerp } from './shapes';
import { Stage, card, listOf, type Kit, type LaunchProps } from './kit';

export const tabular = { fontVariantNumeric: 'tabular-nums' } as const;
export const clip = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

export const compact = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1).replace(/\.0$/, ''));
/** `text` with its first number replaced by `v` ("12 seats", 8 → "8 seats"). */
export const withNumber = (text: string, v: number) => text.replace(/-?\d[\d,]*(\.\d+)?/, compact(v));
/** The scene's list, never empty (a lone placeholder stands in), so index access is safe. */
export const some = (items: unknown, max: number) => listOf(items, [{ text: '—' }], max);
export const initial = (text: string) => text.trim().charAt(0).toUpperCase();
export const easeInOut = (t: number) => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};
/** 1 at `t0`, decaying to 0: the flash that follows a hit. */
export const kick = (k: Kit, t0: number, rate = 5) => (k.s < t0 ? 0 : Math.exp(-(k.s - t0) * rate));
const blink = (k: Kit) => (Math.floor(k.s * 2.2) % 2 ? 0 : 1);

export interface Zone {
    w: number;
    h: number;
}

/**
 * The frame every scene shares: depth behind the panel (accent aura, two ghost cards), the panel itself with a
 * spring entrance, idle drift and a light sweep on the hit, the scene's hit accent at `hit`, and the headline lockup.
 * `solo` centres a wide panel under just the eyebrow; `lock` overrides the fields the lockup shows.
 */
export function Scene({ p, k, hit, t0 = 0.8, solo = false, lock, children }: { p: LaunchProps; k: Kit; hit: number; t0?: number; solo?: boolean; lock?: Partial<LaunchProps>; children: (z: Zone) => ReactNode }) {
    const wide = !k.stacked;
    const z: Zone = solo ? (wide ? { w: k.width * 0.62, h: k.height * 0.7 } : { w: k.width * 0.9, h: k.height * 0.6 }) : wide ? { w: k.width * 0.5, h: k.height * 0.76 } : { w: k.width * 0.9, h: k.height * (k.portrait ? 0.52 : 0.54) };
    const cx = wide && !solo ? k.width * 0.29 : k.width / 2;
    const cy = solo ? k.height * 0.55 : wide ? k.height / 2 : k.height * 0.04 + z.h / 2;
    const born = k.pop(0, 13);
    const punch = kick(k, hit);
    const sweep = k.ramp(hit - 0.05, hit + 0.8);
    const ghost = (side: number): CSSProperties => card(k, { position: 'absolute', inset: 0, opacity: 0.4, transform: `translate(${side * k.u * 1.8}px, ${k.u * 1.5}px) rotate(${side * 1.7}deg) scale(0.96)` });
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={Math.max(z.w, z.h) * 0.7} a={0.2 + punch * 0.18} scale={born} />
            <HitFx variant={variantFor(useVideoConfig().id)} t={k.ramp(hit, hit + 0.6)} x={cx} y={cy} size={z.w * 0.6} color={k.c.accent} />
            <div style={{ position: 'absolute', left: cx - z.w / 2, top: cy - z.h / 2, width: z.w, height: z.h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: '100%', opacity: Math.min(1, born * 2), transform: `translateY(${(1 - born) * k.u * 4 + Math.sin(k.s * 1.1) * k.u * 0.35}px) scale(${0.93 + 0.07 * born + punch * 0.012})` }}>
                    {[-1, 1].map((side) => <div key={side} style={ghost(side)} />)}
                    <div style={{ position: 'relative' }}>{children(z)}</div>
                    {sweep > 0 && sweep < 1 && (
                        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: k.u * 1.8, pointerEvents: 'none', zIndex: 30 }}>
                            <div style={{ position: 'absolute', top: '-10%', bottom: '-10%', width: '36%', left: `${lerp(-40, 110, sweep)}%`, transform: 'skewX(-18deg)', background: `linear-gradient(90deg, transparent, ${al(k.c.text, 0.13)}, transparent)` }} />
                        </div>
                    )}
                </div>
            </div>
            <Lockup k={k} p={{ ...p, ...lock }} t0={t0} place={solo ? 'top' : 'side'} />
        </Stage>
    );
}

/** A rounded icon tile; `hot` 0–1 lights it up. */
export const Tile = ({ k, size = 4.6, hot = 0, children }: { k: Kit; size?: number; hot?: number; children?: ReactNode }) => (
    <span style={{ width: k.u * size, height: k.u * size, flexShrink: 0, borderRadius: k.u * size * 0.28, display: 'grid', placeItems: 'center', fontWeight: 850, fontSize: k.tx * size * 0.5, background: al(k.c.accent, 0.12 + 0.32 * hot), color: hot > 0.5 ? k.c.text : k.c.muted, boxShadow: hot > 0 ? `0 0 ${k.u * 2.2 * hot}px ${al(k.c.accent, 0.55 * hot)}` : undefined }}>{children}</span>
);

export const Dot = ({ k, size = 1.4, pulse = 0 }: { k: Kit; size?: number; pulse?: number }) => (
    <span style={{ width: k.u * size, height: k.u * size, flexShrink: 0, borderRadius: '50%', background: k.c.accent, boxShadow: `0 0 ${k.u * (1.5 + pulse * 2.5)}px ${k.c.accent}` }} />
);

/** One list row: icon, title, detail and a right-hand slot; `hot` 0–1 tints it. */
export function Row({ k, icon, title, detail, right, hot = 0, style }: { k: Kit; icon?: ReactNode; title: ReactNode; detail?: ReactNode; right?: ReactNode; hot?: number; style?: CSSProperties }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.6, padding: `${k.u * 0.9}px ${k.u * 1.6}px`, borderRadius: k.u * 1.2, background: hot > 0 ? al(k.c.accent, 0.2 * hot) : undefined, ...style }}>
            {icon}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: k.tx * 2.6, fontWeight: 700, color: hot > 0.5 ? k.c.text : k.c.muted, ...clip }}>{title}</div>
                {detail && <div style={{ fontSize: k.tx * 2, color: k.c.muted, opacity: 0.8, ...clip }}>{detail}</div>}
            </div>
            {right}
        </div>
    );
}

/** Text that types in while holding its full height, so the panel never reflows. */
export function TypedText({ k, text, fraction, caret = true }: { k: Kit; text: string; fraction: number; caret?: boolean }) {
    const shown = text.slice(0, Math.round(text.length * clamp01(fraction)));
    return (
        <div style={{ position: 'relative', lineHeight: 1.45 }}>
            <span style={{ opacity: 0 }}>{text}</span>
            <span style={{ position: 'absolute', inset: 0 }}>{shown}{caret && fraction < 1 && <Caret k={k} />}</span>
        </div>
    );
}

export const Caret = ({ k, h = 3 }: { k: Kit; h?: number }) => (
    <span style={{ display: 'inline-block', width: k.u * 0.45, height: k.tx * h, marginLeft: k.u * 0.3, verticalAlign: 'text-bottom', background: k.c.accent, opacity: blink(k), boxShadow: `0 0 ${k.u}px ${k.c.accent}` }} />
);

// ---- Diagram wires ----

export type Pt = readonly [number, number];
const cubic = (a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt => {
    const q = 1 - t;
    return [q ** 3 * a[0] + 3 * q * q * t * b[0] + 3 * q * t * t * c[0] + t ** 3 * d[0], q ** 3 * a[1] + 3 * q * q * t * b[1] + 3 * q * t * t * c[1] + t ** 3 * d[1]];
};

/** Pixel-space SVG over a panel of the given size, for edges and pulses. */
export const Wires = ({ z, children }: { z: Zone; children: ReactNode }) => (
    <svg width={z.w} height={z.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>{children}</svg>
);

/** A curved connector that draws itself (`draw` 0–1) with a bright pulse travelling along it (`pulse` 0–1, hidden at the ends). */
export function Edge({ k, a, b, vertical = false, draw, pulse = 0, width = 0.3 }: { k: Kit; a: Pt; b: Pt; vertical?: boolean; draw: number; pulse?: number; width?: number }) {
    const mid = vertical ? (a[1] + b[1]) / 2 : (a[0] + b[0]) / 2;
    const [c1, c2]: [Pt, Pt] = vertical ? [[a[0], mid], [b[0], mid]] : [[mid, a[1]], [mid, b[1]]];
    const d = `M${a} C${c1} ${c2} ${b}`;
    const [px, py] = cubic(a, c1, c2, b, easeInOut(pulse));
    return (
        <g>
            <path d={d} fill="none" stroke={al(k.c.muted, 0.28)} strokeWidth={k.u * width * 0.7} strokeLinecap="round" />
            {draw > 0 && <path d={d} fill="none" stroke={k.c.accent} strokeWidth={k.u * width} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(draw)} style={{ filter: `drop-shadow(0 0 ${k.u * 0.8}px ${k.c.accent})` }} />}
            {pulse > 0 && pulse < 1 && (
                <>
                    <circle cx={px} cy={py} r={k.u * 2} fill={al(k.c.accent, 0.3)} />
                    <circle cx={px} cy={py} r={k.u * 0.8} fill={k.c.text} />
                </>
            )}
        </g>
    );
}

// ---- Chart axes ----

/** Horizontal gridlines with value labels on the left, drawn in a `w` × `h` plot whose top is `max`. */
export function Grid({ k, w, h, max, steps = 4, prefix = '' }: { k: Kit; w: number; h: number; max: number; steps?: number; prefix?: string }) {
    return (
        <g>
            {Array.from({ length: steps + 1 }, (_, i) => {
                const y = h - (h * i) / steps;
                return (
                    <g key={i}>
                        <line x1={0} x2={w} y1={y} y2={y} stroke={al(k.c.muted, i ? 0.18 : 0.45)} strokeWidth={k.u * 0.14} strokeDasharray={i ? `${k.u * 0.5} ${k.u * 0.7}` : undefined} />
                        <text x={-k.u * 1.3} y={y + k.tx * 0.75} textAnchor="end" fontSize={k.tx * 1.9} fill={k.c.muted} style={tabular}>{prefix}{compact((max * i) / steps)}</text>
                    </g>
                );
            })}
        </g>
    );
}
