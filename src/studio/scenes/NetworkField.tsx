import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';
import './fonts';
import { useContext } from 'react';
import { BrandTexture, CalmContext, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand } from './assets';

export interface NetworkFieldProps {
    heading: string;
    subtitle: string;
    /** How many points drift in the field (12-60). */
    density: number;
    transparent?: boolean;
    brand: Brand;
}

const SEED = 'network-field';

/**
 * Points drifting on noise, joined by thin lines when they come close, in the brand's one accent
 * colour. Seeded, so every render draws the same field. Particles are opt-in: use it where a scene
 * needs a quiet, techy backdrop under a heading.
 */
export function NetworkField({ heading, subtitle, density, transparent, brand }: NetworkFieldProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const unit = Math.min(width, height) / 100;
    const { colors } = brand;
    const exit = useExit();
    const calm = useContext(CalmContext);
    const count = Math.round(Math.min(60, Math.max(12, Number(density) || 36)));
    const reach = Math.min(width, height) * 0.27;

    const points = Array.from({ length: count }, (_, i) => {
        const x = random(`${SEED}-x-${i}`) * width + noise2D(`${SEED}-dx`, i * 0.37, calm ? 0 : frame * 0.004) * width * 0.08;
        const y = random(`${SEED}-y-${i}`) * height + noise2D(`${SEED}-dy`, i * 0.37, calm ? 0 : frame * 0.004) * height * 0.08;
        return { x, y, r: unit * (0.25 + random(`${SEED}-r-${i}`) * 0.4), at: random(`${SEED}-t-${i}`) * 24 };
    });
    const links: { a: number; b: number; strength: number }[] = [];
    for (let a = 0; a < count; a++)
        for (let b = a + 1; b < count; b++) {
            const d = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
            if (d < reach) links.push({ a, b, strength: 1 - d / reach });
        }
    const grow = interpolate(frame, [8, 40], [0, 1], clamp);

    const enter = spring({ frame: frame - 6, fps, config: { damping: 200 } });
    const headSize = Math.min(unit * 9, fitSize(String(heading || ' '), width * 0.8 * (String(heading).length > 18 ? 1.7 : 1), brand.fonts.display, 999));

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={0.5}>
                <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
                    {links.map(({ a, b, strength }) => (
                        <line key={`${a}-${b}`} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} stroke={colors.accent} strokeWidth={unit * 0.16} opacity={strength * 0.75 * grow} />
                    ))}
                    {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={colors.accent} opacity={0.85 * interpolate(frame, [p.at, p.at + 14], [0, 1], clamp)} />
                    ))}
                </svg>
            </Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: width * 0.8, opacity: enter, transform: `translateY(${(1 - enter) * unit * 2.4}px)`, textShadow: transparent ? undefined : `0 0 ${unit * 4}px ${colors.bg}` }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, letterSpacing: -headSize * 0.02, color: colors.text }}>{heading}</div>
                    {subtitle && <div style={{ marginTop: headSize * 0.25, fontSize: Math.max(unit * 2.8, headSize * 0.32), color: colors.muted }}>{subtitle}</div>}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
