import { grow } from './layout';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export interface ChangelogProps {
    heading: string;
    entries: { version: string; text: string }[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last entry has landed, for a sound. */
export const CHANGELOG_BEAT = 2.2;

/** A "what's new" list: each version pill and its line slide in one after another and tick off. */
export function Changelog({ heading, entries, transparent, brand }: ChangelogProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const rows = (entries ?? []).slice(0, 5);
    const headIn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: u * 2.2, width: Math.min(width * 0.8, u * 110) }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: u * 5.4, fontWeight: 800, color: colors.text, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 2}px)` }}>{heading}</div>
                    {rows.map((row, i) => {
                        const at = 10 + (i / Math.max(1, rows.length - 1)) * CHANGELOG_BEAT * fps * 0.8;
                        const p = spring({ frame: frame - at, fps, config: { damping: 200 } });
                        const tick = spring({ frame: frame - at - 8, fps, config: { damping: 12, stiffness: 160 } });
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: u * 2, padding: `${u * 1.6}px ${u * 2.2}px`, borderRadius: u * 1.4, background: colors.surface, opacity: p, transform: `translateX(${(1 - p) * u * 6}px)` }}>
                                <div style={{ padding: `${u * 0.5}px ${u * 1.4}px`, borderRadius: u * 5, background: colors.accent, color: colors.bg, fontWeight: 800, fontSize: u * 2.2, fontVariantNumeric: 'tabular-nums' }}>{row.version}</div>
                                <div style={{ flex: 1, color: colors.text, fontSize: u * 3 }}>{row.text}</div>
                                <div style={{ color: colors.accent, fontSize: u * 3.4, fontWeight: 800, transform: `scale(${Math.min(1, tick)})`, opacity: Math.min(1, tick) }}>✓</div>
                            </div>
                        );
                    })}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
