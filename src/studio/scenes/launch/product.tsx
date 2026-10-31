// Product reveals and UI-demo scenes. Each one is layered (accent aura, depth, spring entrances) with the headline lockup part of the composition.
import type { CSSProperties, ReactNode } from 'react';
import { HitFx, variantFor } from '../hitFx';
import { Check, Cursor, Pill, Screen, Stage, Win, card, easeOut, listOf, typed, useKit, type Kit, type LaunchProps } from './kit';
import { Aura, Canvas, Lockup, TAU, al, clamp01, lerp, shortSide } from './shapes';

// ---- motion helpers shared with story.tsx ----

/** Spring entrance from `t0`: fades in, rises `y` units and (optionally) grows by `scale`. */
export const enter = (k: Kit, t0 = 0, { y = 3, scale = 0, damping = 13 } = {}): CSSProperties => {
    const a = k.pop(t0, damping);
    return { opacity: Math.min(1, a * 1.6), transform: `translateY(${(1 - a) * k.u * y}px) scale(${1 - (1 - a) * scale})` };
};

type Pt = [number, number];
const backOut = (t: number) => 1 + 2.2 * (clamp01(t) - 1) ** 3 + 1.2 * (clamp01(t) - 1) ** 2;
/** A cursor-like move between two percent points: eased with a slight overshoot and a curved path (`arc` percent of lift). */
export const glide = (k: Kit, t0: number, t1: number, [x0, y0]: Pt, [x1, y1]: Pt, arc = 6): Pt => {
    const t = k.ramp(t0, t1);
    const e = backOut(t);
    return [lerp(x0, x1, e), lerp(y0, y1, e) - Math.sin(t * Math.PI) * arc];
};

/** The scene's hit accent (a per-scene look, see hitFx), centred in the nearest positioned parent. */
export const Hit = ({ k, scene, t0, r = 8 }: { k: Kit; scene: string; t0: number; r?: number }) => (
    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
        <HitFx variant={variantFor(scene)} t={k.ramp(t0, t0 + 0.7)} x={0} y={0} size={k.u * r * 2} color={k.c.accent} />
    </div>
);

/** Where a visual sits beside a Lockup: left/right half in wide frames, top/bottom in tall ones, with an accent aura behind it. */
export function Slot({ k, side = 'left', below = false, children }: { k: Kit; side?: 'left' | 'right'; below?: boolean; children: ReactNode }) {
    const [x, y, w, h] = k.stacked
        ? [0, k.height * (below ? 0.38 : 0.04), k.width, k.height * (below ? 0.58 : 0.56)]
        : [k.width * (side === 'left' ? 0 : 0.48), 0, k.width * (side === 'left' ? 0.54 : 0.5), k.height];
    return (
        <>
            <Aura k={k} x={x + w / 2} y={y + h / 2} r={Math.min(w, h) * 0.85} a={0.22} scale={k.pop(0, 14)} />
            <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
        </>
    );
}

// ---- product reveals ----

/** Placeholder app content for reveal scenes: sidebar, hero block and rows. */
const MockUi = ({ p, k, label = '', index = 0 }: { p: LaunchProps; k: Kit; label?: string; index?: number }) => (
    <Screen p={p} k={k} index={index} fallback={<MockPlaceholder k={k} label={label} />} />
);
const MockPlaceholder = ({ k, label }: { k: Kit; label: string }) => (
    <div style={{ display: 'flex', height: '100%', background: `linear-gradient(160deg, ${k.c.surface}, ${k.c.bg})` }}>
        <div style={{ width: '18%', padding: k.u * 1.6, display: 'flex', flexDirection: 'column', gap: k.u * 1.2, borderRight: `1px solid ${al(k.c.muted, 0.2)}` }}>
            {[70, 90, 60, 80].map((w, i) => <div key={i} style={{ height: k.u * 1.4, width: `${w}%`, borderRadius: k.u, background: i === 0 ? k.c.accent : al(k.c.muted, 0.3) }} />)}
        </div>
        <div style={{ flex: 1, padding: k.u * 2.2, display: 'flex', flexDirection: 'column', gap: k.u * 1.4 }}>
            <div style={{ color: k.c.muted, fontSize: k.tx * 1.7 }}>{label}</div>
            <div style={{ flex: 1, borderRadius: k.u * 1.2, background: `linear-gradient(135deg, ${al(k.c.accent, 0.65)}, ${al(k.c.accent, 0.1)})` }} />
            <div style={{ display: 'flex', gap: k.u }}>{[60, 38, 26].map((w, i) => <div key={i} style={{ height: k.u * 2.4, width: `${w}%`, borderRadius: k.u, background: al(k.c.text, i ? 0.13 : 0.27) }} />)}</div>
        </div>
    </div>
);

export function DeviceRise(p: LaunchProps) {
    const k = useKit(p);
    const rise = k.pop(0.05, 11);
    const w = k.width * (k.stacked ? 0.84 : 0.46);
    const bob = Math.sin(k.s * 1.2) * k.u * 0.35;
    const glare = k.ramp(0.5, 1.4, -30, 130);
    return (
        <Stage p={p}>
            <Slot k={k}>
                <div style={{ perspective: k.u * 110, position: 'relative' }}>
                    <div style={{ width: w, transformOrigin: '50% 100%', opacity: Math.min(1, rise * 3), transform: `translateY(${bob}px) rotateX(${(1 - rise) * 48}deg)` }}>
                        <div style={{ padding: k.u * 0.9, borderRadius: k.u * 2, background: 'linear-gradient(#2b3045, #0e111b)', border: `1px solid ${al(k.c.muted, 0.45)}`, boxShadow: `0 ${k.u * 4}px ${k.u * 10}px #000a, 0 0 ${k.u * 9}px ${al(k.c.accent, 0.28)}` }}>
                            <div style={{ position: 'relative', height: w * 0.6, borderRadius: k.u * 1.2, overflow: 'hidden' }}>
                                <MockUi p={p} k={k} label={p.headline} />
                                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${glare - 14}%, ${al(k.c.text, 0.16)} ${glare}%, transparent ${glare + 14}%)` }} />
                            </div>
                        </div>
                        <div style={{ height: k.u * 1.5, margin: `0 -${k.u * 3}px`, borderRadius: `0 0 ${k.u * 3}px ${k.u * 3}px`, background: 'linear-gradient(#aeb8d5, #6b7391)', boxShadow: `0 ${k.u * 2}px ${k.u * 4}px #0009` }} />
                    </div>
                </div>
            </Slot>
            <Lockup k={k} p={p} t0={0.5} />
        </Stage>
    );
}

export function SpotlightCard(p: LaunchProps) {
    const k = useKit(p);
    const a = k.pop(0.05, 12);
    const sx = 50 + 40 * Math.sin(k.s * 1.2 - 1.6);
    const sy = 45 + 30 * Math.sin(k.s * 0.9 + 0.5);
    const flash = k.s > 0.4 ? Math.exp(-(k.s - 0.4) * 5) : 0;
    const r = k.u * 2.4;
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.85} a={0.22 + flash * 0.2} scale={a} />
            <div style={{ perspective: k.u * 120, width: k.stacked ? '84%' : '60%', ...enter(k, 0.05, { y: 5, scale: 0.06 }) }}>
                <div style={{ padding: 1.5, borderRadius: r, background: `radial-gradient(circle at ${sx}% ${sy}%, ${k.c.accent}, ${al(k.c.muted, 0.25)} 45%)`, boxShadow: `0 ${k.u * 4}px ${k.u * 10}px #000a, 0 0 ${k.u * (5 + flash * 8)}px ${al(k.c.accent, 0.3 + flash * 0.3)}`, transform: `rotateY(${(sx - 50) * 0.07}deg) rotateX(${(50 - sy) * 0.05}deg)` }}>
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: r - 1.5, padding: `${k.u * 8}px ${k.u * 5}px`, background: `radial-gradient(${al(k.c.muted, 0.14)} 1px, transparent 1px) 0 0 / ${k.u * 2.6}px ${k.u * 2.6}px, linear-gradient(150deg, ${k.c.surface}, ${k.c.bg})` }}>
                        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at ${sx}% ${sy}%, ${al(k.c.accent, 0.3)}, transparent 42%)` }} />
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 2.4 }}>
                            <div style={{ color: k.c.accent, fontSize: k.tx * 2.3, fontWeight: 700, letterSpacing: k.u * 0.4, textTransform: 'uppercase', ...enter(k, 0.2) }}>{p.eyebrow}</div>
                            <div style={{ fontFamily: k.display, fontSize: k.tx * 8 * (k.portrait ? 0.9 : 1), fontWeight: 850, lineHeight: 1.05, letterSpacing: -k.u * 0.28, textAlign: 'center', textWrap: 'balance', ...enter(k, 0.3, { y: 4 }) }}>{p.headline}</div>
                            <div style={{ color: k.c.muted, fontSize: k.tx * 3, textAlign: 'center', textWrap: 'balance', ...enter(k, 0.5) }}>{p.subtitle}</div>
                        </div>
                    </div>
                </div>
            </div>
        </Stage>
    );
}

export function BentoTour(p: LaunchProps) {
    const k = useKit(p);
    const tiles = listOf(p.items, [], 6);
    const FIRST = 0.9, STEP = 0.5;
    return (
        <Stage p={p}>
            <Lockup k={k} p={p} t0={0.1} place={k.stacked ? 'top' : 'sideLeft'} size={5} />
            <Slot k={k} side="right" below>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: k.u * 1.6, width: k.stacked ? '88%' : '92%' }}>
                    {tiles.map((tile, i) => {
                        const a = k.pop(0.15 + i * 0.09, 12);
                        const hl = clamp01(k.pop(FIRST + i * STEP, 16)) * (1 - clamp01(k.pop(FIRST + (i + 1) * STEP, 16)));
                        return (
                            <div key={i} style={{ ...card(k, { padding: k.u * 2.4, borderColor: al(k.c.accent, 0.15 + hl * 0.85), boxShadow: `0 ${k.u * (2 + hl * 2)}px ${k.u * 8}px #0008, 0 0 ${k.u * 6 * hl}px ${al(k.c.accent, 0.5)}` }), opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * k.u * 5 - hl * k.u * 0.6}px) scale(${0.94 + 0.06 * a + hl * 0.03})` }}>
                                <div style={{ width: k.u * 4.4, height: k.u * 4.4, borderRadius: k.u * 1.2, background: `linear-gradient(135deg, ${al(k.c.accent, 0.5 + hl * 0.5)}, ${al(k.c.accent, 0.25 + hl * 0.5)})`, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: k.tx * 2.4 }}>{i + 1}</div>
                                <div style={{ marginTop: k.u * 1.4, fontSize: k.tx * 2.9, fontWeight: 700 }}>{tile.text}</div>
                                {tile.detail && <div style={{ marginTop: k.u * 0.5, fontSize: k.tx * 2, color: k.c.muted }}>{tile.detail}</div>}
                            </div>
                        );
                    })}
                </div>
            </Slot>
        </Stage>
    );
}

export function OrbitGallery(p: LaunchProps) {
    const k = useKit(p);
    const nodes = listOf(p.items, [], 6);
    const [cx, cy] = [k.width / 2, k.height * (k.stacked ? 0.66 : 0.5)];
    const [rx, ry] = [k.width * (k.stacked ? 0.36 : 0.4), k.height * (k.stacked ? 0.1 : 0.2)];
    const spin = TAU * 1.1 * (1 - easeOut((k.s - 0.1) / 2.2)) + k.s * 0.05;
    const chips = nodes.map((node, i) => {
        const a = (i / nodes.length) * TAU + spin - 0.6;
        const depth = (Math.sin(a) + 1) / 2;
        const pop = k.pop(0.1 + i * 0.06, 12);
        return { depth, el: (
            <div key={i} style={{ position: 'absolute', left: cx, top: cy, ...card(k, { borderRadius: k.u * 1.4, padding: `${k.u * 1.3}px ${k.u * 2.4}px`, boxShadow: `0 ${k.u * 2}px ${k.u * 5}px #0008, 0 0 ${k.u * 4 * depth}px ${al(k.c.accent, 0.35)}` }), display: 'flex', alignItems: 'center', gap: k.u * 1.2, fontSize: k.tx * 3.1, fontWeight: 650, whiteSpace: 'nowrap', opacity: (0.4 + depth * 0.6) * Math.min(1, pop * 1.5), transform: `translate(-50%, -50%) translate(${Math.cos(a) * rx * pop}px, ${Math.sin(a) * ry * pop}px) scale(${0.72 + depth * 0.36})` }}>
                <span style={{ width: k.u * 1.2, height: k.u * 1.2, borderRadius: '50%', background: k.c.accent }} />{node.text}
            </div>
        ) };
    });
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={shortSide(k) * 0.8} a={0.22} scale={k.pop(0, 14)} />
            <Canvas k={k}>
                <ellipse cx={cx} cy={cy} rx={rx * k.pop(0, 14)} ry={ry * k.pop(0, 14)} fill="none" stroke={al(k.c.accent, 0.35)} strokeWidth={k.u * 0.2} strokeDasharray={`${k.u * 1.4} ${k.u * 1.2}`} />
            </Canvas>
            {chips.filter((c) => c.depth < 0.5).map((c) => c.el)}
            <Lockup k={k} p={p} t0={0.4} place={k.stacked ? 'top' : 'center'} maxW={k.width * 0.3} size={k.stacked ? 6.4 : 5.2} />
            {chips.filter((c) => c.depth >= 0.5).map((c) => c.el)}
        </Stage>
    );
}

export function WindowFan(p: LaunchProps) {
    const k = useKit(p);
    const wins = listOf(p.items, [], 5);
    const mid = (wins.length - 1) / 2;
    const w = k.u * (k.stacked ? 46 : 40);
    return (
        <Stage p={p}>
            <Slot k={k}>
                <div style={{ position: 'relative', width: '100%', height: w * 0.8 }}>
                    {wins.map((win, i) => {
                        const off = i - mid;
                        const a = k.pop(0.1 + Math.abs(off) * 0.1, 11);
                        return (
                            <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: w, height: w * 0.68, zIndex: 10 - Math.round(Math.abs(off) * 2), transformOrigin: '50% 150%', opacity: Math.min(1, a * 2), transform: `translate(-50%, -50%) translateX(${off * a * k.u * (k.stacked ? 9 : 12.5)}px) rotate(${off * a * 5.5}deg)` }}>
                                <Win k={k} title={win.text} width="100%" height="100%">
                                    <MockUi p={p} k={k} index={i} label={win.detail ?? ''} />
                                    <div style={{ position: 'absolute', inset: 0, background: al(k.c.bg, 0.18 * Math.abs(off)) }} />
                                </Win>
                            </div>
                        );
                    })}
                </div>
            </Slot>
            <Lockup k={k} p={p} t0={0.5} />
        </Stage>
    );
}

// ---- UI demos ----

/** The window every demo plays in; the headline lockup sits below it. Children are laid out inside the window body. */
function DemoFrame({ p, k, title, children, width = 66, height = 0.6 }: { p: LaunchProps; k: Kit; title: string; children: ReactNode; width?: number; height?: number }) {
    const w = k.stacked ? 90 : width;
    const h = k.stacked ? 0.44 : height;
    const sheen = k.ramp(0.15, 1, -30, 130);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height * (0.07 + h / 2)} r={shortSide(k) * 0.9} a={0.24} scale={k.pop(0, 14)} />
            <div style={{ position: 'absolute', left: `${(100 - w) / 2}%`, top: k.stacked ? '7%' : '6%', width: `${w}%`, height: k.height * h, ...enter(k, 0, { y: 4, scale: 0.06, damping: 12 }) }}>
                <Win k={k} title={title} width="100%" height="100%">{children}</Win>
                <div style={{ position: 'absolute', inset: 0, borderRadius: k.u * 1.8, pointerEvents: 'none', background: `linear-gradient(105deg, transparent ${sheen - 12}%, ${al(k.c.text, 0.08)} ${sheen}%, transparent ${sheen + 12}%)` }} />
            </div>
            <Lockup k={k} p={p} t0={0.4} place="bottom" size={4.4} />
        </Stage>
    );
}

const keycap = (k: Kit): CSSProperties => ({ width: k.u * 7, height: k.u * 7, display: 'grid', placeItems: 'center', borderRadius: k.u * 1.4, fontSize: k.tx * 3.4, fontWeight: 700 });

export function CommandPalette(p: LaunchProps) {
    const k = useKit(p);
    const actions = listOf(p.items, [], 5);
    const query = 'new';
    const RUN = 2.3;
    const open = k.pop(0.55, 13);
    const typing = k.ramp(0.95, 1.45);
    const close = k.ramp(RUN + 0.25, RUN + 0.55);
    const run = k.pop(RUN, 20);
    const toast = k.pop(RUN + 0.2, 13);
    const has = (a: { text: string }) => a.text.toLowerCase().includes(query);
    const shown = typing < 1 ? actions : [...actions].sort((a, b) => Number(has(b)) - Number(has(a)));
    return (
        <DemoFrame p={p} k={k} title="Workspace">
            <MockUi p={p} k={k} />
            <div style={{ position: 'absolute', inset: 0, background: al(k.c.bg, 0.6), opacity: open * (1 - close) }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: k.u * 1.4, opacity: k.ramp(0.1, 0.25) * (1 - clamp01(open * 3)) }}>
                {['⌘', 'K'].map((key) => <div key={key} style={{ ...card(k, { ...keycap(k), borderColor: k.c.accent, transform: `translateY(${k.s > 0.3 ? k.u * 0.4 : 0}px)` }) }}>{key}</div>)}
            </div>
            <div style={{ ...card(k, { position: 'absolute', left: '50%', top: '12%', width: k.stacked ? '86%' : '58%', overflow: 'hidden', background: k.c.surface, borderColor: al(k.c.accent, 0.5), boxShadow: `0 ${k.u * 4}px ${k.u * 12}px #000a, 0 0 ${k.u * 6}px ${al(k.c.accent, 0.25)}` }), opacity: Math.min(1, open * 1.6) * (1 - close), transform: `translateX(-50%) translateY(${(1 - open) * -k.u * 2 + close * k.u}px) scale(${0.94 + 0.06 * open - 0.03 * close})` }}>
                <div style={{ padding: `${k.u * 1.8}px ${k.u * 2.4}px`, borderBottom: `1px solid ${al(k.c.muted, 0.2)}`, fontSize: k.tx * 2.6 }}>
                    <span style={{ color: k.c.muted }}>⌘ </span>{typed(query, typing)}<span style={{ color: k.c.accent, opacity: k.frame % 16 < 9 ? 1 : 0 }}>|</span>
                </div>
                {shown.slice(0, 4).map((a, i) => (
                    <div key={a.text} style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.4, padding: `${k.u * 1.3}px ${k.u * 2.4}px`, fontSize: k.tx * 2.3, background: i === 0 ? al(k.c.accent, 0.28 + 0.5 * run) : 'transparent', opacity: k.pop(0.7 + i * 0.05, 16) }}>
                        <span style={{ width: k.u * 2.6, height: k.u * 2.6, borderRadius: k.u * 0.7, background: al(k.c.accent, 0.35) }} />
                        <span style={{ flex: 1 }}>{a.text}</span>
                        {a.detail && <span style={{ color: k.c.muted, fontSize: k.tx * 1.9, padding: `0 ${k.u * 0.8}px`, borderRadius: k.u * 0.6, border: `1px solid ${al(k.c.muted, 0.35)}` }}>{a.detail}</span>}
                    </div>
                ))}
            </div>
            <div style={{ ...card(k, { position: 'absolute', right: '4%', bottom: '8%', display: 'flex', alignItems: 'center', gap: k.u * 1.4, padding: `${k.u * 1.4}px ${k.u * 2.4}px`, borderColor: k.c.accent }), fontSize: k.tx * 2.3, opacity: Math.min(1, toast * 1.6), transform: `translateY(${(1 - toast) * k.u * 3}px)` }}>
                <Check k={k} size={3} progress={k.ramp(RUN + 0.3, RUN + 0.6)} />{actions[0]?.text} done
            </div>
        </DemoFrame>
    );
}

export function ToastCascade(p: LaunchProps) {
    const k = useKit(p);
    const toasts = listOf(p.items, [], 4);
    return (
        <Stage p={p}>
            <Lockup k={k} p={p} t0={0.1} place={k.stacked ? 'top' : 'sideLeft'} size={5.4} />
            <Slot k={k} side="right" below>
                <div style={{ display: 'flex', flexDirection: 'column', gap: k.u * 1.6, width: k.stacked ? '88%' : '86%' }}>
                    {toasts.map((t, i) => {
                        const at = 0.25 + i * 0.3;
                        const a = k.pop(at, 12);
                        return (
                            <div key={i} style={{ ...card(k, { position: 'relative', overflow: 'hidden', borderRadius: k.u * 1.4, display: 'flex', alignItems: 'center', gap: k.u * 2, padding: `${k.u * 2}px ${k.u * 2.4}px` }), opacity: Math.min(1, a * 1.6), transform: `translateX(${(1 - a) * k.u * 14}px) scale(${0.95 + 0.05 * a})` }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: k.u * 0.5, background: k.c.accent }} />
                                <Check k={k} size={4} progress={k.ramp(at + 0.2, at + 0.5)} />
                                <div><div style={{ fontSize: k.tx * 2.7, fontWeight: 700 }}>{t.text}</div>{t.detail && <div style={{ fontSize: k.tx * 2.1, color: k.c.muted }}>{t.detail}</div>}</div>
                                <div style={{ position: 'absolute', left: 0, bottom: 0, height: k.u * 0.35, width: `${100 - 65 * k.ramp(at + 0.3, 2.6)}%`, background: al(k.c.accent, 0.6) }} />
                            </div>
                        );
                    })}
                </div>
            </Slot>
        </Stage>
    );
}

export function KanbanDrag(p: LaunchProps) {
    const k = useKit(p);
    const cols = ['To do', 'Doing', 'Done'];
    const cards = listOf(p.items, [], 4);
    const GRAB = 0.7, DROP = 1.8;
    const left = (col: number) => 4 + col * 32.5;
    const top = (row: number) => 19 + row * 17;
    const [dx, dy] = glide(k, GRAB + 0.1, DROP, [left(0), top(0)], [left(1), top(0)], 9);
    const lift = k.pop(GRAB, 14) * (1 - k.pop(DROP, 14));
    const settle = k.pop(DROP, 12);
    const moving = Math.sin(k.ramp(GRAB + 0.1, DROP) * Math.PI);
    const tile = (text: string, x: number, y: number, extra?: CSSProperties) => (
        <div key={text + x} style={{ ...card(k, { position: 'absolute', left: `${x}%`, top: `${y}%`, width: '28%', height: '14%', padding: `0 ${k.u * 1.4}px`, borderRadius: k.u, display: 'flex', alignItems: 'center', gap: k.u * 1.2, ...extra }), fontSize: k.tx * 2.1 }}>
            <span style={{ width: k.u * 1, height: k.u * 1, borderRadius: '50%', background: k.c.accent, flexShrink: 0 }} />{text}
        </div>
    );
    const press = k.s < DROP - 0.2 ? k.ramp(GRAB, GRAB + 0.35) : k.ramp(DROP, DROP + 0.35);
    const [cursorX, cursorY] = k.s < GRAB + 0.1 ? glide(k, 0.05, GRAB, [75, 85], [left(0) + 12, top(0) + 7]) : [dx + 12, dy + 7];
    return (
        <DemoFrame p={p} k={k} title="Board">
            {cols.map((name, ci) => {
                const hl = ci === 1 ? settle * (1 - k.ramp(DROP + 0.4, DROP + 1)) : 0;
                const count = cards.filter((_, i) => (i === 0 ? (k.s > DROP ? 1 : 0) : i % 2 ? 2 : 0) === ci).length;
                return (
                    <div key={name} style={{ position: 'absolute', left: `${left(ci) - 1.5}%`, top: '4%', width: '31%', bottom: '4%', borderRadius: k.u * 1.2, background: al(k.c.bg, 0.55), border: `1px solid ${al(hl ? k.c.accent : k.c.muted, hl ? 0.9 * hl + 0.1 : 0.2)}`, boxShadow: hl ? `0 0 ${k.u * 4 * hl}px ${al(k.c.accent, 0.4)}` : undefined, ...enter(k, 0.1 + ci * 0.06, { y: 2 }) }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${k.u * 1.2}px ${k.u * 1.4}px`, color: k.c.muted, fontSize: k.tx * 1.9, fontWeight: 700 }}>{name}<span style={{ color: k.c.text }}>{count}</span></div>
                    </div>
                );
            })}
            {cards.map((c, i) => {
                if (i === 0) return null;
                // Odd cards sit in "Done"; even ones in "To do" slide up once the first card leaves.
                const [col, row] = i % 2 ? [2, (i - 1) / 2] : [0, lerp(i / 2, i / 2 - 1, settle)];
                return tile(c.text, left(col), top(row), enter(k, 0.2 + i * 0.07, { y: 2 }));
            })}
            {cards[0] && tile(cards[0].text, dx, dy, { borderColor: k.c.accent, zIndex: 9, boxShadow: `0 ${k.u * (1 + lift * 3)}px ${k.u * (3 + lift * 7)}px #000a, 0 0 ${k.u * 3 * lift}px ${al(k.c.accent, 0.5)}`, transform: `rotate(${-5 * moving}deg) scale(${1 + 0.05 * lift})` })}
            <Cursor k={k} x={cursorX} y={cursorY} press={press} />
        </DemoFrame>
    );
}

export function FormFillSuccess(p: LaunchProps) {
    const k = useKit(p);
    const fields = listOf(p.items, [], 4);
    const T0 = 0.45, STEP = 0.55;
    const typedEnd = T0 + fields.length * STEP;
    const PRESS = typedEnd + 0.25;
    const sent = k.pop(PRESS + 0.2, 13);
    const row = (i: number) => 6 + i * 18;
    const btn = row(fields.length);
    const [cx, cy] = k.s < typedEnd - 0.1 ? glide(k, 0.05, 0.4, [82, 14], [56, row(0) + 11]) : glide(k, typedEnd - 0.05, PRESS, [56, row(0) + 11], [58, btn + 7]);
    return (
        <DemoFrame p={p} k={k} title="New account" width={52} height={0.62}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - 0.9 * k.ramp(PRESS + 0.15, PRESS + 0.4) }}>
                {fields.map((f, i) => {
                    const t0 = T0 + i * STEP;
                    const focus = k.s > t0 && k.s < t0 + STEP;
                    return (
                        <div key={i} style={{ position: 'absolute', left: '8%', width: '84%', top: `${row(i)}%`, height: '16%', ...enter(k, 0.1 + i * 0.05, { y: 2 }) }}>
                            <div style={{ color: k.c.muted, fontSize: k.tx * 1.8, marginBottom: k.u * 0.6 }}>{f.text}</div>
                            <div style={{ display: 'flex', alignItems: 'center', padding: `${k.u * 1.2}px ${k.u * 1.6}px`, borderRadius: k.u, border: `1px solid ${focus ? k.c.accent : al(k.c.muted, 0.27)}`, background: al(k.c.bg, 0.67), boxShadow: focus ? `0 0 ${k.u * 2.4}px ${al(k.c.accent, 0.35)}` : undefined, fontSize: k.tx * 2.3 }}>
                                <span style={{ flex: 1 }}>{typed(f.detail ?? '', k.ramp(t0, t0 + STEP * 0.85))}{focus && <span style={{ color: k.c.accent }}>|</span>}</span>
                                {k.s > t0 + STEP * 0.85 && <Check k={k} size={2.8} progress={k.ramp(t0 + STEP * 0.85, t0 + STEP + 0.1)} />}
                            </div>
                        </div>
                    );
                })}
                <div style={{ position: 'absolute', left: '8%', width: '84%', top: `${btn}%`, height: '14%', display: 'grid', placeItems: 'center', borderRadius: k.u, background: `linear-gradient(${k.c.accent}, ${al(k.c.accent, 0.8)})`, boxShadow: `0 ${k.u}px ${k.u * 3}px ${al(k.c.accent, 0.4)}`, fontWeight: 750, fontSize: k.tx * 2.4, transform: `scale(${k.s > PRESS && k.s < PRESS + 0.15 ? 0.96 : 1})`, ...enter(k, 0.3, { y: 2 }) }}>Create account</div>
            </div>
            {sent > 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: k.u * 1.5, opacity: Math.min(1, sent * 1.6), transform: `scale(${0.8 + 0.2 * sent})` }}>
                    <Hit k={k} scene="FormFillSuccess" t0={PRESS + 0.2} r={22} />
                    <Check k={k} size={12} progress={k.ramp(PRESS + 0.3, PRESS + 0.7)} />
                    <div style={{ fontSize: k.tx * 3.2, fontWeight: 750 }}>You're in</div>
                </div>
            )}
            {k.s < PRESS + 0.25 && <Cursor k={k} x={cx} y={cy} press={k.s < 0.8 ? k.ramp(0.35, 0.7) : k.ramp(PRESS, PRESS + 0.3)} />}
        </DemoFrame>
    );
}

export function SelectAskAi(p: LaunchProps) {
    const k = useKit(p);
    const words = 'Our launch plan covers the teaser, the product reveal and a clear call to action for every channel.'.split(' ');
    const SEL = 9;
    const select = k.ramp(0.5, 1.1);
    const bar = k.pop(1.15, 13);
    const panel = k.pop(1.85, 13);
    const answer = k.ramp(2, k.seconds - 0.9);
    const [cx, cy] = k.s < 0.5 ? glide(k, 0.05, 0.5, [70, 40], [8, 14]) : k.s < 1.15 ? [8 + 52 * easeOut(select), 14] : glide(k, 1.2, 1.7, [60, 14], [17, 30]);
    return (
        <DemoFrame p={p} k={k} title="Draft.md">
            <div style={{ padding: k.u * 3.4, fontSize: k.tx * 2.7, lineHeight: 1.6, ...enter(k, 0.1, { y: 2 }) }}>
                {words.map((w, i) => <span key={i} style={{ background: i < SEL && i < Math.ceil(select * SEL) ? al(k.c.accent, 0.4) : 'transparent', borderRadius: 4 }}>{w}{' '}</span>)}
            </div>
            <div style={{ ...card(k, { position: 'absolute', left: '6%', top: '26%', display: 'flex', gap: k.u * 1.4, padding: k.u * 1.2, borderRadius: k.u * 1.2, borderColor: al(k.c.accent, 0.5) }), opacity: Math.min(1, bar * 1.6), transform: `translateY(${(1 - bar) * k.u * 1.5}px) scale(${0.92 + 0.08 * bar})` }}>
                {['✦ Ask AI', 'Rewrite', 'Shorten'].map((t, i) => <Pill key={t} k={k} active={i === 0} style={{ fontSize: k.tx * 2 }}>{t}</Pill>)}
            </div>
            <div style={{ ...card(k, { position: 'absolute', left: '6%', right: '6%', bottom: '6%', padding: k.u * 2.2, borderColor: al(k.c.accent, 0.55), boxShadow: `0 ${k.u * 3}px ${k.u * 9}px #000a, 0 0 ${k.u * 5}px ${al(k.c.accent, 0.25)}` }), fontSize: k.tx * 2.4, opacity: Math.min(1, panel * 1.6), transform: `translateY(${(1 - panel) * k.u * 3}px)` }}>
                <div style={{ color: k.c.accent, fontWeight: 700, fontSize: k.tx * 1.9, marginBottom: k.u * 0.8 }}>✦ AI</div>{typed(p.subtitle, answer)}<span style={{ color: k.c.accent }}>▍</span>
            </div>
            <Cursor k={k} x={cx} y={cy} press={k.s < 1 ? k.ramp(0.45, 0.8) : k.ramp(1.65, 2)} />
        </DemoFrame>
    );
}

export function DropFileUpload(p: LaunchProps) {
    const k = useKit(p);
    const file = p.items[0]?.text || 'launch-plan.pdf';
    const DROP = 1.1;
    const [x, y] = glide(k, 0.15, DROP - 0.05, [80, 76], [50, 46], 8);
    const [rx, ry] = glide(k, DROP + 0.1, DROP + 0.9, [50, 46], [66, 74], 4);
    const over = k.pop(0.7, 14);
    const gone = k.ramp(DROP, DROP + 0.25);
    const up = k.pop(DROP + 0.1, 13);
    const progress = k.ramp(DROP + 0.3, DROP + 1.5);
    const fileCard = (style: CSSProperties) => <div style={{ ...card(k, { display: 'flex', alignItems: 'center', gap: k.u * 1.4, padding: `${k.u}px ${k.u * 1.8}px`, borderRadius: k.u, borderColor: k.c.accent, ...style }), fontSize: k.tx * 2 }}>▤ {file}</div>;
    return (
        <DemoFrame p={p} k={k} title="Upload">
            <div style={{ position: 'absolute', inset: '5%', display: 'grid', placeItems: 'center', borderRadius: k.u * 1.6, border: `2px dashed ${al(k.c.accent, 0.3 + 0.7 * over)}`, background: al(k.c.accent, 0.03 + 0.1 * over), boxShadow: `inset 0 0 ${k.u * 8 * over}px ${al(k.c.accent, 0.2)}`, ...enter(k, 0.1, { y: 2 }) }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 1.4, fontSize: k.tx * 2.6, color: k.c.muted, opacity: 1 - gone }}>
                    <div style={{ fontSize: k.tx * 6, color: k.c.accent, transform: `translateY(${-over * k.u * 1}px)` }}>⇪</div>{over > 0.5 ? 'Release to upload' : 'Drop a file here'}
                </div>
                {up > 0 && (
                    <div style={{ ...card(k, { position: 'absolute', left: '20%', right: '20%', display: 'flex', alignItems: 'center', gap: k.u * 1.6, padding: k.u * 1.8, borderRadius: k.u * 1.2 }), opacity: Math.min(1, up * 1.6), transform: `scale(${0.85 + 0.15 * up})` }}>
                        <div style={{ width: k.u * 5, height: k.u * 5, borderRadius: k.u, background: al(k.c.accent, progress >= 1 ? 1 : 0.4), display: 'grid', placeItems: 'center', fontSize: k.tx * 2.4 }}>{progress >= 1 ? '✓' : '▤'}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: k.tx * 2.3, fontWeight: 650 }}>{file}</div>
                            <div style={{ marginTop: k.u, height: k.u * 0.9, borderRadius: k.u, background: al(k.c.muted, 0.2) }}><div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: k.u, background: k.c.accent, boxShadow: `0 0 ${k.u * 2}px ${al(k.c.accent, 0.6)}` }} /></div>
                        </div>
                    </div>
                )}
            </div>
            {k.s < DROP + 0.25 && fileCard({ position: 'absolute', left: `${x + 1.5}%`, top: `${y + 2.5}%`, zIndex: 9, opacity: 1 - gone, transform: `rotate(${(1 - k.ramp(0.15, DROP)) * 8}deg) scale(${1 - 0.3 * gone})` })}
            <Cursor k={k} x={k.s < DROP + 0.1 ? x : rx} y={k.s < DROP + 0.1 ? y : ry} press={k.s < 0.5 ? k.ramp(0.1, 0.4) : k.ramp(DROP, DROP + 0.35)} />
        </DemoFrame>
    );
}

export function MultiplayerCursors(p: LaunchProps) {
    const k = useKit(p);
    const people = listOf(p.items, [], 4);
    const colours = [k.c.accent, '#ff6b9a', '#5bd6a0', '#f4c655'];
    const blocks = [[8, 20, 32, 28], [48, 14, 42, 34], [20, 60, 56, 28]];
    const settle = k.ramp(k.seconds - 1.4, k.seconds - 0.5);
    return (
        <DemoFrame p={p} k={k} title="Shared canvas">
            {blocks.map(([x, y, w, h], i) => <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, borderRadius: k.u, background: `linear-gradient(135deg, ${al(k.c.text, 0.1)}, ${al(k.c.text, 0.04)})`, border: `1px solid ${al(k.c.muted, 0.25)}`, ...enter(k, i * 0.1, { y: 2 }) }} />)}
            <div style={{ position: 'absolute', right: '3%', top: '4%', display: 'flex' }}>
                {people.map((person, i) => <div key={i} style={{ width: k.u * 3.4, height: k.u * 3.4, marginLeft: -k.u * 0.8, borderRadius: '50%', background: colours[i % 4], border: `2px solid ${k.c.surface}`, display: 'grid', placeItems: 'center', color: '#10131c', fontWeight: 800, fontSize: k.tx * 1.6, transform: `scale(${k.pop(0.2 + i * 0.1, 10)})` }}>{person.text.charAt(0)}</div>)}
            </div>
            {people.map((person, i) => {
                const [bx, by, bw, bh] = blocks[i % 3];
                const a = k.s * (0.7 + i * 0.18) + i * 2;
                const x = lerp(50 + Math.cos(a) * (28 - i * 3), bx + bw * 0.7, settle);
                const y = lerp(50 + Math.sin(a * 1.3) * (24 - i * 2), by + bh * 0.6, settle);
                const claim = k.pop(0.7 + i * 0.25, 14);
                return (
                    <div key={i} style={{ position: 'absolute', inset: 0, zIndex: 10 + i }}>
                        <div style={{ position: 'absolute', left: `${bx}%`, top: `${by}%`, width: `${bw}%`, height: `${bh}%`, borderRadius: k.u, border: `2px solid ${colours[i % 4]}`, opacity: claim, transform: `scale(${1.04 - 0.04 * claim})` }} />
                        <div style={{ opacity: k.pop(0.1 + i * 0.12) }}>
                            <Cursor k={k} x={x} y={y} />
                            <div style={{ position: 'absolute', left: `calc(${x}% + ${k.u * 2.6}px)`, top: `calc(${y}% + ${k.u * 2.6}px)`, padding: `${k.u * 0.5}px ${k.u * 1.2}px`, borderRadius: k.u, background: colours[i % 4], color: '#10131c', fontSize: k.tx * 1.8, fontWeight: 700, whiteSpace: 'nowrap' }}>{person.text}</div>
                        </div>
                    </div>
                );
            })}
        </DemoFrame>
    );
}

export function ThemeRipple(p: LaunchProps) {
    const k = useKit(p);
    const ORIGIN: Pt = [92, 9];
    const ripple = easeOut(k.ramp(0.9, 2));
    const [cx, cy] = glide(k, 0.1, 0.8, [55, 72], ORIGIN, 6);
    const ui = (light: boolean) => {
        const [bg, fg, panel, line, bar] = light ? ['#f4f6fb', '#141828', 'linear-gradient(135deg, #fff, #dfe5f6)', '#c7cee4', '#c7cee4'] : [k.c.bg, k.c.text, `linear-gradient(135deg, ${k.c.surface}, ${k.c.bg})`, al(k.c.muted, 0.2), al(k.c.muted, 0.27)];
        return (
            <div style={{ position: 'absolute', inset: 0, padding: k.u * 3, display: 'flex', flexDirection: 'column', gap: k.u * 2, background: bg, color: fg }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: k.display, fontWeight: 800, fontSize: k.tx * 3.6 }}>{p.eyebrow || 'Dashboard'}</div>
                    <div style={{ width: k.u * 6, height: k.u * 3.2, borderRadius: 999, background: light ? '#141828' : k.c.accent, padding: k.u * 0.4 }}>
                        <div style={{ width: k.u * 2.4, height: k.u * 2.4, borderRadius: '50%', background: '#fff', transform: `translateX(${light ? k.u * 2.8 : 0}px)` }} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: k.u * 1.6 }}>
                    {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: k.u * 6, borderRadius: k.u * 1.2, background: panel, border: `1px solid ${line}`, padding: k.u * 1.4 }}><div style={{ height: k.u * 1, width: '50%', borderRadius: k.u, background: bar }} /><div style={{ height: k.u * 1.8, width: '70%', marginTop: k.u * 1, borderRadius: k.u, background: i ? bar : k.c.accent }} /></div>)}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: k.u * 1.4, borderRadius: k.u * 1.4, background: panel, border: `1px solid ${line}`, padding: k.u * 2.4 }}>
                    {Array.from({ length: 9 }, (_, i) => <div key={i} style={{ flex: 1, height: `${30 + 60 * ((i * 37) % 11) / 10}%`, borderRadius: k.u * 0.6, background: i === 6 ? k.c.accent : bar }} />)}
                </div>
            </div>
        );
    };
    const reveal = (r: number) => ({ position: 'absolute', inset: 0, clipPath: `circle(${r * 150}% at ${ORIGIN[0]}% ${ORIGIN[1]}%)` }) as CSSProperties;
    return (
        <DemoFrame p={p} k={k} title="Settings">
            {ui(false)}
            <div style={{ ...reveal(ripple + 0.015), background: k.c.accent, opacity: 1 - ripple }} />
            <div style={reveal(ripple)}>{ui(true)}</div>
            <Cursor k={k} x={cx} y={cy} press={k.ramp(0.8, 1.2)} />
        </DemoFrame>
    );
}
