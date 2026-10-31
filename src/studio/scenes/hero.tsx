// The look the classic scenes (big number, chart, title, kinetic type...) share with the launch scenes: its stage, glow and hit ring, plus a few helpers they all need.
import type { CSSProperties } from 'react';
import type { Brand } from './assets';
import { easeOut, seeded, useKit, type Kit, type LaunchProps } from './launch/kit';
import { TAU, al, lerp, polar } from './launch/shapes';

export { Kicker, Rule, Stage, card, easeOut } from './launch/kit';
export { Aura, Canvas, Shock, TAU, al, clamp01, glow, lerp, polar, shortSide } from './launch/shapes';
export type { Kit };

/** The launch kit (time, springs, sizes) for a classic scene, which only has a brand and a transparent flag. */
export function useHero(brand: Brand, transparent?: boolean) {
    const p = { brand, transparent } as LaunchProps;
    return { p, k: useKit(p) };
}

/** 1 at `t0` seconds, fading out after: the flash on a hit. */
export const hitFlash = (k: Kit, t0: number, rate = 5) => (k.s < t0 ? 0 : Math.exp(-(k.s - t0) * rate));

export const easeOutQuart = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 4;

/** Text filled with a light-to-accent gradient (put the glow on a wrapper: text-shadow shows through transparent fill). */
export const inkGradient = (k: Kit): CSSProperties => ({
    backgroundImage: `linear-gradient(180deg, ${k.c.text} 20%, ${k.c.accent} 135%)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
});

/** Sparks thrown out of (x, y) at `t0` seconds; goes inside a Canvas. Seeded, so every render matches. */
export function Sparks({ k, x, y, t0, r0, r1, count = 10, seed = 0 }: { k: Kit; x: number; y: number; t0: number; r0: number; r1: number; count?: number; seed?: number }) {
    const t = k.ramp(t0, t0 + 0.8);
    if (t <= 0 || t >= 1) return null;
    return (
        <>
            {Array.from({ length: count }, (_, i) => {
                const [sx, sy] = polar(x, y, lerp(r0, r1 * (0.7 + 0.5 * seeded(seed + i + 9)), easeOut(t)), (i / count) * TAU + seeded(seed + i) * 0.5);
                return <circle key={i} cx={sx} cy={sy} r={k.u * (0.25 + 0.35 * seeded(seed + i + 3)) * (1 - t)} fill={i % 3 ? k.c.accent : k.c.text} opacity={1 - t} />;
            })}
        </>
    );
}

/** One light streak crossing a surface once as the card lands. */
export const Sheen = ({ k, from }: { k: Kit; from: number }) => {
    const t = k.ramp(from, from + 0.5);
    return t <= 0 || t >= 1 ? null : <div style={{ position: 'absolute', top: 0, bottom: 0, width: '35%', left: `${-40 + t * 170}%`, background: `linear-gradient(105deg, transparent, ${al(k.c.text, 0.28)}, transparent)`, pointerEvents: 'none' }} />;
};

