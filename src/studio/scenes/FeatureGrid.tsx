import { BarChart3, Clock, Globe, Heart, Layers, Lock, Rocket, Shield, Sparkles, Users, Wand2, Zap, type LucideIcon } from 'lucide-react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { useBeatSnap } from './beat';
import { Glow, Sweep, SNAP, useTiming } from './deviceParts';
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

/** Frames between one card landing and the next. */
const STAGGER = 4;

/** 2–6 features as glass cards: the heading drops in, then the cards land one after another, each with its icon flashing on. */
export function FeatureGrid({ heading, items, transparent, brand }: FeatureGridProps) {
    const { pop, glide, ramp } = useTiming();
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
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6.5);
    const headIn = glide(0);
    const iconBox = compact ? t * 5 : t * 7;

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}>
                <BrandTexture brand={brand} transparent={transparent} />
                <Glow x={width / 2} y={height / 2} r={Math.max(width, height) * 0.5} color={`${colors.accent}22`} opacity={headIn} />
            </Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
                {heading && (
                    <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * 3, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 3}px)` }}>{heading}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap, perspective: width * 1.5 }}>
                    {list.map((item, i) => {
                        // Each card lands on the nearest beat within 0.15 s of its usual time.
                        const start = snap((3 + i * STAGGER) / fps) * fps;
                        const land = pop(start);
                        const iconIn = pop(start + 3, { ...SNAP, damping: 9 });
                        const Icon = FEATURE_ICONS[item.icon] ?? Sparkles;
                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'relative',
                                    height: cardH,
                                    boxSizing: 'border-box',
                                    padding: compact ? u * 2.2 : u * 3,
                                    borderRadius: u * 2.4,
                                    overflow: 'hidden',
                                    background: `linear-gradient(160deg, ${colors.surface}f2, ${colors.surface}b0)`,
                                    border: `1px solid ${colors.muted}33`,
                                    boxShadow: `0 ${u * 2}px ${u * 5}px rgba(0,0,0,0.3), 0 1px 0 #ffffff1a inset`,
                                    display: 'flex',
                                    flexDirection: compact ? 'row' : 'column',
                                    alignItems: compact ? 'center' : 'flex-start',
                                    gap: u * 2,
                                    opacity: Math.min(1, land * 2.5),
                                    transform: `translateY(${(1 - land) * u * 8}px) rotateX(${(1 - land) * 16}deg) scale(${0.9 + land * 0.1})`,
                                    transformOrigin: '50% 100%',
                                }}
                            >
                                <div style={{ position: 'relative', width: iconBox, height: iconBox, flexShrink: 0 }}>
                                    <div style={{ width: iconBox, height: iconBox, borderRadius: u * 1.6, background: `linear-gradient(145deg, ${colors.accent}, ${colors.accent}bb)`, color: colors.bg, boxShadow: `0 0 ${u * 2.4 * iconIn}px ${colors.accent}88, 0 1px 0 #ffffff55 inset`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${iconIn}) rotate(${(1 - iconIn) * -25}deg)` }}>
                                        <Icon size={iconBox * 0.55} strokeWidth={2.2} />
                                    </div>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: t * (compact ? 3.2 : 3.8), fontWeight: 750, lineHeight: 1.15 }}>{item.title}</div>
                                    {item.text && <div style={{ color: colors.muted, fontSize: t * (compact ? 2.4 : 2.7), fontWeight: 500, lineHeight: 1.3, marginTop: u * 0.8 }}>{item.text}</div>}
                                </div>
                                <Sweep t={ramp(start + 2, start + 22, (x) => x)} strength={0.1} />
                            </div>
                        );
                    })}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
