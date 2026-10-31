// Shared pieces for the device, window and UI-walkthrough scenes: motion helpers, device chrome, cursor, light effects, text block.
import type { CSSProperties, ReactNode } from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp } from './SceneBase';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand } from './assets';

// ---------------------------------------------------------------------------------------------
// Motion

/** Overshoots about 12% and settles in 0.6 s: the entrance every pop-in shares. */
export const SNAP = { damping: 12, stiffness: 180, mass: 0.7 };
/** No overshoot, settles in about 0.5 s: text and fades. */
export const GLIDE = { damping: 200, stiffness: 200 };

export const smooth = (x: number) => x * x * (3 - 2 * x);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
export const inOut = Easing.inOut(Easing.cubic);

/** Springs and ramps keyed to the scene's frame, so scenes say "pop at frame 8" instead of repeating the spring call. */
export function useTiming() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    return {
        frame,
        fps,
        pop: (at: number, config: typeof SNAP = SNAP) => spring({ frame: frame - at, fps, config }),
        glide: (at: number) => spring({ frame: frame - at, fps, config: GLIDE }),
        ramp: (from: number, to: number, ease: (x: number) => number = smooth) => ease(interpolate(frame, [from, to], [0, 1], clamp)),
    };
}

export interface Pt {
    x: number;
    y: number;
}

/** A point a fraction `t` along a curved path from `a` to `b`: the middle is pushed sideways by `bow` times the length, like a hand moving a mouse. */
export function bowed(a: Pt, b: Pt, t: number, bow = 0.18): Pt {
    const mx = (a.x + b.x) / 2 + (a.y - b.y) * bow;
    const my = (a.y + b.y) / 2 + (b.x - a.x) * bow;
    const s = 1 - t;
    return { x: s * s * a.x + 2 * s * t * mx + t * t * b.x, y: s * s * a.y + 2 * s * t * my + t * t * b.y };
}

/** Where a cursor is at `frame` as it visits `keys` (frame and position) in turn, easing along a curve between each pair. */
export function cursorAt(frame: number, keys: (Pt & { t: number })[], bow = 0.14): Pt {
    if (frame <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
        if (frame <= keys[i].t) return bowed(keys[i - 1], keys[i], inOut((frame - keys[i - 1].t) / Math.max(1, keys[i].t - keys[i - 1].t)), bow);
    }
    return keys[keys.length - 1];
}

// ---------------------------------------------------------------------------------------------
// Light and cursor

const abs: CSSProperties = { position: 'absolute', pointerEvents: 'none' };

/** A soft round light in the accent colour, centred on a point (pixels). */
export function Glow({ x, y, r, color, opacity = 1, scale = 1 }: { x: number; y: number; r: number; color: string; opacity?: number; scale?: number }) {
    return <div style={{ ...abs, left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${color}, transparent 68%)`, opacity, transform: `scale(${scale})` }} />;
}

/** An expanding ring that fades: the flash on a hit or click. `t` runs 0 → 1 (nothing is drawn outside that). */
export function Ring({ x, y, r0, r1, t, color, width }: { x: number; y: number; r0: number; r1: number; t: number; color: string; width: number }) {
    if (t <= 0 || t >= 1) return null;
    const r = r0 + (r1 - r0) * easeOut(t);
    return <div style={{ ...abs, left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `${Math.max(0.5, width * (1 - t * 0.7))}px solid ${color}`, opacity: 1 - t, boxSizing: 'border-box' }} />;
}

/** A band of light crossing its (overflow-hidden) parent once as `t` runs 0 → 1. */
export function Sweep({ t, strength = 0.22 }: { t: number; strength?: number }) {
    if (t <= 0 || t >= 1) return null;
    return (
        <div style={{ ...abs, inset: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', width: '45%', left: `${-50 + t * 150}%`, transform: 'skewX(-18deg)', background: `linear-gradient(90deg, transparent, rgba(255,255,255,${strength}), transparent)` }} />
        </div>
    );
}

/** The mouse pointer, its tip at (x, y); `press` 0 → 1 squeezes it. */
export function Cursor({ x, y, size, press = 0, opacity = 1 }: Pt & { size: number; press?: number; opacity?: number }) {
    const k = size / 24;
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' style={{ ...abs, left: x - 3 * k, top: y - 2 * k, zIndex: 50, opacity, transform: `scale(${1 - press * 0.16})`, transformOrigin: `${3 * k}px ${2 * k}px`, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))', overflow: 'visible' }}>
            <path d='M3 2l7.5 18 2.4-7.1L20 10.5z' fill='#fff' stroke='#111' strokeWidth={1.4} strokeLinejoin='round' />
        </svg>
    );
}

/** Red, yellow and green window buttons, or quiet grey ones. */
export function Lights({ size, muted }: { size: number; muted?: string }) {
    return (
        <div style={{ display: 'flex', gap: size * 0.7 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                <span key={c} style={{ width: size, height: size, borderRadius: '50%', background: muted ?? c }} />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------------------------
// Devices

export type FrameKind = 'macbook' | 'browser' | 'window' | 'phone' | 'tablet';

const LAPTOP_REACH = 1.12;

/** Width and height the frame adds around the screen (in `u`), and how much wider than the lid its base is drawn. */
function chromeOf(kind: FrameKind, u: number) {
    switch (kind) {
        case 'macbook': return { x: u * 3, y: u * 5.7, reach: LAPTOP_REACH };
        case 'browser': return { x: 0, y: u * 4.6, reach: 1 };
        case 'window': return { x: 0, y: u * 3.6, reach: 1 };
        case 'phone': return { x: u * 3.4, y: u * 3.4, reach: 1 };
        case 'tablet': return { x: u * 3.8, y: u * 3.8, reach: 1 };
    }
}

/** The largest screen of `ratio` (width over height) whose frame fits `areaW` × `areaH`. */
export function fitScreen(kind: FrameKind, u: number, areaW: number, areaH: number, ratio: number) {
    const c = chromeOf(kind, u);
    const sw = Math.max(1, Math.min(areaW / c.reach - c.x, (areaH - c.y) * ratio));
    return { sw, sh: sw / ratio, outerH: sw / ratio + c.y };
}

const RIM = 'linear-gradient(145deg, #5b5c64 0%, #1b1c20 38%, #2d2e34 70%, #4a4b52 100%)';
const GLASS = 'linear-gradient(125deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.03) 32%, transparent 33%)';

/** Frame a device lands on (see Landing): its light sweep and ring fire here. */
export const LAND = 9;

/** `children` on a drawn device's screen (`sw` × `sh` px): bezels, a glass reflection, a contact shadow, and a light sweep as it lands. */
export function DeviceFrame({ kind, sw, sh, u, brand, url = '', children }: { kind: FrameKind; sw: number; sh: number; u: number; brand: Brand; url?: string; children: ReactNode }) {
    const { ramp } = useTiming();
    const screen = (radius: number | string) => (
        <div style={{ position: 'relative', width: sw, height: sh, overflow: 'hidden', borderRadius: radius, background: '#000' }}>
            {children}
            <div style={{ ...abs, inset: 0, background: GLASS }} />
            <Sweep t={ramp(LAND, LAND + 20, (x) => x)} />
        </div>
    );
    const shadow = <div style={{ ...abs, left: '8%', right: '8%', bottom: -u * 1.6, height: u * 3, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', filter: `blur(${u * 1.6}px)` }} />;

    if (kind === 'macbook') {
        const bezel = u * 1.3;
        const lidW = sw + bezel * 2;
        return (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {shadow}
                <div style={{ position: 'relative', padding: `${u * 0.2}px`, background: RIM, borderRadius: `${u * 1.9}px ${u * 1.9}px ${u * 0.4}px ${u * 0.4}px` }}>
                    <div style={{ position: 'relative', width: sw, padding: `${u * 1.8}px ${bezel}px ${bezel}px`, background: '#0a0a0c', borderRadius: `${u * 1.7}px ${u * 1.7}px ${u * 0.3}px ${u * 0.3}px`, boxSizing: 'content-box' }}>
                        <div style={{ ...abs, top: u * 0.7, left: '50%', width: u * 0.55, height: u * 0.55, marginLeft: -u * 0.275, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #3a4660, #12151c)' }} />
                        {screen(u * 0.5)}
                    </div>
                </div>
                <div style={{ position: 'relative', width: (lidW + u * 0.4) * LAPTOP_REACH, height: u * 2.2, marginTop: -u * 0.05, borderRadius: `0 0 ${u * 3}px ${u * 3}px`, background: 'linear-gradient(#eceef1, #c3c5cb 45%, #8b8e95)', boxShadow: `0 ${u * 0.2}px 0 rgba(255,255,255,0.5) inset` }}>
                    <div style={{ ...abs, top: 0, left: '50%', width: u * 14, height: u * 0.9, marginLeft: -u * 7, borderRadius: `0 0 ${u}px ${u}px`, background: 'linear-gradient(#a0a3a9, #b7b9bf)' }} />
                </div>
            </div>
        );
    }

    if (kind === 'phone' || kind === 'tablet') {
        const phone = kind === 'phone';
        const bezel = u * (phone ? 1.7 : 1.9);
        const outer = u * (phone ? 5.2 : 3.2);
        const key = (side: 'left' | 'right', top: number, h: number) => <div style={{ ...abs, [side]: -u * 0.22, top: `${top}%`, width: u * 0.3, height: `${h}%`, borderRadius: u * 0.2, background: '#3a3b41' }} />;
        return (
            <div style={{ position: 'relative' }}>
                {shadow}
                <div style={{ position: 'relative', padding: u * 0.2, background: RIM, borderRadius: outer }}>
                    <div style={{ position: 'relative', padding: bezel, background: '#0a0a0c', borderRadius: outer - u * 0.2 }}>
                        {screen(outer - bezel * 0.7)}
                        {phone && <div style={{ ...abs, left: '50%', top: bezel + u * 1.2, width: sw * 0.28, height: u * 2.3, marginLeft: -sw * 0.14, borderRadius: u * 2, background: '#000', boxShadow: '0 0 0 1px #1b1c20' }} />}
                        {phone && <div style={{ ...abs, left: '50%', bottom: bezel + u * 0.9, width: sw * 0.34, height: u * 0.5, marginLeft: -sw * 0.17, borderRadius: u, background: 'rgba(255,255,255,0.4)' }} />}
                    </div>
                    {phone && key('right', 24, 11)}
                    {phone && key('left', 18, 6)}
                    {phone && key('left', 27, 8)}
                </div>
            </div>
        );
    }

    const bar = u * (kind === 'browser' ? 4.6 : 3.6);
    return (
        <div style={{ position: 'relative' }}>
            {shadow}
            <div style={{ position: 'relative', width: sw, borderRadius: u * 1.4, overflow: 'hidden', background: brand.colors.surface, boxShadow: `0 0 0 1px rgba(255,255,255,0.14), 0 ${u * 0.3}px 0 rgba(255,255,255,0.06) inset` }}>
                <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: u * 2, padding: `0 ${u * 1.6}px`, background: 'linear-gradient(rgba(255,255,255,0.09), rgba(255,255,255,0.04))', borderBottom: '1px solid rgba(0,0,0,0.35)' }}>
                    <Lights size={u * 1.1} />
                    {kind === 'browser' && (
                        <div style={{ flex: 1, height: bar * 0.56, borderRadius: bar, background: 'rgba(0,0,0,0.3)', color: brand.colors.muted, fontFamily: bodyFont(brand), fontSize: u * 1.5, lineHeight: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u * 0.7, marginRight: u * 6, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            <span style={{ width: u * 0.9, height: u * 0.9, borderRadius: '50%', background: brand.colors.accent, opacity: 0.8, flex: 'none' }} />
                            {url}
                        </div>
                    )}
                </div>
                {screen(0)}
            </div>
        </div>
    );
}

/** A device (or window) that tips up and lands on a spring at LAND, with an accent glow and a ring flashing behind it. `outerH` is its height, `tiltY` extra yaw while it arrives. */
export function Landing({ brand, u, outerH, tiltY = 0, children }: { brand: Brand; u: number; outerH: number; tiltY?: number; children: ReactNode }) {
    const { pop, ramp } = useTiming();
    const { width, height } = useVideoConfig();
    const enter = pop(0);
    const flash = ramp(LAND, LAND + 22, easeOut);
    return (
        <div style={{ position: 'relative', perspective: width * 1.4 }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%' }}>
                <Glow x={0} y={0} r={outerH * 1.5} color={`${brand.colors.accent}55`} opacity={enter * (0.55 + 0.45 * (1 - flash))} scale={0.8 + 0.2 * enter} />
                <Ring x={0} y={0} r0={outerH * 0.4} r1={outerH * 1.3} t={ramp(LAND, LAND + 26, easeOut)} color={brand.colors.accent} width={u * 0.4} />
            </div>
            <div style={{ transform: `translateY(${(1 - enter) * height * 0.2}px) rotateX(${(1 - enter) * 26}deg) rotateY(${(1 - enter) * tiltY}deg) scale(${0.9 + 0.1 * enter})`, transformOrigin: '50% 100%', opacity: Math.min(1, enter * 3) }}>{children}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------------------------
// Text

/** Headline, a rule that draws itself, and detail, each gliding in after `at` frames. `width` is the room for the text. */
export function Copy({ brand, headline, detail, width, size, align, at = 5 }: { brand: Brand; headline: string; detail: string; width: number; size: number; align: 'left' | 'center'; at?: number }) {
    const { glide, ramp } = useTiming();
    const { width: frameW, height: frameH } = useVideoConfig();
    const t = frameLayout(frameW, frameH).text;
    const { colors } = brand;
    const fitted = fitSize(headline, width, brand.fonts.display, size, '750');
    const rise = (p: number): CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * t * 2.5}px)` });
    return (
        <div style={{ width, textAlign: align, display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'center', overflowWrap: 'break-word' }}>
            <div style={{ width: t * 6 * ramp(at, at + 10, easeOut), height: t * 0.5, borderRadius: t, background: colors.accent, boxShadow: `0 0 ${t * 2}px ${colors.accent}`, marginBottom: t * 2 }} />
            {headline.trim() && <div style={{ ...rise(glide(at)), fontFamily: displayFont(brand), color: colors.text, fontSize: fitted, fontWeight: 750, lineHeight: 1.08, letterSpacing: -fitted * 0.02 }}>{headline}</div>}
            {detail.trim() && <div style={{ ...rise(glide(at + 4)), fontFamily: bodyFont(brand), color: colors.muted, fontSize: t * 2.9, fontWeight: 450, lineHeight: 1.35, marginTop: t * 1.8 }}>{detail}</div>}
        </div>
    );
}
