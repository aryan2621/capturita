// Insight scenes: data that moves (charts, races, heatmaps, calculators) and diagrams that explain (flows, grids, trees, funnels, release notes).
import type { CSSProperties } from 'react';
import { Check, Pill, Win, card, easeOut, mono, numberIn, seeded, useKit, type Kit, type LaunchProps } from './kit';
import { al, clamp01, glow, lerp } from './shapes';
import { Edge, Grid, Row, Scene, Tile, Wires, clip, compact, easeInOut, initial, kick, some, tabular, withNumber, type Pt } from './buildParts';

const bigNumber = (k: Kit, size: number): CSSProperties => ({ fontFamily: k.display, fontWeight: 850, fontSize: k.tx * size, lineHeight: 1, ...tabular });

/** A big counter and its unit, the payoff line under a panel. */
const Payoff = ({ k, value, unit, show, hot }: { k: Kit; value: string; unit: string; show: number; hot: number }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: k.u * 1.6, opacity: show, transform: `translateY(${(1 - show) * k.u * 2}px) scale(${1 + 0.08 * hot})`, textShadow: `0 0 ${k.u * 4 * hot}px ${k.c.accent}` }}>
        <span style={{ ...bigNumber(k, 7.5), color: k.c.accent }}>{value}</span>
        <span style={{ fontSize: k.tx * 2.8, color: k.c.muted }}>{unit}</span>
    </div>
);

// ---- Data ----

export function DataAxisRescaleShock(p: LaunchProps) {
    const k = useKit(p);
    const m = Math.max(1, p.metric);
    const base = [0.08, 0.1, 0.13, 0.15, 0.18, 0.21, 0.24, 0.27].map((f) => f * m);
    const HIT = 1.55;
    const draw = easeInOut(k.ramp(0.15, 1.3));
    const spike = lerp(base[7], m, easeOut(k.ramp(1.3, HIT + 0.2)));
    const axis = lerp(0.35 * m, 1.15 * m, easeInOut(k.ramp(HIT + 0.3, 3)));
    const cur = k.s < 1.3 ? base[Math.min(7, Math.round(draw * 7))] : spike;
    const flash = kick(k, HIT, 3);
    return (
        <Scene p={p} k={k} hit={HIT}>
            {(z) => {
                const [W, H] = [z.w - k.u * 10, k.u * (k.stacked ? 24 : 30)];
                const [X, Y] = [(i: number) => (i / 8) * W, (v: number) => H * (1 - v / axis)];
                const line = base.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v)}`).join('');
                const last: Pt = [X(8), Y(spike)];
                return (
                    <div style={card(k, { padding: `${k.u * 3}px ${k.u * 3}px ${k.u * 2}px ${k.u * 7}px` })}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: k.u * 2.5, marginLeft: -k.u * 4 }}>
                            <span style={{ ...bigNumber(k, 6), color: flash > 0.02 || k.s > HIT ? k.c.accent : k.c.text, textShadow: `0 0 ${k.u * 4 * flash}px ${k.c.accent}` }}>{p.date}{compact(cur)}</span>
                            <span style={{ transform: `scale(${k.pop(HIT, 10)})` }}><Pill k={k} active style={tabular}>×{compact(spike / base[0])}</Pill></span>
                        </div>
                        <svg width={W} height={H + k.u * 4} style={{ overflow: 'visible' }}>
                            <defs>
                                <linearGradient id="axis-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={k.c.accent} stopOpacity="0.32" /><stop offset="1" stopColor={k.c.accent} stopOpacity="0" /></linearGradient>
                            </defs>
                            <Grid k={k} w={W} h={H} max={axis} prefix={p.date} />
                            {[0, 2, 4, 6, 8].map((i) => <text key={i} x={X(i)} y={H + k.u * 3.2} textAnchor="middle" fontSize={k.tx * 1.8} fill={k.c.muted}>W{i + 1}</text>)}
                            <path d={`${line}L${X(7)},${H}L0,${H}Z`} fill="url(#axis-area)" opacity={draw} />
                            <path d={line} fill="none" stroke={k.c.accent} strokeWidth={k.u * 0.45} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} style={glow(k, k.c.accent, 1.2)} />
                            {k.s > 1.3 && (
                                <>
                                    <path d={`M${X(7)},${Y(base[7])}L${last}`} fill="none" stroke={k.c.accent} strokeWidth={k.u * 0.6} strokeLinecap="round" style={glow(k, k.c.accent, 2.5)} />
                                    <circle cx={last[0]} cy={last[1]} r={k.u * (3.2 * flash + 1.1)} fill={al(k.c.accent, 0.25 + 0.4 * flash)} />
                                    <circle cx={last[0]} cy={last[1]} r={k.u * 1.2} fill={k.c.text} stroke={k.c.accent} strokeWidth={k.u * 0.4} />
                                </>
                            )}
                        </svg>
                    </div>
                );
            }}
        </Scene>
    );
}

export function DataComparisonVersus(p: LaunchProps) {
    const k = useKit(p);
    const [a, b = a] = some(p.items, 2);
    const [va, vb] = [numberIn(a.detail), numberIn(b.detail)];
    const top = Math.max(1, va, vb) * 1.15;
    const delta = va ? ((vb - va) / va) * 100 : 0;
    const HIT = 1.5;
    const grow = (delay: number) => k.pop(0.2 + delay, 12);
    return (
        <Scene p={p} k={k} hit={HIT}>
            {(z) => {
                const [W, H] = [z.w - k.u * 10, k.u * (k.stacked ? 26 : 32)];
                const slot = W / 2;
                const bars = [{ item: a, v: va, hero: false, delay: 0 }, { item: b, v: vb, hero: true, delay: 0.2 }];
                const heightOf = (v: number, g: number) => (v / top) * H * g;
                return (
                    <div style={card(k, { padding: `${k.u * 3}px ${k.u * 3}px ${k.u * 2}px ${k.u * 7}px` })}>
                        <svg width={W} height={H + k.u * 6} style={{ overflow: 'visible' }}>
                            <defs>
                                <linearGradient id="vs-hero" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={k.c.accent} /><stop offset="1" stopColor={k.c.accent} stopOpacity="0.45" /></linearGradient>
                            </defs>
                            <Grid k={k} w={W} h={H} max={top} />
                            {bars.map(({ item, v, hero, delay }, i) => {
                                const g = grow(delay);
                                const [bw, h] = [slot * 0.5, heightOf(v, g)];
                                const x = slot * i + (slot - bw) / 2;
                                return (
                                    <g key={i}>
                                        <rect x={x} y={H - h} width={bw} height={Math.max(0, h)} rx={k.u * 1.2} fill={hero ? 'url(#vs-hero)' : al(k.c.muted, 0.4)} style={hero ? glow(k, k.c.accent, 2 + 3 * kick(k, HIT, 3)) : undefined} />
                                        <text x={x + bw / 2} y={H - h - k.u * 1.4} textAnchor="middle" fontSize={k.tx * 4.6} fontWeight={850} fontFamily={k.display} fill={hero ? k.c.accent : k.c.text} opacity={clamp01(g)} style={tabular}>{item.detail ? withNumber(item.detail, v * clamp01(g)) : ''}</text>
                                        <text x={x + bw / 2} y={H + k.u * 4} textAnchor="middle" fontSize={k.tx * 2.5} fontWeight={700} fill={hero ? k.c.text : k.c.muted}>{item.text}</text>
                                    </g>
                                );
                            })}
                            <line x1={slot * 0.75} x2={slot * 1.25} y1={H - heightOf(va, 1)} y2={H - heightOf(va, 1)} stroke={al(k.c.accent, 0.7)} strokeWidth={k.u * 0.2} strokeDasharray={`${k.u * 0.6} ${k.u * 0.6}`} opacity={k.ramp(HIT - 0.2, HIT)} />
                        </svg>
                        <div style={{ position: 'absolute', left: '50%', top: k.u * 3, transform: `translateX(-50%) scale(${k.pop(HIT, 9)})` }}>
                            <Pill k={k} active style={{ fontSize: k.tx * 3.2, fontWeight: 800, boxShadow: `0 0 ${k.u * 4 * kick(k, HIT, 3)}px ${k.c.accent}`, ...tabular }}>{delta > 0 ? '▲ +' : '▼ −'}{Math.abs(Math.round(delta * easeOut(k.ramp(HIT, HIT + 0.7))))}%</Pill>
                        </div>
                    </div>
                );
            }}
        </Scene>
    );
}

export function DataTimeRaceBars(p: LaunchProps) {
    const k = useKit(p);
    const racers = some(p.items, 4);
    const times = racers.map((r) => Math.max(0.1, numberIn(r.detail)));
    const maxT = Math.max(...times);
    const order = times.map((t, i) => times.filter((u, j) => u < t || (u === t && j < i)).length);
    const win = order.indexOf(0);
    const dur = (i: number) => 1.1 + (times[i] / maxT) * 1.6;
    const HIT = 0.2 + dur(win) + 0.05;
    return (
        <Scene p={p} k={k} hit={HIT}>
            {() => (
                <Win k={k} title="Benchmark" width="100%">
                    <div style={{ padding: k.u * 2.4, display: 'flex', flexDirection: 'column', gap: k.u * 2.4, fontSize: k.tx * 2.6 }}>
                        {racers.map((r, i) => {
                            const prog = easeInOut(k.ramp(0.2, 0.2 + dur(i)));
                            const hero = i === win;
                            const finished = prog >= 1 ? k.pop(0.2 + dur(i), 10) : 0;
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.6 }}>
                                    <span style={{ width: '22%', fontWeight: 700, color: hero ? k.c.text : k.c.muted, ...clip }}>{r.text}</span>
                                    <div style={{ flex: 1, height: k.u * 4.4, borderRadius: k.u * 2.2, background: al(k.c.muted, 0.16), borderRight: `${k.u * 0.25}px dashed ${al(k.c.muted, 0.6)}`, position: 'relative' }}>
                                        <div style={{ width: `${prog * 100}%`, height: '100%', borderRadius: k.u * 2.2, background: hero ? `linear-gradient(90deg, ${al(k.c.accent, 0.4)}, ${k.c.accent})` : `linear-gradient(90deg, ${al(k.c.muted, 0.3)}, ${al(k.c.muted, 0.7)})`, boxShadow: hero ? `0 0 ${k.u * 3}px ${al(k.c.accent, 0.6)}` : undefined, position: 'relative' }}>
                                            {prog > 0 && prog < 1 && <span style={{ position: 'absolute', right: 0, top: '50%', width: k.u * 1.6, height: k.u * 1.6, borderRadius: '50%', background: k.c.text, transform: 'translate(40%, -50%)', boxShadow: `0 0 ${k.u * 2.5}px ${hero ? k.c.accent : k.c.muted}` }} />}
                                        </div>
                                    </div>
                                    <span style={{ width: '17%', textAlign: 'right', fontWeight: 800, color: hero && prog >= 1 ? k.c.accent : k.c.text, ...tabular }}>{r.detail ? withNumber(r.detail, times[i] * prog) : ''}</span>
                                    <span style={{ width: k.u * 3.6, height: k.u * 3.6, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 850, fontSize: k.tx * 2, background: hero ? k.c.accent : al(k.c.muted, 0.35), color: hero ? k.c.bg : k.c.text, opacity: Math.min(1, finished * 2), transform: `scale(${finished})` }}>{order[i] + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                </Win>
            )}
        </Scene>
    );
}

export function DataHeatmapStreak(p: LaunchProps) {
    const k = useKit(p);
    const cols = k.stacked ? 16 : 22;
    const total = cols * 7;
    const streak = Math.min(total, Math.round(p.metric));
    const HIT = 2.5;
    const wave = easeInOut(k.ramp(1.1, HIT));
    const count = Math.round(p.metric * wave);
    return (
        <Scene p={p} k={k} hit={HIT} lock={{ subtitle: '' }}>
            {(z) => {
                const gap = k.u * 0.7;
                const cell = Math.min((z.w - k.u * 5 - gap * (cols - 1)) / cols, (k.u * (k.stacked ? 24 : 32) - gap * 6) / 7);
                return (
                    <div style={card(k, { padding: k.u * 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 2.5 })}>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap }}>
                            {Array.from({ length: total }, (_, i) => {
                                const [r, c] = [Math.floor(i / cols), i % cols];
                                const day = c * 7 + r;
                                const start = (c / cols) * 1.1 + r * 0.02;
                                const on = easeOut(k.ramp(0.1 + start, 0.45 + start));
                                const level = [0.15, 0.3, 0.55, 0.8, 1][Math.floor(seeded(i + 5) ** 1.5 * 5)];
                                const hot = day >= total - streak && (day - (total - streak)) / Math.max(1, streak) < wave;
                                return <div key={i} style={{ width: cell, height: cell, borderRadius: k.u * 0.5, transform: `scale(${on})`, background: k.c.accent, opacity: hot ? 1 : level * 0.6 * on, boxShadow: hot ? `0 0 ${k.u * 1.3}px ${k.c.accent}` : undefined }} />;
                            })}
                        </div>
                        <Payoff k={k} value={String(count)} unit={p.subtitle} show={easeOut(k.ramp(1, 1.4))} hot={kick(k, HIT, 3)} />
                    </div>
                );
            }}
        </Scene>
    );
}

export function DataCalculatorSliders(p: LaunchProps) {
    const k = useKit(p);
    const sliders = some(p.items, 3);
    const finals = sliders.map((s) => numberIn(s.detail) || 1);
    const HIT = 2;
    const dragSpan = (i: number) => [0.25 + i * 0.35, 1.15 + i * 0.35] as const;
    const drag = (i: number) => easeInOut(k.ramp(...dragSpan(i)));
    const vals = finals.map((f, i) => f * lerp(0.25, 1, drag(i)));
    const total = vals.reduce((a, b) => a * b, 1);
    const pop = kick(k, HIT, 4);
    return (
        <Scene p={p} k={k} hit={HIT} lock={{ subtitle: '' }}>
            {() => (
                <div style={card(k, { padding: k.u * 3, display: 'flex', flexDirection: 'column', gap: k.u * 2.6, fontSize: k.tx * 2.5 })}>
                    {sliders.map((s, i) => {
                        const active = k.s >= dragSpan(i)[0] && k.s < dragSpan(i)[1];
                        const at = (vals[i] / (finals[i] * 1.6)) * 100;
                        return (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: k.u * 1.2 }}>
                                    <span style={{ color: k.c.muted }}>{s.text}</span>
                                    <b style={{ ...tabular, color: active ? k.c.accent : k.c.text }}>{s.detail ? withNumber(s.detail, vals[i]) : ''}</b>
                                </div>
                                <div style={{ position: 'relative', height: k.u * 1.1, borderRadius: k.u, background: al(k.c.muted, 0.2) }}>
                                    <div style={{ width: `${at}%`, height: '100%', borderRadius: k.u, background: `linear-gradient(90deg, ${al(k.c.accent, 0.5)}, ${k.c.accent})`, boxShadow: `0 0 ${k.u * 1.5}px ${al(k.c.accent, 0.5)}` }} />
                                    <span style={{ position: 'absolute', top: '50%', left: `${at}%`, width: k.u * 2.8, height: k.u * 2.8, borderRadius: '50%', background: k.c.text, transform: `translate(-50%, -50%) scale(${active ? 1.2 : 1})`, boxShadow: active ? `0 0 0 ${k.u * 0.8}px ${al(k.c.accent, 0.4)}, 0 0 ${k.u * 3}px ${k.c.accent}` : `0 ${k.u * 0.3}px ${k.u}px #0008` }} />
                                </div>
                            </div>
                        );
                    })}
                    <div style={{ borderTop: `1px solid ${al(k.c.muted, 0.25)}`, paddingTop: k.u * 2.2, textAlign: 'center' }}>
                        <div style={{ ...bigNumber(k, 8), color: k.s > HIT ? k.c.accent : k.c.text, transform: `scale(${1 + 0.1 * pop})`, textShadow: `0 0 ${k.u * 4 * pop}px ${k.c.accent}` }}>{p.date}{Math.round(total).toLocaleString()}</div>
                        <div style={{ color: k.c.muted, marginTop: k.u }}>{p.subtitle}</div>
                    </div>
                </div>
            )}
        </Scene>
    );
}

// ---- Diagrams ----

export function DiagramsNodeFlow(p: LaunchProps) {
    const k = useKit(p);
    const nodes = some(p.items, 5);
    const n = nodes.length;
    const span = n - 1 || 1;
    const HIT = 2.2;
    const pulseAt = (i: number) => 1 + (i * 0.9) / span;
    const arrive = (i: number) => (i === 0 ? 0.9 : pulseAt(i - 1) + 0.5);
    return (
        <Scene p={p} k={k} hit={HIT}>
            {(z) => {
                const [W, H] = [z.w, Math.min(z.h, k.u * (k.portrait ? 62 : 42))];
                const [nw, nh] = k.portrait ? [W * 0.5, k.u * 9] : [Math.min(W * 0.3, (W * 0.8 * 0.9) / span), k.u * 11];
                const pos: Pt[] = nodes.map((_, i) => (k.portrait ? [W * (i % 2 ? 0.68 : 0.32), H * (0.1 + (0.8 * i) / span)] : [W * (0.12 + (0.76 * i) / span), H * (i % 2 ? 0.7 : 0.3)]));
                const out = (a: Pt): Pt => (k.portrait ? [a[0], a[1] + nh / 2] : [a[0] + nw / 2, a[1]]);
                const into = (b: Pt): Pt => (k.portrait ? [b[0], b[1] - nh / 2] : [b[0] - nw / 2, b[1]]);
                return (
                    <div style={{ position: 'relative', width: W, height: H }}>
                        <Wires z={{ w: W, h: H }}>
                            {pos.slice(1).map((b, i) => (
                                <Edge key={i} k={k} a={out(pos[i])} b={into(b)} vertical={k.portrait} draw={k.ramp(0.4 + i * 0.15, 0.9 + i * 0.15)} pulse={k.s < pulseAt(i) ? 0 : ((k.s - pulseAt(i)) % 2) / 0.5} />
                            ))}
                        </Wires>
                        {nodes.map((node, i) => {
                            const s = k.pop(0.05 + i * 0.12, 12);
                            const lit = k.s >= arrive(i) ? 0.35 + 0.65 * kick(k, arrive(i), 3) : 0;
                            return (
                                <div key={i} style={{ ...card(k, { position: 'absolute', left: pos[i][0] - nw / 2, top: pos[i][1] - nh / 2, width: nw, height: nh, display: 'flex', alignItems: 'center', gap: k.u * 1.2, padding: `0 ${k.u * 1.4}px`, opacity: Math.min(1, s * 2), transform: `scale(${0.6 + 0.4 * s})`, borderColor: lit > 0.1 ? k.c.accent : undefined, boxShadow: `0 ${k.u * 2.5}px ${k.u * 9}px #0007${lit > 0 ? `, 0 0 ${k.u * 3.5 * lit}px ${al(k.c.accent, 0.7)}` : ''}` }) }}>
                                    <Tile k={k} size={4} hot={lit}>{i + 1}</Tile>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 750, fontSize: k.tx * 2.4, ...clip }}>{node.text}</div>
                                        {node.detail && <div style={{ color: k.c.muted, fontSize: k.tx * 1.8, ...clip }}>{node.detail}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            }}
        </Scene>
    );
}

export function DiagramsIntegrationPickerGrid(p: LaunchProps) {
    const k = useKit(p);
    const tiles = some(p.items, 9);
    const on = tiles.map((t) => t.detail?.trim().toLowerCase() !== 'off');
    const onCount = on.filter(Boolean).length;
    const order = on.map((v, i) => (v ? on.slice(0, i).filter(Boolean).length : -1));
    const flipAt = (i: number) => 0.7 + (order[i] * 1.2) / Math.max(1, onCount);
    const HIT = 2;
    const connected = tiles.filter((_, i) => on[i] && k.s >= flipAt(i)).length;
    return (
        <Scene p={p} k={k} hit={HIT} lock={{ subtitle: '' }}>
            {() => (
                <Win k={k} title="Integrations" width="100%">
                    <div style={{ padding: k.u * 2.2, display: 'flex', flexDirection: 'column', gap: k.u * 2.4 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: k.u * 1.5, fontSize: k.tx * 2.2 }}>
                            {tiles.map((t, i) => {
                                const s = k.pop(i * 0.05, 13);
                                const flip = on[i] ? easeOut(k.ramp(flipAt(i), flipAt(i) + 0.3)) : 0;
                                const ring = on[i] ? kick(k, flipAt(i), 5) : 0;
                                return (
                                    <div key={i} style={{ ...card(k, { padding: k.u * 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u, transform: `scale(${0.7 + 0.3 * s + 0.04 * ring})`, opacity: Math.min(1, s * 2), borderColor: flip > 0.5 ? k.c.accent : undefined, boxShadow: `0 ${k.u * 1.5}px ${k.u * 5}px #0006${ring > 0.02 ? `, 0 0 ${k.u * 3.5 * ring}px ${k.c.accent}` : ''}` }) }}>
                                        <Tile k={k} size={5.4} hot={flip}>{initial(t.text)}</Tile>
                                        <span style={{ fontWeight: 700, maxWidth: '100%', ...clip }}>{t.text}</span>
                                        <span style={{ position: 'relative', width: k.u * 5.6, height: k.u * 3, borderRadius: 999, background: flip > 0.5 ? k.c.accent : al(k.c.muted, 0.3) }}>
                                            <span style={{ position: 'absolute', top: k.u * 0.4, left: k.u * (0.4 + 2.6 * flip), width: k.u * 2.2, height: k.u * 2.2, borderRadius: '50%', background: k.c.text }} />
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <Payoff k={k} value={String(connected)} unit={p.subtitle} show={easeOut(k.ramp(0.6, 1))} hot={kick(k, HIT, 3)} />
                    </div>
                </Win>
            )}
        </Scene>
    );
}

const depthOf = (path: string) => path.split('/').length - 1;
const nameOf = (path: string) => path.split('/').pop() ?? path;
const dirOf = (path: string) => path.split('/').slice(0, -1).join('/');
const rankOf = (list: string[]) => list.map((x, i) => list.filter((y, j) => y < x || (y === x && j < i)).length);

export function DiagramsFileTreeReflow(p: LaunchProps) {
    const k = useKit(p);
    const files = some(p.items, 8);
    const from = files.map((f) => f.text.trim());
    const to = files.map((f, i) => f.detail?.trim() || from[i]);
    const [ra, rb] = [rankOf(from), rankOf(to)];
    const HIT = 2;
    const mark = easeOut(k.ramp(HIT - 0.1, HIT + 0.4));
    const rh = k.u * 5.2;
    return (
        <Scene p={p} k={k} hit={HIT}>
            {() => (
                <Win k={k} title="Explorer" width="100%">
                    <div style={{ padding: k.u * 2, ...mono(k) }}>
                        <div style={{ position: 'relative', height: rh * files.length }}>
                            {files.map((_, i) => {
                                const changed = from[i] !== to[i];
                                const inn = easeOut(k.ramp(0.05 + i * 0.07, 0.4 + i * 0.07));
                                const r = easeInOut(k.ramp(1 + i * 0.04, 1.9 + i * 0.04));
                                const x = lerp(depthOf(from[i]), depthOf(to[i]), r) * k.u * 2.6;
                                const label = (path: string, o: number) => <span style={{ position: 'absolute', left: x, opacity: o, whiteSpace: 'nowrap' }}><span style={{ color: k.c.accent }}>▤ </span>{nameOf(path)}</span>;
                                return (
                                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: lerp(ra[i], rb[i], r) * rh, height: rh, display: 'flex', alignItems: 'center', opacity: inn, transform: `translateX(${(1 - inn) * -k.u * 3}px)`, borderRadius: k.u, background: changed ? al(k.c.accent, 0.2 * mark) : undefined, boxShadow: changed && mark > 0 ? `inset ${k.u * 0.3}px 0 0 ${al(k.c.accent, mark)}` : undefined, padding: `0 ${k.u}px` }}>
                                        <div style={{ position: 'relative', flex: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
                                            {nameOf(from[i]) === nameOf(to[i]) ? label(from[i], 1) : <>{label(from[i], 1 - r)}{label(to[i], r)}</>}
                                        </div>
                                        <span style={{ color: k.c.muted, fontSize: k.tx * 1.9 }}>{r < 0.5 ? dirOf(from[i]) : dirOf(to[i])}</span>
                                        {changed && <span style={{ marginLeft: k.u, color: k.c.accent, opacity: mark }}>↪</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Win>
            )}
        </Scene>
    );
}

export function DiagramsPipelineFunnel(p: LaunchProps) {
    const k = useKit(p);
    const stages = some(p.items, 5);
    const n = stages.length;
    const counts = stages.map((s) => Math.max(0, numberIn(s.detail)));
    const max = Math.max(1, ...counts);
    const ratio = counts.map((c) => c / max);
    const conv = (counts[n - 1] / (counts[0] || 1)) * 100;
    const HIT = 2;
    const flow = easeOut(k.ramp(1.4, HIT));
    return (
        <Scene p={p} k={k} hit={HIT} lock={{ subtitle: '' }}>
            {(z) => {
                const [W, H] = [z.w - k.u * 4, Math.min(z.h * 0.62, k.u * (k.portrait ? 40 : 32))];
                const band = H / n;
                const width = (j: number) => Math.max(0.2, ratio[Math.min(j, n - 1)]) * W;
                const poly = (j: number) => {
                    const [top, bottom, y0] = [width(j) / 2, (j === n - 1 ? width(j) * 0.8 : width(j + 1)) / 2, j * band];
                    const cx = W / 2;
                    return `${cx - top},${y0} ${cx + top},${y0} ${cx + bottom},${y0 + band - k.u * 0.6} ${cx - bottom},${y0 + band - k.u * 0.6}`;
                };
                return (
                    <div style={{ ...card(k, { padding: k.u * 2 }), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 2.4 }}>
                        <div style={{ position: 'relative', width: W, height: H }}>
                            <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="fun-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={k.c.accent} stopOpacity="0.5" /><stop offset="1" stopColor={k.c.accent} stopOpacity="0.15" /></linearGradient>
                                </defs>
                                {stages.map((_, j) => {
                                    const s = k.pop(j * 0.15, 14);
                                    return <polygon key={j} points={poly(j)} fill="url(#fun-fill)" stroke={al(k.c.accent, j === n - 1 ? 0.9 : 0.4)} strokeWidth={k.u * 0.2} opacity={Math.min(1, s * 2)} style={j === n - 1 ? glow(k, k.c.accent, 1.5 + 3 * kick(k, HIT, 3)) : undefined} />;
                                })}
                                {Array.from({ length: 14 }, (_, i) => {
                                    const t = (k.s - (0.5 + i * 0.1)) / 1.3;
                                    if (t <= 0 || t >= 1) return null;
                                    const j = Math.min(n - 1, Math.floor(t * n));
                                    if (seeded(i + 11) >= ratio[j]) return null;
                                    return <circle key={i} cx={W / 2 + (seeded(i + 3) - 0.5) * 0.7 * width(j)} cy={t * H} r={k.u * 0.7} fill={k.c.text} style={glow(k, k.c.accent, 1.8)} />;
                                })}
                            </svg>
                            {stages.map((s, j) => {
                                const c = easeOut(k.ramp(0.3 + j * 0.15, 1.4 + j * 0.15));
                                return (
                                    <div key={j} style={{ position: 'absolute', top: j * band, height: band, left: (W - Math.max(width(j), k.u * 22)) / 2, width: Math.max(width(j), k.u * 22), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: k.u, padding: `0 ${k.u * 2}px`, fontSize: k.tx * 2.3, opacity: k.pop(j * 0.15, 14) }}>
                                        <span style={{ fontWeight: 700, ...clip }}>{s.text}</span>
                                        <b style={{ color: k.c.accent, ...tabular }}>{s.detail ? withNumber(s.detail, counts[j] * c) : ''}</b>
                                    </div>
                                );
                            })}
                        </div>
                        <Payoff k={k} value={`${(conv * flow).toFixed(1).replace(/\.0$/, '')}%`} unit={p.subtitle} show={flow} hot={kick(k, HIT, 3)} />
                    </div>
                );
            }}
        </Scene>
    );
}

export function ReleaseNotesCascade(p: LaunchProps) {
    const k = useKit(p);
    const notes = some(p.items, 5);
    const prev = p.date.replace(/(\d+)(?!.*\d)/, (x) => String(Math.max(0, Number(x) - 1)));
    const HIT = 1.8;
    const roll = easeInOut(k.ramp(HIT - 0.1, HIT + 0.4));
    const face: CSSProperties = { ...bigNumber(k, 5.4), color: k.c.accent, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' };
    return (
        <Scene p={p} k={k} hit={HIT}>
            {() => (
                <Win k={k} title="Changelog" width="100%">
                    <div style={{ padding: k.u * 2.2, display: 'flex', flexDirection: 'column', gap: k.u * 0.8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 2, paddingBottom: k.u * 1.2 }}>
                            <div style={{ position: 'relative', width: k.u * 26, height: k.tx * 6, overflow: 'hidden' }}>
                                <span style={{ ...face, transform: `translateY(${-roll * 100}%)`, opacity: 1 - roll, color: k.c.muted }}>{prev}</span>
                                <span style={{ ...face, transform: `translateY(${(1 - roll) * 100}%)`, opacity: roll, textShadow: `0 0 ${k.u * 4 * kick(k, HIT, 3)}px ${k.c.accent}` }}>{p.date}</span>
                            </div>
                            <span style={{ transform: `scale(${k.pop(HIT + 0.1, 10)})` }}><Pill k={k} active>NEW</Pill></span>
                        </div>
                        {notes.map((n, i) => {
                            const s = k.pop(0.15 + i * 0.25, 12);
                            return <Row key={i} k={k} style={{ borderBottom: `1px solid ${al(k.c.muted, 0.15)}`, borderRadius: 0, opacity: Math.min(1, s * 2), transform: `translateY(${(1 - s) * -k.u * 8}px) rotate(${(1 - s) * (i % 2 ? 2 : -2)}deg)` }} icon={<Check k={k} size={3.4} progress={k.ramp(0.35 + i * 0.25, 0.7 + i * 0.25)} />} title={<span style={{ color: k.c.text }}>{n.text}</span>} detail={n.detail} />;
                        })}
                    </div>
                </Win>
            )}
        </Scene>
    );
}
