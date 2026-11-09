import { Easing, interpolate } from 'remotion';
import { clamp } from './SceneBase';
import { Aura, Hit, Stage, al, card, easeOutQuart, glow, hitFlash, inkGradient, shortSide, useHero, Sheen, type Kit } from './hero';
import { ElementView } from './elements';
import { fitSize } from './text';
import { SceneImage } from './SceneBase';
import { type Brand, type SceneAssets } from './assets';
import { easeInOutCubic as inOut } from '../../lib/math';

// The Animation tab: pieces that are mostly motion, made to sit over the video (or on a plain background as a scene).
// Everything springs in with a little overshoot and then holds still: no endless bobbing.

const FRAME = 1 / 30;
const ALIGN = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

/** Where the content sits in the frame, keeping inside the safe margins. */
const Placed = ({ k, justify, align = 'center', children }: { k: Kit; justify: string; align?: string; children: React.ReactNode }) => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: justify, alignItems: align, padding: `${k.height * (k.portrait ? 0.07 : 0.06)}px ${k.width * (k.portrait ? 0.08 : 0.06)}px` }}>{children}</div>
);

// ---------- Text ----------

type TextStyle = 'words' | 'letters' | 'typewriter' | 'blur' | 'rise' | 'wipe' | 'highlight';

export interface TextAnimationProps {
    text: string;
    style: TextStyle;
    size: 's' | 'm' | 'l';
    position: keyof typeof ALIGN;
    color: string;
    transparent?: boolean;
    brand: Brand;
}

const FIRST = 2; // frames before the first thing moves
const WORD_STEP = 3;
const LETTER_STEP = 0.8;
const TYPE_STEP = 1.2;
const SETTLE = 10; // frames a word or letter takes to land

/** Seconds until the text has fully landed, for a sound. */
export const textAnimationBeat = (props: Record<string, unknown>) => {
    const text = String(props.text ?? '');
    const words = text.split(/\s+/).filter(Boolean).length;
    switch (props.style) {
        case 'typewriter': return (FIRST + 1 + text.length * TYPE_STEP) / 30;
        case 'letters': return (FIRST + text.length * LETTER_STEP + SETTLE) / 30;
        case 'wipe': return 0.6;
        case 'highlight': return 0.8;
        default: return (FIRST + Math.max(0, words - 1) * WORD_STEP + SETTLE) / 30;
    }
};

/** Text that animates in by word, letter, typing, blur, mask-rise, wipe or a highlighter. */
export function TextAnimation({ text, style, size, position, color, transparent, brand }: TextAnimationProps) {
    const { p, k } = useHero(brand, transparent);
    const { colors } = brand;
    const ink = color || colors.text;
    const innerW = k.width * (k.portrait ? 0.84 : 0.88);
    const content = (text ?? '').trim() || 'Your text';
    const fontSize = fitSize(content, innerW, brand.fonts.display, k.tx * (size === 's' ? 5 : size === 'l' ? 12 : 8));
    const words = content.split(/\s+/);
    const at = (frames: number) => frames / k.fps; // seconds, for k.pop
    const common = { fontFamily: k.display, fontSize, fontWeight: 800, lineHeight: 1.12, color: ink, textAlign: 'center' as const, maxWidth: innerW, letterSpacing: -fontSize * 0.015 };
    const gap = fontSize * 0.28;
    const hit = hitFlash(k, textAnimationBeat({ text, style }));

    const wordsView = ({ mask, blur }: { mask?: boolean; blur?: boolean }) => (
        <div style={common}>
            {words.map((word, w) => {
                const t = k.pop(at(FIRST + w * WORD_STEP), 14);
                if (mask) {
                    return (
                        <span key={w} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', marginRight: gap, padding: `${fontSize * 0.04}px 0 ${fontSize * 0.14}px` }}>
                            <span style={{ display: 'inline-block', transform: `translateY(${(1 - t) * 110}%)` }}>{word}</span>
                        </span>
                    );
                }
                return <span key={w} style={{ display: 'inline-block', marginRight: gap, opacity: Math.min(1, t * 1.6), transform: `translateY(${(1 - t) * fontSize * 0.4}px) scale(${0.92 + 0.08 * t})`, filter: blur ? `blur(${Math.max(0, 1 - t) * fontSize * 0.22}px)` : undefined }}>{word}</span>;
            })}
        </div>
    );

    const letters = () => {
        let index = 0;
        return (
            <div style={common}>
                {words.map((word, w) => (
                    <span key={w} style={{ display: 'inline-block', whiteSpace: 'nowrap', marginRight: gap }}>
                        {[...word].map((char, c) => {
                            const t = k.pop(at(FIRST + index++ * LETTER_STEP), 12);
                            return <span key={c} style={{ display: 'inline-block', opacity: Math.min(1, t * 2), transform: `translateY(${(1 - t) * fontSize * 0.55}px) rotate(${(1 - t) * 8}deg)` }}>{char}</span>;
                        })}
                    </span>
                ))}
            </div>
        );
    };

    const typewriter = () => {
        const shown = Math.min(content.length, Math.max(0, Math.floor((k.frame - FIRST - 1) / TYPE_STEP)));
        const typing = shown < content.length;
        const caret = typing || Math.floor(k.frame / 15) % 2 === 0;
        return (
            <div style={{ ...common, whiteSpace: 'pre-wrap' }}>
                {content.slice(0, shown)}
                <span style={{ opacity: 0 }}>{content.slice(shown)}</span>
                <span style={{ position: 'absolute', display: 'inline-block', width: fontSize * 0.07, height: fontSize * 0.9, marginLeft: fontSize * 0.06, borderRadius: fontSize * 0.03, background: colors.accent, opacity: caret ? 1 : 0, transform: `translateY(${fontSize * 0.1}px)`, ...glow(k, colors.accent, 1.2) }} />
            </div>
        );
    };

    const wipe = () => {
        const t = interpolate(k.frame, [FIRST, FIRST + 16], [0, 1], { ...clamp, easing: inOut });
        return (
            <div style={{ position: 'relative' }}>
                <div style={{ ...common, clipPath: `inset(-10% ${(1 - t) * 100}% -10% 0)`, transform: `translateX(${(1 - t) * -fontSize * 0.4}px)` }}>{content}</div>
                {t > 0 && t < 1 && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${t * 100}%`, width: fontSize * 0.07, marginLeft: -fontSize * 0.4 * (1 - t), borderRadius: fontSize, background: colors.accent, ...glow(k, colors.accent, 1.6) }} />}
            </div>
        );
    };

    // Highlighter: the words settle, then a marker swipes under them.
    const highlight = () => {
        const settle = k.pop(at(FIRST), 14);
        const mark = interpolate(k.frame, [10, 24], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        return (
            <div style={{ ...common, opacity: Math.min(1, settle * 1.6), transform: `translateY(${(1 - settle) * fontSize * 0.3}px)` }}>
                <span style={{ backgroundImage: `linear-gradient(${al(colors.accent, 0.55)}, ${al(colors.accent, 0.55)})`, backgroundRepeat: 'no-repeat', backgroundPosition: '0 88%', backgroundSize: `${mark * 100}% 42%`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: `0 ${fontSize * 0.1}px` }}>{content}</span>
            </div>
        );
    };

    const bodies = { typewriter, letters, blur: () => wordsView({ blur: true }), words: () => wordsView({}), rise: () => wordsView({ mask: true }), wipe, highlight };
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.7} a={(transparent ? 0 : 0.12) + hit * 0.16} scale={k.pop(0, 16)} />
            <Placed k={k} justify={ALIGN[position] ?? 'center'}>{(bodies[style] ?? highlight)()}</Placed>
        </Stage>
    );
}

// ---------- Image ----------

type ImageStyle = 'rise' | 'fade' | 'reveal' | 'slide';

export interface ImageAnimationProps {
    image: string;
    style: ImageStyle;
    frame: 'card' | 'none';
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** A picture you add that comes in with a rise, fade, wipe or slide, lands with a sheen and rests on a soft shadow (no zooming or tilting). */
export function ImageAnimation({ image, style, frame: framing, transparent, brand, assets }: ImageAnimationProps) {
    const { p, k } = useHero(brand, transparent);
    const u = k.u;
    const card_ = framing === 'card';
    const boxW = Math.min(k.width * (1 - (k.portrait ? 0.16 : 0.12)), k.height * 0.75 * (16 / 10) * (k.stacked ? 0.9 : 1));
    const boxH = Math.min(k.height * (1 - (k.portrait ? 0.14 : 0.12)), boxW * 0.625);
    const t = k.pop(FRAME * 2, 15);
    const radius = card_ ? u * 2.2 : 0;
    const wipe = interpolate(k.frame, [2, 16], [0, 1], { ...clamp, easing: inOut });
    const enter = {
        fade: { opacity: Math.min(1, t * 1.4) },
        reveal: { clipPath: wipe < 1 ? `inset(0 ${(1 - wipe) * 100}% 0 0 round ${radius}px)` : undefined },
        slide: { opacity: Math.min(1, t * 2), transform: `translateX(${(1 - t) * k.width * 0.25}px)` },
        rise: { opacity: Math.min(1, t * 1.6), transform: `translateY(${(1 - t) * boxH * 0.18}px) scale(${0.96 + 0.04 * t})` },
    }[style] ?? {};
    const hit = hitFlash(k, 0.35);

    return (
        <Stage p={p}>
            {card_ && <Aura k={k} x={k.width / 2} y={k.height / 2} r={boxW * 0.65} a={0.16 + hit * 0.14} scale={t} />}
            <div style={{ position: 'relative', width: boxW, height: boxH, ...enter }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', ...(card_ ? card(k, { background: k.c.surface, borderRadius: radius, boxShadow: `0 ${u * 2.5}px ${u * 8}px ${al(k.c.bg, 0.75)}, 0 0 ${u * 5}px ${al(k.c.accent, 0.15 + hit * 0.25)}` }) : {}) }}>
                    <SceneImage src={image} assets={assets} brand={brand} fit={card_ ? 'cover' : 'contain'} style={{ width: '100%', height: '100%' }} />
                    {card_ && <Sheen k={k} from={0.2} />}
                </div>
            </div>
        </Stage>
    );
}

// ---------- Element ----------

export interface ElementAnimationProps {
    element: string;
    color: string;
    size: 's' | 'm' | 'l';
    position: 'center' | 'top' | 'bottom' | 'left' | 'right';
    transparent?: boolean;
    brand: Brand;
}

const PLACE = { center: ['center', 'center'], top: ['flex-start', 'center'], bottom: ['flex-end', 'center'], left: ['center', 'flex-start'], right: ['center', 'flex-end'] } as const;
const WIDE = ['underline', 'arrow', 'ring'];

/** One of the built-in animated elements (check, arrow, underline, ring, sparkles, burst, confetti) on its own. */
export function ElementAnimation({ element, color, size, position, transparent, brand }: ElementAnimationProps) {
    const { p, k } = useHero(brand, transparent);
    const side = shortSide(k) * (size === 's' ? 0.22 : size === 'l' ? 0.62 : 0.4);
    const wide = WIDE.includes(element);
    const box = { width: wide ? side * 1.6 : side, height: wide ? side * (element === 'underline' ? 0.25 : 0.8) : side };
    const [justify, align] = PLACE[position] ?? PLACE.center;
    return (
        <Stage p={p}>
            <Placed k={k} justify={justify} align={align}>
                <div style={{ position: 'relative', ...box }}>
                    <div style={{ position: 'absolute', left: '50%', top: '50%', width: box.width * 1.6, height: box.width * 1.6, marginLeft: -box.width * 0.8, marginTop: -box.width * 0.8, borderRadius: '50%', background: `radial-gradient(circle, ${al(color || brand.colors.accent, transparent ? 0 : 0.16)}, transparent 65%)`, transform: `scale(${k.pop(0, 16)})` }} />
                    <ElementView element={element} color={color || brand.colors.accent} colors={brand.colors} local={k.frame - 2} fps={k.fps} width={box.width} height={box.height} />
                </div>
            </Placed>
        </Stage>
    );
}

// ---------- Progress ----------

export interface ProgressAnimationProps {
    style: 'ring' | 'bar';
    value: number;
    label: string;
    transparent?: boolean;
    brand: Brand;
}

/** Seconds the fill takes: the number lands, flashes and throws sparks at this moment. */
export const PROGRESS_BEAT = 1.2;
const FILL_FROM = 0.1;

/** A ring or bar that fills to a value while the number counts up with it, ending with a flash, a ring and sparks. */
export function ProgressAnimation({ style, value, label, transparent, brand }: ProgressAnimationProps) {
    const { p, k } = useHero(brand, transparent);
    const u = k.u;
    const target = Math.max(0, Math.min(100, Number(value) || 0));
    const fill = easeOutQuart(k.ramp(FILL_FROM, PROGRESS_BEAT));
    const hit = hitFlash(k, PROGRESS_BEAT);
    const rise = k.pop(0, 14);
    const figure = (size: number) => (
        <div style={{ filter: `drop-shadow(0 0 ${size * (0.1 + hit * 0.25)}px ${al(k.c.accent, 0.4 + hit * 0.4)})`, transform: `scale(${1 + hit * 0.07})` }}>
            <span style={{ ...inkGradient(k), fontFamily: k.display, fontSize: size, fontWeight: 800, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{Math.round(target * fill)}<span style={{ WebkitTextFillColor: k.c.accent }}>%</span></span>
        </div>
    );
    const caption = label ? <div style={{ color: k.c.muted, fontSize: u * 3 * (k.stacked ? 1.15 : 1), fontWeight: 600, marginTop: u * 3, textAlign: 'center', opacity: k.pop(0.15, 14) }}>{label}</div> : null;

    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.65} a={0.16 + hit * 0.2} scale={rise} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: Math.min(1, rise * 2), transform: `translateY(${(1 - rise) * u * 3}px)` }}>
                {style === 'bar' ? <Bar k={k} target={target} fill={fill} number={figure(u * 12)} /> : <Ring k={k} target={target} fill={fill} number={figure} />}
                {caption}
            </div>
        </Stage>
    );
}

function Ring({ k, target, fill, number }: { k: Kit; target: number; fill: number; number: (size: number) => React.ReactNode }) {
    const D = Math.min(k.width * 0.7, k.height * 0.62) * 0.78;
    const [c, R] = [D / 2, D * 0.43];
    const angle = -Math.PI / 2 + (target / 100) * fill * Math.PI * 2;
    const head: [number, number] = [c + Math.cos(angle) * R, c + Math.sin(angle) * R];
    return (
        <div style={{ position: 'relative', width: D, height: D }}>
            <svg width={D} height={D} viewBox={`0 0 ${D} ${D}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <defs>
                    <linearGradient id="pr-arc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={k.c.accent} stopOpacity="0.6" /><stop offset="1" stopColor={k.c.accent} /></linearGradient>
                </defs>
                {Array.from({ length: 60 }, (_, i) => {
                    const a = -Math.PI / 2 + (i / 60) * Math.PI * 2;
                    const lit = i / 60 <= (target / 100) * fill;
                    return <line key={i} x1={c + Math.cos(a) * R * 1.12} y1={c + Math.sin(a) * R * 1.12} x2={c + Math.cos(a) * R * (i % 5 ? 1.17 : 1.22)} y2={c + Math.sin(a) * R * (i % 5 ? 1.17 : 1.22)} stroke={lit ? k.c.accent : al(k.c.muted, 0.3)} strokeWidth={k.u * 0.2} strokeLinecap="round" />;
                })}
                <circle cx={c} cy={c} r={R} fill="none" stroke={al(k.c.muted, 0.2)} strokeWidth={D * 0.07} />
                <g style={glow(k, k.c.accent, 2.4)}>
                    <circle cx={c} cy={c} r={R} fill="none" stroke="url(#pr-arc)" strokeWidth={D * 0.07} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (target / 100) * fill} transform={`rotate(-90 ${c} ${c})`} />
                    {fill > 0.01 && <circle cx={head[0]} cy={head[1]} r={D * 0.045} fill={k.c.text} />}
                </g>
            </svg>
            <Hit k={k} name="ProgressRing" x={head[0]} y={head[1]} t0={PROGRESS_BEAT} size={D * 0.2} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{number(D * 0.17)}</div>
        </div>
    );
}

function Bar({ k, target, fill, number }: { k: Kit; target: number; fill: number; number: React.ReactNode }) {
    const w = Math.min(k.width * 0.7, k.u * 110);
    const h = k.u * 3;
    const x = (target / 100) * fill * w;
    return (
        <div style={{ width: w }}>
            <div style={{ textAlign: 'center', marginBottom: k.u * 3 }}>{number}</div>
            <div style={{ position: 'relative', height: h, borderRadius: h, background: al(k.c.muted, 0.18) }}>
                <div style={{ width: x, height: '100%', borderRadius: h, background: `linear-gradient(90deg, ${al(k.c.accent, 0.45)}, ${k.c.accent})`, ...glow(k, k.c.accent, 1.8) }} />
                {fill > 0.01 && <div style={{ position: 'absolute', left: x, top: '50%', width: h * 1.5, height: h * 1.5, marginLeft: -h * 0.75, marginTop: -h * 0.75, borderRadius: '50%', background: k.c.text, boxShadow: `0 0 ${h}px ${k.c.accent}` }} />}
                <Hit k={k} name="ProgressBar" x={x} y={h / 2} t0={PROGRESS_BEAT} size={h * 4} />
            </div>
        </div>
    );
}
