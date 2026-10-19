import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export type LogoStingStyle = 'pop' | 'wipe' | 'draw' | 'glow';

export interface LogoStingProps {
    style: LogoStingStyle;
    /** Product name set beside the logo (below it in portrait); also stands in when there's no logo. */
    wordmark: string;
    tagline: string;
    burst: boolean;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Frame the logo lands on, per style; the burst and the wordmark key off it. */
/** Frame the logo lands on, per style. */
export const LOGO_HITS: Record<LogoStingStyle, number> = { pop: 10, wipe: 16, draw: 22, glow: 18 };

/** A short brand reveal: the logo arrives (pop, wipe, ring or glow), an accent burst fires, the name and tagline follow. */
export function LogoSting({ style, wordmark, tagline, burst, transparent, brand, assets }: LogoStingProps) {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const unit = Math.min(width, height) / 100;
    // Square and portrait frames stack the name under the logo.
    const stacked = width < height * 1.4;
    const { colors } = brand;
    const kind: LogoStingStyle = LOGO_HITS[style] ? style : 'pop';
    const hit = LOGO_HITS[kind];
    const hasLogo = !!brand.logo;
    const name = wordmark.trim();
    const logoSize = unit * (name && hasLogo ? 16 : 22);

    // The logo's own entrance.
    const pop = spring({ frame, fps, config: { damping: 9, stiffness: 120, mass: 0.8 } });
    const smooth = spring({ frame: frame - 2, fps, config: { damping: 200 }, durationInFrames: hit });
    let logoStyle: CSSProperties = {};
    if (kind === 'pop') {
        logoStyle = { transform: `scale(${pop}) rotate(${(1 - pop) * -12}deg)` };
    } else if (kind === 'wipe') {
        logoStyle = { clipPath: `inset(0 ${(1 - smooth) * 100}% 0 0)`, transform: `translateX(${(1 - smooth) * -unit * 4}px)` };
    } else if (kind === 'draw') {
        const inside = spring({ frame: frame - hit + 6, fps, config: { damping: 14, stiffness: 140 } });
        logoStyle = { opacity: inside, transform: `scale(${0.7 + inside * 0.3})` };
    } else {
        const blur = interpolate(frame, [0, hit], [unit * 3, 0], clamp);
        logoStyle = { opacity: interpolate(frame, [0, hit * 0.7], [0, 1], clamp), filter: `blur(${blur}px)`, transform: `scale(${interpolate(frame, [0, hit], [1.15, 1], clamp)})` };
    }

    // Ring drawn around the logo (draw style), then released outward.
    const ringRadius = logoSize * 0.82;
    const ringLength = 2 * Math.PI * ringRadius;
    const ringDraw = interpolate(frame, [0, hit], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
    const ringOut = spring({ frame: frame - hit - 4, fps, config: { damping: 200 }, durationInFrames: 16 });

    // Glow behind the logo: peaks on the hit, settles to a soft halo.
    const glow = kind === 'glow' ? interpolate(frame, [0, hit, hit + 20], [0, 1, 0.45], clamp) : interpolate(frame, [hit, hit + 6, hit + 30], [0, 0.5, 0.2], clamp);

    const nameIn = spring({ frame: frame - hit - 4, fps, config: { damping: 200 } });
    const taglineIn = spring({ frame: frame - hit - 14, fps, config: { damping: 200 } });
    const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
    const settle = interpolate(frame, [hit, durationInFrames], [1, 1.04], clamp);

    const mark = hasLogo ? (
        <Img src={assetUrl(assets, brand.logo!)} style={{ height: logoSize, width: 'auto', maxWidth: unit * 60, objectFit: 'contain', display: 'block' }} />
    ) : (
        // No logo: a brand-coloured tile with the name's initial stands in.
        <div style={{ width: logoSize, height: logoSize, borderRadius: logoSize * 0.24, background: colors.accent, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: displayFont(brand), fontSize: logoSize * 0.56, fontWeight: 800, lineHeight: 1 }}>
            {(name[0] ?? '•').toUpperCase()}
        </div>
    );

    return (
        <AbsoluteFill
            style={{
                background: transparent ? 'transparent' : `radial-gradient(90% 90% at 50% 45%, ${colors.surface} 0%, ${colors.bg} 70%)`,
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: bodyFont(brand),
                lineHeight: 1.2,
                opacity: exit,
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${settle})` }}>
                <div style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', alignItems: 'center', gap: unit * (stacked ? 4 : 4.5) }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div
                            style={{
                                position: 'absolute',
                                width: logoSize * 2.6,
                                height: logoSize * 2.6,
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${colors.accent} 0%, transparent 62%)`,
                                opacity: glow * 0.55,
                            }}
                        />
                        {burst && <Burst frame={frame - hit} radius={logoSize * 0.75} unit={unit} color={colors.accent} />}
                        {kind === 'draw' && (
                            <svg width={ringRadius * 2 + unit * 2} height={ringRadius * 2 + unit * 2} style={{ position: 'absolute', overflow: 'visible', opacity: 1 - ringOut, transform: `scale(${1 + ringOut * 0.35})` }}>
                                <circle
                                    cx={ringRadius + unit}
                                    cy={ringRadius + unit}
                                    r={ringRadius}
                                    fill='none'
                                    stroke={colors.accent}
                                    strokeWidth={unit * 0.7}
                                    strokeLinecap='round'
                                    strokeDasharray={ringLength}
                                    strokeDashoffset={ringLength * (1 - ringDraw)}
                                    transform={`rotate(-90 ${ringRadius + unit} ${ringRadius + unit})`}
                                />
                            </svg>
                        )}
                        <div style={{ position: 'relative', ...logoStyle }}>{mark}</div>
                    </div>
                    {name && (
                        <div style={{ overflow: 'hidden', padding: `${unit}px ${unit * 0.5}px` }}>
                            <div
                                style={{
                                    color: colors.text,
                                    fontFamily: displayFont(brand),
                                    fontSize: Math.min(unit * (stacked ? 10 : 11), (width * (stacked ? 0.84 : 0.5)) / Math.max(1, name.length * 0.56)),
                                    fontWeight: 800,
                                    lineHeight: 1.1,
                                    letterSpacing: -unit * 0.25,
                                    whiteSpace: 'nowrap',
                                    opacity: nameIn,
                                    transform: stacked ? `translateY(${(1 - nameIn) * 100}%)` : `translateX(${(1 - nameIn) * -unit * 6}px)`,
                                }}
                            >
                                {name}
                            </div>
                        </div>
                    )}
                </div>
                {tagline && (
                    <div
                        style={{
                            color: colors.muted,
                            fontSize: unit * 3.6,
                            fontWeight: 500,
                            lineHeight: 1.3,
                            marginTop: unit * 4,
                            textAlign: 'center',
                            maxWidth: width * 0.8,
                            opacity: taglineIn,
                            transform: `translateY(${(1 - taglineIn) * unit * 2}px)`,
                        }}
                    >
                        {tagline}
                    </div>
                )}
            </div>
        </AbsoluteFill>
    );
}

/** Short accent strokes flying out from the logo when it lands; `frame` counts from the hit. */
function Burst({ frame, radius, unit, color }: { frame: number; radius: number; unit: number; color: string }) {
    if (frame < 0 || frame > 22) return null;
    const rays = 12;
    const travel = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) });
    const fade = interpolate(frame, [8, 22], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
        <svg width={1} height={1} style={{ position: 'absolute', overflow: 'visible', left: '50%', top: '50%' }}>
            {Array.from({ length: rays }, (_, i) => {
                const angle = (i / rays) * Math.PI * 2 + random(`burst-${i}`) * 0.2;
                const reach = radius * (1.05 + random(`reach-${i}`) * 0.25);
                const start = reach + travel * unit * 6;
                const length = unit * (2.2 + random(`len-${i}`) * 1.4) * (1 - travel * 0.6);
                return (
                    <line
                        key={i}
                        x1={Math.cos(angle) * start}
                        y1={Math.sin(angle) * start}
                        x2={Math.cos(angle) * (start + length)}
                        y2={Math.sin(angle) * (start + length)}
                        stroke={color}
                        strokeWidth={unit * 0.55}
                        strokeLinecap='round'
                        opacity={fade}
                    />
                );
            })}
        </svg>
    );
}
