// Shared building blocks for the launch scenes: one look (cards, windows, type) so 50 scenes read as a set.
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import '../fonts';
import { BrandTexture, Depth, SceneImage, clamp, sceneGradient, useExit } from '../SceneBase';
import { bodyFont, displayFont, type Brand, type RecordingInfo, type SceneAssets, type Segment } from '../assets';
import { RecordingVideo } from '../RecordingVideo';
import { frameLayout } from '../layout';

export interface LaunchItem {
    text: string;
    detail?: string;
}

/** What every launch scene receives. Each scene reads only the fields its catalog entry lists. */
export interface LaunchProps {
    brand: Brand;
    assets: SceneAssets;
    transparent?: boolean;
    eyebrow: string;
    headline: string;
    subtitle: string;
    metric: number;
    date: string;
    image?: string;
    items: LaunchItem[];
    /** The project's screen recording (injected) and the part of it the scene shows; whole-scene length from its start when unset. */
    recording?: RecordingInfo;
    segment?: Segment;
    /** Screenshots the user added; the first one stands in for the product on screen. */
    images?: { image?: string }[];
}

export const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
/** The list a scene shows: real entries only, capped, padded from the defaults when short. */
export const listOf = (items: unknown, fallback: LaunchItem[], max = 6): LaunchItem[] => {
    const real = (Array.isArray(items) ? items : []).filter((item): item is LaunchItem => typeof item?.text === 'string' && item.text.trim() !== '');
    return (real.length ? real : fallback).slice(0, max);
};
/** First number in a string ("4.2M" → 4.2, "98%" → 98), 0 when there is none. */
export const numberIn = (text = '') => Number(/-?\d+(\.\d+)?/.exec(text.replace(/,/g, ''))?.[0] ?? 0);
/** The first `fraction` of a string, for typing effects. */
export const typed = (text: string, fraction: number) => text.slice(0, Math.round(text.length * Math.max(0, Math.min(1, fraction))));
export const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
/** A repeatable pseudo-random 0–1 (renders must not use Math.random). */
export const seeded = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
};

/** Time, springs and sizes for a scene. `u` is 1% of the short side; `tx` is `u` boosted for text in tall frames. */
export function useKit(p: LaunchProps) {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const L = frameLayout(width, height);
    return {
        frame,
        fps,
        width,
        height,
        dur: durationInFrames,
        seconds: durationInFrames / fps,
        s: frame / fps,
        u: L.unit,
        tx: L.text,
        portrait: L.portrait,
        stacked: L.stacked,
        c: p.brand.colors,
        display: displayFont(p.brand),
        body: bodyFont(p.brand),
        /** 0→1 spring starting `delay` seconds in. */
        pop: (delay = 0, damping = 18) => spring({ frame: frame - delay * fps, fps, config: { damping, stiffness: 140 } }),
        /** Value from `a` to `b` as time runs from `t0` to `t1` seconds. */
        ramp: (t0: number, t1: number, a = 0, b = 1) => interpolate(frame, [t0 * fps, t1 * fps], [a, b], clamp),
    };
}
export type Kit = ReturnType<typeof useKit>;

/** Background, texture, centred content and the closing fade every scene shares. */
export function Stage({ p, children }: { p: LaunchProps; children: ReactNode }) {
    const exit = useExit();
    return (
        <AbsoluteFill style={{ background: sceneGradient(p.brand, p.transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(p.brand), color: p.brand.colors.text, lineHeight: 1.2, opacity: exit, overflow: 'hidden' }}>
            <Depth z={-0.5}><BrandTexture brand={p.brand} transparent={p.transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</Depth>
        </AbsoluteFill>
    );
}

export const Col = ({ k, gap = 3, children, style }: { k: Kit; gap?: number; children: ReactNode; style?: CSSProperties }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * gap, width: '100%', ...style }}>{children}</div>
);

export const Kicker = ({ k, children, style }: { k: Kit; children?: ReactNode; style?: CSSProperties }) =>
    children ? <div style={{ color: k.c.accent, fontSize: k.tx * 2.3, fontWeight: 700, letterSpacing: k.u * 0.4, textTransform: 'uppercase', textAlign: 'center', ...style }}>{children}</div> : null;

export const Headline = ({ k, size = 9, children, style }: { k: Kit; size?: number; children: ReactNode; style?: CSSProperties }) => (
    <div style={{ fontFamily: k.display, fontSize: k.tx * size * (k.portrait ? 0.9 : 1), fontWeight: 850, lineHeight: 1.05, letterSpacing: -k.u * 0.035 * size, textAlign: 'center', maxWidth: '86%', textWrap: 'balance', ...style }}>{children}</div>
);

export const Sub = ({ k, children, style }: { k: Kit; children?: ReactNode; style?: CSSProperties }) =>
    children ? <div style={{ color: k.c.muted, fontSize: k.tx * 3, textAlign: 'center', maxWidth: '72%', textWrap: 'balance', ...style }}>{children}</div> : null;

export const Rule = ({ k, width = 20, progress = 1 }: { k: Kit; width?: number; progress?: number }) => (
    <div style={{ width: k.u * width, height: k.u * 0.6, borderRadius: k.u, background: k.c.accent, transform: `scaleX(${progress})`, boxShadow: `0 0 ${k.u * 3}px ${k.c.accent}88` }} />
);

/** A raised surface in the brand's colours. */
export const card = (k: Kit, style?: CSSProperties): CSSProperties => ({
    background: `linear-gradient(150deg, ${k.c.surface}, ${k.c.bg})`,
    border: `1px solid ${k.c.muted}33`,
    borderRadius: k.u * 1.8,
    boxShadow: `0 ${k.u * 2.5}px ${k.u * 9}px #0007`,
    ...style,
});

/** An app window with its traffic lights and title. */
export function Win({ k, title = '', width = '70%', height, children, style }: { k: Kit; title?: string; width?: string | number; height?: string | number; children: ReactNode; style?: CSSProperties }) {
    return (
        <div style={{ ...card(k, { width, height, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }), ...style }}>
            <div style={{ height: k.u * 5.4, flexShrink: 0, display: 'flex', alignItems: 'center', gap: k.u, padding: `0 ${k.u * 2}px`, borderBottom: `1px solid ${k.c.muted}22`, background: `${k.c.bg}88` }}>
                {['#ff6b62', '#f4c655', '#5bc58a'].map((color) => <span key={color} style={{ width: k.u * 1.3, height: k.u * 1.3, borderRadius: '50%', background: color }} />)}
                <div style={{ margin: '0 auto', color: k.c.muted, fontSize: k.tx * 1.8 }}>{title}</div>
                <span style={{ width: k.u * 6 }} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>{children}</div>
        </div>
    );
}

/** A mouse pointer at (x, y) percent of its parent; `press` 0–1 draws a click ripple. */
export function Cursor({ k, x, y, press = 0 }: { k: Kit; x: number; y: number; press?: number }) {
    return (
        <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, zIndex: 20, pointerEvents: 'none' }}>
            {press > 0 && press < 1 && <div style={{ position: 'absolute', left: -k.u * 2, top: -k.u * 2, width: k.u * 4, height: k.u * 4, borderRadius: '50%', border: `${k.u * 0.35}px solid ${k.c.accent}`, opacity: 1 - press, transform: `scale(${1 + press * 2.2})` }} />}
            <svg width={k.u * 3.4} height={k.u * 3.4} viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 4px #0009)', transform: `scale(${1 - (press > 0 && press < 0.25 ? 0.15 : 0)})` }}>
                <path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
        </div>
    );
}

/** A small pill label. */
export const Pill = ({ k, children, active = false, style }: { k: Kit; children: ReactNode; active?: boolean; style?: CSSProperties }) => (
    <span style={{ display: 'inline-block', padding: `${k.u * 1}px ${k.u * 2.2}px`, borderRadius: 999, fontSize: k.tx * 2.2, fontWeight: 650, border: `1px solid ${active ? k.c.accent : `${k.c.muted}44`}`, background: active ? `${k.c.accent}33` : `${k.c.surface}cc`, color: active ? k.c.text : k.c.muted, ...style }}>{children}</span>
);

export const Check = ({ k, size = 3, progress = 1 }: { k: Kit; size?: number; progress?: number }) => (
    <svg width={k.u * size} height={k.u * size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="11" fill={`${k.c.accent}33`} stroke={k.c.accent} strokeWidth="1.6" />
        <path d="M7 12.5l3.2 3.2L17 8.8" stroke={k.c.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
    </svg>
);

/** A monospace line of text (terminal, code). */
export const mono = (k: Kit): CSSProperties => ({ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: k.tx * 2.4 });

/**
 * The product on screen: the user's screenshot number `index` if they added one, else (for the front
 * piece, `index` 0) the screen recording, else `fallback`. One place so every scene shows real UI.
 */
export function Screen({ p, k, index = 0, fallback, style }: { p: LaunchProps; k: Kit; index?: number; fallback: ReactNode; style?: CSSProperties }) {
    const image = p.images?.[index]?.image;
    if (image) return <SceneImage src={image} assets={p.assets} brand={p.brand} style={{ width: '100%', height: '100%', ...style }} />;
    if (index === 0 && p.recording?.file) {
        const start = p.segment?.start ?? p.recording.offset;
        return <RecordingVideo recording={p.recording} assets={p.assets} segment={p.segment ?? { start, end: start + k.seconds }} style={style} />;
    }
    return <>{fallback}</>;
}
