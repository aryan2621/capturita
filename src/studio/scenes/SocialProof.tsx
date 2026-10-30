import { grow } from './layout';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export interface SocialProofProps {
    /** 0–5, halves allowed. */
    rating: number;
    reviews: string;
    badge: string;
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last star lights, for a sound. */
export const SOCIAL_PROOF_BEAT = 1.4;

/** Five stars that fill one by one, the rating and review count under them, and a badge line. */
export function SocialProof({ rating, reviews, badge, transparent, brand }: SocialProofProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    const starSize = Math.min(u * 11, width * 0.14);
    const numberIn = spring({ frame: frame - 6 - SOCIAL_PROOF_BEAT * fps * 0.6, fps, config: { damping: 200 } });
    const lowerIn = spring({ frame: frame - 12 - SOCIAL_PROOF_BEAT * fps * 0.8, fps, config: { damping: 200 } });
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 3 }}>
                    <div style={{ display: 'flex', gap: starSize * 0.12 }}>
                        {[0, 1, 2, 3, 4].map((i) => {
                            const fill = Math.max(0, Math.min(1, value - i));
                            const p = spring({ frame: frame - 6 - i * (SOCIAL_PROOF_BEAT * fps * 0.15), fps, config: { damping: 12, stiffness: 150 } });
                            return (
                                <svg key={i} width={starSize} height={starSize} viewBox="0 0 24 24" style={{ transform: `scale(${Math.max(0, Math.min(1.15, p))})` }}>
                                    <defs><clipPath id={`star-${i}`}>{/* the star spans x 2–22 of its box, so a partial fill is measured across that, not the whole box */}<rect width={fill >= 1 ? 24 : 2 + 20 * fill} height={24} /></clipPath></defs>
                                    <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={colors.surface} stroke={colors.accent} strokeWidth={1} strokeLinejoin="round" />
                                    <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={colors.accent} clipPath={`url(#star-${i})`} />
                                </svg>
                            );
                        })}
                    </div>
                    <div style={{ fontFamily: displayFont(brand), fontSize: u * 12, fontWeight: 800, color: colors.text, fontVariantNumeric: 'tabular-nums', opacity: numberIn, transform: `translateY(${(1 - numberIn) * u * 2}px)` }}>{value.toFixed(1)}</div>
                    <div style={{ fontSize: u * 3.4, color: colors.muted, opacity: numberIn }}>{reviews}</div>
                    {badge && <div style={{ padding: `${u * 1}px ${u * 2.6}px`, borderRadius: u * 5, border: `${u * 0.25}px solid ${colors.accent}`, color: colors.accent, fontWeight: 700, fontSize: u * 2.8, opacity: lowerIn, transform: `translateY(${(1 - lowerIn) * u * 2}px)` }}>{badge}</div>}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
