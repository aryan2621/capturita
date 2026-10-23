import { AbsoluteFill, OffthreadVideo, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface VideoClipProps {
    video: string;
    /** Seconds into the file where the scene starts. */
    from: number;
    framing: 'full' | 'card';
    caption: string;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** B-roll: a video the user adds, full-bleed or in a card with a caption. Silent: its sound goes on an audio lane. A clip shorter than the scene holds its last frame. */
export function VideoClip({ video, from, framing, caption, transparent, brand, assets }: VideoClipProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit;
    const t = layout.text;
    const exit = useExit();
    const src = video ? assetUrl(assets, video) : null;
    const start = Math.max(0, Math.round((Number(from) || 0) * fps));
    const card = framing === 'card';
    const cardIn = spring({ frame, fps, config: { damping: 200 } });
    const captionIn = spring({ frame: frame - 12, fps, config: { damping: 200 } });

    const media = src ? (
        <OffthreadVideo src={src} trimBefore={start} muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    ) : (
        <SceneImage src='' assets={assets} brand={brand} label='Add a video' style={{ width: '100%', height: '100%' }} />
    );

    return (
        <AbsoluteFill style={{ background: card ? sceneGradient(brand, transparent) : '#000', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            {card && <BrandTexture brand={brand} transparent={transparent} />}
            {card ? (
                <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px`, gap: t * 3, flexDirection: 'column' }}>
                    <div style={{ width: '100%', flex: 1, minHeight: 0, borderRadius: u * 2.4, overflow: 'hidden', boxShadow: `0 ${u * 2}px ${u * 6}px rgba(0,0,0,0.45)`, opacity: cardIn, transform: `scale(${0.94 + cardIn * 0.06})` }}>{media}</div>
                    {caption && <div style={{ color: brand.colors.text, fontFamily: displayFont(brand), fontSize: t * 3.8, fontWeight: 750, textAlign: 'center', opacity: captionIn, transform: `translateY(${(1 - captionIn) * u * 2}px)` }}>{caption}</div>}
                </AbsoluteFill>
            ) : (
                <>
                    {media}
                    {caption && (
                        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: `${layout.safeY}px ${layout.safeX}px`, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 40%)' }}>
                            <div style={{ color: '#fff', fontFamily: displayFont(brand), fontSize: t * 4.4, fontWeight: 800, opacity: captionIn, transform: `translateY(${(1 - captionIn) * u * 2}px)` }}>{caption}</div>
                        </AbsoluteFill>
                    )}
                </>
            )}
        </AbsoluteFill>
    );
}
