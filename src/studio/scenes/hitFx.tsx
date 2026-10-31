// The accent that marks a scene's key moment. Several looks so scenes don't all end in the same expanding ring;
// `variantFor(sceneName)` gives each scene a fixed one, spread across the set.
import type { CSSProperties } from 'react';
import { seeded } from './launch/kit';

export type HitVariant = 'glow' | 'sweep' | 'sparks' | 'flash' | 'none';

const VARIANTS: HitVariant[] = ['glow', 'sweep', 'sparks', 'flash', 'none', 'glow', 'sweep', 'none'];

/** A stable variant per scene name, so a scene never changes look between renders but neighbours differ. */
export function variantFor(key: string): HitVariant {
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return VARIANTS[h % VARIANTS.length];
}

const ease = (t: number) => 1 - (1 - t) ** 3;

/**
 * Draws one hit accent over its (positioned) parent. `t` is 0→1 progress through the effect (0 or 1 draws nothing),
 * `x`/`y` its centre in px, `size` its reach in px. Pointer-transparent.
 */
export function HitFx({ variant, t, x, y, size, color, seed = 1 }: { variant: HitVariant; t: number; x: number; y: number; size: number; color: string; seed?: number }) {
    if (variant === 'none' || t <= 0 || t >= 1) return null;
    const fade = 1 - t;
    const fill: CSSProperties = { position: 'absolute', pointerEvents: 'none' };
    if (variant === 'glow') {
        const r = size * (0.55 + 0.35 * ease(t));
        return <div style={{ ...fill, left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${color}66, transparent 65%)`, opacity: fade }} />;
    }
    if (variant === 'flash') {
        const r = size * 1.6; // sized from its own centre, so it still shows inside a zero-size parent
        return <div style={{ ...fill, left: x - r, top: y - r, width: r * 2, height: r * 2, background: `radial-gradient(circle, ${color}44, transparent 70%)`, opacity: fade * fade }} />;
    }
    if (variant === 'sweep') {
        const run = ease(t);
        return (
            <div style={{ ...fill, left: x - size, top: y - size, width: size * 2, height: size * 2, overflow: 'hidden', opacity: Math.min(1, fade * 2) }}>
                <div style={{ position: 'absolute', top: -size * 0.4, bottom: -size * 0.4, width: size * 0.45, left: run * size * 2.4 - size * 0.5, transform: 'skewX(-18deg)', background: `linear-gradient(90deg, transparent, ${color}88, transparent)` }} />
            </div>
        );
    }
    // sparks: short streaks thrown outward from the centre, drifting as they fade.
    const count = 14;
    return (
        <div style={{ ...fill, left: x, top: y, width: 0, height: 0, opacity: fade }}>
            {Array.from({ length: count }, (_, i) => {
                const angle = (i / count) * Math.PI * 2 + seeded(seed + i) * 0.5;
                const reach = size * (0.35 + 0.65 * seeded(seed * 3 + i)) * ease(t);
                const len = size * 0.12 * (1 - t * 0.6);
                return <div key={i} style={{ position: 'absolute', left: Math.cos(angle) * reach, top: Math.sin(angle) * reach, width: len, height: Math.max(1.5, size * 0.018), borderRadius: 4, background: color, transform: `rotate(${angle}rad)`, transformOrigin: '0 50%' }} />;
            })}
        </div>
    );
}
