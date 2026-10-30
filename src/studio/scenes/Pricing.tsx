import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface PricingTier {
    name: string;
    price: string;
    period: string;
    features: string;
    highlight: 'yes' | 'no';
}

export interface PricingProps {
    heading: string;
    tiers: PricingTier[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** 1–3 price plans as cards that rise in turn; the highlighted plan lifts with an accent ring. Features are separated by ";". */
export function Pricing({ heading, tiers, transparent, brand }: PricingProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit * grow(width, height);
    const t = layout.text * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const list = (Array.isArray(tiers) ? tiers : []).filter((tier) => tier?.name?.trim()).slice(0, 3);
    const n = Math.max(1, list.length);
    const row = !layout.stacked;
    const innerW = width - layout.safeX * 2;
    const gap = u * 2.4;
    const cardW = row ? Math.min((innerW - gap * (n - 1)) / n, t * 46) : Math.min(innerW, t * 80);
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6.5);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {heading && <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * 4, opacity: headIn }}>{heading}</div>}
            <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', alignItems: row ? 'flex-end' : 'stretch', gap }}>
                {list.map((tier, i) => {
                    const hot = tier.highlight === 'yes';
                    const rise = spring({ frame: frame - 8 - i * 6, fps, config: { damping: 15, stiffness: 120 } });
                    const lift = hot ? spring({ frame: frame - 30 - n * 6, fps, config: { damping: 12, stiffness: 140 } }) : 0;
                    const features = tier.features.split(';').map((f) => f.trim()).filter(Boolean).slice(0, row ? 6 : 3);
                    return (
                        <div
                            key={i}
                            style={{
                                width: cardW,
                                boxSizing: 'border-box',
                                padding: row ? u * 3.4 : `${u * 2.2}px ${u * 3}px`,
                                borderRadius: u * 2.6,
                                background: hot ? colors.surface : `${colors.surface}99`,
                                border: `${hot ? u * 0.4 : 1}px solid ${hot ? colors.accent : `${colors.muted}33`}`,
                                boxShadow: hot ? `0 ${u * 2 * lift}px ${u * 6}px ${colors.accent}44` : 'none',
                                display: 'flex',
                                flexDirection: row ? 'column' : 'row',
                                alignItems: row ? 'flex-start' : 'center',
                                justifyContent: 'space-between',
                                gap: u * 2,
                                opacity: interpolate(rise, [0, 0.5], [0, 1], clamp),
                                transform: `translateY(${(1 - rise) * u * 10 - lift * u * 2.5}px) scale(${1 + lift * 0.03})`,
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: u * 1.2 }}>
                                    <span style={{ color: colors.text, fontSize: t * 3.2, fontWeight: 700, lineHeight: 1.2 }}>{tier.name}</span>
                                    {hot && <span style={{ background: colors.accent, color: colors.bg, fontSize: t * 1.9, fontWeight: 700, lineHeight: 1.2, padding: `${u * 0.4}px ${u * 1.2}px`, borderRadius: u * 2 }}>Popular</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: u * 0.6, marginTop: u * 1.2 }}>
                                    <span style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: t * (row ? 8 : 6), fontWeight: 800, lineHeight: 1 }}>{tier.price}</span>
                                    {tier.period && <span style={{ color: colors.muted, fontSize: t * 2.6, fontWeight: 500, lineHeight: 1.2 }}>{tier.period}</span>}
                                </div>
                            </div>
                            {features.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: u * 0.9, marginTop: row ? u * 1.5 : 0, maxWidth: row ? undefined : '55%' }}>
                                    {features.map((feature, f) => {
                                        const p = interpolate(frame, [18 + i * 6 + f * 3, 26 + i * 6 + f * 3], [0, 1], clamp);
                                        return (
                                            <div key={f} style={{ display: 'flex', gap: u * 1, alignItems: 'flex-start', color: colors.text, fontSize: t * 2.5, fontWeight: 500, lineHeight: 1.25, opacity: p }}>
                                                <span style={{ color: colors.accent, fontWeight: 800, lineHeight: 1.25 }}>✓</span>
                                                {feature}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
}
