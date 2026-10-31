// Build-and-demo scenes: drawn product UI (typing, tables, timelines), code and AI moments, and the scroll-of-doom problem beat.
import type { CSSProperties } from 'react';
import { Check, Cursor, Pill, Win, card, easeOut, mono, numberIn, seeded, typed, useKit, type Kit, type LaunchProps } from './kit';
import { al, clamp01, glow, lerp, polar, TAU } from './shapes';
import { Caret, Dot, Edge, Row, Scene, Tile, TypedText, Wires, clip, easeInOut, initial, kick, some, tabular, type Pt } from './buildParts';

const RED = '#ff6b62';
const GREEN = '#5bc58a';
const lineBelow = (k: Kit) => `1px solid ${al(k.c.muted, 0.18)}`;

// ---- UI demo ----

export function UiTypingAutocomplete(p: LaunchProps) {
    const k = useKit(p);
    const options = some(p.items, 4);
    const picked = Math.min(1, options.length - 1);
    const HIT = 2.3;
    const applied = k.s >= HIT;
    const open = easeOut(k.ramp(1.2, 1.5)) * (1 - easeOut(k.ramp(HIT, HIT + 0.25)));
    const rowH = k.u * 6.2;
    const bar = picked * easeInOut(k.ramp(1.6, 2));
    const query = applied ? options[picked].text : typed(p.subtitle, k.ramp(0.2, 1.1));
    const focus = 0.5 + 0.5 * kick(k, HIT, 3);
    return (
        <Scene p={p} k={k} hit={HIT}>
            {() => (
                <Win k={k} title="Search" width="100%">
                    <div style={{ padding: k.u * 2.4, minHeight: rowH * options.length + k.u * 17, fontSize: k.tx * 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.4, padding: `${k.u * 1.6}px ${k.u * 2}px`, borderRadius: k.u * 1.4, background: al(k.c.bg, 0.6), border: `1px solid ${al(k.c.accent, focus)}`, boxShadow: `0 0 ${k.u * (2.5 + 3 * kick(k, HIT, 3))}px ${al(k.c.accent, 0.3)}` }}>
                            <span style={{ color: k.c.muted }}>⌕</span>
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>{query}{!applied && <Caret k={k} />}</span>
                            <span style={{ opacity: easeOut(k.ramp(1.6, 1.8)) * (applied ? 0 : 1) }}><Pill k={k} active>↵</Pill></span>
                        </div>
                        <div style={{ height: rowH * options.length * open, opacity: open, overflow: 'hidden', marginTop: k.u * 1.2 }}>
                            {options.map((o, i) => {
                                const n = o.text.toLowerCase().startsWith(p.subtitle.toLowerCase()) ? p.subtitle.length : 0;
                                const hot = clamp01(1 - Math.abs(i - bar)) * easeOut(k.ramp(1.5, 1.7));
                                return <Row key={i} k={k} hot={hot} style={{ height: rowH }} icon={<span style={{ color: k.c.muted }}>⌕</span>} title={<><b style={{ color: k.c.text }}>{o.text.slice(0, n)}</b>{o.text.slice(n)}</>} />;
                            })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.4, marginTop: k.u * 2, color: k.c.muted, fontSize: k.tx * 2.7, opacity: k.ramp(HIT, HIT + 0.25), transform: `translateY(${(1 - easeOut(k.ramp(HIT, HIT + 0.3))) * k.u * 1.5}px)` }}>
                            <Check k={k} size={3.4} progress={k.ramp(HIT + 0.05, HIT + 0.45)} /> {p.date}
                        </div>
                    </div>
                </Win>
            )}
        </Scene>
    );
}

export function UiTableLiveFill(p: LaunchProps) {
    const k = useKit(p);
    const rows = some(p.items, 7);
    const vals = rows.map((r) => numberIn(r.detail));
    const top = Math.max(1, ...vals);
    const rank = vals.map((v, i) => vals.filter((w, j) => w > v || (w === v && j < i)).length);
    const keep = (i: number) => rank[i] < Math.ceil(rows.length / 2);
    const [CLICK, HIT] = [1.35, 2.5];
    const sort = easeInOut(k.ramp(CLICK, CLICK + 0.8));
    const filter = easeOut(k.ramp(HIT - 0.1, HIT + 0.5));
    const [pad, bar, head, rh] = [k.u * 2, k.u * 6.4, k.u * 4.6, k.u * 6.2];
    const bodyH = pad * 2 + bar + head + rh * rows.length;
    const at = (px: number) => (px / bodyH) * 100;
    return (
        <Scene p={p} k={k} hit={HIT}>
            {(z) => {
                const valueX = ((pad + (z.w - 2 * pad) * 0.6 + k.u * 6) / z.w) * 100;
                const chipX = ((pad + k.u * 17) / z.w) * 100;
                const moving = k.s < 1.9;
                return (
                    <Win k={k} title="Table" width="100%">
                        <div style={{ position: 'relative', height: bodyH, padding: pad, fontSize: k.tx * 2.5 }}>
                            <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: k.u * 1.2, color: k.c.muted }}>
                                Filter
                                <span style={{ transform: `scale(${k.pop(1.9, 11)})`, transformOrigin: 'left', boxShadow: `0 0 ${k.u * 3 * kick(k, HIT, 3)}px ${k.c.accent}` }}><Pill k={k} active>{p.date}</Pill></span>
                            </div>
                            <div style={{ height: head, display: 'grid', gridTemplateColumns: '1.5fr 1fr', alignItems: 'center', borderBottom: lineBelow(k), fontWeight: 700, color: k.c.muted }}>
                                <span>Name</span>
                                <span style={{ color: k.s > CLICK ? k.c.accent : k.c.muted }}>{p.subtitle}{k.s > CLICK ? ' ↓' : ''}</span>
                            </div>
                            <div style={{ position: 'relative', height: rh * rows.length }}>
                                {rows.map((r, i) => {
                                    const inn = easeOut(k.ramp(0.15 + i * 0.1, 0.55 + i * 0.1));
                                    const fade = keep(i) ? 1 : 1 - filter;
                                    return (
                                        <Row key={i} k={k} hot={keep(i) ? filter : 0} icon={<Tile k={k} size={3.8} hot={keep(i) ? filter : 0}>{initial(r.text)}</Tile>} title={r.text}
                                            style={{ position: 'absolute', left: 0, right: 0, top: lerp(i, rank[i], sort) * rh, height: rh, opacity: inn * fade, transform: `translateX(${(1 - inn) * k.u * 5}px) scale(${0.97 + 0.03 * fade})`, borderBottom: lineBelow(k) }}
                                            right={
                                                <span style={{ width: '40%', display: 'flex', alignItems: 'center', gap: k.u, ...tabular }}>
                                                    <i style={{ width: `${(vals[i] / top) * 42 * inn}%`, height: k.u * 0.9, borderRadius: k.u, background: `linear-gradient(90deg, ${al(k.c.accent, 0.3)}, ${k.c.accent})` }} />
                                                    <b style={{ color: k.c.text }}>{r.detail}</b>
                                                </span>
                                            } />
                                    );
                                })}
                            </div>
                            <Cursor k={k} x={moving ? k.ramp(0.4, CLICK, 40, valueX) : k.ramp(1.8, HIT, valueX, chipX)} y={moving ? k.ramp(0.4, CLICK, 85, at(pad + bar + head / 2)) : k.ramp(1.8, HIT, at(pad + bar + head / 2), at(pad + bar / 2))} press={moving ? k.ramp(CLICK, CLICK + 0.4) : k.ramp(HIT - 0.2, HIT + 0.2)} />
                        </div>
                    </Win>
                );
            }}
        </Scene>
    );
}

/** Deterministic waveform bars for an audio clip. */
const Waveform = ({ k, seed }: { k: Kit; seed: number }) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: k.u * 0.3, height: '100%' }}>
        {Array.from({ length: 16 }, (_, j) => <i key={j} style={{ width: k.u * 0.35, height: `${25 + seeded(seed + j) * 70}%`, borderRadius: k.u, background: al(k.c.text, 0.6) }} />)}
    </span>
);

export function UiTimelineAssembly(p: LaunchProps) {
    const k = useKit(p);
    const blocks = some(p.items, 6);
    const HIT = 2.4;
    const laneEnd = [0, 0, 0];
    const placed = blocks.map((b, i) => {
        const lane = i % 3;
        const width = 22 + seeded(i + 3) * 12;
        const left = laneEnd[lane] + 3 + seeded(i) * 5;
        laneEnd[lane] = left + width;
        return { b, lane, width, left };
    });
    const head = easeInOut(k.ramp(0.9, HIT));
    const [laneH, gutter] = [k.u * 8, k.u * 5];
    const clipStyle = (lane: number, lit: number): CSSProperties => ({
        background: lane === 1 ? `linear-gradient(${al(k.c.muted, 0.55)}, ${al(k.c.muted, 0.28)})` : `linear-gradient(${al(k.c.accent, 0.55 + 0.3 * lit)}, ${al(k.c.accent, 0.3 + 0.3 * lit)})`,
        border: `1px solid ${lane === 1 ? al(k.c.muted, 0.7) : k.c.accent}`,
        boxShadow: lit > 0 ? `0 0 ${k.u * 2.4 * lit}px ${al(k.c.accent, 0.55)}` : undefined,
    });
    return (
        <Scene p={p} k={k} hit={HIT}>
            {() => (
                <Win k={k} title="Timeline" width="100%">
                    <div style={{ padding: k.u * 2, fontSize: k.tx * 2 }}>
                        <div style={{ display: 'flex', marginLeft: gutter, height: k.u * 3.6, justifyContent: 'space-between', color: k.c.muted, ...tabular }}>
                            {Array.from({ length: 9 }, (_, i) => <span key={i} style={{ width: 0, overflow: 'visible', whiteSpace: 'nowrap', borderLeft: `1px solid ${al(k.c.muted, 0.35)}`, paddingLeft: k.u * 0.5, height: i % 2 ? '45%' : '100%', fontSize: k.tx * 1.7 }}>{i % 2 ? '' : `0:0${i}`}</span>)}
                        </div>
                        <div style={{ position: 'relative', paddingLeft: gutter }}>
                            {['V1', 'V2', 'A1'].map((name, l) => (
                                <div key={name} style={{ height: laneH, display: 'flex', alignItems: 'center', margin: `${k.u * 0.4}px 0`, borderRadius: k.u, background: al(k.c.muted, 0.08), position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: -gutter, width: gutter - k.u, textAlign: 'center', color: k.c.muted, fontWeight: 700, fontSize: k.tx * 1.8 }}>{name}</span>
                                    <div style={{ position: 'absolute', inset: 0 }}>
                                        {placed.filter((c) => c.lane === l).map(({ b, width, left }) => {
                                            const i = placed.findIndex((c) => c.b === b);
                                            const drop = k.pop(0.15 + i * 0.13, 11);
                                            const lit = clamp01((head * 100 - left) / 8);
                                            return (
                                                <div key={i} style={{ position: 'absolute', top: k.u * 0.6, bottom: k.u * 0.6, left: `${left}%`, width: `${width}%`, borderRadius: k.u * 0.9, padding: `0 ${k.u * 1.1}px`, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 650, opacity: Math.min(1, drop * 3), transform: `translateY(${-(1 - drop) * k.u * 18}px) rotate(${(1 - drop) * (seeded(i + 9) - 0.5) * 12}deg)`, ...clipStyle(l, lit) }}>
                                                    {l === 2 ? <Waveform k={k} seed={i * 17} /> : b.text}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div style={{ position: 'absolute', top: -k.u * 1.2, bottom: 0, left: `calc(${gutter}px + (100% - ${gutter}px) * ${head})`, width: k.u * 0.35, marginLeft: -k.u * 0.17, background: k.c.text, opacity: k.ramp(0.8, 1), boxShadow: `0 0 ${k.u * 2}px ${k.c.accent}` }}>
                                <span style={{ position: 'absolute', top: -k.u * 2.4, left: '50%', transform: 'translateX(-50%)', padding: `${k.u * 0.2}px ${k.u * 0.8}px`, borderRadius: k.u * 0.7, background: k.c.accent, color: k.c.bg, fontWeight: 800, fontSize: k.tx * 1.7, whiteSpace: 'nowrap', ...tabular }}>0:{String(Math.round(head * 8)).padStart(2, '0')}</span>
                            </div>
                        </div>
                    </div>
                </Win>
            )}
        </Scene>
    );
}

export function UiHoldToDeploy(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.8;
    const fill = easeInOut(k.ramp(0.25, HIT));
    const done = easeOut(k.ramp(HIT, HIT + 0.4));
    const burst = k.ramp(HIT, HIT + 0.8);
    const ticks = 40;
    return (
        <Scene p={p} k={k} hit={HIT} lock={{ subtitle: '' }}>
            {(z) => {
                const size = Math.min(z.h * 0.62, z.w * 0.7, k.u * 36);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 3, padding: `${k.u * 2}px 0` }}>
                        <div style={{ position: 'relative', width: size, height: size, transform: `scale(${1 - 0.04 * (1 - fill) * k.ramp(0.2, 0.3) + 0.1 * kick(k, HIT, 7)})` }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                <defs>
                                    <radialGradient id="hold-disc" cx="40%" cy="30%" r="80%"><stop offset="0" stopColor={k.c.surface} /><stop offset="1" stopColor={k.c.bg} /></radialGradient>
                                </defs>
                                <circle cx="50" cy="50" r="37" fill="url(#hold-disc)" stroke={al(k.c.muted, 0.3)} strokeWidth="0.8" style={{ filter: `drop-shadow(0 ${k.u}px ${k.u * 2}px #0008)` }} />
                                {Array.from({ length: ticks }, (_, i) => {
                                    const lit = i / ticks < fill;
                                    const [x0, y0] = polar(50, 50, 44, (i / ticks) * TAU - TAU / 4);
                                    const [x1, y1] = polar(50, 50, lit ? 49 : 47, (i / ticks) * TAU - TAU / 4);
                                    return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={lit ? k.c.accent : al(k.c.muted, 0.35)} strokeWidth="1.1" strokeLinecap="round" />;
                                })}
                                <circle cx="50" cy="50" r="40" fill="none" stroke={k.c.accent} strokeWidth={2.2 + done * 1.2} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - fill} transform="rotate(-90 50 50)" style={glow(k, k.c.accent, 2 + 3 * kick(k, HIT, 4))} />
                                <circle cx="50" cy="50" r={37 * kick(k, HIT, 9)} fill={al(k.c.accent, 0.5)} />
                                {burst > 0 && burst < 1 && Array.from({ length: 14 }, (_, i) => {
                                    const [x, y] = polar(50, 50, 46 + easeOut(burst) * (14 + seeded(i) * 22), (i / 14) * TAU + seeded(i + 5));
                                    return <circle key={i} cx={x} cy={y} r={1.1 * (1 - burst)} fill={i % 2 ? k.c.text : k.c.accent} />;
                                })}
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                                {done > 0.3 ? <Check k={k} size={size / k.u * 0.34} progress={k.ramp(HIT + 0.1, HIT + 0.5)} /> : <span style={{ fontFamily: k.display, fontWeight: 850, fontSize: size * 0.22, ...tabular }}>{Math.round(fill * 100)}%</span>}
                            </div>
                            {fill < 1 && <Cursor k={k} x={58} y={60} press={k.ramp(0.1, 0.55)} />}
                        </div>
                        <div style={{ position: 'relative', height: k.tx * 4.2, width: '100%', fontSize: k.tx * 2.8 }}>
                            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: k.c.muted, opacity: 1 - done }}>{p.date}</div>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: done, transform: `translateY(${(1 - done) * k.u * 2}px)` }}>
                                <Pill k={k} active style={{ display: 'inline-flex', alignItems: 'center', gap: k.u * 1.2, fontSize: k.tx * 2.8 }}><Dot k={k} pulse={Math.sin(k.s * 6) * 0.5 + 0.5} />{p.subtitle}</Pill>
                            </div>
                        </div>
                    </div>
                );
            }}
        </Scene>
    );
}

// ---- Problem ----

export function ProblemScrollOfDoom(p: LaunchProps) {
    const k = useKit(p);
    const feed = some(p.items, 8);
    const HIT = 2.2;
    const FINAL = 20;
    const h = k.u * 8.4;
    const x = clamp01(k.s / HIT);
    const thump = k.s > HIT ? k.u * 1.4 * Math.sin((k.s - HIT) * 24) * Math.exp(-(k.s - HIT) * 8) : 0;
    const hl = easeOut(k.ramp(HIT, HIT + 0.35));
    const unread = Math.min(99, Math.round(x ** 1.9 * 140));
    return (
        <Scene p={p} k={k} hit={HIT} t0={0.6} lock={{ headline: p.subtitle, subtitle: '' }}>
            {(z) => {
                const view = Math.min(h * 7, z.h * 0.92);
                const travel = ((FINAL + 3.5) * h - view / 2) * x ** 1.9 + thump;
                const mask = 'linear-gradient(transparent, #000 14%, #000 86%, transparent)';
                return (
                    <Win k={k} title="Notifications" width="100%">
                        <div style={{ position: 'absolute', top: k.u * 1, right: k.u * 2, zIndex: 5, height: k.u * 3, padding: `0 ${k.u * 1.2}px`, display: 'flex', alignItems: 'center', borderRadius: 999, background: k.c.accent, color: k.c.bg, fontWeight: 800, fontSize: k.tx * 1.9, ...tabular }}>{unread}{unread === 99 ? '+' : ''}</div>
                        <div style={{ height: view, overflow: 'hidden', position: 'relative', WebkitMaskImage: mask, maskImage: mask }}>
                            <div style={{ position: 'absolute', left: k.u * 2, right: k.u * 2, top: 0, transform: `translateY(${-travel}px)`, filter: `blur(${Math.min(5, x < 1 ? 1.9 * x ** 0.9 * 2.6 : 0)}px)` }}>
                                {Array.from({ length: FINAL + 6 }, (_, j) => {
                                    const hit = j === FINAL + 3;
                                    const item = hit ? { text: p.headline, detail: p.subtitle } : feed[j % feed.length];
                                    return (
                                        <div key={j} style={card(k, { height: h - k.u * 1.2, margin: `${k.u * 0.6}px 0`, opacity: hit ? 1 : 1 - hl * 0.55, transform: hit ? `scale(${1 + hl * 0.07})` : undefined, border: hit && hl > 0 ? `1px solid ${k.c.accent}` : undefined, boxShadow: hit ? `0 0 ${k.u * 4 * hl}px ${al(k.c.accent, 0.5)}` : undefined, zIndex: hit ? 2 : 0, position: 'relative' })}>
                                            <Row k={k} hot={hit ? 1 : 0} style={{ height: '100%' }} icon={<Tile k={k} size={4.4} hot={hit ? 1 : 0}>{hit ? '!' : initial(item.text)}</Tile>} title={<span style={{ fontWeight: hit ? 800 : 650, color: hit ? k.c.text : k.c.muted }}>{item.text}</span>} detail={item.detail} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Win>
                );
            }}
        </Scene>
    );
}

// ---- Code & AI ----

/** Keywords, numbers and comments picked out of a line of code. */
function Highlight({ k, text }: { k: Kit; text: string }) {
    return (
        <>
            {text.split(/(\b(?:function|return|const|let|if|else|export|import)\b|\/\/.*|\b\d+(?:\.\d+)?\b)/g).map((part, i) =>
                i % 2 === 0 ? part : <span key={i} style={{ color: part.startsWith('//') ? k.c.muted : /^\d/.test(part) ? k.c.text : k.c.accent, fontStyle: part.startsWith('//') ? 'italic' : undefined, fontWeight: /^\d/.test(part) ? 700 : undefined }}>{part}</span>,
            )}
        </>
    );
}

interface DiffRowProps { k: Kit; no?: number; text: string; kind: 'old' | 'new' | 'same'; grow: number; tint: number; rowH: number }
function DiffRow({ k, no, text, kind, grow, tint, rowH }: DiffRowProps) {
    const colour = kind === 'old' ? RED : GREEN;
    const changed = kind !== 'same';
    return (
        <div style={{ ...mono(k), height: rowH * grow, opacity: grow, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: k.u * 1.2, padding: `0 ${k.u * 1.4}px 0 0`, whiteSpace: 'pre', background: changed ? al(colour, tint * 0.17) : undefined, borderLeft: `${k.u * 0.35}px solid ${changed ? al(colour, tint) : 'transparent'}` }}>
            <span style={{ width: k.u * 4, textAlign: 'right', color: al(k.c.muted, 0.6), fontSize: k.tx * 1.9, ...tabular }}>{no}</span>
            <span style={{ width: k.u * 1.4, color: colour, opacity: changed ? tint : 0 }}>{kind === 'old' ? '−' : '+'}</span>
            <span style={{ color: kind === 'old' && tint > 0.5 ? k.c.muted : k.c.text, textDecoration: kind === 'old' && tint > 0.5 ? 'line-through' : undefined }}><Highlight k={k} text={text} /></span>
        </div>
    );
}

export function CodeMorphDiff(p: LaunchProps) {
    const k = useKit(p);
    const lines = some(p.items, 6);
    const HIT = 1.9;
    const rowH = k.u * 4.8;
    const mark = k.ramp(0.5, 0.9);
    const add = easeOut(k.ramp(0.7, 1.2));
    const collapse = easeInOut(k.ramp(HIT, HIT + 0.5));
    const settle = k.ramp(HIT + 0.2, HIT + 0.8);
    const accepted = k.s >= HIT;
    const edits = lines.filter((l) => l.detail !== l.text);
    const added = edits.filter((l) => l.detail).length;
    const [pad, bar] = [k.u * 1.6, k.u * 6];
    const bodyH = pad * 2 + bar + rowH * (lines.length + added);
    const at = (px: number) => (px / bodyH) * 100;
    return (
        <Scene p={p} k={k} hit={HIT}>
            {() => (
                <Win k={k} title={p.subtitle} width="100%">
                    <div style={{ position: 'relative', height: bodyH, padding: pad }}>
                        <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: k.u * 1.2, fontSize: k.tx * 2.2, fontWeight: 700, ...tabular }}>
                            <span style={{ color: GREEN }}>+{added}</span><span style={{ color: RED }}>−{edits.length}</span>
                            <span style={{ marginLeft: 'auto', transform: `scale(${1 + 0.12 * kick(k, HIT, 8)})`, opacity: k.ramp(0.5, 0.8) }}><Pill k={k} active={!accepted || k.s < HIT + 0.4}>{accepted ? '✓ Accepted' : p.date}</Pill></span>
                        </div>
                        {lines.map((l, i) => {
                            if (l.detail === l.text) return <DiffRow key={i} k={k} no={i + 1} text={l.text} kind="same" grow={1} tint={0} rowH={rowH} />;
                            return [
                                <DiffRow key={`o${i}`} k={k} no={i + 1} text={l.text} kind="old" grow={1 - collapse} tint={mark} rowH={rowH} />,
                                l.detail ? <DiffRow key={`n${i}`} k={k} text={l.detail} kind="new" grow={add} tint={1 - settle * 0.85} rowH={rowH} /> : null,
                            ];
                        })}
                        <Cursor k={k} x={k.ramp(0.6, HIT - 0.1, 55, 88)} y={k.ramp(0.6, HIT - 0.1, 80, at(pad + bar / 2))} press={k.ramp(HIT - 0.15, HIT + 0.25)} />
                    </div>
                </Win>
            )}
        </Scene>
    );
}

export function CodeBranchTreeBuild(p: LaunchProps) {
    const k = useKit(p);
    const branches = some(p.items, 4);
    const HIT = 2.5;
    const mainX = [0.04, 0.16, 0.28, 0.4, 0.52, 0.64, 0.76, 0.92];
    const lanes = [0.14, 0.86, 0.32, 0.68];
    const mainDraw = easeOut(k.ramp(0.1, 1.2));
    const merged = easeOut(k.ramp(HIT - 0.3, HIT + 0.2));
    return (
        <Scene p={p} k={k} hit={HIT}>
            {(z) => {
                const [W, H] = [z.w - k.u * 5, Math.min(z.h * 0.8, (z.w - k.u * 5) * 0.62)];
                const pt = (fx: number, fy: number): Pt => [fx * W, fy * H];
                return (
                    <div style={{ ...card(k, { padding: k.u * 2.5 }), fontSize: k.tx * 2 }}>
                        <div style={{ position: 'relative', width: W, height: H }}>
                            <Wires z={{ w: W, h: H }}>
                                <Edge k={k} a={pt(mainX[0], 0.5)} b={pt(mainX[7], 0.5)} draw={mainDraw} width={0.4} />
                                {mainX.map((f, i) => (
                                    <circle key={i} cx={f * W} cy={H / 2} r={k.u * (i === 7 ? 1.7 + 0.7 * kick(k, HIT, 3) : 1.1) * k.pop(0.1 + (i / 8) * 1.1, 12)} fill={i === 7 ? k.c.accent : k.c.surface} stroke={i === 7 ? k.c.accent : k.c.muted} strokeWidth={k.u * 0.2} style={i === 7 ? glow(k, k.c.accent, 2.5) : undefined} />
                                ))}
                                {branches.map((b, i) => {
                                    const x0 = 0.14 + i * 0.1;
                                    const t0 = 0.9 + i * 0.2;
                                    const [fork, run] = [k.ramp(t0, t0 + 0.5), k.ramp(t0 + 0.4, t0 + 1.1)];
                                    const end = HIT - 0.3 + i * 0.05;
                                    return (
                                        <g key={i}>
                                            <Edge k={k} a={pt(x0, 0.5)} b={pt(x0 + 0.1, lanes[i])} draw={fork} pulse={k.ramp(t0 + 0.1, t0 + 0.6)} />
                                            <Edge k={k} a={pt(x0 + 0.1, lanes[i])} b={pt(0.8, lanes[i])} draw={run} />
                                            <Edge k={k} a={pt(0.8, lanes[i])} b={pt(mainX[7], 0.5)} draw={k.ramp(end, end + 0.4)} pulse={k.ramp(end + 0.1, end + 0.6)} />
                                            {[0.35, 0.65].map((f, j) => <circle key={j} cx={lerp(x0 + 0.1, 0.8, f) * W} cy={lanes[i] * H} r={k.u * 0.9 * k.pop(t0 + 0.3 + f * 0.5, 12)} fill={k.c.surface} stroke={k.c.accent} strokeWidth={k.u * 0.22} />)}
                                            <text x={(x0 + 0.1) * W} y={lanes[i] * H + (lanes[i] < 0.5 ? -k.u * 1.9 : k.u * 4)} fontSize={k.tx * 2} fill={k.c.muted} opacity={fork}>{b.text}</text>
                                        </g>
                                    );
                                })}
                                <text x={mainX[7] * W} y={H / 2 + k.u * 5} fontSize={k.tx * 2.6} fontWeight={800} textAnchor="middle" fill={k.c.accent} opacity={merged} style={tabular}>{p.date}</text>
                            </Wires>
                        </div>
                    </div>
                );
            }}
        </Scene>
    );
}

export function AiAnswerStream(p: LaunchProps) {
    const k = useKit(p);
    const cites = some(p.items, 4);
    const HIT = 3;
    const stream = k.ramp(0.9, HIT);
    const ask = easeOut(k.ramp(0.05, 0.45));
    const thinking = k.s > 0.45 && k.s < 0.9;
    return (
        <Scene p={p} k={k} hit={HIT} solo lock={{ headline: '', subtitle: '' }}>
            {() => (
                <Win k={k} title="Assistant" width="100%">
                    <div style={{ padding: k.u * 2.6, display: 'flex', flexDirection: 'column', gap: k.u * 2.2, fontSize: k.tx * 2.8 }}>
                        <div style={{ alignSelf: 'flex-end', maxWidth: '82%', padding: `${k.u * 1.4}px ${k.u * 2}px`, borderRadius: `${k.u * 1.8}px ${k.u * 1.8}px ${k.u * 0.4}px ${k.u * 1.8}px`, background: al(k.c.accent, 0.22), border: `1px solid ${al(k.c.accent, 0.5)}`, opacity: ask, transform: `translateY(${(1 - ask) * k.u * 2}px) scale(${0.96 + 0.04 * ask})` }}>{p.headline}</div>
                        <div style={{ display: 'flex', gap: k.u * 1.6, alignItems: 'flex-start', opacity: easeOut(k.ramp(0.45, 0.7)) }}>
                            <Tile k={k} size={4.6} hot={1}>✦</Tile>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {thinking ? (
                                    <div style={{ display: 'flex', gap: k.u * 0.8, paddingTop: k.u * 1.4 }}>{[0, 1, 2].map((i) => <Dot key={i} k={k} size={1.1} pulse={Math.max(0, Math.sin(k.s * 14 - i * 1.2))} />)}</div>
                                ) : (
                                    <TypedText k={k} text={p.subtitle} fraction={stream + Math.sin(stream * 38) * 0.01} />
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: k.u, paddingLeft: k.u * 6.2 }}>
                            {cites.map((c, i) => {
                                const s = k.pop(HIT + i * 0.1, 12);
                                return <span key={i} style={{ opacity: Math.min(1, s * 2), transform: `translateY(${(1 - s) * k.u * 2}px) scale(${0.85 + 0.15 * s})` }}><Pill k={k} active={i === 0}>[{i + 1}] {c.text}</Pill></span>;
                            })}
                        </div>
                    </div>
                </Win>
            )}
        </Scene>
    );
}

/** A generated tile's artwork: a gradient with one simple shape, different per tile. */
const Artwork = ({ k, i, reveal }: { k: Kit; i: number; reveal: number }) => (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: k.u, background: `linear-gradient(${60 + seeded(i + 2) * 200}deg, ${al(k.c.accent, [0.55, 0.33, 0.7][i % 3])}, ${k.c.surface})` }}>
        <div style={{ position: 'absolute', left: `${25 + seeded(i + 11) * 30}%`, top: `${20 + seeded(i + 13) * 30}%`, width: '34%', aspectRatio: '1', borderRadius: i % 2 ? '50%' : k.u * 0.8, background: al(k.c.text, 0.55), transform: `rotate(${i * 20}deg) scale(${reveal})` }} />
        {reveal < 1 && <div style={{ position: 'absolute', inset: 0, background: k.c.surface, opacity: 1 - reveal }} />}
    </div>
);

export function AiOnePromptManyResults(p: LaunchProps) {
    const k = useKit(p);
    const results = some(p.items, 6);
    const HIT = 2.1;
    const cols = k.stacked ? 2 : 3;
    const rows = Math.ceil(results.length / cols);
    const settle = easeOut(k.ramp(1.1, 2.4));
    const [gap, barH] = [k.u * 1.6, k.u * 7.4];
    return (
        <Scene p={p} k={k} hit={HIT} solo lock={{ headline: '' }}>
            {(z) => {
                const cellW = (z.w - gap * (cols - 1)) / cols;
                const cellH = Math.min(k.u * (k.portrait ? 12 : 14), (z.h * 0.86 - barH - gap) / rows - gap);
                return (
                    <div style={{ position: 'relative' }}>
                        <div style={{ ...card(k, { height: barH, padding: `0 ${k.u * 2.4}px`, display: 'flex', alignItems: 'center', gap: k.u * 1.4, position: 'relative', zIndex: 3, fontSize: k.tx * 3, boxShadow: `0 ${k.u * 2.5}px ${k.u * 9}px #0007, 0 0 ${k.u * 4 * kick(k, 1.05, 5)}px ${k.c.accent}` }) }}>
                            <span style={{ color: k.c.accent }}>✦</span>
                            <span style={{ flex: 1, ...clip }}>{typed(p.headline, k.ramp(0.1, 0.9))}</span>
                            <span style={{ transform: `scale(${1 - 0.15 * kick(k, 1, 12)})` }}><Pill k={k} active>↵</Pill></span>
                        </div>
                        <div style={{ position: 'relative', height: rows * (cellH + gap) }}>
                            {results.map((r, i) => {
                                const s = k.pop(1.1 + i * 0.14, 12);
                                const [gx, gy] = [(i % cols) * (cellW + gap), Math.floor(i / cols) * (cellH + gap) + gap];
                                const x = lerp(z.w / 2 - cellW / 2, gx + (seeded(i + 1) - 0.5) * k.u * 5 * (1 - settle), s);
                                const y = lerp(-barH, gy + (seeded(i + 7) - 0.5) * k.u * 4 * (1 - settle), s);
                                return (
                                    <div key={i} style={card(k, { position: 'absolute', left: x, top: y, width: cellW, height: cellH, padding: k.u * 1.2, display: 'flex', flexDirection: 'column', gap: k.u * 0.7, opacity: Math.min(1, s * 2), transform: `scale(${0.55 + 0.45 * s}) rotate(${(1 - settle) * (seeded(i + 4) - 0.5) * 12}deg)`, overflow: 'hidden' })}>
                                        <Artwork k={k} i={i} reveal={easeOut(k.ramp(1.4 + i * 0.14, 1.9 + i * 0.14))} />
                                        <div style={{ fontSize: k.tx * 2.2, fontWeight: 700, ...clip }}>{r.text}</div>
                                        {r.detail && <div style={{ fontSize: k.tx * 1.8, color: k.c.muted, ...clip }}>{r.detail}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }}
        </Scene>
    );
}

export function AiParallelTaskFanout(p: LaunchProps) {
    const k = useKit(p);
    const tasks = some(p.items, 5);
    const n = tasks.length;
    const HIT = 2.7;
    const doneAt = (i: number) => 1.9 + i * 0.1;
    const merge = k.pop(HIT, 11);
    return (
        <Scene p={p} k={k} hit={HIT} solo lock={{ headline: '', subtitle: '' }}>
            {(z) => {
                const [W, H] = [z.w, Math.min(z.h * 0.9, k.u * (k.portrait ? 50 : 44))];
                const [rootW, taskX, taskW, doneW] = [W * 0.22, W * 0.33, W * 0.36, W * 0.2];
                const laneY = (i: number) => ((i + 0.5) / n) * H;
                const node = (extra: CSSProperties): CSSProperties => card(k, { position: 'absolute', display: 'flex', alignItems: 'center', ...extra });
                return (
                    <div style={{ position: 'relative', width: W, height: H, fontSize: k.tx * 2.2 }}>
                        <Wires z={{ w: W, h: H }}>
                            {tasks.map((_, i) => (
                                <g key={i}>
                                    <Edge k={k} a={[rootW, H / 2]} b={[taskX, laneY(i)]} draw={k.ramp(0.3 + i * 0.1, 0.8 + i * 0.1)} pulse={k.ramp(0.5 + i * 0.1, 1 + i * 0.1)} />
                                    <Edge k={k} a={[taskX + taskW, laneY(i)]} b={[W - doneW, H / 2]} draw={k.ramp(doneAt(i) - 0.2, doneAt(i) + 0.2)} pulse={k.ramp(doneAt(i), doneAt(i) + 0.5)} />
                                </g>
                            ))}
                        </Wires>
                        <div style={node({ left: 0, top: '50%', width: rootW, padding: k.u * 1.4, justifyContent: 'center', textAlign: 'center', fontWeight: 750, fontSize: k.tx * 2.4, transform: `translateY(-50%) scale(${0.8 + 0.2 * k.pop(0.05, 11)})`, opacity: k.pop(0.05) })}>{p.headline}</div>
                        {tasks.map((t, i) => {
                            const s = k.pop(0.55 + i * 0.1, 12);
                            const prog = easeInOut(k.ramp(0.9 + i * 0.15, doneAt(i)));
                            return (
                                <div key={i} style={node({ left: taskX, top: laneY(i), width: taskW, height: (H / n) * 0.8, transform: `translateY(-50%) scale(${0.75 + 0.25 * s})`, opacity: Math.min(1, s * 2), padding: `0 ${k.u * 1.2}px`, flexDirection: 'column', justifyContent: 'center', gap: k.u * 0.6, borderRadius: k.u * 1.2, borderColor: prog >= 1 ? k.c.accent : undefined })}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: k.u, width: '100%' }}>
                                        {prog >= 1 ? <Check k={k} size={2.6} /> : <Dot k={k} size={1.1} pulse={Math.sin(k.s * 9 + i) * 0.5 + 0.5} />}
                                        <span style={{ flex: 1, ...clip }}>{t.text}</span>
                                        <span style={{ color: k.c.muted, ...tabular }}>{Math.round(prog * 100)}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: k.u * 0.7, borderRadius: k.u, background: al(k.c.muted, 0.22), overflow: 'hidden' }}>
                                        <div style={{ width: `${prog * 100}%`, height: '100%', borderRadius: k.u, background: `linear-gradient(90deg, ${al(k.c.accent, 0.6)}, ${k.c.accent})`, boxShadow: `0 0 ${k.u * 1.5}px ${k.c.accent}` }} />
                                    </div>
                                </div>
                            );
                        })}
                        <div style={node({ right: 0, top: '50%', width: doneW, padding: k.u * 1.4, flexDirection: 'column', justifyContent: 'center', gap: k.u, textAlign: 'center', fontWeight: 700, transform: `translateY(-50%) scale(${0.8 + 0.2 * merge})`, opacity: Math.min(1, merge * 2), borderColor: k.c.accent, boxShadow: `0 0 ${k.u * (3 + 4 * kick(k, HIT, 4))}px ${al(k.c.accent, 0.6)}` })}>
                            <Check k={k} size={4} progress={k.ramp(HIT + 0.1, HIT + 0.5)} />{p.subtitle}
                        </div>
                    </div>
                );
            }}
        </Scene>
    );
}

export function AiModelMenuSelect(p: LaunchProps) {
    const k = useKit(p);
    const models = some(p.items, 4);
    const picked = Math.min(1, models.length - 1);
    const HIT = 1.9;
    const [pad, selH, rowH] = [k.u * 2.2, k.u * 7, k.u * 7];
    const H = k.u * 46;
    const menuTop = pad + selH + k.u * 1.2;
    const chosen = k.s >= HIT;
    const menu = easeOut(k.ramp(0.7, 1)) * (1 - easeOut(k.ramp(HIT, HIT + 0.3)));
    const idx = picked * easeInOut(k.ramp(1.1, 1.7));
    const rowY = (i: number) => ((menuTop + k.u * 0.7 + rowH * (i + 0.5)) / H) * 100;
    const selY = ((pad + selH / 2) / H) * 100;
    const [cx, cy] = k.s < 1 ? [k.ramp(0.15, 0.65, 95, 78), k.ramp(0.15, 0.65, 72, selY)] : [k.ramp(1, 1.7, 78, 55), k.ramp(1, 1.7, selY, rowY(picked))];
    const reply = easeOut(k.ramp(HIT + 0.3, HIT + 0.6));
    return (
        <Scene p={p} k={k} hit={HIT} lock={{ subtitle: '' }}>
            {() => (
                <div style={card(k, { position: 'relative', height: H, padding: pad, fontSize: k.tx * 2.6 })}>
                    <div style={{ height: selH, display: 'flex', alignItems: 'center', gap: k.u * 1.4, padding: `0 ${k.u * 1.6}px`, borderRadius: k.u * 1.3, border: `1px solid ${al(k.c.accent, 0.55)}`, background: al(k.c.accent, 0.08 + 0.18 * kick(k, HIT, 4)), boxShadow: `0 0 ${k.u * 3 * kick(k, HIT, 3)}px ${k.c.accent}` }}>
                        <Tile k={k} size={4} hot={1}>{initial(models[chosen ? picked : 0].text)}</Tile>
                        <span style={{ flex: 1, fontWeight: 750 }}>{models[chosen ? picked : 0].text}</span>
                        <span style={{ color: k.c.muted, transform: `rotate(${menu * 180}deg)` }}>▾</span>
                    </div>
                    {menu > 0.01 && (
                        <div style={card(k, { position: 'absolute', left: pad, right: pad, top: menuTop, padding: k.u * 0.7, opacity: menu, transform: `translateY(${(menu - 1) * k.u * 2}px) scale(${0.97 + 0.03 * menu})`, transformOrigin: 'top' })}>
                            {models.map((m, i) => (
                                <Row key={i} k={k} hot={clamp01(1 - Math.abs(i - idx)) * easeOut(k.ramp(1, 1.2))} style={{ height: rowH }} icon={<Tile k={k} size={3.8} hot={i === picked ? 1 : 0}>{initial(m.text)}</Tile>} title={m.text} detail={m.detail} />
                            ))}
                        </div>
                    )}
                    <div style={{ position: 'absolute', left: pad, right: pad, top: menuTop, opacity: reply, transform: `translateY(${(1 - reply) * k.u * 2}px)` }}>
                        <Pill k={k} active style={{ marginBottom: k.u * 1.2 }}>{models[picked].text}</Pill>
                        <TypedText k={k} text={p.subtitle} fraction={k.ramp(HIT + 0.4, HIT + 1.5)} />
                    </div>
                    {k.s < HIT + 0.4 && <Cursor k={k} x={cx} y={cy} press={k.s < 1 ? k.ramp(0.65, 1) : k.ramp(HIT - 0.15, HIT + 0.25)} />}
                </div>
            )}
        </Scene>
    );
}
