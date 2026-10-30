import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export type ScreenshotDevice = 'phone' | 'tablet' | 'laptop' | 'browser';

export interface ScreenshotShowcaseProps {
    image: string;
    device: ScreenshotDevice;
    placement: 'side' | 'center';
    headline: string;
    detail: string;
    url: string;
    scroll: boolean;
    /** A cursor glides to the focus point and clicks. */
    cursor?: boolean;
    /** Then the screenshot zooms in on the focus point. */
    zoom?: boolean;
    /** The focus point, as a percentage of the screenshot. */
    focusX?: number;
    focusY?: number;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Screen width over height for each frame. */
const SCREEN_RATIO: Record<ScreenshotDevice, number> = { phone: 9 / 19.5, tablet: 3 / 4, laptop: 16 / 10, browser: 16 / 10 };

/** A screenshot in a phone, tablet, laptop or browser frame that rises and settles, with a headline beside or above it. */
export function ScreenshotShowcase({ image, device, placement, headline, detail, url, scroll, cursor, zoom, focusX, focusY, transparent, brand, assets }: ScreenshotShowcaseProps) {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit;
    const t = layout.text;
    const { colors } = brand;
    const exit = useExit();
    const side = placement === 'side' && !layout.stacked && (headline || detail);
    const hasText = !!(headline || detail);

    // The area the device may fill, then the device sized to it.
    const areaW = side ? width * 0.5 - layout.safeX : width - layout.safeX * 2;
    const areaH = height - layout.safeY * 2 - (!side && hasText ? height * (layout.portrait ? 0.24 : 0.28) : 0);
    const ratio = SCREEN_RATIO[device] ?? SCREEN_RATIO.browser;
    const bezel = device === 'phone' ? u * 1.6 : device === 'tablet' ? u * 1.8 : device === 'laptop' ? u * 1.2 : 0;
    const bar = device === 'browser' ? u * 4.2 : 0;
    const base = device === 'laptop' ? u * 2.6 : 0;
    let screenW = Math.min(areaW - bezel * 2, (areaH - bezel * 2 - bar - base) * ratio);
    if (device === 'laptop') screenW = Math.min(screenW, (areaW - bezel * 2) / 1.12);
    const screenH = screenW / ratio;
    const radius = device === 'phone' ? u * 5 : device === 'tablet' ? u * 3 : u * 1.4;

    const rise = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 90 } });
    const tilt = interpolate(rise, [0, 1], [22, 0]);
    const float = 0; // no idle bobbing: moving after landing reads as wandering
    const textIn = spring({ frame: frame - 12, fps, config: { damping: 200 } });
    const detailIn = spring({ frame: frame - 20, fps, config: { damping: 200 } });
    const scrollP = scroll ? interpolate(frame, [30, durationInFrames - 20], [0, 1], { ...clamp, easing: (x) => x * x * (3 - 2 * x) }) : 0;

    const textW = side ? width * 0.5 - layout.safeX * 1.5 : width - layout.safeX * 2;
    const headSize = fitSize(headline, textW, brand.fonts.display, t * (side ? 7 : 7.5));

    const fx = Math.min(95, Math.max(5, Number(focusX) || 50));
    const fy = Math.min(95, Math.max(5, Number(focusY) || 40));
    const ease = (x: number) => x * x * (3 - 2 * x);
    const glide = interpolate(frame, [24, 56], [0, 1], { ...clamp, easing: ease });
    const zoomIn = zoom ? interpolate(frame, [62, 96], [1, 1.8], { ...clamp, easing: ease }) : 1;
    const click = frame >= 56 && frame < 62;
    const cursorSize = u * 3.4;

    const screen = (
        <div style={{ position: 'relative', width: screenW, height: screenH, overflow: 'hidden', borderRadius: device === 'browser' ? `0 0 ${radius}px ${radius}px` : device === 'laptop' ? u * 0.4 : radius - bezel * 0.6, background: colors.surface }}>
            <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoomIn})`, transformOrigin: `${fx}% ${fy}%` }}>
            {scroll && image ? (
                <SceneImage
                    src={image}
                    assets={assets}
                    brand={brand}
                    style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 'auto', transform: `translateY(calc(${-scrollP * 100}% + ${scrollP * screenH}px))` }}
                />
            ) : (
                <SceneImage src={image} assets={assets} brand={brand} label='Add a screenshot' style={{ width: '100%', height: '100%' }} />
            )}
            </div>
            {cursor && image && (
                <svg
                    width={cursorSize}
                    height={cursorSize}
                    viewBox="0 0 24 24"
                    style={{
                        position: 'absolute',
                        left: interpolate(glide, [0, 1], [screenW * 0.92, (fx / 100) * screenW]),
                        top: interpolate(glide, [0, 1], [screenH * 0.95, (fy / 100) * screenH]),
                        transform: `scale(${click ? 0.86 : 1})`,
                        transformOrigin: '2px 2px',
                        opacity: interpolate(frame, [18, 26], [0, 1], clamp),
                        filter: 'drop-shadow(0 2px 4px #0006)',
                    }}
                >
                    <path d="M3 2l7.5 18 2.4-7.1L20 10.5z" fill="#fff" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
                </svg>
            )}
        </div>
    );

    const frameEl =
        device === 'browser' ? (
            <div style={{ borderRadius: radius, overflow: 'hidden', boxShadow: `0 ${u * 3}px ${u * 8}px rgba(0,0,0,0.45)`, border: `1px solid ${colors.muted}33` }}>
                <div style={{ height: bar, background: colors.surface, display: 'flex', alignItems: 'center', gap: u * 0.8, padding: `0 ${u * 1.6}px` }}>
                    {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                        <span key={c} style={{ width: u * 1.1, height: u * 1.1, borderRadius: '50%', background: c }} />
                    ))}
                    {url && (
                        <span style={{ marginLeft: u * 2, flex: 1, maxWidth: screenW * 0.55, height: bar * 0.56, borderRadius: bar, background: colors.bg, color: colors.muted, fontSize: u * 1.6, lineHeight: `${bar * 0.56}px`, padding: `0 ${u * 1.4}px`, overflow: 'hidden', whiteSpace: 'nowrap' }}>{url}</span>
                    )}
                </div>
                {screen}
            </div>
        ) : device === 'laptop' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: bezel, background: '#111', borderRadius: `${u * 1.6}px ${u * 1.6}px 0 0`, boxShadow: `0 ${u * 3}px ${u * 8}px rgba(0,0,0,0.45)` }}>{screen}</div>
                <div style={{ width: (screenW + bezel * 2) * 1.12, height: base, background: 'linear-gradient(#e6e7ea, #b9bbc1 55%, #8d9097)', borderRadius: `0 0 ${u * 2.4}px ${u * 2.4}px` }} />
            </div>
        ) : (
            <div style={{ padding: bezel, background: '#0d0d10', borderRadius: radius, boxShadow: `0 ${u * 3}px ${u * 8}px rgba(0,0,0,0.5), inset 0 0 0 ${u * 0.25}px #3a3a40` }}>
                {screen}
                {device === 'phone' && (
                    <div style={{ position: 'absolute', left: '50%', top: bezel + u * 1.2, width: screenW * 0.3, height: u * 2.4, marginLeft: -screenW * 0.15, borderRadius: u * 2, background: '#000' }} />
                )}
            </div>
        );

    const text = hasText && (
        <div style={{ width: textW, display: 'flex', flexDirection: 'column', alignItems: side ? 'flex-start' : 'center', textAlign: side ? 'left' : 'center' }}>
            {headline && (
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -headSize * 0.02, opacity: textIn, transform: `translateY(${(1 - textIn) * u * 3}px)` }}>{headline}</div>
            )}
            {detail && (
                <div style={{ color: colors.muted, fontSize: t * 3.4, fontWeight: 500, lineHeight: 1.3, marginTop: u * 2, opacity: detailIn, transform: `translateY(${(1 - detailIn) * u * 2}px)` }}>{detail}</div>
            )}
        </div>
    );

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent, side ? '75% 50%' : '50% 100%'), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <BrandTexture brand={brand} transparent={transparent} />
            <AbsoluteFill style={{ flexDirection: side ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: side ? layout.safeX : u * 4, padding: `${layout.safeY}px ${layout.safeX}px` }}>
                {text}
                <div style={{ position: 'relative', perspective: u * 200, transform: `translateY(${(1 - rise) * height * 0.25 + float}px)`, opacity: interpolate(rise, [0, 0.4], [0, 1], clamp) }}>
                    <div style={{ position: 'relative', transform: `rotateX(${tilt}deg) rotateY(${side ? -tilt * 0.4 : 0}deg)`, transformOrigin: '50% 100%' }}>{frameEl}</div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
}
