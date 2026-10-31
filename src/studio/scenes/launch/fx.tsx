// Shared depth and "hit" effects for the hook, data and tech scenes (hooks.tsx, data.tsx, tech.tsx).
import type { CSSProperties } from 'react';
import { al, shortSide } from './shapes';
import { card, seeded, type Kit } from './kit';

/** Semantic status colours (the brand has none for "bad" and "done"). */
export const DANGER = '#ff6b73';
export const OK = '#7fe3a8';

/** Entry style: fades up from `dist` units below with a springy overshoot. Spread it into a style. */
export const rise = (k: Kit, delay: number, dist = 4, damping = 13): CSSProperties => {
    const a = k.pop(delay, damping);
    return { opacity: Math.min(1, a * 1.6), transform: `translateY(${(1 - a) * k.u * dist}px) scale(${0.94 + 0.06 * a})` };
};

/** A raised surface with an accent edge light, for the hero card of a scene. */
export const glass = (k: Kit, style?: CSSProperties): CSSProperties =>
    card(k, {
        borderColor: al(k.c.accent, 0.35),
        boxShadow: `0 ${k.u * 3}px ${k.u * 10}px #000a, 0 0 ${k.u * 9}px ${al(k.c.accent, 0.16)}, inset 0 1px 0 ${al(k.c.text, 0.08)}`,
        ...style,
    });

/**
 * Soft coloured lights behind the content, slowly drifting, swelling briefly at `hit` seconds.
 * `x`/`y` are fractions of the frame.
 */
export function Atmosphere({ k, hit, x = 0.5, y = 0.5, a = 0.26, colour = k.c.accent }: { k: Kit; hit?: number; x?: number; y?: number; a?: number; colour?: string }) {
    const M = shortSide(k);
    const swell = hit === undefined ? 1 : 1 + 0.6 * Math.sin(Math.PI * k.ramp(hit, hit + 0.8));
    const born = k.pop(0, 12);
    const light = (cx: number, cy: number, r: number, alpha: number) => (
        <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${al(colour, alpha * swell)}, transparent 68%)`, transform: `scale(${born})`, pointerEvents: 'none' }} />
    );
    const drift = (phase: number) => Math.sin(k.s * 0.5 + phase) * M * 0.035;
    return (
        <>
            {light(k.width * x + drift(0), k.height * y + drift(2), M * 0.78, a)}
            {light(k.width * (1 - x * 0.3) - drift(1), k.height * 0.14 + drift(3), M * 0.42, a * 0.5)}
        </>
    );
}

/** A diagonal band of light crossing the parent between `t0` and `t1` seconds. */
export function Sweep({ k, t0, t1 = t0 + 0.9 }: { k: Kit; t0: number; t1?: number }) {
    if (k.s < t0 || k.s > t1) return null;
    const at = k.ramp(t0, t1, -30, 130);
    return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(105deg, transparent ${at - 14}%, ${al(k.c.text, 0.15)} ${at}%, transparent ${at + 14}%)` }} />;
}

/** Specks floating up and drifting sideways, for depth behind the content (embers, dust). */
export function Motes({ k, n = 12, colour = k.c.accent, seed = 1, speed = 1 }: { k: Kit; n?: number; colour?: string; seed?: number; speed?: number }) {
    return (
        <>
            {Array.from({ length: n }, (_, i) => {
                const z = seeded(i + seed * 17);
                const t = (seeded(i + seed * 5) + k.s * (0.04 + z * 0.06) * speed) % 1;
                const size = k.u * (0.25 + z * 0.7);
                return <div key={i} style={{ position: 'absolute', left: `${seeded(i + seed * 3) * 100 + Math.sin(k.s + i) * 1.2}%`, top: `${108 - t * 120}%`, width: size, height: size, borderRadius: '50%', background: colour, opacity: Math.sin(t * Math.PI) * (0.25 + z * 0.4) * Math.min(1, k.s * 2), filter: z < 0.35 ? `blur(${k.u * 0.25}px)` : undefined, pointerEvents: 'none' }} />;
            })}
        </>
    );
}

/** A blinking text caret. */
export const Caret = ({ k, on = true, colour = k.c.accent }: { k: Kit; on?: boolean; colour?: string }) => (
    <span style={{ display: 'inline-block', width: '0.12em', height: '1em', marginLeft: '0.1em', verticalAlign: 'text-bottom', background: on && Math.floor(k.s * 2.2) % 2 === 0 ? colour : 'transparent' }} />
);
