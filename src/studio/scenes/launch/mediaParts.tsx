// Shared chrome for the product-media scenes (media.tsx): one device frame, window, ghost UI, placement and light effect each.
import type { CSSProperties, ReactNode } from 'react';
import { Screen, Win, pulse, seeded, type Kit, type LaunchProps } from './kit';
export { pulse };
import { useVideoConfig } from 'remotion';
import { HitFx, variantFor } from '../hitFx';
import { lerp } from './shapes';

import { easeInOutCubic as inOut } from '../../../lib/math';
export { inOut };

// ---- placement ------------------------------------------------------------------------------

export interface Zone { x: number; y: number; w: number; h: number }
/** Where a product shot lives beside the lockup: left of centre in wide frames (right when mirrored), upper part of tall ones. */
export const deviceZone = (k: Kit, mirror = false): Zone => {
    if (k.stacked) return { x: k.width / 2, y: k.height * 0.37, w: k.width * 0.88, h: k.height * 0.5 };
    return { x: mirror ? k.width * 0.7 : k.width * 0.3, y: k.height / 2, w: k.width * 0.5, h: k.height * 0.78 };
};
/** Where a centred product shot lives when the lockup sits above or below it. */
export const stageZone = (k: Kit): Zone => k.stacked
    ? { x: k.width / 2, y: k.height * 0.4, w: k.width * 0.9, h: k.height * 0.56 }
    : { x: k.width / 2, y: k.height * 0.43, w: k.width * 0.74, h: k.height * 0.6 };
/** Width of a box of this width/height ratio that fits the zone. */
export const fit = (z: Zone, ratio: number) => Math.min(z.w, z.h * ratio);
/** Width/height ratio for a window-like product shot, wider in wide frames. */
export const windowRatio = (k: Kit) => (k.portrait ? 0.95 : k.stacked ? 1.3 : 1.6);

/** A zero-size anchor at pixel (x, y): children are centred on it, and a transform on it pivots around that point. */
export const At = ({ x, y, children, style }: { x: number; y: number; children: ReactNode; style?: CSSProperties }) => (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>{children}</div>
);

// ---- light and depth ------------------------------------------------------------------------

/** A soft diagonal light band crossing its (overflow hidden) parent as `t` runs 0 to 1. */
export const Sheen = ({ t = 0, a = 0.22 }: { t?: number; a?: number }) => t <= 0 || t >= 1 ? null : (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(105deg, transparent 38%, rgba(255,255,255,${a}) 50%, transparent 62%)`, transform: `translateX(${lerp(-100, 100, t)}%)` }} />
);
/** Static glass reflection across a screen. */
export const Glare = () => <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(125deg, rgba(255,255,255,0.13), transparent 34%)' }} />;
/** Layered soft shadow; `lift` raises the object off the ground. */
export const depthShadow = (k: Kit, lift = 1) => `0 ${k.u * 1.2 * lift}px ${k.u * 3}px #0007, 0 ${k.u * 6 * lift}px ${k.u * 16 * lift}px #000a`;
/** A soft contact shadow under the bottom edge of its (relative) parent. */
const Ground = ({ k, o = 1 }: { k: Kit; o?: number }) => (
    <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: -k.u * 1.4, height: k.u * 3, borderRadius: '50%', background: 'radial-gradient(#000c, transparent 70%)', opacity: o, pointerEvents: 'none' }} />
);
/** The accent for a scene's key moment at (x, y) px, `size` px reach, over `dur` seconds from `t0`: the look is fixed per scene `name` (or nothing). */
export const HitAt = ({ k, name, x, y, t0, size, dur = 0.7, seed }: { k: Kit; name: string; x: number; y: number; t0: number; size: number; dur?: number; seed?: number }) => (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <HitFx variant={variantFor(name)} t={k.ramp(t0, t0 + dur)} x={x} y={y} size={size} color={k.c.accent} seed={seed} />
    </div>
);
export const Hit = ({ k, x, y, r, t0 }: { k: Kit; x: number; y: number; r: number; t0: number }) => (
    <HitAt k={k} name={useVideoConfig().id} x={x} y={y} t0={t0} size={r} dur={0.6} seed={Math.round(x + y)} />
);

// ---- devices and windows --------------------------------------------------------------------

/** An app window (kit's Win) with glass reflection, layered shadow and an optional light sweep `sweep` 0 to 1. */
export const Frame = ({ k, w, h, title, sweep = 0, lift = 1, children, style }: { k: Kit; w: number; h: number; title?: string; sweep?: number; lift?: number; children: ReactNode; style?: CSSProperties }) => (
    <Win k={k} title={title} width={w} height={h} style={{ boxShadow: depthShadow(k, lift), ...style }}>{children}<Glare /><Sheen t={sweep} /></Win>
);

interface BezelProps { k: Kit; w: number; h: number; radius: number; pad: number; sweep?: number; children: ReactNode; style?: CSSProperties }
const Bezel = ({ k, w, h, radius, pad, sweep, children, style }: BezelProps) => (
    <div style={{ position: 'relative', flexShrink: 0, width: w, height: h, padding: pad, borderRadius: radius, background: 'linear-gradient(145deg, #4a5062, #15171e 40%, #2a2e3a)', boxShadow: `inset 0 0 0 ${k.u * 0.15}px #ffffff30, ${depthShadow(k)}`, ...style }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: radius - pad, overflow: 'hidden', background: k.c.bg }}>{children}<Glare /><Sheen t={sweep} /></div>
    </div>
);
interface DeviceProps { k: Kit; sweep?: number; children: ReactNode; style?: CSSProperties }
export const Phone = ({ k, h, sweep, children, style }: DeviceProps & { h: number }) => (
    <Bezel k={k} w={h * 0.49} h={h} radius={h * 0.09} pad={h * 0.012} sweep={sweep} style={style}>
        {children}
        <div style={{ position: 'absolute', top: h * 0.012, left: '50%', width: '28%', height: h * 0.022, borderRadius: 99, background: '#000', transform: 'translateX(-50%)', zIndex: 5 }} />
        <Ground k={k} />
    </Bezel>
);
export const Tablet = ({ k, h, sweep, children, style }: DeviceProps & { h: number }) => (
    <Bezel k={k} w={h * 0.75} h={h} radius={h * 0.05} pad={h * 0.02} sweep={sweep} style={style}>{children}<Ground k={k} /></Bezel>
);
export const Laptop = ({ k, w, sweep, children, style }: DeviceProps & { w: number }) => (
    <div style={{ position: 'relative', width: w, flexShrink: 0, ...style }}>
        <Bezel k={k} w={w} h={w * 0.64} radius={k.u * 1.3} pad={w * 0.012} sweep={sweep}>{children}</Bezel>
        <div style={{ position: 'relative', height: k.u * 1.2, margin: `0 ${-w * 0.04}px`, borderRadius: `0 0 ${k.u * 3}px ${k.u * 3}px`, background: 'linear-gradient(#c4cbe0, #6b7391)', boxShadow: depthShadow(k, 0.5) }}>
            <div style={{ position: 'absolute', left: '42%', right: '42%', top: 0, height: k.u * 0.4, borderRadius: `0 0 ${k.u}px ${k.u}px`, background: '#00000030' }} />
        </div>
    </div>
);

// ---- product UI -----------------------------------------------------------------------------

type GhostKind = 'bar' | 'list' | 'chart' | 'form';
/** Placeholder UI shapes (toolbar, list, chart, inspector) shared by the fallback app and the exploded layers. */
export const Ghost = ({ k, kind, seed = 0 }: { k: Kit; kind: GhostKind; seed?: number }) => {
    const u = k.u;
    const muted = `${k.c.muted}38`;
    const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: u * 0.8 };
    if (kind === 'bar') return (
        <div style={{ ...row, width: '100%', height: '100%', padding: `0 ${u * 1.2}px` }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: u * 1.5, height: u * 1.5, borderRadius: '50%', background: i === seed % 3 ? k.c.accent : muted }} />)}
            <span style={{ flex: 1, height: u * 1.6, borderRadius: u, background: muted, margin: `0 ${u}px` }} />
            <span style={{ width: u * 2, height: u * 2, borderRadius: '50%', background: `${k.c.accent}99` }} />
        </div>
    );
    if (kind === 'list') return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: u * 0.9, padding: u * 1.2, width: '100%', height: '100%' }}>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ height: u * 1.5, width: `${55 + seeded(seed * 7 + i) * 40}%`, borderRadius: u * 0.5, background: i === seed % 5 ? k.c.accent : muted }} />)}
        </div>
    );
    if (kind === 'chart') return (
        <div style={{ ...row, alignItems: 'flex-end', width: '100%', height: '100%', padding: u * 1.4, gap: u * 0.9 }}>
            {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ flex: 1, height: `${28 + seeded(seed * 5 + i) * 62}%`, borderRadius: `${u * 0.5}px ${u * 0.5}px 0 0`, background: i === 4 ? k.c.accent : `${k.c.accent}${i % 2 ? '55' : '88'}` }} />)}
        </div>
    );
    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: u * 1.2, width: '100%', height: '100%' }}>
            {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: u * 0.5 }}>
                    <span style={{ height: u * 0.9, width: '40%', borderRadius: u, background: muted }} />
                    <span style={{ position: 'relative', height: u * 0.7, borderRadius: u, background: muted }}><span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${35 + seeded(seed + i) * 55}%`, borderRadius: u, background: k.c.accent }} /></span>
                </div>
            ))}
        </div>
    );
};

/** Placeholder app for when the user has added no screenshot or recording. */
const MockApp = ({ k, label, seed, side }: { k: Kit; label: string; seed: number; side: boolean }) => (
    <div style={{ display: 'flex', height: '100%', background: k.c.bg }}>
        {side && <div style={{ width: '22%', background: k.c.surface }}><Ghost k={k} kind="list" seed={seed} /></div>}
        <div style={{ flex: 1, padding: k.u * 1.4, display: 'flex', flexDirection: 'column', gap: k.u * 1.1, minWidth: 0 }}>
            <div style={{ color: k.c.muted, fontSize: k.tx * 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
            <div style={{ flex: 1, borderRadius: k.u * 0.8, background: `linear-gradient(${135 + seed * 25}deg, ${k.c.accent}33, ${k.c.accent}0d)`, border: `1px solid ${k.c.accent}33` }}><Ghost k={k} kind="chart" seed={seed} /></div>
            <div style={{ display: 'flex', gap: k.u * 0.8 }}>{[58, 36, 24].map((w, i) => <div key={i} style={{ height: k.u * 1.8, width: `${w}%`, borderRadius: k.u * 0.6, background: `${k.c.text}${i ? '22' : '44'}` }} />)}</div>
        </div>
    </div>
);

/** The `i`th piece of product UI: screenshot (cycled when fewer than asked for), else the recording for the front piece, else a mock app. */
export const Ui = ({ p, k, i = 0, label = '', side = true }: { p: LaunchProps; k: Kit; i?: number; label?: string; side?: boolean }) => {
    const real = (p.images ?? []).flatMap((x, n) => (x?.image ? [n] : []));
    return <Screen p={p} k={k} index={real.length ? real[i % real.length] : i} fallback={<MockApp k={k} label={label} seed={i} side={side} />} />;
};
