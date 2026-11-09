import { AbsoluteFill, interpolate, random } from 'remotion';
import { useVideoConfig } from './clock';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { ElementView } from './elements';
import { Cursor, Landing, Lights, Ring, Sweep, cursorAt, easeOut, useTiming } from './deviceParts';
import { bodyFont, displayFont, type Brand } from './assets';

export interface UiCardProps {
    /** The window's title. */
    title: string;
    toggles: { text: string }[];
    rows: { text: string }[];
    toast: string;
    transparent?: boolean;
    brand: Brand;
}

// The window is laid out once in this fixed space and scaled to fit the frame, so the cursor can aim at exact spots.
const W = 900;
const BAR = 56;
const PAD = 32;
const TOGGLE = 76;
const ROW = 64;
const SPARK = 110;
const GAP = 24;
const SWITCH = { w: 60, h: 32, thumb: 24 };
/** Frame the cursor clicks toggle `i`. */
const FLIP = (i: number) => 20 + i * 13;

const mono = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const items = (list: { text?: string }[] | undefined, max: number) =>
    (Array.isArray(list) ? list : []).map((i) => String(i?.text ?? '').trim()).filter(Boolean).slice(0, max);

/** Seconds until the last toggle flips, for a sound on the click. */
export function uiCardBeat({ toggles }: { toggles?: { text?: string }[] }) {
    return (FLIP(Math.max(0, items(toggles, 3).length - 1)) + 4) / 30;
}

/** A switch whose thumb overshoots as `on` springs 0 → 1, glowing in the accent once on. */
function Switch({ on, accent, muted }: { on: number; accent: string; muted: string }) {
    const lit = Math.min(1, on);
    return (
        <div style={{ position: 'relative', marginLeft: 'auto', width: SWITCH.w, height: SWITCH.h, borderRadius: SWITCH.h / 2, background: `${muted}55`, boxShadow: `0 0 ${18 * lit}px ${accent}99` }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: SWITCH.h / 2, background: accent, opacity: lit }} />
            <div style={{ position: 'absolute', top: 4, left: 4 + on * (SWITCH.w - SWITCH.thumb - 8), width: SWITCH.thumb, height: SWITCH.thumb, borderRadius: SWITCH.thumb / 2, background: '#fff', boxShadow: '0 2px 6px #0005' }} />
        </div>
    );
}

/** A trend line from seeded numbers (the same title always draws the same line) that draws itself in over an accent fill, ending on a pulsing dot. */
function Sparkline({ seed, draw, accent }: { seed: string; draw: number; accent: string }) {
    const w = W - PAD * 2;
    const pts = Array.from({ length: 9 }, (_, i) => ({ x: (i / 8) * w, y: SPARK - 14 - (0.25 + 0.55 * (i / 8) + (random(`${seed}-${i}`) - 0.5) * 0.3) * (SPARK - 28) }));
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
    const end = pts[pts.length - 1];
    return (
        <svg width={w} height={SPARK} style={{ position: 'absolute', left: PAD, top: 0, overflow: 'visible' }}>
            <defs>
                <linearGradient id='uc-fill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0' stopColor={accent} stopOpacity='0.35' />
                    <stop offset='1' stopColor={accent} stopOpacity='0' />
                </linearGradient>
            </defs>
            <path d={`${line}L${w} ${SPARK}L0 ${SPARK}Z`} fill='url(#uc-fill)' opacity={draw} />
            <path d={line} fill='none' stroke={accent} strokeWidth={4} strokeLinecap='round' strokeLinejoin='round' pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />
            {draw >= 1 && <circle cx={end.x} cy={end.y} r={7} fill={accent} />}
        </svg>
    );
}

/**
 * A synthetic app window built only from the user's own feature text (toggles, list rows, a small
 * trend line and a toast) with a cursor that clicks through it. It is generic UI, not any real
 * product's screen, and says so in the title bar.
 */
export function UiCard({ title, toggles, rows, toast, transparent, brand }: UiCardProps) {
    const { frame, pop, glide, ramp } = useTiming();
    const { width, height } = useVideoConfig();
    const { colors } = brand;
    const exit = useExit();
    const switches = items(toggles, 3);
    const list = items(rows, 3);

    const toggleTop = BAR + PAD;
    const sparkTop = toggleTop + switches.length * TOGGLE + GAP;
    const rowTop = sparkTop + SPARK + GAP;
    const H = rowTop + list.length * ROW + PAD;
    const scale = Math.min((width * (height > width ? 0.9 : 0.66)) / W, (height * 0.74) / H);

    const lastFlip = FLIP(Math.max(0, switches.length - 1));
    const toastAt = lastFlip + 6;

    // The cursor comes in from the corner, clicks each switch in turn, then picks the first row.
    const switchAt = (i: number) => ({ x: W - PAD - SWITCH.w / 2, y: toggleTop + i * TOGGLE + TOGGLE / 2 });
    const pointer = cursorAt(frame, [
        { t: 2, x: W * 0.95, y: H * 1.02 },
        ...switches.map((_, i) => ({ t: FLIP(i) - 2, ...switchAt(i) })),
        ...(list.length ? [{ t: lastFlip + 20, x: W * 0.42, y: rowTop + ROW / 2 }] : []),
    ]);
    const pressed = switches.some((_, i) => frame >= FLIP(i) - 2 && frame < FLIP(i) + 4);
    const picked = glide(lastFlip + 22);

    const text = { fontFamily: bodyFont(brand), fontSize: 30, color: colors.text, lineHeight: 1.2 } as const;
    const line = `1px solid ${colors.muted}33`;
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Landing brand={brand} u={Math.min(width, height) / 100} outerH={H * scale}>
                    <div style={{ width: W, height: H, transform: `scale(${scale})`, position: 'relative', flex: 'none' }}>
                        <div style={{ position: 'absolute', inset: 0, background: colors.surface, borderRadius: 24, border: line, boxShadow: `0 40px 90px #0007, 0 0 0 1px #ffffff10 inset, 0 0 ${60 * pop(lastFlip)}px ${colors.accent}33`, overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #ffffff0d, transparent 30%)' }} />
                            <div style={{ position: 'relative', height: BAR, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${PAD - 8}px`, borderBottom: line }}>
                                <Lights size={12} muted={`${colors.muted}66`} />
                                <div style={{ ...text, fontFamily: displayFont(brand), fontWeight: 700, marginLeft: 12 }}>{mono(String(title ?? ''), 26)}</div>
                                <div style={{ ...text, fontSize: 20, color: colors.muted, marginLeft: 'auto' }}>Illustration</div>
                            </div>
                            {switches.map((label, i) => {
                                const row = glide(4 + i * 3);
                                return (
                                    <div key={i} style={{ position: 'absolute', left: PAD, right: PAD, top: toggleTop + i * TOGGLE, height: TOGGLE, display: 'flex', alignItems: 'center', opacity: row, transform: `translateY(${(1 - row) * 24}px)` }}>
                                        <div style={text}>{mono(label, 26)}</div>
                                        <Switch on={pop(FLIP(i))} accent={colors.accent} muted={colors.muted} />
                                    </div>
                                );
                            })}
                            <div style={{ position: 'absolute', left: 0, top: sparkTop }}>
                                <Sparkline seed={String(title ?? '')} draw={ramp(8, 34, easeOut)} accent={colors.accent} />
                            </div>
                            {list.map((label, i) => {
                                const row = glide(12 + i * 3);
                                const first = i === 0;
                                return (
                                    <div key={i} style={{ position: 'absolute', left: PAD, right: PAD, top: rowTop + i * ROW, height: ROW, display: 'flex', alignItems: 'center', gap: 16, borderTop: line, opacity: row, transform: `translateY(${(1 - row) * 24}px)` }}>
                                        <div style={{ position: 'absolute', inset: '0 -12px', borderRadius: 12, background: `${colors.accent}1f`, opacity: first ? picked : 0 }} />
                                        <div style={{ position: 'relative', width: 14, height: 14, borderRadius: 7, background: first ? colors.accent : `${colors.muted}88` }} />
                                        <div style={{ ...text, position: 'relative' }}>{mono(label, 32)}</div>
                                    </div>
                                );
                            })}
                            <Sweep t={ramp(6, 28, (x) => x)} strength={0.12} />
                        </div>
                        {switches.map((_, i) => <Ring key={i} {...switchAt(i)} r0={14} r1={64} t={ramp(FLIP(i), FLIP(i) + 16)} color={colors.accent} width={5} />)}
                        {toast.trim() && <Toast text={mono(toast.trim(), 24)} at={toastAt} brand={brand} />}
                        {switches.length > 0 && <Cursor {...pointer} size={44} press={pressed ? 1 : 0} opacity={interpolate(frame, [1, 5], [0, 1], clamp)} />}
                    </div>
                </Landing>
            </Depth>
        </AbsoluteFill>
    );
}

/** The confirmation toast hanging off the window's corner. */
function Toast({ text, at, brand }: { text: string; at: number; brand: Brand }) {
    const { frame, fps, pop } = useTiming();
    const { colors } = brand;
    const p = pop(at);
    return (
        <div style={{ position: 'absolute', right: -24, bottom: -28, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px 14px 16px', borderRadius: 16, background: colors.text, boxShadow: `0 16px 40px #0006, 0 0 36px ${colors.accent}55`, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`, fontFamily: bodyFont(brand), fontSize: 30, lineHeight: 1.2, fontWeight: 600 }}>
            <div style={{ width: 28, height: 28 }}>
                <ElementView element='check' color={colors.accent} colors={colors} local={frame - at} fps={fps} width={28} height={28} />
            </div>
            <span style={{ color: colors.bg }}>{text}</span>
        </div>
    );
}
