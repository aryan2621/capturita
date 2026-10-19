import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { frameLayout } from './layout';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface TitleRevealProps {
    eyebrow: string;
    title: string;
    subtitle: string;
    /** Transparent background, for overlays rendered with alpha. */
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** A generated title card: logo and eyebrow fade in, title rises letter by letter, accent line draws, subtitle follows. */
export function TitleReveal({ eyebrow, title, subtitle, transparent, brand, assets }: TitleRevealProps) {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const unit = layout.text;
    const { colors } = brand;
    // The title wraps between words where it can't fit on one line; its size fits the longest word.
    const words = title.split(/(\s+)/).filter(Boolean);
    const longestWord = Math.max(1, ...words.map((w) => w.trim().length));
    const room = width - layout.safeX * 2;
    const titleSize = Math.min(unit * 13, room / (longestWord * 0.6), room / (Math.min(title.length, 14) * 0.56));
    let charIndex = 0;

    const eyebrowIn = interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const line = spring({ frame: frame - 26, fps, config: { damping: 200 } });
    const subtitleIn = spring({ frame: frame - 34, fps, config: { damping: 200 } });
    const exit = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const drift = interpolate(frame, [0, durationInFrames], [1, 1.05]);

    return (
        <AbsoluteFill
            style={{
                background: transparent ? 'transparent' : `radial-gradient(120% 120% at 30% 20%, ${colors.surface} 0%, ${colors.bg} 60%)`,
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: bodyFont(brand),
                // Explicit everywhere: WebKit (preview) and Chrome (renderer) size `normal` differently.
                lineHeight: 1.2,
                opacity: exit,
            }}
        >
            <div style={{ transform: `scale(${drift})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {brand.logo && <Img src={assetUrl(assets, brand.logo)} style={{ height: unit * 7, width: 'auto', marginBottom: unit * 3, opacity: eyebrowIn, objectFit: 'contain' }} />}
                <div style={{ color: colors.muted, fontSize: unit * 2.6, fontWeight: 600, lineHeight: 1.2, letterSpacing: unit * 0.6, opacity: eyebrowIn, textTransform: 'uppercase', maxWidth: room, textAlign: 'center' }}>{eyebrow}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: room, marginTop: unit * 1.5, fontFamily: displayFont(brand) }}>
                    {words.map((word, w) => (
                        // Each word clips its own letters as they rise, and never breaks inside.
                        <span key={w} style={{ display: 'flex', overflow: 'hidden', padding: `${unit}px 0` }}>
                            {[...word].map((char) => {
                                const i = charIndex++;
                                const p = spring({ frame: frame - 10 - i * 1.2, fps, config: { damping: 18, stiffness: 140 } });
                                return (
                                    <span
                                        key={i}
                                        style={{
                                            color: colors.text,
                                            fontSize: titleSize,
                                            fontWeight: 800,
                                            lineHeight: 1.1,
                                            letterSpacing: -titleSize * 0.023,
                                            display: 'inline-block',
                                            whiteSpace: 'pre',
                                            transform: `translateY(${(1 - p) * 110}%)`,
                                        }}
                                    >
                                        {char}
                                    </span>
                                );
                            })}
                        </span>
                    ))}
                </div>
                <div style={{ height: unit * 0.6, width: unit * 30 * line, background: colors.accent, borderRadius: unit, marginTop: unit * 1.5 }} />
                <div style={{ color: colors.muted, fontSize: unit * 4, fontWeight: 500, lineHeight: 1.3, marginTop: unit * 3, maxWidth: room, textAlign: 'center', opacity: subtitleIn, transform: `translateY(${(1 - subtitleIn) * unit * 3}px)` }}>
                    {subtitle}
                </div>
            </div>
        </AbsoluteFill>
    );
}
