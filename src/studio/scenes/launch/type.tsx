// Typography, social-proof and closer scenes (see catalog-type.ts). Each has one hit (flash/ring/sparks) and a composed, held end frame.
import type { CSSProperties, ReactNode } from 'react';
import { Img, spring } from 'remotion';
import { assetUrl } from '../assets';
import { Check, Col, Headline, Kicker, Pill, Screen, Stage, Sub, Win, card, easeOut, listOf, seeded, typed, useKit, type Kit, type LaunchProps } from './kit';
import { Aura, Canvas, Lockup, Shock, TAU, al, clamp01, glow, lerp, polar, shortSide } from './shapes';

// ---- shared helpers ----

/** 0→1 spring from `t0` seconds; low damping overshoots, high stiffness snaps. */
const spr = (k: Kit, t0: number, damping = 12, stiffness = 200) => spring({ frame: k.frame - t0 * k.fps, fps: k.fps, config: { damping, stiffness } });
/** Font size that keeps `chars` characters inside `frac` of the frame width. */
const fit = (k: Kit, chars: number, max: number, frac = 0.88) => Math.min(max, (k.width * frac) / Math.max(1, chars * 0.55));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '•';
/** Gradient-filled text (top to bottom); pair with `glow` for a lit look. */
const gradText = (k: Kit, from = k.c.text, to = k.c.accent): CSSProperties => ({ backgroundImage: `linear-gradient(180deg, ${from}, ${to} 75%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' });
const outlined = (k: Kit, colour: string, width = 0.28): CSSProperties => ({ color: 'transparent', WebkitTextStroke: `${k.u * width}px ${colour}` });
/** Heavy display type shared by the slam, poster and outline scenes. */
const slab = (k: Kit, size: number): CSSProperties => ({ fontFamily: k.display, fontWeight: 900, fontSize: size, lineHeight: 0.95, letterSpacing: -size * 0.03, textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center' });
/** Layers stacked in one grid cell, so they share a size and centre. */
const stack: CSSProperties = { display: 'grid', placeItems: 'center' };
const layer: CSSProperties = { gridArea: '1 / 1' };

/** Accent ring plus dots flung outward: the "hit". Sits at (x, y) of the nearest positioned parent. */
function Impact({ k, t0, r, n = 10, seed = 0, x = '50%', y = '50%' }: { k: Kit; t0: number; r: number; n?: number; seed?: number; x?: string; y?: string }) {
    const t = k.ramp(t0, t0 + 0.8);
    if (t <= 0 || t >= 1) return null;
    return (
        <svg width={1} height={1} style={{ position: 'absolute', left: x, top: y, overflow: 'visible', pointerEvents: 'none' }}>
            <Shock k={k} x={0} y={0} r0={k.u * r * 0.4} r1={k.u * r} t0={t0} />
            {Array.from({ length: n }, (_, i) => {
                const [dx, dy] = polar(0, 0, k.u * r * (0.5 + seeded(seed + i + 9) * 0.6) * easeOut(t), (i / n) * TAU + seeded(seed + i) * 0.5);
                return <circle key={i} cx={dx} cy={dy} r={k.u * 0.55 * (1 - t)} fill={i % 2 ? k.c.text : k.c.accent} opacity={1 - t} />;
            })}
        </svg>
    );
}

function Avatar({ k, name, size, tone = 0 }: { k: Kit; name: string; size: number; tone?: number }) {
    const solid = tone % 2 === 0;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: solid ? `linear-gradient(145deg, ${k.c.text}, ${k.c.accent} 55%)` : `linear-gradient(145deg, ${k.c.surface}, ${al(k.c.muted, 0.5)})`, color: solid ? k.c.bg : k.c.text, fontFamily: k.display, fontWeight: 800, fontSize: size * 0.4, border: `${size * 0.04}px solid ${al(k.c.text, 0.18)}`, boxShadow: `0 ${size * 0.08}px ${size * 0.25}px #0006` }}>
            {initials(name)}
        </div>
    );
}

/** The brand logo, or an accent tile with an initial when there is none. */
function LogoMark({ p, k, size, initial }: { p: LaunchProps; k: Kit; size: number; initial: string }) {
    if (p.brand.logo) return <Img src={assetUrl(p.assets, p.brand.logo)} style={{ height: size, width: 'auto', maxWidth: k.u * 50, objectFit: 'contain', display: 'block' }} />;
    return <div style={{ width: size, height: size, borderRadius: size * 0.24, background: k.c.accent, color: k.c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: k.display, fontSize: size * 0.56, fontWeight: 800, lineHeight: 1 }}>{initial}</div>;
}

// ---- typography ----

const TUNNEL_WORDS = [{ text: 'Record' }, { text: 'Edit' }, { text: 'Polish' }, { text: 'Share' }, { text: 'Repeat' }, { text: 'Launch' }];
const TUNNEL_FLIGHT = 0.9;

/** Words rush out of the vanishing point toward the camera, each with two lagging ghosts; the headline punches through last. */
export function FlyingWordsTunnel(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const words = listOf(p.items, TUNNEL_WORDS, 9);
    const gap = Math.min(0.28, 1.5 / words.length);
    const hit = 0.15 + (words.length - 1) * gap + TUNNEL_FLIGHT * 0.55;
    const land = spr(k, hit, 10, 170);
    const wordAt = (i: number, t: number, alpha: number, key: string) => {
        if (t <= 0 || t >= 1) return null;
        const a = i * 2.4 + seeded(i) * 0.6;
        const d = t ** 1.7;
        const lit = i % 3 === 0;
        return (
            <div key={key} style={{ position: 'absolute', fontFamily: k.display, fontWeight: 900, fontSize: k.tx * 9, whiteSpace: 'nowrap', ...(lit ? gradText(k) : { color: k.c.text }), ...(alpha < 1 && { color: k.c.accent, backgroundImage: 'none' }), opacity: alpha * Math.min(1, t * 5) * (1 - clamp01((t - 0.75) / 0.25)), transform: `translate(${Math.cos(a) * d * k.width * 0.55}px, ${Math.sin(a) * d * k.height * 0.46}px) scale(${0.15 + t * t * 2.6})`, filter: lit ? `drop-shadow(0 0 ${k.u * 2}px ${al(k.c.accent, 0.5)})` : undefined }}>
                {words[i]!.text}
            </div>
        );
    };
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={M * 0.7} a={0.3} scale={0.6 + 0.4 * land} />
            <Canvas k={k}>
                {[0, 1, 2, 3, 4].map((i) => {
                    const f = (k.s * 0.9 + i / 5) % 1;
                    return <circle key={i} cx={k.width / 2} cy={k.height / 2} r={M * (0.08 + f ** 1.6 * 0.95)} fill="none" stroke={al(k.c.accent, 0.3 * (1 - f) * (1 - k.ramp(hit, hit + 0.3)))} strokeWidth={k.u * 0.2} />;
                })}
                <Shock k={k} x={k.width / 2} y={k.height / 2} r0={M * 0.1} r1={M * 0.85} t0={hit} />
            </Canvas>
            {words.map((_, i) => {
                const t = (k.s - 0.15 - i * gap) / TUNNEL_FLIGHT;
                return [0.07, 0.035, 0].map((lag, g) => wordAt(i, t - lag, g === 2 ? 1 : 0.22 + g * 0.1, `${i}-${g}`));
            })}
            <div style={{ position: 'absolute', inset: 0, opacity: k.ramp(hit, hit + 0.1), transform: `scale(${lerp(2, 1, land)})` }}>
                <Lockup k={k} p={p} t0={hit} place="center" size={9} />
            </div>
        </Stage>
    );
}

const SLAM_WORDS = [{ text: 'Faster' }, { text: 'Cleaner' }, { text: 'Yours' }];
const SLAM_FROM = 2.6;

/** One word per beat: each slams in from 2.6x with three lagging ghosts, a flash and a shake; the headline takes the last beat in accent. */
export function BeatSlam(p: LaunchProps) {
    const k = useKit(p);
    const beat = 60 / Math.max(60, Math.min(200, p.metric || 120));
    const seq = [...listOf(p.items, SLAM_WORDS, 5).map((w) => w.text), p.headline].filter(Boolean);
    const start = 0.1;
    const idx = Math.min(seq.length - 1, Math.floor((k.s - start) / beat));
    const t0 = start + idx * beat;
    const since = k.s - t0;
    const last = idx === seq.length - 1;
    const word = seq[Math.max(0, idx)] ?? '';
    const prev = seq[idx - 1];
    const impact = Math.max(0, 1 - since / 0.16) ** 2;
    const size = fit(k, word.length, k.tx * 17);
    const sp = spr(k, t0, 10, 260);
    const tilt = (seeded(idx + 4) - 0.5) * 7 * (1 - clamp01(sp));
    const wordCss = (scale: number, extra: CSSProperties): CSSProperties => ({ ...slab(k, size), ...layer, transform: `scale(${scale})`, ...extra });
    return (
        <Stage p={p}>
            <div style={{ position: 'absolute', inset: 0, background: k.c.accent, opacity: idx >= 0 ? impact * (last ? 0.3 : 0.16) : 0 }} />
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.6} a={last ? 0.35 : 0.15} />
            {prev && <div style={{ ...slab(k, fit(k, prev.length, k.tx * 17)), ...outlined(k, al(k.c.text, 0.12), 0.2), position: 'absolute', transform: `scale(${1.5 + 0.2 * clamp01(sp)})` }}>{prev}</div>}
            <Col k={k} gap={3}>
                <Kicker k={k} style={{ opacity: k.ramp(0, 0.2) }}>{p.eyebrow}</Kicker>
                {idx >= 0 && (
                    <div style={{ ...stack, transform: `translate(${Math.sin(since * 140) * impact * k.u * 0.5}px, ${Math.cos(since * 120) * impact * k.u * 0.4}px) rotate(${tilt}deg)` }}>
                        {[3, 2, 1].map((g) => {
                            const lag = clamp01(spr(k, t0 + g * 0.035, 10, 260));
                            return <div key={g} style={wordCss(lerp(SLAM_FROM, 1, lag), { ...outlined(k, k.c.accent, 0.25), opacity: 0.3 * (1 - lag) })}>{word}</div>;
                        })}
                        <div key={idx} style={wordCss(lerp(SLAM_FROM, 1, sp), last ? { ...gradText(k), ...glow(k, al(k.c.accent, 0.6), 2.5) } : { color: k.c.text, textShadow: `0 ${k.u * 0.8}px ${k.u * 3}px #0008` })}>{word}</div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: k.u * 1.2, opacity: k.ramp(0.15, 0.4) }}>
                    {seq.map((_, i) => <span key={i} style={{ width: k.u * 1.2, height: k.u * 1.2, borderRadius: '50%', background: i <= idx ? k.c.accent : al(k.c.muted, 0.3), transform: `scale(${i === idx ? 1 + 0.6 * impact : 1})` }} />)}
                </div>
                <Sub k={k} style={{ opacity: last ? k.ramp(t0 + 0.25, t0 + 0.6) : 0 }}>{p.subtitle}</Sub>
            </Col>
            <Impact k={k} t0={start + (seq.length - 1) * beat} r={26} seed={5} y="46%" />
        </Stage>
    );
}

const POSTER_LINES = [{ text: 'Bold' }, { text: 'Fast' }, { text: 'Yours' }];

/** Huge stacked lines spring in from alternating sides (outline layer lags like a trail), settle into a framed poster and drift. */
export function PosterGrid(p: LaunchProps) {
    const k = useKit(p);
    const lines = [p.headline, ...listOf(p.items, POSTER_LINES, 4).map((w) => w.text)].filter(Boolean);
    const size = Math.min(fit(k, Math.max(...lines.map((l) => l.length)), k.height), (k.height * 0.72) / lines.length / 0.95);
    const shineAt = 0.15 + lines.length * 0.13 + 0.2;
    const line = (text: string, i: number) => {
        const dir = i % 2 ? 1 : -1;
        const at = (lag: number) => (1 - spr(k, 0.15 + i * 0.13 + lag, 13, 190)) * dir * k.width * 0.8 + k.s * dir * -k.u * 1.2;
        const kind = i % 3;
        const css = slab(k, size);
        const shine = k.ramp(shineAt, shineAt + 0.9, 150, -50);
        const face: CSSProperties = kind === 1 ? outlined(k, k.c.text, 0.3)
            : kind === 2 ? { backgroundImage: `linear-gradient(100deg, ${k.c.accent} 40%, ${k.c.text} 50%, ${k.c.accent} 60%)`, backgroundSize: '250% 100%', backgroundPosition: `${shine}% 0`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: `drop-shadow(0 0 ${k.u * 2.5}px ${al(k.c.accent, 0.45)})` }
            : { color: k.c.text };
        return (
            <div key={i} style={{ ...stack, opacity: clamp01(spr(k, 0.15 + i * 0.13, 20, 200) * 2) }}>
                <div style={{ ...css, ...layer, ...outlined(k, k.c.accent, 0.2), transform: `translate(${at(0.05) + k.u * 0.9}px, ${k.u * 0.9}px)` }}>{text}</div>
                <div style={{ ...css, ...layer, ...face, transform: `translateX(${at(0)}px)` }}>{text}</div>
            </div>
        );
    };
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.7} a={0.18} />
            <div style={{ position: 'absolute', inset: k.u * 2.5, border: `1px solid ${al(k.c.muted, 0.28)}`, borderRadius: k.u, opacity: k.ramp(0, 0.4) }} />
            <Kicker k={k} style={{ position: 'absolute', top: k.u * 5, opacity: k.ramp(0.05, 0.35) }}>{p.eyebrow}</Kicker>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>{lines.map(line)}</div>
            <Sub k={k} style={{ position: 'absolute', bottom: k.u * 5, opacity: k.ramp(shineAt, shineAt + 0.4) }}>{p.subtitle}</Sub>
        </Stage>
    );
}

/** Polygon clip whose top edge is a travelling wave rising with `fill` (0→1). */
const liquid = (fill: number, s: number) => {
    const pts = Array.from({ length: 11 }, (_, i) => `${i * 10}% ${(1 - fill) * 112 - 6 + Math.sin(i * 1.3 + s * 9) * 3 * Math.sin(fill * Math.PI)}%`);
    return `polygon(0% 100%, ${pts.join(', ')}, 100% 100%)`;
};

/** The headline appears as an outline, then a liquid accent fill rises through it and a light sweeps across the finished word. */
export function OutlineFill(p: LaunchProps) {
    const k = useKit(p);
    const fillStart = 0.35;
    const hit = 1.3;
    const fill = easeOut(k.ramp(fillStart, hit));
    const enter = spr(k, 0, 14, 200);
    const css: CSSProperties = { ...layer, fontFamily: k.display, fontWeight: 900, fontSize: k.tx * (k.portrait ? 13 : 14), lineHeight: 1.02, letterSpacing: -k.u * 0.4, textAlign: 'center', maxWidth: '88%', textWrap: 'balance', strokeLinejoin: 'round' };
    const sweep = k.ramp(hit, hit + 0.8, 130, -30);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.55} a={0.08 + 0.3 * fill} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={{ opacity: k.ramp(0, 0.25) }}>{p.eyebrow}</Kicker>
                <div style={{ ...stack, width: '100%', transform: `scale(${lerp(1.12, 1, enter)})`, opacity: clamp01(enter * 2) }}>
                    <div style={{ ...css, ...outlined(k, k.c.text, 0.28) }}>{p.headline}</div>
                    <div style={{ ...css, ...gradText(k, k.c.text, k.c.accent), backgroundImage: `linear-gradient(105deg, transparent 40%, ${al(k.c.text, 0.9)} 50%, transparent 60%), linear-gradient(180deg, ${k.c.text}, ${k.c.accent} 70%)`, backgroundSize: '300% 100%, 100% 100%', backgroundPosition: `${sweep}% 0, 0 0`, filter: `drop-shadow(0 0 ${k.u * 4 * fill}px ${al(k.c.accent, 0.55)})`, clipPath: liquid(fill, k.s) }}>{p.headline}</div>
                </div>
                <Sub k={k} style={{ opacity: k.ramp(hit, hit + 0.4), transform: `translateY(${(1 - k.ramp(hit, hit + 0.4)) * k.u * 2}px)` }}>{p.subtitle}</Sub>
            </Col>
            <Impact k={k} t0={hit} r={30} n={12} seed={2} />
        </Stage>
    );
}

// ---- social proof ----

const POSTS = [
    { text: 'Shipped our launch video in an afternoon. This is unreal.', detail: 'Maya Chen @mayabuilds' },
    { text: 'Finally a screen recorder that makes me look like I hired a studio.', detail: 'Dev Patel @devships' },
    { text: 'Our demo clips went from awkward to polished overnight.', detail: 'Sara Okafor @saraok' },
];
const ICONS = {
    reply: 'M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20l1.3-4.9A8.5 8.5 0 1 1 21 11.5z',
    repost: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
    heart: 'M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z',
    share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14',
};
const Icon = ({ d, size, color, fill = 'none' }: { d: string; size: number; color: string; fill?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const POST_SLOT = 1;

/** One post: header with verified badge, typed body, action row whose heart pops (with sparks) once typed. */
function PostCard({ k, text, detail, i, count }: { k: Kit; text: string; detail?: string; i: number; count: number }) {
    const handle = /@\S+/.exec(detail ?? '')?.[0] ?? '';
    const name = (detail ?? '').replace(handle, '').trim() || 'A happy customer';
    const t0 = 0.15 + i * POST_SLOT;
    const likeAt = t0 + 0.75;
    const enter = spr(k, t0, 13, 170);
    // Older posts sink behind newer ones: each later post's arrival pushes this one back a step.
    const depth = Array.from({ length: count - 1 - i }, (_, j) => clamp01(spr(k, 0.15 + (i + 1 + j) * POST_SLOT, 16, 150))).reduce((a, b) => a + b, 0);
    const liked = k.s >= likeAt;
    const likes = Math.round(easeOut(k.ramp(likeAt - 0.3, likeAt + 0.8)) * (480 + seeded(i + 3) * 4200));
    const stat = (d: string, n: string, color = k.c.muted) => <span style={{ display: 'flex', alignItems: 'center', gap: k.u * 0.8 }}><Icon d={d} size={k.u * 2.6} color={color} />{n}</span>;
    return (
        <div style={{ ...card(k, { position: 'absolute', inset: 0, padding: k.u * 2.8, display: 'flex', flexDirection: 'column', gap: k.u * 1.6, zIndex: i }), opacity: clamp01(enter * 2) * (1 - depth * 0.28), filter: `brightness(${1 - depth * 0.16})`, transform: `translateY(${(1 - enter) * k.u * 14 - depth * k.u * 3.6}px) scale(${0.92 + enter * 0.08 - depth * 0.05})` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.5 }}>
                <Avatar k={k} name={name} size={k.u * 6} tone={i} />
                <div style={{ lineHeight: 1.25 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 0.7, fontWeight: 750, fontSize: k.tx * 2.4 }}>
                        {name}
                        <svg width={k.u * 2.2} height={k.u * 2.2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill={k.c.accent} /><path d="M7 12.5l3.2 3.2L17 8.8" stroke={k.c.bg} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ color: k.c.muted, fontSize: k.tx * 2 }}>{handle} · {2 + i}h</div>
                </div>
            </div>
            <div style={{ fontSize: k.tx * 3, lineHeight: 1.35, flex: 1 }}>{typed(text, k.ramp(t0 + 0.15, t0 + 0.7))}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 3.5, color: k.c.muted, fontSize: k.tx * 2.1, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${al(k.c.muted, 0.18)}`, paddingTop: k.u * 1.4 }}>
                {stat(ICONS.reply, `${12 + i * 7}`)}
                {stat(ICONS.repost, `${40 + i * 23}`)}
                <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: k.u * 0.8, color: liked ? k.c.text : k.c.muted, fontWeight: liked ? 650 : 400 }}>
                    <span style={{ display: 'flex', transform: `scale(${1 + 0.7 * Math.sin(clamp01((k.s - likeAt) / 0.4) * Math.PI)})` }}><Icon d={ICONS.heart} size={k.u * 2.8} color={liked ? k.c.accent : k.c.muted} fill={liked ? k.c.accent : 'none'} /></span>
                    {likes.toLocaleString('en-US')}
                    <Impact k={k} t0={likeAt} r={5} n={7} seed={i * 11} x={`${k.u * 1.4}px`} />
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex' }}><Icon d={ICONS.share} size={k.u * 2.6} color={k.c.muted} /></span>
            </div>
        </div>
    );
}

/** Posts land one after another and stack like a deck; the heart pops on each, and the three sit fanned at the end. */
export function SocialPostTestimonial(p: LaunchProps) {
    const k = useKit(p);
    const posts = listOf(p.items, POSTS, 3);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.6} a={0.14} />
            <Col k={k} gap={4}>
                <Kicker k={k} style={{ opacity: k.ramp(0, 0.25) }}>{p.eyebrow}</Kicker>
                <div style={{ position: 'relative', width: k.stacked ? '88%' : '52%', height: k.u * (k.portrait ? 40 : 30), marginTop: k.u * posts.length * 1.8 }}>
                    {posts.map((post, i) => <PostCard key={i} k={k} text={post.text} detail={post.detail} i={i} count={posts.length} />)}
                </div>
                <Sub k={k} style={{ opacity: k.ramp(0.4, 0.8) }}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

const RUSH_NAMES = ['Ava Lin', 'Ben Ortiz', 'Chloe Park', 'Dan Reyes', 'Eli Novak', 'Fay Zhao', 'Gus Holt', 'Hana Kim', 'Ivo Rossi', 'Jo Lund', 'Kai Mori', 'Lea Brandt'];
const RUSH_COUNT = 24;

/** Avatars spiral into two rings around a counter that accelerates to the milestone; the hit pulses the rings and fires an impact. */
export function FollowerRush(p: LaunchProps) {
    const k = useKit(p);
    const target = p.metric || 10000;
    const hit = 2;
    const count = Math.round(k.ramp(0.15, hit) ** 1.9 * target);
    const kick = Math.max(0, 1 - (k.s - hit) / 0.5) ** 2;
    const av = k.u * (k.portrait ? 6 : 7);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.7} a={0.12 + 0.25 * k.ramp(0.15, hit)} />
            {Array.from({ length: RUSH_COUNT }, (_, i) => {
                const ring = i % 2 ? 1 : 0.84;
                const a = (i / RUSH_COUNT) * TAU + (i % 2) * 0.13 + 0.3;
                const e = spr(k, 0.1 + (i / RUSH_COUNT) ** 1.3 * 1.5, 13, 160);
                const [x, y] = polar(0, 0, lerp(1.9, 1, e) * (1 + kick * 0.1), a + (1 - e) * 0.9);
                const bob = Math.sin(k.s * 1.6 + i) * k.u * 0.5 * clamp01(e);
                return (
                    <div key={i} style={{ position: 'absolute', opacity: clamp01(e * 2), transform: `translate(${x * k.width * 0.4 * ring}px, ${y * k.height * 0.38 * ring + bob}px) scale(${(0.4 + e * 0.6) * (1 + kick * 0.2)})` }}>
                        <Avatar k={k} name={RUSH_NAMES[i % RUSH_NAMES.length]!} size={av * (0.8 + seeded(i) * 0.4)} tone={i + Math.floor(seeded(i) * 2)} />
                    </div>
                );
            })}
            <Col k={k} gap={1.5} style={{ position: 'absolute', width: '70%' }}>
                <Kicker k={k} style={{ opacity: k.ramp(0, 0.25) }}>{p.eyebrow}</Kicker>
                <div style={{ ...slab(k, fit(k, 7, k.tx * 17, 0.6)), textTransform: 'none', fontVariantNumeric: 'tabular-nums', ...gradText(k), ...glow(k, al(k.c.accent, 0.3 + 0.4 * kick), 3 + 3 * kick), transform: `scale(${1 + 0.1 * k.ramp(0.15, hit) + 0.15 * kick})` }}>{count.toLocaleString('en-US')}</div>
                <Headline k={k} size={4.4} style={{ opacity: k.ramp(0.3, 0.7) }}>{p.headline}</Headline>
                <Sub k={k} style={{ opacity: k.ramp(hit, hit + 0.4) }}>{p.subtitle}</Sub>
            </Col>
            <Impact k={k} t0={hit} r={34} n={14} seed={7} y="46%" />
        </Stage>
    );
}

const STAR = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1z';
const SPARKLE = 'M12 0l2.2 9.8L24 12l-9.8 2.2L12 24l-2.2-9.8L0 12l9.8-2.2z';

/** One star: spins and pops in, then fills left to right by `fill`. */
function Star({ k, size, fill, pop }: { k: Kit; size: number; fill: number; pop: number }) {
    const shape = (style: CSSProperties, paint: ReactNode) => <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute', ...style }}>{paint}</svg>;
    return (
        <div style={{ position: 'relative', width: size, height: size, transform: `scale(${pop}) rotate(${(1 - pop) * -40}deg)` }}>
            {shape({}, <path d={STAR} fill={al(k.c.muted, 0.13)} stroke={al(k.c.muted, 0.4)} strokeWidth="1" strokeLinejoin="round" />)}
            {shape({ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`, filter: `drop-shadow(0 0 ${k.u * 1.2}px ${al(k.c.accent, 0.7)})` }, <path d={STAR} fill={k.c.accent} strokeLinejoin="round" />)}
        </div>
    );
}

/** Five stars pop in on a stagger while the rating counts up; the last star lands the hit, then review line and source follow. */
export function StarRatingSummary(p: LaunchProps) {
    const k = useKit(p);
    const rating = Math.max(0, Math.min(5, p.metric || 4.9));
    const size = k.u * (k.portrait ? 12 : 11);
    const hit = 1.1;
    const lastStar = 0.15 + 4 * 0.13;
    const twinkle = Math.sin(clamp01((k.s - lastStar) / 0.7) * Math.PI);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.6} a={0.1 + 0.25 * k.ramp(0.2, hit)} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={{ opacity: k.ramp(0, 0.25) }}>{p.eyebrow}</Kicker>
                <div style={{ position: 'relative', display: 'flex', gap: size * 0.12 }}>
                    {[0, 1, 2, 3, 4].map((i) => {
                        const pop = spr(k, 0.15 + i * 0.13, 9, 260);
                        return <Star key={i} k={k} size={size} fill={clamp01(rating - i) * clamp01(pop)} pop={pop} />;
                    })}
                    <svg width={k.u * 3.6} height={k.u * 3.6} viewBox="0 0 24 24" style={{ position: 'absolute', right: -k.u * 1.4, top: -k.u * 1.8, opacity: twinkle, transform: `scale(${twinkle}) rotate(${twinkle * 90}deg)`, filter: `drop-shadow(0 0 ${k.u}px ${k.c.accent})` }}><path d={SPARKLE} fill={k.c.text} /></svg>
                    <Impact k={k} t0={hit} r={32} n={12} seed={3} />
                </div>
                <div style={{ ...slab(k, k.tx * 16), textTransform: 'none', lineHeight: 1, fontVariantNumeric: 'tabular-nums', ...gradText(k), ...glow(k, al(k.c.accent, 0.35), 3), opacity: k.ramp(0.1, 0.3), transform: `scale(${1 + 0.06 * Math.exp(-Math.max(0, k.s - hit) * 5) * Math.sin(Math.max(0, k.s - hit) * 22)})` }}>
                    {(easeOut(k.ramp(0.2, hit)) * rating).toFixed(1)}<span style={{ color: k.c.muted, backgroundImage: 'none', fontSize: '0.4em', fontWeight: 700 }}> / 5</span>
                </div>
                <Headline k={k} size={4.4} style={{ opacity: k.ramp(hit, hit + 0.4), transform: `translateY(${(1 - k.ramp(hit, hit + 0.4)) * k.u * 2}px)` }}>{p.headline}</Headline>
                {p.subtitle && (
                    <Pill k={k} active style={{ opacity: k.ramp(hit + 0.2, hit + 0.6), display: 'inline-flex', alignItems: 'center', gap: k.u }}>
                        <Check k={k} size={2.4} progress={k.ramp(hit + 0.3, hit + 0.8)} />{p.subtitle}
                    </Pill>
                )}
            </Col>
        </Stage>
    );
}

// ---- closers ----

/** A chat input types the prompt, the send button fires, and the box contracts (with overshoot) into the logo. */
export function InputMorph(p: LaunchProps) {
    const k = useKit(p);
    const sendAt = 1.15;
    const morphAt = 1.25;
    const hit = 1.7;
    const m = spr(k, morphAt, 15, 150);
    const mc = clamp01(m);
    const press = Math.sin(clamp01((k.s - sendAt) / 0.25) * Math.PI);
    const logoSize = k.u * (k.portrait ? 24 : 22);
    const boxW = Math.min(k.width * 0.82, k.u * 76);
    const boxH = k.u * 9;
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={logoSize * 2.4} a={0.45} scale={mc * mc} />
            <Col k={k} gap={4}>
                <Kicker k={k} style={{ opacity: (1 - mc) * k.ramp(0, 0.25) }}>{p.eyebrow}</Kicker>
                <div style={{ position: 'relative', width: lerp(boxW, logoSize, mc), height: lerp(boxH, logoSize, mc), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: k.ramp(0, 0.15) }}>
                    <div style={card(k, { position: 'absolute', inset: 0, borderRadius: lerp(boxH / 2, logoSize * 0.24, mc), opacity: 1 - mc ** 2, boxShadow: `0 ${k.u * 2.5}px ${k.u * 9}px #0007, 0 0 ${k.u * 4 * k.ramp(0.1, sendAt)}px ${al(k.c.accent, 0.25)}` })} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: k.u * 1.5, padding: `0 ${k.u * 1.6}px 0 ${k.u * 2.6}px`, opacity: 1 - clamp01(mc * 3), overflow: 'hidden' }}>
                        <svg width={k.u * 3} height={k.u * 3} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d={SPARKLE} fill={k.c.accent} /></svg>
                        <div style={{ flex: 1, fontSize: k.tx * 3, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {typed(p.headline, k.ramp(0.15, sendAt - 0.1))}
                            <span style={{ display: 'inline-block', width: k.u * 0.3, height: k.u * 3, marginLeft: k.u * 0.3, verticalAlign: 'middle', background: k.c.accent, opacity: Math.floor(k.frame / 8) % 2 ? 0 : 1 }} />
                        </div>
                        <div style={{ width: k.u * 6, height: k.u * 6, borderRadius: '50%', background: k.c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: `scale(${1 + 0.22 * press})`, boxShadow: `0 0 ${k.u * 3 * press}px ${k.c.accent}` }}>
                            <svg width={k.u * 3} height={k.u * 3} viewBox="0 0 24 24" fill="none" stroke={k.c.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                        </div>
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: clamp01((mc - 0.5) / 0.4), transform: `scale(${0.5 + 0.5 * m})` }}>
                        <LogoMark p={p} k={k} size={logoSize} initial={(p.headline.trim()[0] ?? '•').toUpperCase()} />
                    </div>
                    <Impact k={k} t0={hit} r={26} n={12} seed={9} />
                </div>
                <Sub k={k} style={{ opacity: k.ramp(hit, hit + 0.4), transform: `translateY(${(1 - k.ramp(hit, hit + 0.4)) * k.u * 2}px)` }}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

const BURST_PTS = Array.from({ length: 32 }, (_, i) => polar(50, 50, i % 2 ? 40 : 50, (i / 32) * TAU));
const BURST_POINTS = BURST_PTS.map(([x, y]) => `${x},${y}`).join(' ');
const BURST_CLIP = `polygon(${BURST_PTS.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
const PRICE_TILES = [0.6, 1, 0.6];

/** A discount sticker flips down onto the product with overshoot: shadow tightens, product shakes, a shine crosses it and sparks fly. */
export function OfferStickerSlap(p: LaunchProps) {
    const k = useKit(p);
    const hit = 0.8;
    const drop = spr(k, hit, 11, 240);
    const far = 1 - drop;
    const since = Math.max(0, k.s - hit);
    const shake = Math.max(0, 1 - since / 0.25) ** 2;
    const wobble = Math.sin(since * 6) * 2.5 * clamp01(since / 0.4) * Math.exp(-since * 1.2);
    const rise = spr(k, 0, 15, 150);
    const size = k.u * (k.portrait ? 44 : 34);
    const fontSize = Math.min(size * 0.26, (size * 0.6) / Math.max(1, p.headline.length * 0.55));
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.6} a={0.1 + 0.2 * clamp01(drop)} />
            <Col k={k} gap={4}>
                <Kicker k={k} style={{ opacity: k.ramp(0, 0.25) }}>{p.eyebrow}</Kicker>
                <div style={{ position: 'relative', width: k.stacked ? '84%' : '52%', height: k.u * (k.portrait ? 44 : 38), opacity: clamp01(rise * 2), transform: `translate(${Math.sin(since * 90) * shake * k.u * 0.7}px, ${(1 - rise) * k.u * 8 + shake * k.u * 0.8}px) scale(${0.94 + rise * 0.06})` }}>
                    <Win k={k} title="Pricing" width="100%" height="100%">
                        <Screen p={p} k={k} fallback={
                            <div style={{ padding: k.u * 3, display: 'flex', gap: k.u * 2, height: '100%' }}>
                                {PRICE_TILES.map((o, i) => (
                                    <div key={i} style={{ flex: 1, borderRadius: k.u, padding: k.u * 2, display: 'flex', flexDirection: 'column', gap: k.u * 1.4, background: i === 1 ? al(k.c.accent, 0.14) : al(k.c.muted, 0.1), border: `1px solid ${i === 1 ? k.c.accent : al(k.c.muted, 0.2)}` }}>
                                        {[40, 70, 55, 60].map((w, j) => <div key={j} style={{ height: k.u * (j === 1 ? 3.4 : 1.6), width: `${w}%`, borderRadius: k.u, background: j === 1 ? al(k.c.accent, 0.6 * o + 0.3) : al(k.c.muted, 0.3) }} />)}
                                    </div>
                                ))}
                            </div>
                        } />
                    </Win>
                    <div style={{ position: 'absolute', right: -size * 0.18, top: -size * 0.3, width: size, height: size, opacity: clamp01(since * 30), transform: `perspective(${size * 4}px) rotateX(${far * 60}deg) rotate(${-14 + far * 24 + wobble}deg) scale(${1 + far * 1.5})`, filter: `drop-shadow(0 ${k.u * (0.5 + far * 3)}px ${k.u * (1.5 + far * 4)}px ${al('#000000', 0.45 + far * 0.1)})` }}>
                        <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
                            <defs><linearGradient id="osl-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={k.c.text} stopOpacity="0.55" /><stop offset="0.4" stopColor={k.c.accent} /><stop offset="1" stopColor={k.c.accent} /></linearGradient></defs>
                            <polygon points={BURST_POINTS} fill="url(#osl-fill)" />
                            <circle cx="50" cy="50" r="33" fill="none" stroke={al(k.c.bg, 0.4)} strokeWidth="0.8" strokeDasharray="2.5 2.5" />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, clipPath: BURST_CLIP, backgroundImage: `linear-gradient(105deg, transparent 38%, ${al('#ffffff', 0.6)} 50%, transparent 62%)`, backgroundSize: '300% 100%', backgroundPosition: `${k.ramp(hit + 0.3, hit + 0.9, 100, 0)}% 0` }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: k.display, fontWeight: 900, color: k.c.bg, fontSize, lineHeight: 1, textTransform: 'uppercase', padding: size * 0.2, textShadow: `0 1px 0 ${al('#ffffff', 0.35)}` }}>{p.headline}</div>
                        <Impact k={k} t0={hit} r={26} n={12} seed={1} />
                    </div>
                </div>
                <Sub k={k} style={{ opacity: k.ramp(hit + 0.4, hit + 0.8), transform: `translateY(${(1 - k.ramp(hit + 0.4, hit + 0.8)) * k.u * 2}px)` }}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}
