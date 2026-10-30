import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface RoadmapProps {
    heading: string;
    milestones: { when: string; title: string; status: 'done' | 'now' | 'next' }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Milestones on a line that draws itself: done ones fill, the current one pulses, later ones stay outlined. Vertical in tall frames. */
export function Roadmap({ heading, milestones, transparent, brand }: RoadmapProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit * grow(width, height);
    const t = layout.text * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const list = (Array.isArray(milestones) ? milestones : []).filter((m) => m?.title?.trim()).slice(0, 5);
    const n = Math.max(1, list.length);
    const vertical = layout.stacked;
    const innerW = width - layout.safeX * 2;
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 7);
    // The line reaches each milestone in turn; a milestone lands when the line gets to it.
    const lineEnd = 12 + n * 9;
    const line = interpolate(frame, [10, lineEnd], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    const reached = (i: number) => 10 + ((i + 0.5) / n) * (lineEnd - 10);
    const dot = t * (vertical ? 3.6 : 3);
    const size = { when: t * (vertical ? 3 : 2.6), title: t * (vertical ? 5 : 4.2) };
    const step = vertical ? Math.min((height - layout.safeY * 2 - (heading ? t * 14 : 0)) / n, t * 26) : innerW / n;

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {heading && (
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * (vertical ? 5 : 8), opacity: headIn, transform: `translateY(${(1 - headIn) * u * 3}px)` }}>{heading}</div>
            )}
            <div style={{ position: 'relative', width: vertical ? Math.min(innerW, t * 75) : innerW, height: vertical ? step * n : t * 30 }}>
                {/* Track and the part drawn so far, through the dots' centres. */}
                <div style={{ position: 'absolute', background: `${colors.muted}44`, borderRadius: 99, ...(vertical ? { left: dot / 2 - u * 0.25, top: step / 2, width: u * 0.5, height: step * (n - 1) } : { top: dot / 2 - u * 0.25, left: step / 2, height: u * 0.5, width: step * (n - 1) }) }} />
                <div style={{ position: 'absolute', background: colors.accent, borderRadius: 99, ...(vertical ? { left: dot / 2 - u * 0.25, top: step / 2, width: u * 0.5, height: step * (n - 1) * line } : { top: dot / 2 - u * 0.25, left: step / 2, height: u * 0.5, width: step * (n - 1) * line }) }} />
                {list.map((m, i) => {
                    const land = spring({ frame: frame - reached(i), fps, config: { damping: 12, stiffness: 160 } });
                    const textIn = interpolate(frame, [reached(i), reached(i) + 10], [0, 1], clamp);
                    const filled = m.status === 'done' || m.status === 'now';
                    // One ring when the milestone lands (not an endless pulse: moving forever reads as the scene swinging).
                    const ring = Math.min(1, Math.max(0, (frame - reached(i)) / fps / 1.2));
                    const pulse = m.status === 'now' ? 1 + 0.6 * ring : 0;
                    const pulseFade = m.status === 'now' ? 1 - ring : 0;
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: vertical ? 'row' : 'column',
                                alignItems: vertical ? 'center' : 'center',
                                gap: u * 2.4,
                                ...(vertical ? { left: 0, right: 0, top: step * i + step / 2 - dot / 2 } : { top: 0, left: step * i, width: step }),
                            }}
                        >
                            <div style={{ position: 'relative', width: dot, height: dot, flexShrink: 0, transform: `scale(${land})` }}>
                                {m.status === 'now' && land > 0.9 && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: colors.accent, opacity: pulseFade * 0.5, transform: `scale(${pulse})` }} />}
                                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxSizing: 'border-box', border: `${u * 0.5}px solid ${colors.accent}`, background: filled ? colors.accent : colors.bg }} />
                                {m.status === 'done' && (
                                    <svg viewBox='0 0 24 24' style={{ position: 'absolute', inset: '18%' }}>
                                        <path d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke={colors.bg} strokeWidth={3.2} strokeLinecap='round' strokeLinejoin='round' />
                                    </svg>
                                )}
                            </div>
                            <div style={{ textAlign: vertical ? 'left' : 'center', opacity: textIn, transform: `translateY(${(1 - textIn) * u * 2}px)`, margin: vertical ? 0 : `0 ${u}px`, padding: `${u * 1.8}px ${u * 2}px`, borderRadius: u * 2, background: `${colors.surface}cc`, border: `${m.status === 'now' ? u * 0.3 : 1}px solid ${m.status === 'now' ? colors.accent : `${colors.muted}33`}`, boxShadow: m.status === 'now' ? `0 ${u * 1.5}px ${u * 5}px ${colors.accent}44` : 'none', minWidth: 0 }}>
                                {m.status === 'done' && <div style={{ color: colors.accent, fontSize: size.when * 0.9, fontWeight: 700, marginBottom: u * 0.6 }}>✓ Shipped</div>}
                                {m.status === 'now' && <div style={{ color: colors.accent, fontSize: size.when * 0.9, fontWeight: 700, marginBottom: u * 0.6 }}>● In progress</div>}
                                {m.when && <div style={{ color: m.status === 'next' ? colors.muted : colors.accent, fontSize: size.when, fontWeight: 700, letterSpacing: size.when * 0.06, textTransform: 'uppercase', lineHeight: 1.2, marginBottom: u * 0.6 }}>{m.when}</div>}
                                <div style={{ color: m.status === 'next' ? colors.muted : colors.text, fontFamily: displayFont(brand), fontSize: size.title, fontWeight: 750, lineHeight: 1.15 }}>{m.title}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
}
