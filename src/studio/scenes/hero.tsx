// The look the classic scenes (big number, chart, title, kinetic type...) share with the launch scenes: its stage, glow and hit accent, plus a few helpers they all need.
import type { CSSProperties } from 'react';
import type { Brand } from './assets';
import { pulse, useKit, type Kit, type LaunchProps } from './launch/kit';
import { al } from './launch/shapes';

export { Rule, Stage, card, easeOut } from './launch/kit';
export { HitAt as Hit } from './launch/mediaParts';
export { Aura, Canvas, al, clamp01, glow, shortSide } from './launch/shapes';
export type { Kit };

/** The launch kit (time, springs, sizes) for a classic scene, which only has a brand and a transparent flag. */
export function useHero(brand: Brand, transparent?: boolean) {
    const p = { brand, transparent } as LaunchProps;
    return { p, k: useKit(p) };
}

/** 1 at `t0` seconds, fading out after: the flash on a hit. */
export const hitFlash = (k: Kit, t0: number, rate = 5) => pulse(k, t0, rate);

import { easeOutQuart } from '../../lib/math';
export { easeOutQuart };

/** Text filled with a light-to-accent gradient (put the glow on a wrapper: text-shadow shows through transparent fill). */
export const inkGradient = (k: Kit): CSSProperties => ({
    backgroundImage: `linear-gradient(180deg, ${k.c.text} 20%, ${k.c.accent} 135%)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
});

/** One light streak crossing a surface once as the card lands. */
export const Sheen = ({ k, from }: { k: Kit; from: number }) => {
    const t = k.ramp(from, from + 0.5);
    return t <= 0 || t >= 1 ? null : <div style={{ position: 'absolute', top: 0, bottom: 0, width: '35%', left: `${-40 + t * 170}%`, background: `linear-gradient(105deg, transparent, ${al(k.c.text, 0.28)}, transparent)`, pointerEvents: 'none' }} />;
};

