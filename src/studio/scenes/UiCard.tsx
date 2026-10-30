import { useBeatSnap } from './beat';
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { ElementView } from './elements';
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
const FLIP = (i: number) => 44 + i * 22;

const mono = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const items = (list: { text?: string }[] | undefined, max: number) =>
    (Array.isArray(list) ? list : []).map((i) => String(i?.text ?? '').trim()).filter(Boolean).slice(0, max);

/** Seconds until the last toggle flips, for a sound on the click. */
export function uiCardBeat({ toggles }: { toggles?: { text?: string }[] }) {
    return (FLIP(Math.max(0, items(toggles, 3).length - 1)) + 4) / 30;
}

/**
 * A synthetic app window built only from the user's own feature text (toggles, list rows, a small
 * trend line and a toast) with a cursor that clicks through it. It is generic UI, not any real
 * product's screen, and says so in the title bar.
 */
export function UiCard({ title, toggles, rows, toast, transparent, brand }: UiCardProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const snap = useBeatSnap();
    const onBeat = (f: number) => snap(f / fps) * fps; // entrance frame moved onto a nearby beat
    const { colors } = brand;
    const exit = useExit();
    const switches = items(toggles, 3);
    const list = items(rows, 3);

    const toggleTop = BAR + PAD;
    const sparkTop = toggleTop + switches.length * TOGGLE + GAP;
    const rowTop = sparkTop + SPARK + GAP;
    const H = rowTop + list.length * ROW + PAD;
    const scale = Math.min((width * (height > width ? 0.9 : 0.66)) / W, (height * 0.74) / H);

    const enter = spring({ frame: frame - onBeat(0), fps, config: { damping: 14, stiffness: 120 } });
    const lastFlip = FLIP(Math.max(0, switches.length - 1));
    const toastIn = spring({ frame: frame - lastFlip - 14, fps, config: { damping: 200 } });

    // Cursor keys: from the corner to each toggle's switch in turn, then to the first row.
    const target = (i: number) => ({ x: W - PAD - 30, y: toggleTop + i * TOGGLE + TOGGLE / 2 });
    const keys = [
        { t: 8, x: W * 0.9, y: H * 0.95 },
        ...switches.map((_, i) => ({ t: FLIP(i) - 6, ...target(i) })),
        ...(list.length ? [{ t: lastFlip + 34, x: W * 0.4, y: rowTop + ROW / 2 }] : []),
    ];
    const at = (axis: 'x' | 'y') =>
        keys.length > 1
            ? interpolate(frame, keys.map((k) => k.t), keys.map((k) => k[axis]), { ...clamp, easing: Easing.inOut(Easing.cubic) })
            : (keys[0]?.[axis] ?? 0);
    const pressed = switches.some((_, i) => frame >= FLIP(i) - 2 && frame < FLIP(i) + 4);

    // A trend line from seeded numbers, so the same title always draws the same line; it draws itself in.
    const points = Array.from({ length: 9 }, (_, i) => 0.25 + 0.55 * (i / 8) + (random(`${title}-${i}`) - 0.5) * 0.3);
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${(i / 8) * (W - PAD * 2)} ${SPARK - 14 - p * (SPARK - 28)}`).join(' ');
    const drawn = interpolate(frame, [14, 44], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

    const text = { fontFamily: bodyFont(brand), fontSize: 30, color: colors.text, lineHeight: 1.2 } as const;
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: W, height: H, transform: `scale(${scale * (0.94 + enter * 0.06)})`, opacity: Math.min(1, enter * 1.5), position: 'relative', flex: 'none' }}>
                    <div style={{ position: 'absolute', inset: 0, background: colors.surface, borderRadius: 24, border: `1px solid ${colors.muted}33`, boxShadow: '0 30px 80px #0006', overflow: 'hidden' }}>
                        <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${PAD - 8}px`, borderBottom: `1px solid ${colors.muted}33` }}>
                            {[0, 1, 2].map((d) => <div key={d} style={{ width: 12, height: 12, borderRadius: 6, background: `${colors.muted}66` }} />)}
                            <div style={{ ...text, fontFamily: displayFont(brand), fontWeight: 700, marginLeft: 12 }}>{mono(String(title ?? ''), 26)}</div>
                            <div style={{ ...text, fontSize: 20, color: colors.muted, marginLeft: 'auto' }}>Illustration</div>
                        </div>
                        {switches.map((label, i) => {
                            const row = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 200 } });
                            const on = spring({ frame: frame - FLIP(i), fps, config: { damping: 200 } });
                            return (
                                <div key={i} style={{ position: 'absolute', left: PAD, right: PAD, top: toggleTop + i * TOGGLE, height: TOGGLE, display: 'flex', alignItems: 'center', opacity: row, transform: `translateY(${(1 - row) * 24}px)` }}>
                                    <div style={text}>{mono(label, 26)}</div>
                                    <div style={{ marginLeft: 'auto', width: 60, height: 32, borderRadius: 16, background: on > 0.5 ? colors.accent : `${colors.muted}55`, position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: 4, left: 4 + on * 28, width: 24, height: 24, borderRadius: 12, background: '#fff' }} />
                                    </div>
                                </div>
                            );
                        })}
                        <svg width={W - PAD * 2} height={SPARK} style={{ position: 'absolute', left: PAD, top: sparkTop, overflow: 'visible' }}>
                            <path d={line} fill="none" stroke={colors.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawn} />
                        </svg>
                        {list.map((label, i) => {
                            const row = spring({ frame: frame - 22 - i * 4, fps, config: { damping: 200 } });
                            return (
                                <div key={i} style={{ position: 'absolute', left: PAD, right: PAD, top: rowTop + i * ROW, height: ROW, display: 'flex', alignItems: 'center', gap: 16, borderTop: `1px solid ${colors.muted}33`, opacity: row, transform: `translateY(${(1 - row) * 24}px)` }}>
                                    <div style={{ width: 14, height: 14, borderRadius: 7, background: i === 0 ? colors.accent : `${colors.muted}88` }} />
                                    <div style={text}>{mono(label, 32)}</div>
                                </div>
                            );
                        })}
                    </div>
                    {toast.trim() && (
                        <div style={{ position: 'absolute', right: -24, bottom: -28, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px 14px 16px', borderRadius: 16, background: colors.text, opacity: toastIn, transform: `translateY(${(1 - toastIn) * 28}px)`, ...text, color: colors.bg, fontWeight: 600 }}>
                            <div style={{ width: 28, height: 28 }}>
                                <ElementView element="check" color={colors.accent} colors={colors} local={frame - lastFlip - 14} fps={fps} width={28} height={28} />
                            </div>
                            <span style={{ color: colors.bg }}>{mono(toast.trim(), 24)}</span>
                        </div>
                    )}
                    {switches.length > 0 && (
                        <svg width={44} height={44} viewBox="0 0 24 24" style={{ position: 'absolute', left: at('x'), top: at('y'), transform: `scale(${pressed ? 0.88 : 1})`, transformOrigin: '2px 2px', opacity: interpolate(frame, [6, 12], [0, 1], clamp), filter: 'drop-shadow(0 2px 4px #0006)' }}>
                            <path d="M3 2l7.5 18 2.4-7.1L20 10.5z" fill="#fff" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
