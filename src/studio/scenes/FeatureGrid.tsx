import { BarChart3, Clock, Globe, Heart, Layers, Lock, Rocket, Shield, Sparkles, Users, Wand2, Zap, type LucideIcon } from 'lucide-react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { useBeatSnap } from './beat';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export const FEATURE_ICONS: Record<string, LucideIcon> = {
    zap: Zap,
    sparkles: Sparkles,
    shield: Shield,
    lock: Lock,
    clock: Clock,
    chart: BarChart3,
    users: Users,
    globe: Globe,
    rocket: Rocket,
    heart: Heart,
    layers: Layers,
    wand: Wand2,
};

export interface FeatureGridProps {
    heading: string;
    items: { icon: string; title: string; text: string }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** 2–6 features as cards: heading first, then the cards pop in one after another with their icons. */
export function FeatureGrid({ heading, items, transparent, brand }: FeatureGridProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit * grow(width, height);
    const t = layout.text * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const list = (Array.isArray(items) ? items : []).filter((item) => item?.title?.trim()).slice(0, 6);
    const n = Math.max(1, list.length);
    const cols = layout.portrait ? (n > 3 ? 2 : 1) : layout.stacked ? Math.min(2, n) : n === 4 ? 2 : Math.min(3, n);
    const rows = Math.ceil(n / cols);
    const gap = u * 2.4;
    const innerW = width - layout.safeX * 2;
    const headH = heading ? t * 9 : 0;
    const cardW = (innerW - gap * (cols - 1)) / cols;
    const cardH = Math.min((height - layout.safeY * 2 - headH - gap * (rows - 1)) / rows, cardW * 0.9);
    const compact = cardH < t * 18;
    const snap = useBeatSnap();
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6.5);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            {heading && (
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * 3, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 3}px)` }}>{heading}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap }}>
                {list.map((item, i) => {
                    // Each card lands on the nearest beat within 0.15 s of its usual time.
                    const start = snap((10 + i * 5) / fps) * fps;
                    const pop = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 150 } });
                    const iconIn = spring({ frame: frame - start - 6, fps, config: { damping: 10, stiffness: 180 } });
                    const Icon = FEATURE_ICONS[item.icon] ?? Sparkles;
                    const iconBox = compact ? t * 5 : t * 7;
                    return (
                        <div
                            key={i}
                            style={{
                                height: cardH,
                                boxSizing: 'border-box',
                                padding: compact ? u * 2.2 : u * 3,
                                borderRadius: u * 2.4,
                                background: `${colors.surface}cc`,
                                border: `1px solid ${colors.muted}33`,
                                display: 'flex',
                                flexDirection: compact ? 'row' : 'column',
                                alignItems: compact ? 'center' : 'flex-start',
                                gap: u * 2,
                                opacity: interpolate(pop, [0, 0.5], [0, 1], clamp),
                                transform: `translateY(${(1 - pop) * u * 6}px) scale(${0.92 + pop * 0.08})`,
                            }}
                        >
                            <div style={{ width: iconBox, height: iconBox, flexShrink: 0, borderRadius: u * 1.6, background: colors.accent, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${iconIn}) rotate(${(1 - iconIn) * -25}deg)` }}>
                                <Icon size={iconBox * 0.55} strokeWidth={2.2} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: t * (compact ? 3.2 : 3.8), fontWeight: 750, lineHeight: 1.15 }}>{item.title}</div>
                                {item.text && <div style={{ color: colors.muted, fontSize: t * (compact ? 2.4 : 2.7), fontWeight: 500, lineHeight: 1.3, marginTop: u * 0.8 }}>{item.text}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
            </Depth>
        </AbsoluteFill>
    );
}
