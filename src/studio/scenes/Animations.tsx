import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, SceneImage, sceneGradient, useExit } from './SceneBase';
import { ElementView } from './elements';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

// The Animation tab: pieces that are mostly motion, made to sit over the video (or on a plain background as a scene).
// Everything eases or springs without overshoot-wobble and nothing moves after it lands: no endless bobbing.

const ease = Easing.out(Easing.cubic);
const smooth = { damping: 200 } as const;
const ALIGN = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

/** The scene's own background (none when it is drawn over the video). */
function Backdrop({ brand, transparent }: { brand: Brand; transparent?: boolean }) {
    return <BrandTexture brand={brand} transparent={transparent} />;
}

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

/** Seconds until the text has fully landed, for a sound. */
export const textAnimationBeat = (props: Record<string, unknown>) => {
    const length = String(props.text ?? '').length;
    const words = String(props.text ?? '').split(/\s+/).filter(Boolean).length;
    switch (props.style) {
        case 'typewriter': return (6 + length * 1.6) / 30;
        case 'letters': return (6 + length * 1.1 + 14) / 30;
        case 'wipe':
        case 'highlight': return 1;
        default: return (4 + words * 4 + 14) / 30;
    }
};

/** Text that animates in by word, letter, typing, blur, mask-rise, wipe or a highlighter. */
export function TextAnimation({ text, style, size, position, color, transparent, brand }: TextAnimationProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const exit = useExit();
    const { colors } = brand;
    const ink = color || colors.text;
    const innerW = width - layout.safeX * 2;
    const base = layout.text * (size === 's' ? 5 : size === 'l' ? 12 : 8);
    const content = (text ?? '').trim() || 'Your text';
    const fontSize = fitSize(content, innerW, brand.fonts.display, base);
    const words = content.split(/\s+/);
    const chars = content.length;
    const common = { fontFamily: displayFont(brand), fontSize, fontWeight: 800, lineHeight: 1.12, color: ink, textAlign: 'center' as const, maxWidth: innerW };

    let body;
    switch (style) {
        case 'typewriter': {
            const shown = Math.min(chars, Math.max(0, Math.floor((frame - 6) / 1.6)));
            const typing = shown < chars;
            const caret = typing || Math.floor(frame / 15) % 2 === 0;
            body = (
                <div style={{ ...common, whiteSpace: 'pre-wrap' }}>
                    {content.slice(0, shown)}
                    <span style={{ opacity: 0 }}>{content.slice(shown)}</span>
                    <span style={{ position: 'absolute', display: 'inline-block', width: fontSize * 0.06, height: fontSize * 0.9, marginLeft: fontSize * 0.06, background: colors.accent, opacity: caret ? 1 : 0, transform: `translateY(${fontSize * 0.1}px)` }} />
                </div>
            );
            break;
        }
        case 'letters': {
            let index = 0;
            body = (
                <div style={common}>
                    {words.map((word, w) => (
                        <span key={w} style={{ display: 'inline-block', whiteSpace: 'nowrap', marginRight: fontSize * 0.28 }}>
                            {[...word].map((char, c) => {
                                const p = spring({ frame: frame - 6 - index++ * 1.1, fps, config: { damping: 18, stiffness: 170 } });
                                return <span key={c} style={{ display: 'inline-block', opacity: interpolate(p, [0, 0.5], [0, 1], clamp), transform: `translateY(${(1 - p) * fontSize * 0.5}px)` }}>{char}</span>;
                            })}
                        </span>
                    ))}
                </div>
            );
            break;
        }
        case 'blur':
        case 'words': {
            body = (
                <div style={common}>
                    {words.map((word, w) => {
                        const p = spring({ frame: frame - 4 - w * 4, fps, config: smooth });
                        return (
                            <span key={w} style={{ display: 'inline-block', marginRight: fontSize * 0.28, opacity: p, transform: `translateY(${(1 - p) * fontSize * 0.35}px)`, filter: style === 'blur' ? `blur(${(1 - p) * fontSize * 0.2}px)` : undefined }}>{word}</span>
                        );
                    })}
                </div>
            );
            break;
        }
        case 'rise':
            body = (
                <div style={common}>
                    {words.map((word, w) => {
                        const p = spring({ frame: frame - 4 - w * 4, fps, config: smooth });
                        return (
                            <span key={w} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', marginRight: fontSize * 0.28, paddingBottom: fontSize * 0.12 }}>
                                <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)` }}>{word}</span>
                            </span>
                        );
                    })}
                </div>
            );
            break;
        case 'wipe': {
            const p = interpolate(frame, [4, 24], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
            body = (
                <div style={{ ...common, clipPath: `inset(-10% ${(1 - p) * 100}% -10% 0)`, transform: `translateX(${(1 - p) * -fontSize * 0.4}px)` }}>{content}</div>
            );
            break;
        }
        default: {
            // Highlighter: the words settle, then a marker swipes under them.
            const settle = spring({ frame: frame - 3, fps, config: smooth });
            const mark = interpolate(frame, [14, 32], [0, 1], { ...clamp, easing: ease });
            body = (
                <div style={{ ...common, opacity: settle, transform: `translateY(${(1 - settle) * fontSize * 0.3}px)` }}>
                    <span style={{ backgroundImage: `linear-gradient(${colors.accent}88, ${colors.accent}88)`, backgroundRepeat: 'no-repeat', backgroundPosition: '0 88%', backgroundSize: `${mark * 100}% 42%`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: `0 ${fontSize * 0.1}px` }}>{content}</span>
                </div>
            );
        }
    }
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), justifyContent: ALIGN[position] ?? 'center', alignItems: 'center', padding: `${layout.safeY}px ${layout.safeX}px`, opacity: exit, fontFamily: bodyFont(brand) }}>
            <Backdrop brand={brand} transparent={transparent} />
            {body}
        </AbsoluteFill>
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

/** A picture you add that comes in with a rise, fade, wipe or slide (no zooming or tilting). */
export function ImageAnimation({ image, style, frame: framing, transparent, brand, assets }: ImageAnimationProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const exit = useExit();
    const { colors } = brand;
    const u = layout.unit;
    const boxW = Math.min(width - layout.safeX * 2, height * 0.75 * (16 / 10) * (layout.stacked ? 0.9 : 1));
    const boxH = Math.min(height - layout.safeY * 2, boxW * 0.625);
    const p = spring({ frame: frame - 4, fps, config: smooth });
    let transform = '';
    let opacity = 1;
    let clip: string | undefined;
    switch (style) {
        case 'fade':
            opacity = p;
            break;
        case 'reveal':
            clip = `inset(0 ${(1 - interpolate(frame, [4, 26], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })) * 100}% 0 0 round ${framing === 'card' ? u * 2.2 : 0}px)`;
            break;
        case 'slide':
            opacity = interpolate(p, [0, 0.6], [0, 1], clamp);
            transform = `translateX(${(1 - p) * width * 0.25}px)`;
            break;
        default:
            opacity = p;
            transform = `translateY(${(1 - p) * boxH * 0.18}px)`;
    }
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', opacity: exit }}>
            <Backdrop brand={brand} transparent={transparent} />
            <div style={{ width: boxW, height: boxH, opacity, transform, clipPath: clip, borderRadius: framing === 'card' ? u * 2.2 : 0, overflow: 'hidden', background: framing === 'card' ? colors.surface : 'transparent', border: framing === 'card' ? `1px solid ${colors.muted}33` : 'none', boxShadow: framing === 'card' ? `0 ${u * 2}px ${u * 7}px #0007` : 'none' }}>
                <SceneImage src={image} assets={assets} brand={brand} fit={framing === 'card' ? 'cover' : 'contain'} style={{ width: '100%', height: '100%' }} />
            </div>
        </AbsoluteFill>
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

const PLACE = { center: ['center', 'center'], top: ['center', 'flex-start'], bottom: ['center', 'flex-end'], left: ['flex-start', 'center'], right: ['flex-end', 'center'] } as const;

/** One of the built-in animated elements (check, arrow, underline, ring, sparkles, burst, confetti) on its own. */
export function ElementAnimation({ element, color, size, position, transparent, brand }: ElementAnimationProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const exit = useExit();
    const side = Math.min(width, height) * (size === 's' ? 0.22 : size === 'l' ? 0.62 : 0.4);
    const wide = element === 'underline' || element === 'arrow' || element === 'ring';
    const [justify, align] = PLACE[position] ?? PLACE.center;
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), justifyContent: justify, alignItems: align, padding: `${layout.safeY}px ${layout.safeX}px`, opacity: exit }}>
            <Backdrop brand={brand} transparent={transparent} />
            <div style={{ width: wide ? side * 1.6 : side, height: wide ? side * (element === 'underline' ? 0.25 : 0.8) : side }}>
                <ElementView element={element} color={color || brand.colors.accent} colors={brand.colors} local={frame - 4} fps={fps} width={wide ? side * 1.6 : side} height={wide ? side * (element === 'underline' ? 0.25 : 0.8) : side} />
            </div>
        </AbsoluteFill>
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

export const PROGRESS_BEAT = 1.6;

/** A ring or bar that fills to a value while the number counts up with it. */
export function ProgressAnimation({ style, value, label, transparent, brand }: ProgressAnimationProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const exit = useExit();
    const { colors } = brand;
    const u = layout.unit;
    const target = Math.max(0, Math.min(100, Number(value) || 0));
    const p = interpolate(frame, [6, 6 + PROGRESS_BEAT * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    const now = Math.round(target * p);
    const rise = spring({ frame: frame - 2, fps, config: smooth });
    const number = <span style={{ fontFamily: displayFont(brand), fontWeight: 800, color: colors.text, lineHeight: 1 }}>{now}<span style={{ color: colors.accent }}>%</span></span>;
    const caption = label ? <div style={{ color: colors.muted, fontSize: u * 3 * (layout.stacked ? 1.15 : 1), fontWeight: 600, marginTop: u * 2, textAlign: 'center' }}>{label}</div> : null;
    const diameter = Math.min(width * 0.7, height * 0.62);
    const r = 44;
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', opacity: exit, fontFamily: bodyFont(brand) }}>
            <Backdrop brand={brand} transparent={transparent} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: rise, transform: `translateY(${(1 - rise) * u * 3}px)` }}>
                {style === 'bar' ? (
                    <div style={{ width: Math.min(width * 0.7, u * 110) }}>
                        <div style={{ fontSize: u * 11, textAlign: 'center', marginBottom: u * 3 }}>{number}</div>
                        <div style={{ height: u * 2.4, borderRadius: 99, background: `${colors.muted}33`, overflow: 'hidden' }}>
                            <div style={{ width: `${target * p}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent}cc)`, boxShadow: `0 0 ${u * 3}px ${colors.accent}77` }} />
                        </div>
                        {caption}
                    </div>
                ) : (
                    <>
                        <div style={{ position: 'relative', width: diameter * 0.62, height: diameter * 0.62 }}>
                            <svg viewBox='0 0 100 100' style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <circle cx={50} cy={50} r={r} fill='none' stroke={`${colors.muted}33`} strokeWidth={7} />
                                <circle cx={50} cy={50} r={r} fill='none' stroke={colors.accent} strokeWidth={7} strokeLinecap='round' pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (target / 100) * p} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: diameter * 0.15 }}>{number}</div>
                        </div>
                        {caption}
                    </>
                )}
            </div>
        </AbsoluteFill>
    );
}

