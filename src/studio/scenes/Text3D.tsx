import { Aura, Canvas, Rule, Shock, Stage, al, hitFlash, shortSide, useHero } from './hero';
import { fitSize } from './text';
import type { Brand } from './assets';

export interface Text3DProps {
    /** One to three short lines. */
    text: string;
    subtitle: string;
    transparent?: boolean;
    brand: Brand;
}

const LAYERS = 14;
const SWING = 0.05;

/** Seconds until the text has swung into place, for a sound. */
export const TEXT_3D_BEAT = 0.4;

/**
 * Extruded text in plain CSS 3D: the same lines stacked in depth, shading from the accent to the
 * background toward the back, with a lit front face that swings in past square and settles. No
 * WebGL, so it renders anywhere the scenes do.
 */
export function Text3D({ text, subtitle, transparent, brand }: Text3DProps) {
    const { p, k } = useHero(brand, transparent);
    const M = shortSide(k);
    const lines = String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3);

    // 0.6 of the width: the measure underestimates wide faces (mono), and the extrusion adds depth sideways.
    const fontSize = Math.min(k.u * (lines.length > 1 ? 15 : 19), fitSize(lines.join('\n') || ' ', k.width * 0.6, brand.fonts.display, 999), (k.height * 0.5) / (Math.max(1, lines.length) * 1.15));
    const depth = fontSize * 0.3;
    const swing = k.pop(SWING, 11);
    const yaw = (1 - swing) * -0.9;
    const pitch = (1 - swing) * 0.35 - 0.06;
    const subIn = k.pop(TEXT_3D_BEAT - 0.1, 14);
    const hit = hitFlash(k, TEXT_3D_BEAT);
    const face = { fontFamily: k.display, fontSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -fontSize * 0.02, textAlign: 'center', whiteSpace: 'pre' } as const;
    const block = lines.map((l) => <div key={l}>{l}</div>);
    const textH = fontSize * 1.08 * Math.max(1, lines.length);
    const [cx, cy] = [k.width / 2, k.height / 2 - (subtitle ? fontSize * 0.25 : 0)];

    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={M * 0.8} a={0.24 + hit * 0.2} scale={swing} />
            <Canvas k={k}>
                <Shock k={k} x={cx} y={cy} r0={fontSize} r1={M * 0.85} t0={TEXT_3D_BEAT} />
            </Canvas>
            <div style={{ position: 'absolute', left: cx - fontSize * 3, top: cy + textH * 0.62 + depth, width: fontSize * 6, height: fontSize * 0.5, borderRadius: '50%', background: `radial-gradient(closest-side, ${al(k.c.bg, 0.6)}, transparent)`, opacity: swing, transform: `scaleX(${0.6 + 0.4 * swing})` }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: Math.max(k.width, k.height) * 1.1, paddingBottom: subtitle ? fontSize * 0.5 : 0 }}>
                <div style={{ position: 'relative', transformStyle: 'preserve-3d', transform: `rotateX(${pitch}rad) rotateY(${yaw}rad) scale(${0.88 + 0.12 * swing})`, opacity: Math.min(1, k.s * 12) }}>
                    {Array.from({ length: LAYERS }, (_, i) => (
                        <div key={i} style={{ ...face, position: 'absolute', inset: 0, color: `color-mix(in srgb, ${k.c.accent} ${Math.round(85 - (i / LAYERS) * 60)}%, ${k.c.bg})`, transform: `translateZ(${-(i + 1) * (depth / LAYERS)}px)` }}>{block}</div>
                    ))}
                    <div style={{ ...face, position: 'relative', color: k.c.text, textShadow: `0 ${fontSize * 0.02}px ${fontSize * 0.08}px ${al(k.c.accent, 0.35 + hit * 0.5)}` }}>{block}</div>
                </div>
            </div>
            {subtitle && (
                <div style={{ position: 'absolute', left: k.width * 0.1, right: k.width * 0.1, top: k.height * (k.portrait ? 0.7 : 0.74), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 1.6, textAlign: 'center', opacity: Math.min(1, subIn * 1.5), transform: `translateY(${(1 - subIn) * k.u * 2.4}px)` }}>
                    <Rule k={k} width={10} progress={subIn} />
                    <div style={{ fontSize: Math.max(k.u * 2.8, fontSize * 0.22), color: k.c.muted }}>{subtitle}</div>
                </div>
            )}
        </Stage>
    );
}
