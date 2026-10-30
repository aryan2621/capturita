import { grow } from './layout';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
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
export const CURSOR_CLICK = 2.6;

/** A product walkthrough without a recording: a card fills in, a cursor glides to the button and clicks, and the result appears. */
export function CursorDemo({ title, typed, button, result, transparent, brand }: CursorDemoProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const clickAt = CURSOR_CLICK * fps;

    const cardIn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
    const text = String(typed ?? '');
    const typedChars = Math.floor(interpolate(frame, [fps * 0.6, fps * 1.7], [0, text.length], clamp));
    // The cursor eases from the lower right to the button; it presses for a few frames, then rests.
    const travel = interpolate(frame, [fps * 1.4, clickAt - 4], [0, 1], { ...clamp, easing: (t) => t * t * (3 - 2 * t) });
    const cardW = Math.min(width * 0.62, u * 70);
    const buttonX = cardW * 0.5; // centre of the button, from the card's left edge
    const buttonY = u * 27.5;
    const cursorX = buttonX + (1 - travel) * cardW * 0.55;
    const cursorY = buttonY + (1 - travel) * u * 22;
    const pressed = frame >= clickAt && frame < clickAt + 6;
    const done = spring({ frame: frame - clickAt - 4, fps, config: { damping: 14, stiffness: 140 } });
    const ripple = interpolate(frame, [clickAt, clickAt + 14], [0, 1], clamp);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: cardW, padding: u * 3.5, borderRadius: u * 2, background: colors.surface, border: `${u * 0.2}px solid ${colors.muted}44`, boxShadow: `0 ${u * 3}px ${u * 8}px #0006`, opacity: cardIn, transform: `translateY(${(1 - cardIn) * u * 3}px) scale(${0.96 + cardIn * 0.04})`, boxSizing: 'border-box', height: u * 46 }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: u * 3.6, fontWeight: 800, color: colors.text }}>{title}</div>
                    <div style={{ marginTop: u * 2.4, padding: `${u * 1.4}px ${u * 1.8}px`, borderRadius: u, background: colors.bg, border: `${u * 0.2}px solid ${colors.muted}55`, fontSize: u * 2.4, color: colors.text, minHeight: u * 3.4 }}>
                        {text.slice(0, typedChars)}
                        {typedChars < text.length && <span style={{ color: colors.accent }}>|</span>}
                    </div>
                    <div style={{ position: 'absolute', left: buttonX - u * 11, top: buttonY - u * 3, width: u * 22, height: u * 6, borderRadius: u * 1.2, background: colors.accent, color: colors.bg, fontSize: u * 2.4, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${pressed ? 0.94 : 1})`, boxShadow: `0 0 ${u * 3 * ripple}px ${colors.accent}88` }}>
                        {button}
                    </div>
                    {frame >= clickAt && <div style={{ position: 'absolute', left: buttonX - u * 3 - u * 6 * ripple, top: buttonY - u * 3 - u * 6 * ripple, width: u * 6 + u * 12 * ripple, height: u * 6 + u * 12 * ripple, borderRadius: '50%', border: `${u * 0.3}px solid ${colors.accent}`, opacity: 1 - ripple }} />}
                    <div style={{ position: 'absolute', left: u * 3.5, right: u * 3.5, bottom: u * 3, padding: `${u * 1.2}px ${u * 1.6}px`, borderRadius: u, background: `${colors.accent}22`, color: colors.text, fontSize: u * 2.2, opacity: done, transform: `translateY(${(1 - done) * u * 2}px)` }}>
                        ✓ {result}
                    </div>
                    <svg width={u * 4} height={u * 4} viewBox="0 0 24 24" style={{ position: 'absolute', left: cursorX, top: cursorY, filter: `drop-shadow(0 ${u * 0.3}px ${u * 0.5}px #0008)` }}>
                        <path d="M4 2l15 9-6.5 1.6L9 19z" fill={colors.text} stroke={colors.bg} strokeWidth={1.4} strokeLinejoin="round" />
                    </svg>
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
