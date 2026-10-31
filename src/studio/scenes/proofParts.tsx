// Shared pieces for the "proof" scenes (Pricing, Chat, Faq, Roadmap...): one scene context, a stage with accent light, a heading, a card surface and hit effects.
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { al } from './launch/shapes';
import { HitFx, variantFor } from './hitFx';
import { BrandTexture, clamp, Depth, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand } from './assets';

/** Entrance with a visible overshoot. (Remotion's damping 200 is so overdamped it crawls; these settle in about 0.4s.) */
export const SNAP = { stiffness: 230, damping: 14, mass: 0.7 };
/** Settles fast without a bounce, for text and fades. */
export const SMOOTH = { stiffness: 260, damping: 32, mass: 0.8 };

export const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** When item `i` of `n` starts, spread so the last one starts at `last` (a lone item starts at `first`). */
export const staggerAt = (i: number, n: number, last: number, first = 0.15) => first + (i / Math.max(1, n - 1)) * Math.max(0, last - first);

/** At most `max` entries of a list prop that may be missing or malformed. */
export const take = <T,>(value: T[] | undefined, max: number): T[] => (Array.isArray(value) ? value : []).slice(0, max);

/** Everything a scene needs from the frame: sizes in px, brand colours, and time-based springs and ramps (all times in seconds). */
export function useScene(brand: Brand, grown = true) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const g = grown ? grow(width, height) : 1;
    const exit = useExit();
    return {
        brand,
        c: brand.colors,
        display: displayFont(brand),
        frame,
        fps,
        width,
        height,
        layout,
        exit,
        seconds: frame / fps,
        u: layout.unit * g,
        t: layout.text * g,
        innerW: width - layout.safeX * 2,
        /** A spring that starts at `at` seconds and runs 0 to 1 (overshooting with SNAP). */
        pop: (at: number, config: Partial<typeof SNAP> = SNAP) => spring({ frame: frame - Math.round(at * fps), fps, config }),
        /** Linear 0 to 1 between two times. */
        ramp: (from: number, to: number) => interpolate(frame / fps, [from, to], [0, 1], clamp),
    };
}
export type Scene = ReturnType<typeof useScene>;

/** The scene root: gradient, brand texture, two soft accent lights behind, and a centred column for the content. */
export function Stage({ s, transparent, at = [50, 42], gap = 0, children }: { s: Scene; transparent?: boolean; at?: [number, number]; gap?: number; children: ReactNode }) {
    const born = s.pop(0, SMOOTH);
    const light = (x: number, y: number, size: number, a: number) => (
        <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, margin: -size / 2, borderRadius: '50%', background: `radial-gradient(circle, ${al(s.c.accent, a)}, transparent 66%)`, opacity: born, transform: `scale(${0.7 + 0.3 * born})` }} />
    );
    const big = Math.max(s.width, s.height) * 0.75;
    return (
        <AbsoluteFill style={{ background: sceneGradient(s.brand, transparent), fontFamily: bodyFont(s.brand), lineHeight: 1.2, opacity: s.exit }}>
            <Depth z={-1}><BrandTexture brand={s.brand} transparent={transparent} /></Depth>
            {!transparent && <Depth z={-0.5}>{light(at[0], at[1], big, 0.2)}{light(at[0] > 50 ? 12 : 88, 92, big * 0.55, 0.11)}</Depth>}
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center', gap, padding: `${s.layout.safeY}px ${s.layout.safeX}px` }}>{children}</Depth>
        </AbsoluteFill>
    );
}

/** Vertical room a Heading takes, for scenes that size their body from what is left. */
export const headRoom = (s: Scene, text: string, size = 6) => (text ? s.t * (size + 5) : 0);

/** The scene's title: springs in with a slight overshoot and an accent rule drawing under it. */
export function Heading({ s, text, size = 6, muted = false, rule = true }: { s: Scene; text: string; size?: number; muted?: boolean; rule?: boolean }) {
    if (!text) return null;
    const p = s.pop(0.02);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: s.u * 1.4, marginBottom: s.t * 3.2, opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * s.u * 4}px)` }}>
            <div style={{ color: muted ? s.c.muted : s.c.text, fontFamily: s.display, fontSize: fitSize(text, s.innerW, s.brand.fonts.display, s.t * size), fontWeight: 800, lineHeight: 1.1, textAlign: 'center', textShadow: `0 ${s.u * 0.5}px ${s.u * 3}px ${al(s.c.bg, 0.6)}` }}>{text}</div>
            {rule && <div style={{ width: s.u * 12 * s.ramp(0.1, 0.5), height: s.u * 0.45, borderRadius: 99, background: s.c.accent, boxShadow: `0 0 ${s.u * 2}px ${al(s.c.accent, 0.8)}` }} />}
        </div>
    );
}

/** A card face: soft top highlight, hairline border, drop shadow; `hot` adds the accent ring and glow. */
export function surface(s: Scene, { hot = false, radius = 2.4, alpha = 0.86 } = {}): CSSProperties {
    const { c, u } = s;
    return {
        borderRadius: u * radius,
        background: `linear-gradient(160deg, ${al(c.text, 0.08)}, transparent 42%), ${al(c.surface, hot ? 1 : alpha)}`,
        border: `${hot ? u * 0.3 : 1}px solid ${hot ? c.accent : al(c.muted, 0.24)}`,
        boxShadow: [`inset 0 1px 0 ${al(c.text, 0.1)}`, `0 ${u * 2}px ${u * 6}px ${al('#000000', 0.38)}`, hot && `0 0 ${u * 6}px ${al(c.accent, 0.4)}`].filter(Boolean).join(', '),
    };
}

/** The accent on a scene's key moment, centred on its positioned parent in a `size` × `h` box: the look is fixed per scene `name` (or nothing). */
export function Ping({ s, name, at, size, h = size, dur = 0.9 }: { s: Scene; name: string; at: number; size: number; h?: number; dur?: number }) {
    return (
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: size, height: h, marginLeft: -size / 2, marginTop: -h / 2, pointerEvents: 'none' }}>
            <HitFx variant={variantFor(name)} t={s.ramp(at, at + dur)} x={size / 2} y={h / 2} size={Math.max(size, h) * 0.6} color={s.c.accent} />
        </div>
    );
}

/** A diagonal light sweep across its parent (which needs position: relative and overflow: hidden). */
export function Sheen({ s, at, dur = 0.8 }: { s: Scene; at: number; dur?: number }) {
    const p = s.ramp(at, at + dur);
    if (p <= 0 || p >= 1) return null;
    return <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', width: '35%', left: `${-40 + 150 * easeOut(p)}%`, background: `linear-gradient(100deg, transparent, ${al(s.c.text, 0.2)}, transparent)`, transform: 'skewX(-18deg)', pointerEvents: 'none' }} />;
}

/** A tick that draws itself. */
export function Tick({ size, color, progress, width = 3 }: { size: number; color: string; progress: number; width?: number }) {
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' style={{ overflow: 'visible' }}>
            <path d='M5 12.5l4.5 4.5L19 7.5' pathLength={1} fill='none' stroke={color} strokeWidth={width} strokeLinecap='round' strokeLinejoin='round' strokeDasharray='1' strokeDashoffset={1 - progress} opacity={progress > 0 ? 1 : 0} />
        </svg>
    );
}

export const STAR_PATH = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';

/** A glowing accent disc with a single character in it (an avatar or logo stand-in). */
export function Badge({ s, size, label, solid = true }: { s: Scene; size: number; label: string; solid?: boolean }) {
    return (
        <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: s.display, fontWeight: 800, fontSize: size * 0.46, lineHeight: 1, color: solid ? s.c.bg : s.c.accent, background: solid ? `linear-gradient(145deg, ${s.c.text}, ${s.c.accent} 55%)` : al(s.c.accent, 0.16), boxShadow: solid ? `0 0 ${s.u * 2.4}px ${al(s.c.accent, 0.55)}` : undefined }}>
            {label.trim().charAt(0).toUpperCase()}
        </div>
    );
}
