import { AbsoluteFill, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { Copy, Glow, Ring, Sweep, useTiming } from './deviceParts';
import { bodyFont, type Brand, type SceneAssets } from './assets';

export interface UiCollageProps {
    headline: string;
    images: { image: string }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Where each card sits on the stage (centre, 0–1), how it is turned and how close it is (1 = front, moves most). */
const LAYOUTS: Record<number, { x: number; y: number; rotate: number; depth: number }[]> = {
    3: [
        { x: 0.26, y: 0.56, rotate: -6, depth: 0.4 },
        { x: 0.5, y: 0.46, rotate: 0, depth: 1 },
        { x: 0.74, y: 0.58, rotate: 6, depth: 0.6 },
    ],
    4: [
        { x: 0.2, y: 0.42, rotate: -7, depth: 0.4 },
        { x: 0.4, y: 0.6, rotate: -3, depth: 0.8 },
        { x: 0.62, y: 0.4, rotate: 3, depth: 0.6 },
        { x: 0.8, y: 0.6, rotate: 7, depth: 1 },
    ],
    5: [
        { x: 0.18, y: 0.5, rotate: -8, depth: 0.3 },
        { x: 0.34, y: 0.34, rotate: -4, depth: 0.6 },
        { x: 0.5, y: 0.62, rotate: 0, depth: 1 },
        { x: 0.66, y: 0.34, rotate: 4, depth: 0.6 },
        { x: 0.82, y: 0.5, rotate: 8, depth: 0.3 },
    ],
};
const CARD_SHARE: Record<number, number> = { 3: 0.42, 4: 0.34, 5: 0.29 };

/** Frames between one card landing and the next; the nearest card lands last. */
const STAGGER = 4;

/** 3–5 screenshots as floating cards at different depths: the far ones drop in first and the nearest lands last with a flash of light, then they drift with a little parallax. */
export function UiCollage({ headline, images, transparent, brand, assets }: UiCollageProps) {
    const { pop, ramp } = useTiming();
    const { width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const { unit: u, text: t } = layout;
    const { colors } = brand;
    const exit = useExit();
    const given = (Array.isArray(images) ? images : []).slice(0, 5);
    // Empty slots stay as placeholders until the user adds pictures; fewer than three is padded.
    const cards = Array.from({ length: Math.min(5, Math.max(3, given.length)) }, (_, i) => given[i]?.image ?? '');
    const n = cards.length;
    const positions = LAYOUTS[n];
    const stageW = width - layout.safeX * 2;
    const headH = headline ? t * 12 : 0;
    const stageH = height - layout.safeY * 2 - headH;
    // Cards are wide screens; in a tall frame they can be larger because the row is mostly vertical space.
    const cardW = Math.min(stageW * (CARD_SHARE[n] * (layout.portrait ? 1.7 : layout.stacked ? 1.3 : 1)), stageH * 0.7 * 1.6);
    const cardH = cardW * 0.625;
    const drift = 0.5 - ramp(0, durationInFrames, (x) => x);
    // Landing order: by depth, so the card nearest the camera is the hit.
    const rank = [...positions].sort((a, b) => a.depth - b.depth);
    const hero = rank[n - 1];
    const heroAt = (n - 1) * STAGGER;

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ padding: `${layout.safeY}px ${layout.safeX}px` }}>
                {headline && <div style={{ height: headH, display: 'flex', justifyContent: 'center' }}><Copy brand={brand} headline={headline} detail='' width={stageW} size={t * 5.5} align='center' at={0} /></div>}
                <div style={{ position: 'relative', width: stageW, height: stageH, perspective: width * 1.2 }}>
                    <Glow x={hero.x * stageW} y={hero.y * stageH} r={cardW * 1.1} color={`${colors.accent}44`} opacity={pop(heroAt)} />
                    <Ring x={hero.x * stageW} y={hero.y * stageH} r0={cardW * 0.3} r1={cardW * 1.1} t={ramp(heroAt + 3, heroAt + 28)} color={colors.accent} width={u * 0.4} />
                    {cards.map((image, i) => {
                        const place = positions[i];
                        const at = rank.indexOf(place) * STAGGER;
                        const rise = pop(at);
                        const front = place === hero;
                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left: place.x * stageW - cardW / 2,
                                    top: place.y * stageH - cardH / 2,
                                    width: cardW,
                                    height: cardH,
                                    zIndex: Math.round(place.depth * 10),
                                    borderRadius: u * 1.6,
                                    overflow: 'hidden',
                                    border: `1px solid ${front ? colors.accent : `${colors.muted}44`}`,
                                    boxShadow: `0 ${u * (1 + place.depth * 2.5)}px ${u * (3 + place.depth * 5)}px rgba(0,0,0,${0.3 + place.depth * 0.3})${front ? `, 0 0 ${u * 5}px ${colors.accent}55` : ''}`,
                                    opacity: Math.min(1, rise * 3),
                                    transform: `translate(${drift * u * 10 * place.depth}px, ${(1 - rise) * u * 18}px) rotate(${place.rotate * rise}deg) rotateY(${(0.5 - place.x) * 22 * rise}deg) scale(${0.8 + rise * 0.2})`,
                                }}
                            >
                                <SceneImage src={image} assets={assets} brand={brand} label='Add a screenshot' style={{ width: '100%', height: '100%' }} />
                                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(125deg, rgba(255,255,255,0.1), transparent 35%), rgba(0,0,0,${(1 - place.depth) * 0.3})` }} />
                                {front && <Sweep t={ramp(at + 4, at + 24, (x) => x)} />}
                            </div>
                        );
                    })}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
