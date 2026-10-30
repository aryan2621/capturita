import { noise2D } from '@remotion/noise';
import { useContext, useMemo, type ComponentType, type ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Brand, BrandColors } from './assets';
import type { SceneFont } from './fonts';
import { useBeatPulse } from './beat';
import { CalmContext, useTimelineFrame } from './SceneBase';

/** A 128px tile of film grain, made once from a fixed seed so every render matches. */
function grainTile() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return '';
    const image = context.createImageData(size, size);
    let state = 1234567;
    for (let i = 0; i < image.data.length; i += 4) {
        state = (state * 1664525 + 1013904223) >>> 0;
        const value = state >>> 24;
        image.data.set([value, value, value, 255], i);
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
}

export type AtmosphereKind = 'filmic' | 'neon' | 'haze' | 'print';

/** Strength of each layer per kind: two leak opacities, vignette darkness, grain opacity, and whether the leaks are brand-accent only. */
const KINDS: Record<AtmosphereKind, { leaks: [number, number]; vignette: number; grain: number; accentOnly?: boolean; veil?: number }> = {
    filmic: { leaks: [0.13, 0.06], vignette: 0.5, grain: 0.09 },
    neon: { leaks: [0.5, 0.4], vignette: 0.6, grain: 0.04, accentOnly: true },
    haze: { leaks: [0.16, 0.12], vignette: 0, grain: 0.03, veil: 0.1 },
    print: { leaks: [0, 0], vignette: 0.18, grain: 0.2 },
};

/** Light over the whole frame: a vignette, two soft leaks of brand colour, and grain. Screen-fixed. */
function Atmosphere({ brand, kind }: { brand: Brand; kind: AtmosphereKind }) {
    const k = KINDS[kind];
    const frame = useTimelineFrame();
    const { width, height, fps } = useVideoConfig();
    const tile = useMemo(grainTile, []);
    const pulse = useBeatPulse(0.3);
    const calm = useContext(CalmContext);
    // Calm freezes the light leaks and the grain's flicker; the picture is the same, just not alive.
    const t = calm ? 0 : frame / fps;
    const size = Math.max(width, height);
    const leaks = [brand.colors.accent, k.accentOnly ? brand.colors.accent : brand.colors.muted];
    // Grain shifts to a new spot every other frame, like film.
    const jitter = calm ? 0 : Math.floor(frame / 2);
    return (
        <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
            {leaks.map((color, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: (0.5 + noise2D(`lx${i}`, t * 0.08, i) * 0.6) * width - size * 0.4,
                        top: (0.5 + noise2D(`ly${i}`, t * 0.08, i + 5) * 0.6) * height - size * 0.4,
                        width: size * 0.8,
                        height: size * 0.8,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${color} 0%, transparent 62%)`,
                        mixBlendMode: 'screen',
                        opacity: k.leaks[i] * (1 + pulse * 0.35),
                    }}
                />
            ))}
            <AbsoluteFill style={{ background: `radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,${k.vignette}) 100%)` }} />
            {k.veil && <AbsoluteFill style={{ background: `rgba(255,255,255,${k.veil})` }} />}
            {tile && (
                <AbsoluteFill
                    style={{
                        backgroundImage: `url(${tile})`,
                        backgroundSize: '128px 128px',
                        backgroundPosition: `${(jitter * 37) % 128}px ${(jitter * 91) % 128}px`,
                        mixBlendMode: 'overlay',
                        opacity: k.grain,
                    }}
                />
            )}
        </AbsoluteFill>
    );
}

/**
 * Wraps every full-screen scene: lays the atmosphere over it unless the scene's `atmosphere` is
 * 'off' (or it is an overlay drawn on a transparent background).
 */
export function withAtmosphere(Scene: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
    return function Atmospheric(props: Record<string, unknown>) {
        const kind = (props.atmosphere ?? 'filmic') as AtmosphereKind | 'off';
        if (kind === 'off' || !KINDS[kind] || props.transparent) return <Scene {...props} />;
        return (
            <>
                <Scene {...props} />
                <Atmosphere brand={props.brand as Brand} kind={kind} />
            </>
        );
    };
}

export type TypeKind = 'grotesk' | 'serif' | 'mono' | 'heavy';
export type PaletteKind = 'brand' | 'duotone' | 'inverted' | 'mono';

const TYPES: Record<TypeKind, { display: SceneFont; body: SceneFont }> = {
    grotesk: { display: 'space-grotesk', body: 'inter' },
    serif: { display: 'fraunces', body: 'inter' },
    mono: { display: 'geist-mono', body: 'mono' },
    heavy: { display: 'bricolage', body: 'dm-sans' },
};

/** Mixes two #rrggbb colours (t = 0 is a, 1 is b); anything else is returned as it was. */
function mix(a: string, b: string, t: number) {
    const hex = /^#[0-9a-f]{6}$/i;
    if (!hex.test(a) || !hex.test(b)) return a;
    const ch = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
    return '#' + [0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, '0')).join('');
}

function recolor(c: BrandColors, palette: PaletteKind): BrandColors {
    if (palette === 'duotone') return { ...c, surface: mix(c.bg, c.accent, 0.22), muted: mix(c.text, c.accent, 0.55) };
    if (palette === 'inverted') return { bg: c.text, surface: mix(c.text, c.bg, 0.07), text: c.bg, muted: mix(c.bg, c.text, 0.4), accent: mix(c.accent, c.bg, 0.3) };
    if (palette === 'mono') return { ...c, surface: mix(c.bg, c.text, 0.08), muted: mix(c.bg, c.text, 0.6) };
    return c;
}

/**
 * Applies a look's type and palette by rewriting the brand a scene receives, so no scene
 * needs to know about looks. Unset or unknown values leave the brand kit alone.
 */
export function withLook(Scene: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
    return function Looked(props: Record<string, unknown>) {
        const type = TYPES[props.type as TypeKind];
        const palette = props.palette as PaletteKind | undefined;
        const enter = props.enter === 'snap' || props.enter === 'ease' ? props.enter : undefined;
        if (!type && !enter && (!palette || palette === 'brand')) return <Scene {...props} />;
        const brand = props.brand as Brand;
        const next: Brand = { ...brand, fonts: type ?? brand.fonts, colors: palette ? recolor(brand.colors, palette) : brand.colors };
        const scene = <Scene {...props} brand={next} />;
        return enter ? <Entrance kind={enter} backdrop={props.transparent ? undefined : next.colors.bg}>{scene}</Entrance> : scene;
    };
}

/** A look's entrance, laid over whatever the scene does itself: a quick punch in, or a fade with a small rise. */
function Entrance({ kind, backdrop, children }: { kind: 'snap' | 'ease'; backdrop?: string; children: ReactNode }) {
    const frame = useCurrentFrame();
    const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
    const p = interpolate(frame, [0, kind === 'snap' ? 6 : 14], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
    const transform = `translateY(${(1 - p) * 2}%)`;
    // The brand colour stays solid under the fade: without it the editor's wallpaper (pink by default) shows through at every cut.
    return (
        <>
            {backdrop && <AbsoluteFill style={{ background: backdrop }} />}
            <AbsoluteFill style={{ opacity: kind === 'snap' ? Math.min(1, p * 3) : p, transform }}>{children}</AbsoluteFill>
        </>
    );
}

/**
 * Opt-in light on hero text (not body copy): `glow` is a blurred copy of the text behind it,
 * `aberration` splits red and cyan a hair either side. Both are plain text-shadows, so the CSS and
 * the exported frames match.
 */
export function heroTextFx(unit: number, fx: { glow?: boolean; aberration?: boolean }, glowColor: string): { textShadow?: string } {
    const shadows: string[] = [];
    if (fx.aberration) shadows.push(`${-unit * 0.4}px 0 0 rgba(255, 40, 80, 0.55)`, `${unit * 0.4}px 0 0 rgba(40, 200, 255, 0.55)`);
    if (fx.glow) shadows.push(`0 0 ${unit * 2.2}px ${glowColor}`, `0 0 ${unit * 6}px ${glowColor}88`);
    return shadows.length ? { textShadow: shadows.join(', ') } : {};
}
