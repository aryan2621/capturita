import { Lottie, type LottieAnimationData } from '@remotion/lottie';
import { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { RiveCanvas } from './RiveCanvas';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface LottieSceneProps {
    animation: string;
    loop: boolean;
    size: number;
    position: 'center' | 'left' | 'right';
    caption: string;
    /** Rive only: the artboard, the animation or state machine to play, and state machine inputs ("speed=2, on=true"). */
    artboard?: string;
    play?: string;
    inputs?: string;
    /** Lottie only: 'auto' draws a black-and-white animation's black in the brand's text colour; 'accent' draws every dark colour in the accent. */
    tint?: 'auto' | 'accent' | 'original';
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** The static colours of a Lottie's fills and strokes ([r, g, b, a?] 0–1). */
function solidColours(node: unknown, out: number[][] = []): number[][] {
    if (Array.isArray(node)) node.forEach((n) => solidColours(n, out));
    else if (node && typeof node === 'object') {
        const o = node as Record<string, unknown>;
        const c = o.c as { a?: number; k?: unknown } | undefined;
        if ((o.ty === 'fl' || o.ty === 'st') && c?.a === 0 && Array.isArray(c.k)) out.push(c.k as number[]);
        Object.values(o).forEach((v) => solidColours(v, out));
    }
    return out;
}

/** A copy of a Lottie with its dark static colours drawn in a brand colour (see `tint`). */
function recolour(data: LottieAnimationData, tint: 'auto' | 'accent' | 'original', text: string, accent: string): LottieAnimationData {
    if (tint === 'original') return data;
    const copy = structuredClone(data);
    const colours = solidColours(copy);
    const mono = colours.every(([r, g, b]) => (r === 0 && g === 0 && b === 0) || (r === 1 && g === 1 && b === 1));
    if (tint === 'auto' && (!mono || !colours.length)) return data;
    const hex = tint === 'accent' ? accent : text;
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    for (const c of colours) if (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 0.5) c.splice(0, 3, ...rgb);
    return copy;
}

/** A Lottie (LottieFiles, After Effects) or Rive (.riv) animation the user added, with an optional caption. Works as a scene or an overlay. */
export function LottieScene({ animation, loop, size, position, caption, artboard = '', play = '', inputs = '', tint = 'auto', transparent, brand, assets }: LottieSceneProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const t = layout.text;
    const { colors } = brand;
    const exit = useExit();
    const [data, setData] = useState<LottieAnimationData | null>(null);
    const url = animation ? assetUrl(assets, animation) : '';
    // Rive plays its own file (and holds the render while loading); a Lottie's JSON is fetched here.
    const rive = /\.riv$/i.test(animation);
    // The render waits for the animation file, so no frame is drawn without it.
    const [handle] = useState(() => (url && !rive ? delayRender(`Loading Lottie ${animation}`) : null));
    useEffect(() => {
        if (!url || handle === null) return;
        fetch(url)
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
            .then((json) => {
                setData(json);
                continueRender(handle);
            })
            .catch((error) => cancelRender(error));
    }, [url, handle]);
    const tinted = useMemo(() => (data ? recolour(data, tint, colors.text, colors.accent) : null), [data, tint, colors.text, colors.accent]);
    const box = Math.min(width, height) * Math.max(0.15, Math.min(1.2, Number(size) || 0.6));
    // Rive fills a box of the frame's shape whose short side is the box.
    const riveScale = box / Math.min(width, height);
    const captionIn = spring({ frame: frame - 8, fps, config: { damping: 200 } });
    const justify = position === 'left' ? 'flex-start' : position === 'right' ? 'flex-end' : 'center';

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: justify, justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: t * 2 }}>
                <div style={{ width: rive ? width * riveScale : box, height: rive ? height * riveScale : box }}>
                    {!animation ? (
                        <SceneImage brand={brand} assets={assets} label='Add a Lottie .json or Rive .riv' style={{ width: '100%', height: '100%', borderRadius: t * 2 }} />
                    ) : rive ? (
                        <RiveCanvas src={url} width={width * riveScale} height={height * riveScale} artboard={artboard} play={play} inputs={inputs} />
                    ) : data ? (
                        <Lottie animationData={tinted!} loop={loop} style={{ width: '100%', height: '100%' }} />
                    ) : null}
                </div>
                {caption && (
                    <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: t * 5, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', maxWidth: width - layout.safeX * 2, opacity: captionIn, transform: `translateY(${(1 - captionIn) * t * 2}px)` }}>{caption}</div>
                )}
            </div>
        </AbsoluteFill>
    );
}
