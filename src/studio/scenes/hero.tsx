// The look the classic scenes (big number, chart, title, kinetic type...) share with the launch scenes: its stage, glow and hit accent, plus a few helpers they all need.
import type { CSSProperties } from 'react';
import type { Brand } from './assets';
import { useKit, type Kit, type LaunchProps } from './launch/kit';
import { al } from './launch/shapes';
import { HitFx, variantFor } from './hitFx';

export { Kicker, Rule, Stage, card, easeOut } from './launch/kit';
export { Aura, Canvas, TAU, al, clamp01, glow, lerp, polar, shortSide } from './launch/shapes';
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

/** The accent for a scene's key moment at (x, y) px, `size` px reach, over `dur` seconds from `t0`: the look is fixed per scene `name` (or nothing). Goes beside the Canvas, in the Stage. */
export function Hit({ k, name, x, y, t0, size, dur = 0.7, seed }: { k: Kit; name: string; x: number; y: number; t0: number; size: number; dur?: number; seed?: number }) {
    return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}><HitFx variant={variantFor(name)} t={k.ramp(t0, t0 + dur)} x={x} y={y} size={size} color={k.c.accent} seed={seed} /></div>;
}

/** One light streak crossing a surface once as the card lands. */
export const Sheen = ({ k, from }: { k: Kit; from: number }) => {
    const t = k.ramp(from, from + 0.5);
    return t <= 0 || t >= 1 ? null : <div style={{ position: 'absolute', top: 0, bottom: 0, width: '35%', left: `${-40 + t * 170}%`, background: `linear-gradient(105deg, transparent, ${al(k.c.text, 0.28)}, transparent)`, pointerEvents: 'none' }} />;
};

