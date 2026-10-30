import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface TestimonialProps {
    quote: string;
    name: string;
    role: string;
    avatar: string;
    rating: number;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

/** A customer quote: big quote mark, the words fade in one by one, stars fill, then who said it. */
export function Testimonial({ quote, name, role, avatar, rating, transparent, brand, assets }: TestimonialProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit * grow(width, height);
    const t = layout.text * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const words = quote.trim().split(/\s+/).filter(Boolean);
    const room = width - layout.safeX * 2;
    // Longer quotes get smaller type so they stay within about five lines.
    const quoteSize = Math.min(t * 6, t * 6 * Math.sqrt(60 / Math.max(60, quote.length)));
    const markIn = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
    const stars = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    const wordsEnd = 8 + words.length * 1.6;
    const byIn = spring({ frame: frame - wordsEnd - 4, fps, config: { damping: 200 } });

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent, '20% 10%'), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            <div style={{ maxWidth: Math.min(room, t * 120), display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ color: colors.accent, fontFamily: displayFont(brand), fontSize: t * 16, fontWeight: 800, lineHeight: 0.8, height: t * 9, transform: `scale(${markIn}) rotate(${(1 - markIn) * -20}deg)` }}>“</div>
                {stars > 0 && (
                    <div style={{ display: 'flex', gap: u * 0.8, marginBottom: u * 3 }}>
                        {Array.from({ length: 5 }, (_, i) => {
                            const fill = i < stars ? interpolate(frame, [6 + i * 3, 12 + i * 3], [0, 1], clamp) : 0;
                            return (
                                <svg key={i} width={t * 4} height={t * 4} viewBox='0 0 24 24' style={{ transform: `scale(${0.7 + fill * 0.3})` }}>
                                    <path d={STAR} fill={i < stars ? colors.accent : 'none'} fillOpacity={fill} stroke={colors.accent} strokeWidth={1.4} strokeOpacity={0.6} />
                                </svg>
                            );
                        })}
                    </div>
                )}
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: quoteSize, fontWeight: 650, lineHeight: 1.25, letterSpacing: -quoteSize * 0.01 }}>
                    {words.map((word, i) => {
                        const p = interpolate(frame, [8 + i * 1.6, 16 + i * 1.6], [0, 1], clamp);
                        return (
                            <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * u * 1.5}px)`, marginRight: '0.28em' }}>
                                {word}
                            </span>
                        );
                    })}
                </div>
                {(name || role) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: u * 2, marginTop: t * 5, opacity: byIn, transform: `translateY(${(1 - byIn) * u * 2}px)` }}>
                        {avatar && <SceneImage src={avatar} assets={assets} brand={brand} style={{ width: t * 8, height: t * 8, borderRadius: '50%', border: `${u * 0.4}px solid ${colors.accent}` }} />}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ color: colors.text, fontSize: t * 3.4, fontWeight: 700, lineHeight: 1.2 }}>{name}</div>
                            {role && <div style={{ color: colors.muted, fontSize: t * 2.8, fontWeight: 500, lineHeight: 1.2 }}>{role}</div>}
                        </div>
                    </div>
                )}
            </div>
        </AbsoluteFill>
    );
}
