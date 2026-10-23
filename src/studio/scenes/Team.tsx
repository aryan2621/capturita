import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface TeamProps {
    heading: string;
    people: { name: string; role: string; photo: string }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** The people behind it: round photos (or initials) pop in one by one, each with a name and role. */
export function Team({ heading, people, transparent, brand, assets }: TeamProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit;
    const t = layout.text;
    const { colors } = brand;
    const exit = useExit();
    const list = (Array.isArray(people) ? people : []).filter((p) => p?.name?.trim()).slice(0, 6);
    const n = Math.max(1, list.length);
    const cols = layout.portrait || (layout.stacked && n === 4) ? Math.min(2, n) : layout.stacked ? Math.min(3, n) : n === 4 ? 4 : Math.min(3, n);
    const rows = Math.ceil(n / cols);
    const innerW = width - layout.safeX * 2;
    const cellW = innerW / cols;
    const headH = heading ? t * 10 : 0;
    const cellH = (height - layout.safeY * 2 - headH) / rows;
    const photo = Math.min(cellW * 0.55, cellH - t * 10, t * 24);
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent, '50% 100%'), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {heading && (
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * 4, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 3}px)` }}>{heading}</div>
            )}
            {/* Wrapping rows, centred, so a short last row sits in the middle. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: innerW, rowGap: t * 3 }}>
                {list.map((p, i) => {
                    const pop = spring({ frame: frame - 8 - i * 5, fps, config: { damping: 13, stiffness: 150 } });
                    const textIn = interpolate(frame, [14 + i * 5, 24 + i * 5], [0, 1], clamp);
                    const initials = p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                        <div key={i} style={{ width: cellW, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: `0 ${u}px` }}>
                            <div style={{ width: photo, height: photo, borderRadius: '50%', padding: u * 0.5, background: colors.accent, transform: `scale(${pop})`, opacity: interpolate(pop, [0, 0.4], [0, 1], clamp) }}>
                                {p.photo ? (
                                    <SceneImage src={p.photo} assets={assets} brand={brand} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: colors.surface, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: displayFont(brand), fontSize: photo * 0.34, fontWeight: 750 }}>{initials}</div>
                                )}
                            </div>
                            <div style={{ marginTop: t * 2, opacity: textIn, transform: `translateY(${(1 - textIn) * u * 2}px)` }}>
                                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: t * 3.2, fontWeight: 750, lineHeight: 1.15 }}>{p.name}</div>
                                {p.role && <div style={{ color: colors.muted, fontSize: t * 2.5, fontWeight: 500, lineHeight: 1.25, marginTop: u * 0.5 }}>{p.role}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
}
