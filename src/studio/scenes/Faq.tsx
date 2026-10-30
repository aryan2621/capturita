import { grow } from './layout';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export interface FaqProps {
    heading: string;
    items: { q: string; a: string }[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last answer is shown, for a sound. */
export const FAQ_BEAT = 2.4;

/** Question cards that rise in one by one, each answer opening under its question. */
export function Faq({ heading, items, transparent, brand }: FaqProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const cards = (items ?? []).slice(0, 4);
    const headIn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: u * 2, width: Math.min(width * 0.8, u * 110) }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: u * 5.4, fontWeight: 800, color: colors.text, opacity: headIn }}>{heading}</div>
                    {cards.map((card, i) => {
                        const at = 8 + (i / Math.max(1, cards.length - 1)) * FAQ_BEAT * fps * 0.75;
                        const rise = spring({ frame: frame - at, fps, config: { damping: 200 } });
                        const open = spring({ frame: frame - at - 10, fps, config: { damping: 200 } });
                        return (
                            <div key={i} style={{ padding: `${u * 1.8}px ${u * 2.4}px`, borderRadius: u * 1.4, background: colors.surface, opacity: rise, transform: `translateY(${(1 - rise) * u * 3}px)` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: u * 1.6, fontSize: u * 3.2, fontWeight: 700, color: colors.text }}>
                                    <span style={{ color: colors.accent }}>Q</span>{card.q}
                                </div>
                                <div style={{ overflow: 'hidden', maxHeight: u * 12 * open, opacity: open, marginTop: u * 1 * open, fontSize: u * 2.7, color: colors.muted, paddingLeft: u * 3.2 }}>{card.a}</div>
                            </div>
                        );
                    })}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
