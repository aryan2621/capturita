import { AbsoluteFill, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { Copy, Cursor, DeviceFrame, Landing, Ring, bowed, fitScreen, inOut, useTiming, type FrameKind } from './deviceParts';
import { bodyFont, type Brand, type SceneAssets } from './assets';

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

/** Screen width over height, and the frame drawn around it, for each device. */
const SCREEN: Record<ScreenshotDevice, { ratio: number; frame: FrameKind }> = {
    phone: { ratio: 9 / 19.5, frame: 'phone' },
    tablet: { ratio: 3 / 4, frame: 'tablet' },
    laptop: { ratio: 16 / 10, frame: 'macbook' },
    browser: { ratio: 16 / 10, frame: 'browser' },
};

/** Frames of the cursor's glide, the click, and the zoom that follows it. */
const GLIDE = [8, 32] as const;
const CLICK = 32;
const ZOOM = [36, 68] as const;

const focus = (value: number | undefined, fallback: number) => Math.min(95, Math.max(5, Number(value) || fallback));

/** A screenshot in a phone, tablet, laptop or browser frame that lands with a flash, optionally scrolls or gets clicked and zoomed, with a headline beside or above it. */
export function ScreenshotShowcase({ image, device, placement, headline, detail, url, scroll, cursor, zoom, focusX, focusY, transparent, brand, assets }: ScreenshotShowcaseProps) {
    const { ramp } = useTiming();
    const { width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const { unit: u, text: t } = layout;
    const exit = useExit();
    const hasText = !!(headline || detail);
    const side = placement === 'side' && !layout.stacked && hasText;
    const spec = SCREEN[device] ?? SCREEN.browser;

    const areaW = side ? width * 0.5 - layout.safeX : width - layout.safeX * 2;
    const areaH = height - layout.safeY * 2 - (!side && hasText ? height * (layout.portrait ? 0.24 : 0.28) : 0);
    const { sw, sh, outerH } = fitScreen(spec.frame, u, areaW, areaH, spec.ratio);

    const [fx, fy] = [focus(focusX, 50), focus(focusY, 40)];
    const target = { x: (fx / 100) * sw, y: (fy / 100) * sh };
    const pointer = bowed({ x: sw * 0.94, y: sh * 1.02 }, target, ramp(GLIDE[0], GLIDE[1], inOut), 0.22);
    const press = ramp(CLICK, CLICK + 3) * (1 - ramp(CLICK + 3, CLICK + 9));
    const zoomIn = zoom ? 1 + 0.8 * ramp(ZOOM[0], ZOOM[1], inOut) : 1;
    const scrolled = scroll ? ramp(14, durationInFrames - 16) : 0;

    const textW = side ? width * 0.5 - layout.safeX * 1.5 : width - layout.safeX * 2;

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent, side ? '75% 50%' : '50% 100%'), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1}>
                <AbsoluteFill style={{ flexDirection: side ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: side ? layout.safeX : u * 4, padding: `${layout.safeY}px ${layout.safeX}px` }}>
                    {hasText && <Copy brand={brand} headline={headline} detail={detail} width={textW} size={t * (side ? 7 : 7.5)} align={side ? 'left' : 'center'} />}
                    <Landing brand={brand} u={u} outerH={outerH} tiltY={side ? -9 : 0}>
                        <DeviceFrame kind={spec.frame} sw={sw} sh={sh} u={u} brand={brand} url={url}>
                            <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoomIn})`, transformOrigin: `${fx}% ${fy}%`, background: brand.colors.surface }}>
                                {scroll && image ? (
                                    <SceneImage src={image} assets={assets} brand={brand} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 'auto', transform: `translateY(calc(${-scrolled * 100}% + ${scrolled * sh}px))` }} />
                                ) : (
                                    <SceneImage src={image} assets={assets} brand={brand} label='Add a screenshot' style={{ width: '100%', height: '100%' }} />
                                )}
                            </div>
                            {cursor && image && (
                                <>
                                    <Ring x={target.x} y={target.y} r0={u * 0.8} r1={u * 5} t={ramp(CLICK, CLICK + 16)} color={brand.colors.accent} width={u * 0.5} />
                                    <Cursor {...pointer} size={u * 3.4} press={press} opacity={ramp(GLIDE[0], GLIDE[0] + 4)} />
                                </>
                            )}
                        </DeviceFrame>
                    </Landing>
                </AbsoluteFill>
            </Depth>
        </AbsoluteFill>
    );
}
