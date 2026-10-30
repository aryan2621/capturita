import { BeatContext, beatsOf } from './beat';
import { Gif } from '@remotion/gif';
import { noise3D } from '@remotion/noise';
import { createContext, useContext, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useFontsReady } from './fonts';
import { assetUrl, type Brand, type SceneAssets } from './assets';

/** Frames the scene starts into the whole video (the timeline sets `clock`, in seconds), so light and camera drift carry across joins. */
const ClockContext = createContext(0);

/** The frame on the video's clock, not the scene's: background layers use it so two scenes in a crossfade show the same background. */
export function useTimelineFrame() {
    return useCurrentFrame() + useContext(ClockContext);
}

/** True (the default) when the scene's background should stand still: no drifting blobs, flickering grain or wandering points. */
export const CalmContext = createContext(true);

/** Provides `CalmContext` from the scene's `calm` setting (anything but `false` is calm, so older videos stay still). */
export function withCalm(Scene: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
    return function Calm(props: Record<string, unknown>) {
        return (
            <CalmContext.Provider value={props.calm !== false}>
                <Scene {...props} />
            </CalmContext.Provider>
        );
    };
}

/**
 * Goes first inside every scene's root: waits for the brand's fonts, then lays the brand kit's
 * texture over the scene's own gradient (nothing for 'gradient' or transparent overlays).
 */
export function BrandTexture({ brand, transparent }: { brand: Brand; transparent?: boolean }) {
    useFontsReady([brand.fonts.display, brand.fonts.body]);
    const calm = useContext(CalmContext);
    const now = useTimelineFrame();
    const frame = calm ? 0 : now;
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

/** Where the camera is, in percent of the frame, so layers can move against it (see Depth). The camera is always locked: drifting, panning and pushing made content wander. */
const CameraContext = createContext({ x: 0, y: 0 });

/**
 * A layer at some depth: 0 moves with the scene, higher numbers sit nearer the camera and slide
 * further against its drift (a parallax), negative ones sit behind. Put backgrounds at -1, hero text at 1.
 */
export function Depth({ z, children, style }: { z: number; children: ReactNode; style?: CSSProperties }) {
    const camera = useContext(CameraContext);
    // No scale pulse on the beat: text that swells on every beat reads as blinking and jumping out of the screen.
    return <AbsoluteFill style={{ transform: `translate(${camera.x * z * 1.6}%, ${camera.y * z * 1.6}%)`, ...style }}>{children}</AbsoluteFill>;
}

/** True when a transition takes the scene off screen, so it shouldn't also fade itself out. */
const HoldEnd = createContext(false);

/** A shape carried between scenes: centre and width in percent of the frame, height as a share of width. */
export interface HandoffShape { shape?: 'circle' | 'rect'; x?: number; y?: number; w?: number; h?: number; color?: string }

const SHAPE_FRAMES = 14;

/**
 * The outgoing scene's `exitShape` grows in over its last frames; the next scene's `enterShape`
 * (same values) starts at full size in the same place and clears away. Under the compositor's
 * crossfade the shape stays solid, so it reads as one object carried across the cut.
 */
function HandoffOverlay({ shape, enter, brand }: { shape: HandoffShape; enter: boolean; brand?: Brand }) {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const t = enter ? interpolate(frame, [0, SHAPE_FRAMES], [0, 1], clamp) : interpolate(frame, [durationInFrames - SHAPE_FRAMES, durationInFrames], [0, 1], clamp);
    const k = ease(t);
    const circle = (shape.shape ?? 'circle') === 'circle';
    const w = shape.w ?? 30;
    const h = circle ? w : w * (shape.h ?? 0.6);
    // Enter: full size, then swells and fades. Exit: grows from 60% to full size while fading in.
    const scale = enter ? 1 + k * 0.25 : 0.6 + 0.4 * k;
    const opacity = enter ? 1 - k : k;
    if (opacity <= 0) return null;
    return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
            <div
                style={{
                    position: 'absolute',
                    left: `${(shape.x ?? 50) - w / 2}%`,
                    top: `${(shape.y ?? 50) - (h * 16) / 9 / 2}%`,
                    width: `${w}%`,
                    aspectRatio: circle ? '1' : `1 / ${shape.h ?? 0.6}`,
                    borderRadius: circle ? '50%' : '4%',
                    background: shape.color ?? brand?.colors.accent ?? '#fff',
                    opacity,
                    transform: `scale(${scale})`,
                }}
            />
        </AbsoluteFill>
    );
}

/** Wraps every registered scene: its `holdEnd` prop (set by the timeline) turns off useExit. */
export function withHeldEnd(Scene: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
    return function Held(props: Record<string, unknown>) {
        const brand = props.brand as Brand | undefined;
        const { fps } = useVideoConfig();
        return (
            <BeatContext.Provider value={beatsOf(props)}>
                <ClockContext.Provider value={typeof props.clock === 'number' ? Math.round(props.clock * fps) : 0}>
                    <HoldEnd.Provider value={props.holdEnd === true}>
                        <Scene {...props} />
                        {!!props.enterShape && <HandoffOverlay shape={props.enterShape as HandoffShape} enter brand={brand} />}
                        {!!props.exitShape && <HandoffOverlay shape={props.exitShape as HandoffShape} enter={false} brand={brand} />}
                    </HoldEnd.Provider>
                </ClockContext.Provider>
            </BeatContext.Provider>
        );
    };
}

/** The scene's gradient, as each scene sets it: transparent for overlays. */
export const sceneGradient = (brand: Brand, transparent?: boolean, at = '50% 0%') =>
    transparent ? 'transparent' : `radial-gradient(120% 110% at ${at}, ${brand.colors.surface} 0%, ${brand.colors.bg} 62%)`;
