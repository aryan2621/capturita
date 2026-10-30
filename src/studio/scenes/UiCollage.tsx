import { useBeatSnap } from './beat';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

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

/** 3–5 screenshots as floating cards at different depths: they rise in one after another and drift with a little parallax. */
export function UiCollage({ headline, images, transparent, brand, assets }: UiCollageProps) {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit;
    const t = layout.text;
    const { colors } = brand;
    const exit = useExit();
    const given = (Array.isArray(images) ? images : []).slice(0, 5);
    // Empty slots stay as placeholders until the user adds pictures; fewer than three is padded.
    const cards = Array.from({ length: Math.min(5, Math.max(3, given.length)) }, (_, i) => given[i]?.image ?? '');
    const n = cards.length;
    const positions = LAYOUTS[n];
    const stageW = width - layout.safeX * 2;
    const headH = headline ? t * 10 : 0;
    const stageH = height - layout.safeY * 2 - headH;
    // Cards are wide screens; in a tall frame they can be larger because the row is mostly vertical space.
    const cardW = Math.min(stageW * (CARD_SHARE[n] * (layout.portrait ? 1.7 : layout.stacked ? 1.3 : 1)), stageH * 0.7 * 1.6);
    const cardH = cardW * 0.625;
    const snap = useBeatSnap();
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    const headSize = fitSize(headline, stageW, brand.fonts.display, t * 5.5);
    const progress = frame / Math.max(1, durationInFrames);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ padding: `${layout.safeY}px ${layout.safeX}px` }}>
            {headline && (
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', height: headH, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 3}px)` }}>{headline}</div>
            )}
            <div style={{ position: 'relative', width: stageW, height: stageH }}>
                {cards.map((image, i) => {
                    const place = positions[i];
                    const rise = spring({ frame: frame - snap((6 + i * 6) / fps) * fps, fps, config: { damping: 15, stiffness: 100 } });
                    // Near cards travel further than far ones as the scene plays, and each floats a little.
                    const drift = (0.5 - progress) * u * 10 * place.depth;
                    const float = 0;
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
                                border: `1px solid ${colors.muted}33`,
                                boxShadow: `0 ${u * 2.5}px ${u * 6}px rgba(0,0,0,${0.25 + place.depth * 0.25})`,
                                opacity: interpolate(rise, [0, 0.5], [0, 1], clamp),
                                transform: `translate(${drift}px, ${(1 - rise) * u * 14 + float}px) rotate(${place.rotate * rise}deg) scale(${0.85 + rise * 0.15})`,
                            }}
                        >
                            <SceneImage src={image} assets={assets} brand={brand} label='Add a screenshot' style={{ width: '100%', height: '100%' }} />
                        </div>
                    );
                })}
            </div>
            </Depth>
        </AbsoluteFill>
    );
}
