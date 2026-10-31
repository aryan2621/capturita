// Product-media scenes: cold opens, reveals, device shots and camera moves built around the user's real UI (Ui in mediaParts, Screen in kit).
import type { CSSProperties } from 'react';
import { AbsoluteFill } from 'remotion';
import { Check, Cursor, Headline, Kicker, Pill, Stage, Sub, card, easeOut, listOf, mono, typed, useKit, type Kit, type LaunchItem, type LaunchProps } from './kit';
import { Aura, Canvas, Lockup, al, clamp01, glow, lerp, polar, TAU } from './shapes';
import { At, Frame, Ghost, Glare, Hit, Laptop, Phone, Sheen, Tablet, Ui, deviceZone, depthShadow, fit, inOut, pulse, stageZone, windowRatio, type Zone } from './mediaParts';

const exp = Math.exp;

// ---- 1. UI cold open ------------------------------------------------------------------------

/** Frame-0 action: the product is mid-task on the first frame, one cursor click, a result card lands. */
export function UiColdOpen(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1;
    const z = stageZone(k);
    const ratio = windowRatio(k);
    const [w, h] = [fit(z, ratio), fit(z, ratio) / ratio];
    const settle = k.pop(0, 12);
    const push = 1 + 0.06 * inOut(k.ramp(0, k.seconds));
    const travel = easeOut(k.ramp(0, HIT));
    const toast = k.pop(HIT, 10);
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x - (push - 1) * k.width * 1.5} y={z.y} r={w * 0.7} a={0.22 + 0.25 * pulse(k, HIT)} scale={settle} />
            <At x={z.x} y={z.y} style={{ perspective: k.u * 180, transform: `scale(${push})` }}>
                <div style={{ transform: `rotateY(${(1 - settle) * -14}deg) rotateX(${(1 - settle) * 6}deg)` }}>
                    <Frame k={k} w={w} h={h} title={p.eyebrow} sweep={k.ramp(HIT, HIT + 0.8)}>
                        <Ui p={p} k={k} label={p.eyebrow} />
                        <Cursor k={k} x={lerp(14, 60, travel)} y={lerp(74, 46, travel)} press={k.ramp(HIT, HIT + 0.5)} />
                    </Frame>
                </div>
                <div style={{ ...card(k, { position: 'absolute', left: w * 0.26, top: h * 0.3, display: 'flex', alignItems: 'center', gap: k.u * 1.6, padding: `${k.u * 1.7}px ${k.u * 3.2}px`, borderColor: `${k.c.accent}99`, whiteSpace: 'nowrap', boxShadow: `${depthShadow(k, 1.4)}, 0 0 ${k.u * 8 * toast}px ${al(k.c.accent, 0.4)}` }), opacity: clamp01(toast * 1.6), transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * toast})` }}>
                    <Check k={k} size={3.4} progress={k.ramp(HIT + 0.15, HIT + 0.6)} />
                    <div style={{ fontSize: k.tx * 3.4, fontWeight: 760 }}>{p.headline}</div>
                </div>
            </At>
        </Stage>
    );
}

// ---- 2. Teaser mask -------------------------------------------------------------------------

/** Giant letters are windows onto the product; they zoom past the camera and the full UI is what remains. */
export function TeaserMask(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 2.4;
    const word = (p.headline || ' ').toUpperCase();
    const fs = Math.min((k.width * 0.88) / (word.length * 0.66), k.u * 34);
    const appear = k.pop(0, 14);
    const zoom = inOut(k.ramp(1.3, HIT));
    const scale = lerp(0.9, 1, appear) * exp(zoom * Math.log(18));
    const cover = 1 - k.ramp(2, HIT + 0.1);
    const letters = { x: 0, y: 0, textAnchor: 'middle' as const, dominantBaseline: 'central' as const, fontFamily: k.display, fontWeight: 900, fontSize: fs, letterSpacing: -fs * 0.03 };
    const place = `translate(${k.width / 2} ${k.height / 2}) scale(${scale})`;
    return (
        <Stage p={p}>
            <AbsoluteFill style={{ transform: `scale(${lerp(1.3, 1, easeOut(k.ramp(0, HIT)))})` }}><Ui p={p} k={k} label={p.eyebrow} /></AbsoluteFill>
            <Canvas k={k}>
                <defs>
                    <mask id="tm-hole">
                        <rect width={k.width} height={k.height} fill="#fff" />
                        <g transform={place}><text {...letters} fill="#000">{word}</text></g>
                    </mask>
                </defs>
                <rect width={k.width} height={k.height} fill={al(k.c.bg, 0.93)} mask="url(#tm-hole)" opacity={cover} />
                <g transform={place} opacity={appear * (1 - k.ramp(1.6, 2.2))} style={glow(k, k.c.accent, 2)}>
                    <text {...letters} fill="none" stroke={k.c.accent} strokeWidth={k.u * 0.3} vectorEffect="non-scaling-stroke">{word}</text>
                </g>
            </Canvas>
            <Kicker k={k} style={{ position: 'absolute', top: k.u * 8, left: 0, right: 0, opacity: k.ramp(0.1, 0.5) * (1 - k.ramp(1.2, 1.6)) }}>{p.eyebrow}</Kicker>
            <Sub k={k} style={{ position: 'absolute', bottom: k.u * 8, left: 0, right: 0, margin: '0 auto', color: k.c.text, textShadow: '0 2px 14px #000b', opacity: k.ramp(HIT, HIT + 0.5), transform: `translateY(${(1 - k.ramp(HIT, HIT + 0.5)) * k.u * 2}px)` }}>{p.subtitle}</Sub>
            <Hit k={k} x={k.width / 2} y={k.height / 2} r={k.u * 28} t0={HIT - 0.1} />
        </Stage>
    );
}

// ---- 3. Old vs new --------------------------------------------------------------------------

/** One side of the comparison: label, time, progress bar, status. */
function RaceCard({ k, item, good, progress, w, h, win }: { k: Kit; item: LaunchItem; good: boolean; progress: number; w: number; h: number; win: number }) {
    const done = progress >= 1;
    const a = k.pop(good ? 0.12 : 0, 14);
    const tilt = (good ? -1 : 1) * 7 * (1 - win);
    const pose = good ? 1 + 0.04 * win : 1 - 0.05 * win;
    return (
        <div style={{ ...card(k, { width: w, height: h, padding: k.u * 3.2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderColor: good ? al(k.c.accent, 0.4 + 0.5 * win) : `${k.c.muted}33`, boxShadow: `${depthShadow(k, good ? 1 + win : 0.8)}, 0 0 ${k.u * 9 * win}px ${al(k.c.accent, 0.45)}` }), opacity: clamp01(a * 1.5) * (good ? 1 : 1 - 0.4 * win), transform: `translateY(${(1 - a) * k.u * 4}px) rotateY(${tilt}deg) scale(${pose})` }}>
            <Kicker k={k} style={{ textAlign: 'left', color: good ? k.c.accent : k.c.muted }}>{item.text}</Kicker>
            <div style={{ fontFamily: k.display, fontWeight: 850, fontSize: k.tx * 6.4, fontVariantNumeric: 'tabular-nums', color: good ? k.c.text : k.c.muted }}>{item.detail}</div>
            <div style={{ height: k.u * 1.6, borderRadius: k.u, background: `${k.c.muted}22`, overflow: 'hidden' }}>
                <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: k.u, background: good ? k.c.accent : k.c.muted, boxShadow: good ? `0 0 ${k.u * 2}px ${k.c.accent}` : undefined }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.4, color: good ? k.c.text : k.c.muted, fontSize: k.tx * 2.4, fontVariantNumeric: 'tabular-nums' }}>
                {done ? <Check k={k} size={3.2} progress={win} /> : (
                    <svg width={k.u * 3} height={k.u * 3} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${k.s * (good ? 700 : 200)}deg)` }}><circle cx="12" cy="12" r="9" stroke={`${k.c.muted}55`} strokeWidth="3" /><path d="M12 3a9 9 0 019 9" stroke={good ? k.c.accent : k.c.muted} strokeWidth="3" strokeLinecap="round" /></svg>
                )}
                <span>{Math.round(progress * 100)}%</span>
            </div>
        </div>
    );
}

/** Same task, two cards: the old way stutters and stalls, the new way finishes first and takes the stage. */
export function OldVsNew(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 2;
    const [oldWay, newWay] = listOf(p.items, [{ text: 'The old way', detail: '3 hours' }, { text: 'The new way', detail: '12 seconds' }], 2);
    const z = stageZone(k);
    const gap = k.u * 2.4;
    const [w, h] = k.stacked ? [z.w, z.h * 0.4] : [(z.w - gap) / 2, z.h * 0.55];
    const win = k.pop(HIT, 9);
    const stutter = Math.floor(k.ramp(0.15, 3, 0, 0.62) * 14) / 14;
    const newProgress = easeOut(k.ramp(0.15, HIT));
    const [nx, ny] = k.stacked ? [z.x, z.y + (h + gap) / 2] : [z.x + (w + gap) / 2, z.y];
    return (
        <Stage p={p}>
            <Aura k={k} x={nx} y={ny} r={w * 0.9} a={0.12 + 0.3 * win} />
            <At x={z.x} y={z.y} style={{ perspective: k.u * 200 }}>
                <div style={{ display: 'flex', flexDirection: k.stacked ? 'column' : 'row', gap }}>
                    <RaceCard k={k} item={oldWay} good={false} progress={stutter} w={w} h={h} win={win} />
                    <RaceCard k={k} item={newWay} good progress={newProgress} w={w} h={h} win={win} />
                </div>
            </At>
            <Lockup k={k} p={p} t0={HIT - 0.1} place="bottom" size={5.2} />
        </Stage>
    );
}

// ---- 4. Hero launch formation ---------------------------------------------------------------

/** Product cards fly in from the sides and below into a fanned formation under the headline. */
export function HeroLaunchFormation(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.3;
    const cards = listOf(p.items, [{ text: 'Dashboard' }, { text: 'Reports' }, { text: 'Mobile' }], 3);
    const n = cards.length;
    const z: Zone = k.stacked ? { x: k.width / 2, y: k.height * 0.62, w: k.width * 0.9, h: k.height * 0.34 } : { x: k.width / 2, y: k.height * 0.64, w: k.width * 0.84, h: k.height * 0.46 };
    const off = k.stacked ? 0.45 : 0.66;
    const cw = Math.min(z.w / ((n - 1) * off + 1), z.h * 1.5);
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={cw * 1.3} a={0.2 + 0.25 * pulse(k, HIT)} scale={k.pop(0, 12)} />
            <Hit k={k} x={z.x} y={z.y} r={cw * 0.6} t0={HIT - 0.1} />
            {cards.map((c, i) => {
                const d = i - (n - 1) / 2;
                const a = k.pop(Math.abs(d) < 0.5 ? 0.1 : 0.3, 11);
                const rest = { x: z.x + d * off * cw, y: z.y };
                const from = Math.abs(d) < 0.5 ? { x: rest.x, y: rest.y + k.height * 0.3 } : { x: rest.x + Math.sign(d) * k.width * 0.6, y: rest.y };
                const float = Math.sin((k.s + i * 0.9) * 1.3) * k.u * 0.5 * k.ramp(HIT, HIT + 1);
                return (
                    <At key={i} x={lerp(from.x, rest.x, a)} y={lerp(from.y, rest.y, a) + float} style={{ perspective: k.u * 220, zIndex: 10 - Math.abs(d) * 2, transform: `scale(${(1 - 0.18 * Math.abs(d)) * (0.85 + 0.15 * a)})`, opacity: clamp01(a * 1.6) }}>
                        <div style={{ transform: `rotateY(${-d * 20}deg)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 1.4 }}>
                            <Frame k={k} w={cw} h={cw / 1.6} sweep={k.ramp(HIT + i * 0.12, HIT + 0.9 + i * 0.12)}><Ui p={p} k={k} i={i} label={c.text} side={false} /></Frame>
                            <div style={{ color: k.c.muted, fontSize: k.tx * 2.3, fontWeight: 650, whiteSpace: 'nowrap' }}>{c.text}</div>
                        </div>
                    </At>
                );
            })}
            <Lockup k={k} p={p} t0={0.1} place="top" size={5} />
        </Stage>
    );
}

// ---- 5. Stage screen reveal -----------------------------------------------------------------

/** A keynote moment: a light cone, curtains gather to the sides, the product screen swells and flashes. */
export function StageScreenReveal(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 2.2;
    const z = stageZone(k);
    const [w, h] = [fit(z, 1.7), fit(z, 1.7) / 1.7];
    const open = inOut(k.ramp(0.35, 2));
    const grow = k.pop(1.3, 12);
    const curtain = (side: -1 | 1): CSSProperties => ({
        position: 'absolute', top: 0, bottom: 0, [side < 0 ? 'left' : 'right']: 0, width: '52%', transformOrigin: side < 0 ? 'left' : 'right',
        transform: `scaleX(${1 - 0.72 * open})`, boxShadow: `0 0 ${k.u * 6}px #000`,
        background: `linear-gradient(180deg, transparent 50%, #000a), repeating-linear-gradient(90deg, ${k.c.surface}, ${k.c.bg} ${k.u * 3}px, ${k.c.surface} ${k.u * 6}px)`,
    });
    return (
        <Stage p={p}>
            <div style={{ position: 'absolute', top: 0, left: '16%', right: '16%', height: '100%', clipPath: 'polygon(44% 0, 56% 0, 100% 100%, 0 100%)', background: `linear-gradient(${al(k.c.accent, 0.4)}, transparent 85%)`, opacity: k.ramp(0, 0.5) * (1 - 0.6 * k.ramp(2, 3)) }} />
            <Aura k={k} x={z.x} y={z.y + h * 0.5} r={w * 0.55} a={0.18 + 0.3 * pulse(k, HIT)} scale={k.ramp(0, 1)} />
            <At x={z.x} y={z.y} style={{ transform: `scale(${lerp(0.72, 1, grow)})` }}>
                <div style={{ ...card(k, { width: w, height: h, overflow: 'hidden', position: 'relative', borderColor: al(k.c.accent, 0.5), boxShadow: `${depthShadow(k, 1.5)}, 0 0 ${k.u * 14}px ${al(k.c.accent, 0.35)}` }) }}>
                    <Ui p={p} k={k} label={p.headline} /><Glare /><Sheen t={k.ramp(1.9, 2.8)} />
                </div>
            </At>
            <div style={curtain(-1)} />
            <div style={curtain(1)} />
            <Hit k={k} x={z.x} y={z.y} r={w * 0.35} t0={HIT - 0.2} />
            <Lockup k={k} p={p} t0={HIT} place="bottom" size={4.8} />
        </Stage>
    );
}

// ---- 6. Tilt to flat ------------------------------------------------------------------------

/** Four corner marks that close in around a rectangle. */
const Brackets = ({ k, x, y, w, h, gap, o }: { k: Kit; x: number; y: number; w: number; h: number; gap: number; o: number }) => {
    const L = k.u * 3;
    const [l, t, r, b] = [x - w / 2 - gap, y - h / 2 - gap, x + w / 2 + gap, y + h / 2 + gap];
    const corner = (cx: number, cy: number, sx: number, sy: number) => `M${cx},${cy + sy * L}V${cy}H${cx + sx * L}`;
    return (
        <Canvas k={k}>
            <path d={[corner(l, t, 1, 1), corner(r, t, -1, 1), corner(l, b, 1, -1), corner(r, b, -1, -1)].join('')} fill="none" stroke={k.c.accent} strokeWidth={k.u * 0.4} strokeLinecap="round" opacity={o} style={glow(k, k.c.accent, 1.5)} />
        </Canvas>
    );
};

/** A tilted screen with depth echoes springs flat; corner marks lock around it. */
export function TiltToFlat(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.3;
    const z = deviceZone(k);
    const ratio = windowRatio(k);
    const [w, h] = [fit(z, ratio), fit(z, ratio) / ratio];
    const tilt = 1 - k.pop(0.05, 10);
    const lock = k.pop(0.8, 12);
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={w * 0.7} a={0.2 + 0.3 * pulse(k, HIT)} scale={k.pop(0, 12)} />
            <At x={z.x} y={z.y} style={{ perspective: k.u * 150 }}>
                <div style={{ position: 'relative', width: w, height: h, transformStyle: 'preserve-3d', transform: `rotateY(${-34 * tilt}deg) rotateX(${18 * tilt}deg) rotateZ(${3 * tilt}deg)` }}>
                    {[2, 1].map((i) => <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: k.u * 1.8, border: `1px solid ${al(k.c.accent, 0.6)}`, background: al(k.c.accent, 0.07), transform: `translateZ(${-tilt * i * k.u * 14}px)`, opacity: tilt * 1.4 }} />)}
                    <Frame k={k} w={w} h={h} title={p.eyebrow} sweep={k.ramp(HIT - 0.2, HIT + 0.8)}><Ui p={p} k={k} label={p.headline} /></Frame>
                </div>
            </At>
            <Brackets k={k} x={z.x} y={z.y} w={w} h={h} gap={k.u * (1.5 + 6 * (1 - lock))} o={clamp01(lock)} />
            <Lockup k={k} p={p} t0={HIT - 0.1} />
        </Stage>
    );
}

// ---- 7. Pullback to wall --------------------------------------------------------------------

/** Camera starts filling the frame with one screen and pulls back, with overshoot, onto a tilted wall of nine. */
export function PullbackToWall(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.8;
    const names = listOf(p.items, [], 8);
    const z = stageZone(k);
    const gap = k.u * 1.6;
    const cellW = k.width * 0.3;
    const cellH = cellW / (k.portrait ? 0.8 : 1.6);
    const [wallW, wallH] = [cellW * 3 + gap * 2, cellH * 3 + gap * 2];
    const close = Math.min((k.width * 0.86) / cellW, (k.height * 0.8) / cellH);
    const far = Math.min(z.w / wallW, z.h / wallH);
    const e = k.pop(0.4, 12);
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={wallW * far * 0.7} a={0.15 + 0.3 * pulse(k, HIT)} scale={k.ramp(0, 1)} />
            <At x={z.x} y={lerp(k.height / 2, z.y, e)} style={{ perspective: k.u * 260, transform: `scale(${lerp(close, far, e)})` }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${cellW}px)`, gap, flexShrink: 0, transform: `rotateX(${7 * e}deg) rotateY(${-9 * e + Math.sin(k.s * 0.7) * 1.2 * k.ramp(HIT, HIT + 1)}deg)` }}>
                    {Array.from({ length: 9 }, (_, cell) => {
                        const i = cell === 4 ? 0 : cell < 4 ? cell + 1 : cell;
                        const dist = Math.hypot((cell % 3) - 1, Math.floor(cell / 3) - 1);
                        const a = k.pop(0.45 + dist * 0.1, 14);
                        return (
                            <div key={cell} style={{ ...card(k, { width: cellW, height: cellH, overflow: 'hidden', position: 'relative', borderColor: cell === 4 ? al(k.c.accent, 0.6) : undefined }), opacity: cell === 4 ? 1 : clamp01(a * 1.4), transform: `scale(${0.9 + 0.1 * a})` }}>
                                <Ui p={p} k={k} i={i} label={names[(i - 1 + names.length) % Math.max(1, names.length)]?.text ?? ''} /><Glare />
                            </div>
                        );
                    })}
                </div>
            </At>
            <Lockup k={k} p={p} t0={HIT - 0.2} place="bottom" size={4.8} />
        </Stage>
    );
}

// ---- 8. Card flip reveal --------------------------------------------------------------------

/** A teaser card flips in 3D (with a lift and a springy overshoot) to the product screen. */
export function CardFlipReveal(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.1;
    const z = stageZone(k);
    const [w, h] = [fit(z, 1.6), fit(z, 1.6) / 1.6];
    const appear = k.pop(0, 14);
    const flip = k.pop(0.25, 9);
    const lift = Math.sin(clamp01(flip) * Math.PI);
    const face: CSSProperties = { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: k.u * 1.8, overflow: 'hidden' };
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={w * 0.65} a={0.2 + 0.3 * pulse(k, HIT)} scale={appear} />
            <At x={z.x} y={z.y + h / 2 + k.u * 5} style={{ opacity: 0.7 - 0.3 * lift }}>
                <div style={{ width: w * 0.8, height: k.u * 3.4, borderRadius: '50%', background: 'radial-gradient(#000c, transparent 70%)', transform: `scaleX(${1 - 0.25 * lift})` }} />
            </At>
            <At x={z.x} y={z.y} style={{ perspective: k.u * 160, opacity: appear }}>
                <div style={{ width: w, height: h, position: 'relative', transformStyle: 'preserve-3d', transform: `translateY(${-lift * k.u * 3}px) scale(${0.88 + 0.12 * appear + 0.06 * lift}) rotateY(${flip * 180}deg)` }}>
                    <div style={{ ...face, ...card(k, { background: `linear-gradient(140deg, ${k.c.accent}, ${k.c.surface} 85%)`, borderColor: al(k.c.accent, 0.6) }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: k.u * 2 }}>
                        <svg viewBox="0 0 100 62" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                            {[26, 40, 54].map((r) => <circle key={r} cx="85" cy="8" r={r} fill="none" stroke={al(k.c.text, 0.12)} strokeWidth="0.6" />)}
                        </svg>
                        <Kicker k={k} style={{ color: k.c.text }}>{p.eyebrow}</Kicker>
                        <Headline k={k} size={6} style={{ maxWidth: '84%' }}>{p.headline}</Headline>
                    </div>
                    <div style={{ ...face, ...card(k, { borderColor: al(k.c.accent, 0.5) }), transform: 'rotateY(180deg)' }}>
                        <Ui p={p} k={k} label={p.subtitle} /><Glare /><Sheen t={k.ramp(HIT - 0.1, HIT + 0.7)} />
                    </div>
                </div>
            </At>
            <Hit k={k} x={z.x} y={z.y} r={w * 0.4} t0={HIT - 0.1} />
            <Lockup k={k} p={{ ...p, eyebrow: '', headline: '' }} t0={HIT} place="bottom" />
        </Stage>
    );
}

// ---- 9. Pen circles number ------------------------------------------------------------------

type Pt = [number, number];
/** The hand-drawn loop as cubic segments in 0-1 box coordinates (it overshoots its start a little, like a real circle). */
const LOOP: Pt[][] = [
    [[0.07, 0.62], [0.01, 0.12], [0.55, -0.06], [0.94, 0.2]],
    [[0.94, 0.2], [1.05, 0.55], [0.62, 1.07], [0.2, 0.93]],
    [[0.2, 0.93], [-0.03, 0.8], [0.02, 0.28], [0.52, 0.1]],
];
const cubic = (s: Pt[], t: number): Pt => {
    const m = 1 - t;
    return [0, 1].map((i) => m ** 3 * s[0][i] + 3 * m * m * t * s[1][i] + 3 * m * t * t * s[2][i] + t ** 3 * s[3][i]) as Pt;
};
const LOOP_POINTS: Pt[] = LOOP.flatMap((s) => Array.from({ length: 36 }, (_, n) => cubic(s, n / 36)));

/** A marker: nib at the origin, body trailing up and to the right. */
const MarkerHead = ({ k, fs }: { k: Kit; fs: number }) => {
    const [bw, nib, len] = [fs * 0.09, fs * 0.12, fs * 0.6];
    return (
        <g style={{ filter: `drop-shadow(0 ${k.u * 0.6}px ${k.u * 0.8}px #0009)` }}>
            <polygon points={`0,0 ${nib},${-bw * 0.35} ${nib},${bw * 0.35}`} fill={k.c.accent} />
            <rect x={nib} y={-bw / 2} width={len} height={bw} rx={bw * 0.3} fill={k.c.text} />
            <rect x={nib} y={-bw / 2} width={len * 0.22} height={bw} fill={k.c.accent} />
        </g>
    );
};

/** The number counts up, a marker draws a loop around it, then lifts away as the number takes the hit. */
export function PenCirclesNumber(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.6;
    const z = deviceZone(k);
    const full = Math.round(p.metric).toLocaleString('en-US');
    const fs = Math.min(k.tx * 28, z.w / (full.length * 0.62 + 0.9));
    const [W, H] = [fs * 0.62 * full.length + fs * 0.9, fs * 1.55];
    const shown = Math.round(p.metric * easeOut(k.ramp(0, 0.9))).toLocaleString('en-US');
    const idx = Math.floor(inOut(k.ramp(0.6, HIT)) * (LOOP_POINTS.length - 1));
    const px = ([x, y]: Pt) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`;
    const ink = `M${LOOP_POINTS.slice(0, idx + 1).map(px).join('L')}`;
    const [tx, ty] = LOOP_POINTS[idx].map((v, i) => v * (i ? H : W));
    const [bx, by] = LOOP_POINTS[Math.max(0, idx - 4)].map((v, i) => v * (i ? H : W));
    const lifted = k.ramp(HIT, HIT + 0.7);
    const bump = pulse(k, HIT, 5);
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={W * 0.7} a={0.14 + 0.3 * bump} scale={k.pop(0, 12)} />
            <At x={z.x} y={z.y} style={{ transform: `scale(${1 + 0.06 * bump})` }}>
                <div style={{ position: 'relative', width: W, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: k.display, fontWeight: 900, fontSize: fs, fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: `0 ${k.u}px ${k.u * 4}px #0008` }}>{shown}</div>
                    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                        {idx > 0 && (
                            <g strokeLinecap="round" strokeLinejoin="round" style={glow(k, k.c.accent, 1)}>
                                <path d={ink} stroke={al(k.c.accent, 0.35)} strokeWidth={fs * 0.075} />
                                <path d={ink} stroke={k.c.accent} strokeWidth={fs * 0.045} />
                            </g>
                        )}
                        {lifted < 1 && idx > 0 && (
                            <g opacity={1 - lifted} transform={`translate(${tx + lifted * fs * 0.4} ${ty - lifted * fs * 0.5}) rotate(${(Math.atan2(ty - by, tx - bx) * 180) / Math.PI * 0.25 - 45})`}><MarkerHead k={k} fs={fs} /></g>
                        )}
                    </svg>
                </div>
            </At>
            <Lockup k={k} p={p} t0={HIT - 0.1} />
        </Stage>
    );
}

// ---- 10. Multi-device family ----------------------------------------------------------------

/** A progress line that fills across a device screen and ends in a check: every device runs the same action. */
const SyncMark = ({ k, from, to }: { k: Kit; from: number; to: number }) => (
    <>
        <div style={{ position: 'absolute', left: 0, bottom: 0, height: k.u * 0.7, width: `${k.ramp(from, to) * 100}%`, background: k.c.accent, boxShadow: `0 0 ${k.u * 2}px ${k.c.accent}` }} />
        <div style={{ position: 'absolute', top: k.u * 0.8, right: k.u * 0.8, opacity: k.pop(to, 9), transform: `scale(${0.6 + 0.4 * k.pop(to, 9)})` }}><Check k={k} size={2.6} /></div>
    </>
);

/** A dashed curve between two points with a dot travelling along it as `t` runs 0 to 1. */
const Link = ({ k, a, b, bend, t }: { k: Kit; a: [number, number]; b: [number, number]; bend: number; t: number }) => {
    const c: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - bend];
    const at = (i: number) => (1 - t) ** 2 * a[i] + 2 * (1 - t) * t * c[i] + t * t * b[i];
    return (
        <>
            <path d={`M${a}Q${c} ${b}`} fill="none" stroke={al(k.c.accent, 0.4 * clamp01(t * 4))} strokeWidth={k.u * 0.25} strokeDasharray={`${k.u} ${k.u * 0.8}`} />
            {t > 0 && t < 1 && <circle cx={at(0)} cy={at(1)} r={k.u * 0.7} fill={k.c.text} style={glow(k, k.c.accent, 2)} />}
        </>
    );
};

/** Laptop, tablet and phone drop in together, linked by travelling dots, and all finish the same action at once. */
export function MultiDeviceFamily(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.5;
    const z = deviceZone(k);
    const Lw = Math.min(z.w / 1.3, z.h * 1.1);
    const [laptop, tablet, phone]: [number, number][] = [[z.x, z.y - Lw * 0.1], [z.x - Lw * 0.46, z.y + Lw * 0.2], [z.x + Lw * 0.5, z.y + Lw * 0.24]];
    const drop = (delay: number): CSSProperties => {
        const a = k.pop(delay, 11);
        return { opacity: clamp01(a * 1.6), transform: `translateY(${(1 - a) * -k.u * 14}px)` };
    };
    const t = k.ramp(0.4, HIT);
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={Lw * 0.8} a={0.16 + 0.3 * pulse(k, HIT)} scale={k.pop(0, 12)} />
            <Canvas k={k}>
                <Link k={k} a={[laptop[0] - Lw * 0.3, laptop[1] + Lw * 0.33]} b={[tablet[0], tablet[1] - Lw * 0.25]} bend={Lw * 0.08} t={t} />
                <Link k={k} a={[laptop[0] + Lw * 0.3, laptop[1] + Lw * 0.33]} b={[phone[0], phone[1] - Lw * 0.21]} bend={Lw * 0.08} t={t} />
            </Canvas>
            <At x={laptop[0]} y={laptop[1]} style={drop(0.05)}><Laptop k={k} w={Lw} sweep={k.ramp(HIT, HIT + 0.9)}><Ui p={p} k={k} i={0} label={p.headline} /><SyncMark k={k} from={0.5} to={HIT} /></Laptop></At>
            <At x={tablet[0]} y={tablet[1]} style={drop(0.3)}><Tablet k={k} h={Lw * 0.5}><Ui p={p} k={k} i={1} label={p.headline} side={false} /><SyncMark k={k} from={0.5} to={HIT} /></Tablet></At>
            <At x={phone[0]} y={phone[1]} style={drop(0.45)}><Phone k={k} h={Lw * 0.42}><Ui p={p} k={k} i={2} label={p.headline} side={false} /><SyncMark k={k} from={0.5} to={HIT} /></Phone></At>
            <Hit k={k} x={laptop[0]} y={laptop[1]} r={Lw * 0.3} t0={HIT} />
            <Lockup k={k} p={p} t0={HIT - 0.2} />
        </Stage>
    );
}

// ---- 11. Focus pull to phone ----------------------------------------------------------------

/** Rack focus: the desktop defocuses into bokeh while a sharp phone rises in front of it. */
export function FocusPullToPhone(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 2;
    const z = deviceZone(k);
    const w = fit(z, 1.5);
    const pull = inOut(k.ramp(0.3, 1.9));
    const rise = k.pop(0.3, 11);
    const ph = Math.min(z.h * 0.8, w * 0.75);
    return (
        <Stage p={p}>
            <At x={z.x} y={z.y - z.h * 0.05} style={{ filter: `blur(${pull * k.u * 1.4}px)`, opacity: 1 - 0.4 * pull, transform: `scale(${1 - 0.05 * pull})` }}>
                <Frame k={k} w={w} h={w / 1.5} title={p.eyebrow}><Ui p={p} k={k} label={p.eyebrow} /></Frame>
            </At>
            <Canvas k={k}>
                {Array.from({ length: 7 }, (_, i) => {
                    const [x, y] = polar(z.x, z.y, z.h * (0.3 + 0.2 * ((i * 5) % 7) / 7), (i / 7) * TAU + 0.4);
                    return <circle key={i} cx={x} cy={y} r={k.u * (1.8 + (i % 3) * 1.4) * pull} fill={al(i % 2 ? k.c.text : k.c.accent, 0.28)} style={{ filter: `blur(${k.u * 0.4}px)` }} />;
                })}
            </Canvas>
            <At x={z.x + w * 0.3} y={z.y + z.h * 0.05 + (1 - rise) * z.h * 0.5} style={{ filter: `blur(${(1 - pull) * k.u * 1.5}px)`, transform: `scale(${lerp(0.85, 1, rise)})` }}>
                <Phone k={k} h={ph} sweep={k.ramp(HIT - 0.3, HIT + 0.6)}><Ui p={p} k={k} i={1} label={p.headline} side={false} /></Phone>
            </At>
            <Hit k={k} x={z.x + w * 0.3} y={z.y + z.h * 0.05} r={ph * 0.3} t0={HIT - 0.2} />
            <Lockup k={k} p={p} t0={HIT} />
        </Stage>
    );
}

// ---- 12. Phone to laptop handoff ------------------------------------------------------------

/** The item that travels between devices. */
const ItemChip = ({ k, item, checked }: { k: Kit; item: LaunchItem; checked: number }) => (
    <div style={{ ...card(k, { display: 'flex', alignItems: 'center', gap: k.u * 1.4, padding: `${k.u * 1.3}px ${k.u * 2.2}px`, whiteSpace: 'nowrap', borderColor: k.c.accent, boxShadow: `${depthShadow(k, 1.2)}, 0 0 ${k.u * 4}px ${al(k.c.accent, 0.55)}` }) }}>
        {checked > 0 && <Check k={k} size={2.8} progress={checked} />}
        <div>
            <div style={{ fontSize: k.tx * 2.3, fontWeight: 750 }}>{item.text}</div>
            {item.detail && <div style={{ fontSize: k.tx * 1.7, color: k.c.muted }}>{item.detail}</div>}
        </div>
    </div>
);

/** An item lifts off the phone, arcs across with a comet trail, and lands on the laptop with a check. */
export function PhoneToLaptopHandoff(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 2.4;
    const [thing] = listOf(p.items, [{ text: 'Design brief', detail: 'From your phone' }], 1);
    const z = deviceZone(k);
    const Lw = Math.min(z.w / 1.4, z.h * 1.1);
    const [laptop, phone]: Pt[] = [[z.x + Lw * 0.2, z.y - Lw * 0.05], [z.x - Lw * 0.5, z.y + Lw * 0.1]];
    const [from, to]: Pt[] = [phone, [laptop[0], laptop[1] - Lw * 0.06]];
    const chipAt = (t: number) => {
        const e = inOut((t - 1) / 1.3);
        return { x: lerp(from[0], to[0], e), y: lerp(from[1], to[1], e) - Math.sin(Math.PI * e) * Lw * 0.22, arc: Math.sin(Math.PI * e) };
    };
    const now = chipAt(k.s);
    const landed = k.ramp(HIT, HIT + 0.4);
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={Lw * 0.8} a={0.14 + 0.3 * pulse(k, HIT)} scale={k.pop(0, 12)} />
            <At x={laptop[0]} y={laptop[1]} style={{ opacity: clamp01(k.pop(0.1) * 1.6), transform: `translateY(${(1 - k.pop(0.1, 14)) * k.u * 6}px)` }}>
                <Laptop k={k} w={Lw} sweep={k.ramp(HIT - 0.1, HIT + 0.8)}><Ui p={p} k={k} label={p.subtitle} /></Laptop>
            </At>
            <At x={phone[0]} y={phone[1]} style={{ opacity: clamp01(k.pop(0) * 1.6), transform: `translateY(${(1 - k.pop(0, 14)) * k.u * 6}px)` }}>
                <Phone k={k} h={Lw * 0.62}><Ui p={p} k={k} i={1} label={thing.text} side={false} /></Phone>
            </At>
            <Canvas k={k}>
                {Array.from({ length: 9 }, (_, j) => {
                    const t = chipAt(k.s - (j + 1) * 0.04);
                    return <circle key={j} cx={t.x} cy={t.y} r={k.u * 1.3 * (1 - j / 10)} fill={k.c.accent} opacity={0.5 * (1 - j / 9) * (now.arc > 0.02 ? 1 : 0)} />;
                })}
            </Canvas>
            <At x={now.x} y={now.y} style={{ zIndex: 10, opacity: k.pop(0.4), transform: `scale(${1 + 0.18 * now.arc})` }}><ItemChip k={k} item={thing} checked={landed} /></At>
            <Lockup k={k} p={p} t0={HIT - 0.6} />
        </Stage>
    );
}

// ---- 13. Phone notification stack -----------------------------------------------------------

/** Lock-screen notifications drop onto a buzzing phone, then the top one expands into its full message. */
export function PhoneNotificationStack(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.7;
    const notes = listOf(p.items, [{ text: 'Messages', detail: 'Where are the final files?' }, { text: 'Calendar', detail: 'Review moved to 3 pm' }, { text: 'Mail', detail: '14 unread since this morning' }, { text: 'Tasks', detail: 'Three items are overdue' }], 5);
    const z = deviceZone(k, true);
    const h = z.h;
    const pu = h / 100;
    const land = (i: number) => 0.15 + i * 0.35;
    const buzz = notes.reduce((sum, _, i) => sum + (k.s > land(i) ? exp(-(k.s - land(i)) * 9) * Math.sin((k.s - land(i)) * 50) : 0), 0);
    const expand = k.pop(HIT - 0.2, 12);
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={h * 0.6} a={0.16 + 0.3 * pulse(k, HIT)} scale={k.pop(0, 12)} />
            <At x={z.x} y={z.y} style={{ transform: `translateX(${buzz * pu * 0.4}px) rotate(${buzz * 0.8}deg)` }}>
                <Phone k={k} h={h}>
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(170deg, ${al(k.c.accent, 0.55)}, ${k.c.bg} 62%)`, padding: `${pu * 8}px ${pu * 3.4}px`, display: 'flex', flexDirection: 'column', gap: pu * 1.8 }}>
                        <div style={{ textAlign: 'center', fontFamily: k.display, fontWeight: 800, fontSize: pu * 9, fontVariantNumeric: 'tabular-nums', marginBottom: pu * 2 }}>9:41</div>
                        {notes.map((n, i) => {
                            const a = k.pop(land(i), 12);
                            const top = i === 0;
                            return (
                                <div key={i} style={{ ...card(k, { padding: pu * 2.6, borderRadius: pu * 3.2, display: 'flex', gap: pu * 2.4, alignItems: 'flex-start', background: `${k.c.surface}ee`, boxShadow: top ? `0 0 ${pu * 5 * expand}px ${al(k.c.accent, 0.5)}` : undefined, borderColor: top ? al(k.c.accent, 0.3 + 0.5 * expand) : undefined }), opacity: clamp01(a * 1.6), transform: `translateY(${(1 - a) * -pu * 30}px) scale(${top ? 1 + 0.03 * expand : 1})` }}>
                                    <div style={{ width: pu * 6, height: pu * 6, borderRadius: pu * 1.6, background: k.c.accent, flexShrink: 0, opacity: 1 - i * 0.12 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: pu * 3.2, fontWeight: 750 }}>{n.text}</div>
                                        {n.detail && <div style={{ fontSize: pu * 2.8, color: k.c.muted, maxHeight: top ? pu * (3.6 + 12 * expand) : pu * 3.6, overflow: 'hidden', textWrap: 'balance' }}>{n.detail}{top && expand > 0.4 ? ` ${p.subtitle}` : ''}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Phone>
            </At>
            <Hit k={k} x={z.x} y={z.y} r={h * 0.3} t0={HIT} />
            <Lockup k={k} p={{ ...p, subtitle: '' }} t0={0.2} place="sideLeft" size={5.6} />
        </Stage>
    );
}

// ---- 14. Terminal to live site --------------------------------------------------------------

/** Deploy logs type out in a terminal, which turns away to reveal the live site behind it. */
export function TerminalToLiveSite(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 2.3;
    const lines = listOf(p.items, [{ text: 'npm run deploy' }, { text: 'Building 214 modules' }, { text: 'Uploading assets' }, { text: 'Provisioning the edge' }, { text: 'Live in 12s' }], 5);
    const z = deviceZone(k);
    const ratio = windowRatio(k);
    const [w, h] = [fit(z, ratio), fit(z, ratio) / ratio];
    const swap = inOut(k.ramp(1.8, HIT + 0.2));
    const born = k.pop(0, 14);
    const per = 1.6 / lines.length;
    const current = Math.min(lines.length - 1, Math.max(0, Math.floor((k.s - 0.15) / per)));
    const layer = (scale: number, opacity: number): CSSProperties => ({ perspective: k.u * 160, opacity, transform: `scale(${scale})` });
    const line = (l: LaunchItem, i: number) => {
        const t0 = 0.15 + i * per;
        const done = k.s >= t0 + per * 0.9;
        const last = i === lines.length - 1;
        const text = l.text.replace(/^[✓✔]\s*/, '');
        return (
            <div key={i} style={{ color: last ? k.c.accent : i ? k.c.muted : k.c.text, fontWeight: last || !i ? 700 : 500, minHeight: k.tx * 3 }}>
                {i === 0 ? <span style={{ color: k.c.accent }}>$ </span> : done && <span style={{ color: k.c.accent }}>✓ </span>}
                {typed(text, k.ramp(t0, t0 + per * 0.9))}
                {i === current && Math.floor(k.s * 3) % 2 === 0 && swap < 1 ? '▋' : ''}
            </div>
        );
    };
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={w * 0.7} a={0.14 + 0.32 * pulse(k, HIT)} scale={born} />
            <At x={z.x} y={z.y} style={layer(lerp(0.9, 1, swap), swap)}>
                <div style={{ transform: `rotateY(${(1 - swap) * -22}deg)` }}>
                    <Frame k={k} w={w} h={h} title={p.subtitle} sweep={k.ramp(HIT, HIT + 0.9)}>
                        <Ui p={p} k={k} label={p.subtitle} />
                        <div style={{ position: 'absolute', top: k.u * 1.4, right: k.u * 1.4, opacity: k.pop(HIT), transform: `scale(${0.7 + 0.3 * k.pop(HIT, 9)})` }}><Pill k={k} active>● Live</Pill></div>
                    </Frame>
                </div>
            </At>
            <At x={z.x} y={z.y} style={layer(lerp(1, 0.9, swap) * (0.92 + 0.08 * born), clamp01(1 - swap * 1.3))}>
                <div style={{ transform: `rotateY(${swap * 22}deg) translateY(${(1 - born) * k.u * 4}px)` }}>
                    <Frame k={k} w={w} h={h} title="Terminal">
                        <div style={{ ...mono(k), padding: k.u * 2.4, height: '100%', background: k.c.bg, display: 'flex', flexDirection: 'column', gap: k.u * 1.1, overflow: 'hidden' }}>{lines.map(line)}</div>
                    </Frame>
                </div>
            </At>
            <Hit k={k} x={z.x} y={z.y} r={w * 0.3} t0={HIT - 0.1} />
            <Lockup k={k} p={p} t0={HIT - 0.2} />
        </Stage>
    );
}

// ---- 15. Exploded view ----------------------------------------------------------------------

/** Where each layer sits on the screen (percent), and the ghost UI it carries. */
const LAYERS: { l: number; t: number; w: number; h: number; kind: 'bar' | 'list' | 'chart' | 'form' }[] = [
    { l: 0, t: 0, w: 100, h: 13, kind: 'bar' },
    { l: 0, t: 13, w: 22, h: 87, kind: 'list' },
    { l: 24, t: 17, w: 50, h: 73, kind: 'chart' },
    { l: 76, t: 13, w: 24, h: 87, kind: 'form' },
];

/** The interface tilts back and its parts (toolbar, sidebar, canvas, inspector) lift apart as glass layers, then settle half back. */
export function ExplodedView(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.9;
    const layers = listOf(p.items, [{ text: 'Toolbar' }, { text: 'Sidebar' }, { text: 'Canvas' }, { text: 'Inspector' }], 4);
    const z = deviceZone(k);
    const w = z.w * 0.78;
    const h = w * 0.625;
    const tilt = inOut(k.ramp(0, 1));
    const settle = 1 - 0.4 * inOut(k.ramp(3.2, 4.2));
    const lift = (i: number) => k.pop(1 + i * 0.1, 10) * settle;
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={w * 0.7} a={0.14 + 0.28 * lift(1)} scale={k.pop(0, 12)} />
            <At x={z.x} y={z.y} style={{ perspective: k.u * 170 }}>
                <div style={{ width: w, height: h, position: 'relative', flexShrink: 0, transformStyle: 'preserve-3d', transform: `rotateX(${58 * tilt}deg) rotateZ(${-32 * tilt}deg)` }}>
                    <div style={{ ...card(k, { position: 'absolute', inset: 0, overflow: 'hidden', boxShadow: depthShadow(k, 1 + tilt) }) }}><Ui p={p} k={k} label={p.headline} /></div>
                    {layers.map((layer, i) => {
                        const r = LAYERS[i];
                        const e = lift(i);
                        return (
                            <div key={i} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `translateZ(${(i + 1) * k.u * (1.2 + 8 * e)}px)` }}>
                                <div style={{ position: 'absolute', left: `${r.l}%`, top: `${r.t}%`, width: `${r.w}%`, height: `${r.h}%`, borderRadius: k.u * 0.8, border: `${k.u * 0.3}px solid ${al(k.c.accent, 0.4 + 0.6 * e)}`, background: al(k.c.surface, 0.1 + 0.75 * e), boxShadow: `0 0 ${k.u * 3 * e}px ${al(k.c.accent, 0.5)}`, overflow: 'hidden' }}>
                                    <div style={{ opacity: e, width: '100%', height: '100%' }}><Ghost k={k} kind={r.kind} seed={i} /></div>
                                    <Pill k={k} active style={{ position: 'absolute', left: k.u * 0.8, top: k.u * 0.6, padding: `${k.u * 0.3}px ${k.u * 1.2}px`, fontSize: k.tx * 1.9, whiteSpace: 'nowrap', opacity: clamp01(e * 2) }}>{layer.text}</Pill>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </At>
            <Hit k={k} x={z.x} y={z.y} r={w * 0.4} t0={HIT - 0.8} />
            <Lockup k={k} p={p} t0={HIT - 0.8} />
        </Stage>
    );
}

// ---- 16. Panel grid moves -------------------------------------------------------------------

/** The camera slides across a 2x2 grid of panels, dipping and re-landing on each feature with parallax inside the panels. */
export function PanelGridMoves(p: LaunchProps) {
    const k = useKit(p);
    const panels = listOf(p.items, [{ text: 'Capture', detail: 'Record in one click' }, { text: 'Edit', detail: 'Trim and polish' }, { text: 'Style', detail: 'Make it yours' }, { text: 'Share', detail: 'Export anywhere' }], 4);
    const base = stageZone(k);
    const z: Zone = { ...base, y: k.height * 0.6, h: k.height * (k.stacked ? 0.5 : 0.52) };
    const ratio = windowRatio(k);
    const [w, h] = [fit(z, ratio), fit(z, ratio) / ratio];
    const spots = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const moves = panels.slice(1).map((_, j) => inOut(k.ramp(0.45 + 1.05 * j, 1.1 + 1.05 * j)));
    const cam = moves.reduce((c, e, j) => [c[0] + (spots[j + 1][0] - spots[j][0]) * e, c[1] + (spots[j + 1][1] - spots[j][1]) * e], [0, 0]);
    const dip = moves.reduce((d, e) => d + Math.sin(Math.PI * e), 0);
    const active = moves.filter((e) => e > 0.5).length;
    return (
        <Stage p={p}>
            <Aura k={k} x={z.x} y={z.y} r={w * 0.7} a={0.16 + 0.2 * Math.min(1, dip)} scale={k.pop(0, 12)} />
            <At x={z.x} y={z.y} style={{ transform: `scale(${1 - 0.05 * dip})`, opacity: clamp01(k.pop(0, 14) * 1.6) }}>
                <Frame k={k} w={w} h={h} title={p.eyebrow}>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: '200%', height: '200%', transform: `translate(${-cam[0] * 50}%, ${-cam[1] * 50}%)` }}>
                        {panels.map((n, i) => {
                            const [dx, dy] = [spots[i][0] - cam[0], spots[i][1] - cam[1]];
                            return (
                                <div key={i} style={{ position: 'absolute', left: `${spots[i][0] * 50}%`, top: `${spots[i][1] * 50}%`, width: '50%', height: '50%', padding: k.u * 2.4, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: k.u * 1.4, opacity: 0.4 + 0.6 * (1 - Math.min(1, Math.hypot(dx, dy))), transform: `translate(${dx * k.u * 4}px, ${dy * k.u * 4}px)` }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: k.u * 1.6 }}>
                                        <span style={{ color: k.c.accent, fontFamily: k.display, fontWeight: 850, fontSize: k.tx * 4, fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
                                        <span style={{ fontSize: k.tx * 3.6, fontWeight: 750 }}>{n.text}</span>
                                        {n.detail && <span style={{ color: k.c.muted, fontSize: k.tx * 2.3 }}>{n.detail}</span>}
                                    </div>
                                    <div style={{ flex: 1, borderRadius: k.u, overflow: 'hidden', position: 'relative' }}><Ui p={p} k={k} i={i} label={n.text} /></div>
                                </div>
                            );
                        })}
                    </div>
                </Frame>
            </At>
            <At x={z.x} y={z.y + h / 2 + k.u * 3.5} style={{ display: 'flex', gap: k.u * 1.2 }}>
                {panels.map((_, i) => <span key={i} style={{ flexShrink: 0, width: k.u * (i === active ? 4 : 1.4), height: k.u * 1.4, borderRadius: k.u, background: i === active ? k.c.accent : `${k.c.muted}55`, boxShadow: i === active ? `0 0 ${k.u * 2}px ${k.c.accent}` : undefined }} />)}
            </At>
            <Lockup k={k} p={p} t0={0.1} place="top" size={4.6} />
        </Stage>
    );
}
