import { AbsoluteFill } from 'remotion';
import { useVideoConfig } from './clock';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { grow } from './layout';
import { Cursor, Landing, Lights, Ring, Sweep, bowed, easeOut, inOut, useTiming } from './deviceParts';
import { bodyFont, displayFont, type Brand } from './assets';

export interface CursorDemoProps {
    /** The card's heading. */
    title: string;
    /** What gets typed into the field before the click. */
    typed: string;
    /** The button the cursor clicks. */
    button: string;
    /** The confirmation that appears after the click. */
    result: string;
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the click lands, for a sound. */
export const CURSOR_CLICK = 1.5;

/** Frames of typing, and the frame the cursor starts toward the button. */
const TYPING = [8, 30] as const;
const CURSOR_FROM = 18;

/** A product walkthrough without a recording: a card fills in, a cursor glides to the button and clicks, and the result appears. */
export function CursorDemo({ title, typed, button, result, transparent, brand }: CursorDemoProps) {
    const { fps, pop, glide, ramp } = useTiming();
    const { width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const clickAt = Math.round(CURSOR_CLICK * fps);

    const text = String(typed ?? '');
    const typing = ramp(TYPING[0], TYPING[1], (x) => x);
    const typedChars = Math.floor(typing * text.length);
    const cardW = Math.min(width * 0.62, u * 70);
    const cardH = u * 46;
    const buttonAt = { x: cardW * 0.5, y: u * 27.5 }; // centre of the button, from the card's top left
    const pointer = bowed({ x: buttonAt.x + cardW * 0.55, y: buttonAt.y + u * 22 }, { x: buttonAt.x + u * 3, y: buttonAt.y + u * 1.2 }, ramp(CURSOR_FROM, clickAt - 2, inOut), 0.2);
    const press = ramp(clickAt, clickAt + 3) * (1 - ramp(clickAt + 3, clickAt + 9));
    const burst = ramp(clickAt, clickAt + 18);
    const done = pop(clickAt + 2);
    const field = ramp(TYPING[0] - 2, TYPING[0] + 4) * (1 - ramp(TYPING[1] + 6, TYPING[1] + 14));

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Landing brand={brand} u={u} outerH={cardH}>
                    <div style={{ position: 'relative', width: cardW, height: cardH, padding: u * 3.5, paddingTop: u * 7, boxSizing: 'border-box', borderRadius: u * 2, background: colors.surface, border: `${u * 0.2}px solid ${colors.muted}44`, boxShadow: `0 ${u * 4}px ${u * 9}px #0007, 0 0 ${u * 6 * done}px ${colors.accent}44, 0 1px 0 #ffffff1a inset` }}>
                        <div style={{ position: 'absolute', left: u * 3.5, top: u * 2.4 }}><Lights size={u * 1.1} muted={`${colors.muted}77`} /></div>
                        <div style={{ fontFamily: displayFont(brand), fontSize: u * 3.6, fontWeight: 800, color: colors.text }}>{title}</div>
                        <div style={{ marginTop: u * 2.4, padding: `${u * 1.4}px ${u * 1.8}px`, borderRadius: u, background: colors.bg, border: `${u * 0.2}px solid ${field > 0 ? colors.accent : `${colors.muted}55`}`, boxShadow: `0 0 ${u * 2.4 * field}px ${colors.accent}66`, fontSize: u * 2.4, color: colors.text, minHeight: u * 3.4 }}>
                            {text.slice(0, typedChars)}
                            {typedChars < text.length && <span style={{ color: colors.accent }}>|</span>}
                        </div>
                        <div style={{ position: 'absolute', left: buttonAt.x - u * 11, top: buttonAt.y - u * 3, width: u * 22, height: u * 6, borderRadius: u * 1.2, background: colors.accent, color: colors.bg, fontSize: u * 2.4, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - press * 0.07})`, boxShadow: `0 ${u * 0.5 * (1 - press)}px ${u * 2.4}px ${colors.accent}${press > 0 || burst > 0 ? 'aa' : '55'}` }}>
                            {button}
                        </div>
                        <Ring x={buttonAt.x} y={buttonAt.y} r0={u * 3} r1={u * 14} t={burst} color={colors.accent} width={u * 0.5} />
                        <div style={{ position: 'absolute', left: u * 3.5, right: u * 3.5, bottom: u * 3, display: 'flex', alignItems: 'center', gap: u * 1.4, padding: `${u * 1.2}px ${u * 1.6}px`, borderRadius: u, background: `${colors.accent}22`, border: `1px solid ${colors.accent}55`, color: colors.text, fontSize: u * 2.2, opacity: Math.min(1, done * 2), transform: `translateY(${(1 - done) * u * 3}px) scale(${0.96 + 0.04 * done})` }}>
                            <svg width={u * 2.6} height={u * 2.6} viewBox='0 0 24 24' fill='none' stroke={colors.accent} strokeWidth={3.2} strokeLinecap='round' strokeLinejoin='round'>
                                <path d='M5 12.5l4.5 4.5L19 7.5' pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ramp(clickAt + 4, clickAt + 14, easeOut)} />
                            </svg>
                            {result}
                        </div>
                        <Sweep t={ramp(clickAt, clickAt + 22, (x) => x)} strength={0.12} />
                        <Cursor {...pointer} size={u * 4} press={press} opacity={glide(CURSOR_FROM - 6)} />
                    </div>
                </Landing>
            </Depth>
        </AbsoluteFill>
    );
}
