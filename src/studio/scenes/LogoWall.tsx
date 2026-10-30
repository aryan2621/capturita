import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface LogoWallProps {
    heading: string;
    logos: { logo: string }[];
    style: 'grid' | 'marquee';
    mono: boolean;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** "Trusted by" logos: a grid that fades in tile by tile, or two rows gliding past in opposite directions. */
export function LogoWall({ heading, logos, style, mono, transparent, brand, assets }: LogoWallProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit * grow(width, height);
    const t = layout.text * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const list = (Array.isArray(logos) ? logos : []).filter((l) => l?.logo).slice(0, 12);
    const shown = list.length ? list : ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark'].map(() => ({ logo: '' }));
    const placeholders = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark'];
    const innerW = width - layout.safeX * 2;
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    const logoFilter = mono ? 'grayscale(1) brightness(1.6) contrast(0.9)' : 'none';
    const tileH = t * (layout.portrait ? 7 : 8);
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 5);

    const tile = (logo: string, key: string | number, opacity = 1) => (
        <div key={key} style={{ height: tileH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity, padding: `0 ${u * 2}px`, borderRadius: u * 1.8, background: `${colors.surface}99`, border: `1px solid ${colors.muted}33` }}>
            {logo ? (
                <SceneImage src={logo} assets={assets} brand={brand} fit='contain' label='Logo' style={{ height: '70%', width: '100%', maxWidth: tileH * 3, filter: logoFilter }} />
            ) : (
                <span style={{ color: colors.muted, fontFamily: displayFont(brand), fontSize: tileH * 0.34, fontWeight: 800, letterSpacing: -0.5 }}>{placeholders[Number(key) % placeholders.length]}</span>
            )}
        </div>
    );

    let body;
    if (style === 'marquee') {
        const half = Math.ceil(shown.length / 2);
        const rowsOf = [shown.slice(0, half), shown.slice(half).length ? shown.slice(half) : shown.slice(0, half)];
        const itemW = tileH * 3 + u * 6;
        body = (
            <div style={{ width, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: u * 4, maskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)' }}>
                {rowsOf.map((row, r) => {
                    const loop = row.length * itemW;
                    const offset = ((frame * u * 0.35 * (r === 0 ? 1 : -1)) % loop + loop) % loop;
                    const repeated = [...row, ...row, ...row, ...row];
                    return (
                        <div key={r} style={{ display: 'flex', gap: u * 6, transform: `translateX(${-offset}px)` }}>
                            {repeated.map((l, i) => (
                                <div key={i} style={{ width: tileH * 3, flexShrink: 0 }}>
                                    {tile(l.logo, i)}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        );
    } else {
        const cols = layout.portrait ? 2 : shown.length <= 6 ? 3 : Math.min(4, Math.ceil(Math.sqrt(shown.length * 1.6)));
        body = (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${u * 4}px ${u * 6}px`, width: Math.min(innerW, cols * tileH * 3.6) }}>
                {shown.map((l, i) => tile(l.logo, i, interpolate(frame, [8 + i * 3, 18 + i * 3], [0, 1], clamp)))}
            </div>
        );
    }

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px 0` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {heading && (
                <div style={{ color: colors.muted, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 700, lineHeight: 1.15, textAlign: 'center', marginBottom: t * 5, padding: `0 ${layout.safeX}px`, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 2}px)` }}>{heading}</div>
            )}
            {body}
        </AbsoluteFill>
    );
}
