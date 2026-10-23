import { Gif } from '@remotion/gif';
import { noise3D } from '@remotion/noise';
import { createContext, useContext, type ComponentType } from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useFontsReady } from './fonts';
import { assetUrl, type Brand, type SceneAssets } from './assets';

/**
 * Goes first inside every scene's root: waits for the brand's fonts, then lays the brand kit's
 * texture over the scene's own gradient (nothing for 'gradient' or transparent overlays).
 */
export function BrandTexture({ brand, transparent }: { brand: Brand; transparent?: boolean }) {
    useFontsReady([brand.fonts.display, brand.fonts.body]);
    const frame = useCurrentFrame();
    const { width, height, fps } = useVideoConfig();
    if (transparent || !brand.background || brand.background === 'gradient') return null;
    if (brand.background === 'grain') {
        // A new grain pattern every 2 frames, like film; seeded by the frame so renders repeat.
        const seed = Math.floor(frame / 2) % 97;
        return (
            <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.16, mixBlendMode: 'overlay' }}>
                <svg width={width} height={height}>
                    <filter id={`grain-${seed}`}>
                        <feTurbulence type='fractalNoise' baseFrequency={0.9} numOctaves={2} seed={seed} stitchTiles='stitch' />
                        <feColorMatrix type='saturate' values='0' />
                    </filter>
                    <rect width='100%' height='100%' filter={`url(#grain-${seed})`} />
                </svg>
            </AbsoluteFill>
        );
    }
    // 'flow': three soft blobs of brand colour drifting on smooth noise.
    const t = frame / fps / 6;
    const blobs = [brand.colors.accent, brand.colors.surface, brand.colors.accent];
    const size = Math.max(width, height) * 0.75;
    return (
        <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
            {blobs.map((color, i) => {
                const x = (0.5 + noise3D(`x${i}`, i, 0, t) * 0.45) * width;
                const y = (0.5 + noise3D(`y${i}`, 0, i, t) * 0.45) * height;
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: x - size / 2,
                            top: y - size / 2,
                            width: size,
                            height: size,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
                            opacity: i === 1 ? 0.5 : 0.22,
                        }}
                    />
                );
            })}
        </AbsoluteFill>
    );
}

/** A project image (or GIF) the user added, or a quiet placeholder until they do. */
export function SceneImage({ src, assets, brand, fit = 'cover', style, label = 'Add an image' }: { src?: string; assets: SceneAssets; brand: Brand; fit?: 'cover' | 'contain'; style?: React.CSSProperties; label?: string }) {
    const { width, height } = useVideoConfig();
    if (!src) {
        const u = Math.min(width, height) / 100;
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `repeating-linear-gradient(45deg, ${brand.colors.surface}, ${brand.colors.surface} ${u}px, ${brand.colors.bg} ${u}px, ${brand.colors.bg} ${u * 2}px)`,
                    color: brand.colors.muted,
                    fontSize: u * 2.2,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    textAlign: 'center',
                    ...style,
                }}
            >
                {label}
            </div>
        );
    }
    const url = assetUrl(assets, src);
    if (src.toLowerCase().endsWith('.gif')) return <Gif src={url} fit={fit} style={{ ...style }} />;
    return <Img src={url} style={{ objectFit: fit, ...style }} />;
}

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** The 10-frame fade every scene ends with. */
export function useExit(frames = 10) {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const held = useContext(HoldEnd);
    return held ? 1 : interpolate(frame, [durationInFrames - frames, durationInFrames], [1, 0], clamp);
}

export type CameraMove = 'none' | 'push' | 'pull' | 'pan-left' | 'pan-right';

/** Wraps every full-screen scene: `camera` drifts the whole frame over the scene's length. */
export function withCamera(Scene: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
    return function Camera(props: Record<string, unknown>) {
        const frame = useCurrentFrame();
        const { durationInFrames } = useVideoConfig();
        const move = props.camera as CameraMove | undefined;
        if (!move || move === 'none') return <Scene {...props} />;
        const t = interpolate(frame, [0, durationInFrames], [0, 1], { ...clamp, easing: (x) => x * x * (3 - 2 * x) });
        // Gentle, so full scenes keep their margins. Panning needs the zoom: 5% leaves 2.5% a side, more than the 2% pan.
        const scale = move === 'push' ? 1 + 0.05 * t : move === 'pull' ? 1.05 - 0.05 * t : 1.05;
        const x = move === 'pan-left' ? 2 - 4 * t : move === 'pan-right' ? -2 + 4 * t : 0;
        return (
            <AbsoluteFill style={{ transform: `translateX(${x}%) scale(${scale})` }}>
                <Scene {...props} />
            </AbsoluteFill>
        );
    };
}

/** True when a transition takes the scene off screen, so it shouldn't also fade itself out. */
const HoldEnd = createContext(false);

/** Wraps every registered scene: its `holdEnd` prop (set by the timeline) turns off useExit. */
export function withHeldEnd(Scene: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
    return function Held(props: Record<string, unknown>) {
        return (
            <HoldEnd.Provider value={props.holdEnd === true}>
                <Scene {...props} />
            </HoldEnd.Provider>
        );
    };
}

/** The scene's gradient, as each scene sets it: transparent for overlays. */
export const sceneGradient = (brand: Brand, transparent?: boolean, at = '50% 0%') =>
    transparent ? 'transparent' : `radial-gradient(120% 110% at ${at}, ${brand.colors.surface} 0%, ${brand.colors.bg} 62%)`;
