import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, sceneGradient, useExit } from './SceneBase';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand } from './assets';

export interface Text3DProps {
    /** One to three short lines. */
    text: string;
    subtitle: string;
    transparent?: boolean;
    brand: Brand;
}

const LAYERS = 22;

/** Seconds until the text has swung into place, for a sound. */
export const TEXT_3D_BEAT = 0.9;

/**
 * Extruded text in plain CSS 3D: the same lines stacked in depth, darker toward the back, with a
 * lit front face, swinging in and then drifting slowly. No WebGL, so it renders anywhere the
 * scenes do; a three.js version would need a bundled typeface (see the Status in 06-hero-scenes.md).
 */
export function Text3D({ text, subtitle, transparent, brand }: Text3DProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const unit = Math.min(width, height) / 100;
    const { colors } = brand;
    const exit = useExit();
    const lines = String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3);
    const portrait = height > width * 1.05;

    // 0.6 of the width: the measure underestimates wide faces (mono), and the extrusion adds depth sideways.
    const fontSize = Math.min(unit * (lines.length > 1 ? 15 : 19), fitSize(lines.join('\n') || ' ', width * 0.6, brand.fonts.display, 999), (height * 0.5) / (Math.max(1, lines.length) * 1.15));
    const depth = fontSize * 0.3;
    const p = spring({ frame: frame - 2, fps, config: { damping: 18, stiffness: 80 } });
    const yaw = (1 - p) * -0.9;
    const pitch = (1 - p) * 0.35 - 0.06;
    const subIn = spring({ frame: frame - 16, fps, config: { damping: 200 } });
    const face = { fontFamily: displayFont(brand), fontSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -fontSize * 0.02, textAlign: 'center', whiteSpace: 'pre' } as const;
    const block = (
        <>
            {lines.map((l) => <div key={l}>{l}</div>)}
        </>
    );

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <BrandTexture brand={brand} transparent={transparent} />
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', perspective: Math.max(width, height) * 1.1, paddingBottom: subtitle ? fontSize * 0.5 : 0 }}>
                <div style={{ position: 'relative', transformStyle: 'preserve-3d', transform: `rotateX(${pitch}rad) rotateY(${yaw}rad) scale(${0.9 + 0.1 * p})`, opacity: interpolate(frame, [0, 8], [0, 1], clamp) }}>
                    {Array.from({ length: LAYERS }, (_, i) => {
                        const back = i / LAYERS; // 0 just behind the face, 1 at the very back
                        return (
                            <div key={i} style={{ ...face, position: 'absolute', inset: 0, color: colors.accent, filter: `brightness(${0.85 - back * 0.55})`, transform: `translateZ(${-(i + 1) * (depth / LAYERS)}px)`, whiteSpace: 'pre' }}>
                                {block}
                            </div>
                        );
                    })}
                    <div style={{ ...face, position: 'relative', color: colors.text, textShadow: `0 ${fontSize * 0.02}px ${fontSize * 0.08}px ${colors.accent}55` }}>{block}</div>
                </div>
            </AbsoluteFill>
            {subtitle && (
                <div style={{ position: 'absolute', left: width * 0.1, right: width * 0.1, top: height * (portrait ? 0.7 : 0.74), textAlign: 'center', fontSize: Math.max(unit * 2.8, fontSize * 0.22), color: colors.muted, opacity: subIn, transform: `translateY(${(1 - subIn) * unit * 2.4}px)` }}>
                    {subtitle}
                </div>
            )}
        </AbsoluteFill>
    );
}
