// Data and metric scenes: numbers that move, charts that draw.
import { Col, Headline, Kicker, Rule, Stage, Sub, easeOut, listOf, numberIn, useKit, type Kit, type LaunchProps } from './kit';
import { al } from './shapes';
import { Atmosphere, glass, rise } from './fx';

/** "Sign" and unit around a number in the item's detail, e.g. "$4.2M" → ['$', 'M']. */
const affixes = (text = '') => [/^[^\d-]*/.exec(text)?.[0] ?? '', /[^\d.,]*$/.exec(text)?.[0] ?? ''] as const;
const compact = (n: number, step = 1) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : n.toFixed(step).replace(/\.0+$/, ''));
/** A detail string with its number replaced by `n`, e.g. ("$4.2M", 2) → "$2M". */
const withValue = (detail: string | undefined, n: number) => (detail ? affixes(detail)[0] + compact(n) + affixes(detail)[1] : '');

/** Standard top-to-bottom layout: eyebrow, headline, the chart, subtitle. */
function ChartScene({ p, k, hit, children }: { p: LaunchProps; k: Kit; hit: number; children: React.ReactNode }) {
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.5} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <Headline k={k} size={5.2} style={rise(k, 0.12)}>{p.headline}</Headline>
                {children}
                <Sub k={k} style={rise(k, hit)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function LineChartDraw(p: LaunchProps) {
    const k = useKit(p);
    const pts = [8, 14, 12, 22, 20, 34, 31, 48, 56, 52, 70, 88];
    const W = 100, H = 50;
    const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, H - (v / 100) * (H - 6) - 3] as const);
    const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const hit = 2.3;
    const draw = easeOut(k.ramp(0.3, hit));
    const at = draw * (xy.length - 1);
    const [i0, frac] = [Math.min(xy.length - 2, Math.floor(at)), at - Math.min(xy.length - 2, Math.floor(at))];
    const head = [xy[i0][0] + (xy[i0 + 1][0] - xy[i0][0]) * frac, xy[i0][1] + (xy[i0 + 1][1] - xy[i0][1]) * frac];
    const land = k.pop(hit, 10);
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} a={0.2 + 0.1 * draw} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={glass(k, { width: k.stacked ? '88%' : '62%', padding: k.u * 3, ...rise(k, 0.1, 5) })}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: k.u * 1.6 }}>
                        <span style={{ color: k.c.muted, fontSize: k.tx * 2.4 }}>{p.headline}</span>
                        <span style={{ fontFamily: k.display, fontWeight: 850, fontSize: k.tx * 6, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 ${k.u * 3 * (1 - land)}px ${k.c.accent}`, transform: `scale(${k.s < hit ? 1 : 1 + 0.12 * (1 - land)})`, transformOrigin: 'right' }}>{Math.round(p.metric * draw).toLocaleString()}</span>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
                        <defs><linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={k.c.accent} stopOpacity=".45" /><stop offset="1" stopColor={k.c.accent} stopOpacity="0" /></linearGradient></defs>
                        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke={k.c.muted} strokeOpacity=".16" strokeWidth=".3" strokeDasharray="1 1.4" />)}
                        <path d={`${d} L${W} ${H} L0 ${H}Z`} fill="url(#lcFill)" style={{ clipPath: `inset(0 ${100 - draw * 100}% 0 0)` }} />
                        <path d={d} fill="none" stroke={k.c.accent} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 1.2px ${k.c.accent})` }} />
                        <line x1={head[0]} x2={head[0]} y1={head[1]} y2={H} stroke={k.c.accent} strokeOpacity=".3" strokeWidth=".3" />
                        <circle cx={head[0]} cy={head[1]} r={1.5 + 1.6 * (1 - Math.min(1, land)) + 0.5 * Math.sin(k.s * 6)} fill={al(k.c.accent, 0.3)} />
                        <circle cx={head[0]} cy={head[1]} r="1.6" fill={k.c.text} stroke={k.c.accent} strokeWidth=".8" />
                    </svg>
                </div>
                <Sub k={k} style={rise(k, hit)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function BarChartRise(p: LaunchProps) {
    const k = useKit(p);
    const bars = listOf(p.items, [], 6);
    const values = bars.map((b) => numberIn(b.detail));
    const max = Math.max(1, ...values);
    const hi = values.indexOf(Math.max(...values));
    const hit = 1.7; // every bar has landed and the tallest lights up
    const lit = k.pop(hit, 10);
    const width = k.stacked ? '84%' : '58%';
    return (
        <ChartScene p={p} k={k} hit={hit}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: k.u * 2.4, width, height: k.u * (k.portrait ? 34 : 30), borderBottom: `1px solid ${al(k.c.muted, 0.3)}` }}>
                {[0.25, 0.5, 0.75].map((g) => <div key={g} style={{ position: 'absolute', left: 0, right: 0, bottom: `${g * 82}%`, borderTop: `1px dashed ${al(k.c.muted, 0.14)}` }} />)}
                {bars.map((bar, i) => {
                    const grow = k.pop(0.2 + i * 0.09, 11);
                    const count = easeOut(k.ramp(0.2 + i * 0.09, 1.1 + i * 0.09));
                    const top = i === hi;
                    return (
                        <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: k.u * 0.8, position: 'relative' }}>
                            <span style={{ fontSize: k.tx * 2.2 * (top ? 1 + 0.25 * lit : 1), fontWeight: 750, fontVariantNumeric: 'tabular-nums', color: top && k.s >= hit ? k.c.accent : k.c.text, opacity: Math.min(1, count * 2) }}>{withValue(bar.detail, values[i] * count)}</span>
                            <div style={{ width: '100%', height: `${(values[i] / max) * Math.max(0, grow) * 82}%`, borderRadius: `${k.u}px ${k.u}px 0 0`, background: top ? `linear-gradient(${k.c.accent}, ${al(k.c.accent, 0.45)})` : `linear-gradient(${al(k.c.muted, 0.5)}, ${al(k.c.muted, 0.18)})`, boxShadow: top ? `0 0 ${k.u * 5 * lit}px ${al(k.c.accent, 0.6)}` : 'none', opacity: top || k.s < hit ? 1 : 1 - 0.3 * lit }} />
                        </div>
                    );
                })}
            </div>
            <div style={{ display: 'flex', gap: k.u * 2.4, width }}>{bars.map((b, i) => <div key={i} style={{ flex: 1, textAlign: 'center', color: i === hi && k.s >= hit ? k.c.text : k.c.muted, fontSize: k.tx * 2, ...rise(k, 0.3 + i * 0.09, 2) }}>{b.text}</div>)}</div>
        </ChartScene>
    );
}

export function RingProgress(p: LaunchProps) {
    const k = useKit(p);
    const pct = Math.max(0, Math.min(100, p.metric));
    const hit = 1.9;
    const fill = easeOut(k.ramp(0.2, hit));
    const size = k.u * 42;
    const land = k.pop(hit, 9);
    const angle = (pct / 100) * fill * Math.PI * 2 - Math.PI / 2;
    const ticks = 48;
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.46} a={0.2 + 0.12 * fill} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center', ...rise(k, 0.08, 3) }}>
                    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', overflow: 'visible' }}>
                        {Array.from({ length: ticks }, (_, i) => {
                            const a = (i / ticks) * Math.PI * 2;
                            const on = i / ticks <= (pct / 100) * fill;
                            return <line key={i} x1={50 + Math.cos(a) * 49.5} y1={50 + Math.sin(a) * 49.5} x2={50 + Math.cos(a) * 47.5} y2={50 + Math.sin(a) * 47.5} transform="rotate(-90 50 50)" stroke={on ? k.c.accent : al(k.c.muted, 0.25)} strokeWidth="0.6" strokeLinecap="round" />;
                        })}
                        <circle cx="50" cy="50" r="38" fill={al(k.c.surface, 0.7)} />
                        <g transform="rotate(-90 50 50)">
                            <circle cx="50" cy="50" r="42" fill="none" stroke={al(k.c.muted, 0.2)} strokeWidth="6" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke={k.c.accent} strokeWidth="6" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (pct / 100) * fill} style={{ filter: `drop-shadow(0 0 ${k.u * 0.9}px ${k.c.accent})` }} />
                        </g>
                        <circle cx={50 + Math.cos(angle) * 42} cy={50 + Math.sin(angle) * 42} r="2.2" fill={k.c.text} style={{ filter: `drop-shadow(0 0 ${k.u * 0.8}px ${k.c.accent})` }} />
                    </svg>
                    <div style={{ fontFamily: k.display, fontWeight: 900, fontSize: k.u * 11, fontVariantNumeric: 'tabular-nums', transform: `scale(${k.s < hit ? 1 : 1 + 0.15 * (1 - land)})`, textShadow: `0 0 ${k.u * 4 * (1 - Math.min(1, land))}px ${k.c.accent}` }}>{Math.round(pct * fill)}<span style={{ fontSize: k.u * 5, color: k.c.accent }}>%</span></div>
                </div>
                <Headline k={k} size={5} style={rise(k, hit)}>{p.headline}</Headline>
                <Sub k={k} style={rise(k, hit + 0.15)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function LeaderboardRace(p: LaunchProps) {
    const k = useKit(p);
    const rows = listOf(p.items, [], 6);
    const target = rows.map((r) => numberIn(r.detail));
    // Rows climb at different paces (later ones slower), so whichever value is biggest passes the rest and ends first.
    const finish = (i: number) => 1.3 + i * 0.22;
    const hit = finish(rows.length - 1) + 0.1;
    const cur = target.map((t, i) => t * easeOut(k.ramp(0.2, finish(i))));
    const max = Math.max(1, ...cur, ...target);
    // Smooth rank: how many rows are ahead, blended so rows slide past each other.
    const rank = cur.map((v, i) => cur.reduce((n, o, j) => (j === i ? n : n + 1 / (1 + Math.exp((v - o) / (max * 0.03)))), 0));
    const rowH = k.u * 7.2;
    const win = k.pop(hit, 10);
    return (
        <ChartScene p={p} k={k} hit={hit}>
            <div style={{ position: 'relative', width: k.stacked ? '86%' : '52%', height: rowH * rows.length }}>
                {rows.map((row, i) => {
                    const lead = rank[i] < 0.5;
                    const crowned = lead && k.s >= hit;
                    return (
                        <div key={i} style={{ ...glass(k, { borderRadius: k.u * 1.2, borderColor: lead ? k.c.accent : al(k.c.muted, 0.22), boxShadow: lead ? `0 0 ${k.u * (3 + 3 * (crowned ? win : 0))}px ${al(k.c.accent, 0.4)}` : `0 ${k.u}px ${k.u * 3}px #0006` }), position: 'absolute', left: 0, right: 0, height: rowH - k.u * 1.2, top: rank[i] * rowH, display: 'flex', alignItems: 'center', gap: k.u * 2, padding: `0 ${k.u * 2}px`, overflow: 'hidden', ...rise(k, 0.1 + i * 0.06, 3), transform: `translateX(${(1 - k.pop(0.1 + i * 0.06, 12)) * -k.u * 5}px) scale(${crowned ? 1 + 0.025 * win : 1})` }}>
                            <div style={{ position: 'absolute', inset: 0, width: `${(cur[i] / max) * 100}%`, background: `linear-gradient(90deg, ${al(k.c.accent, lead ? 0.15 : 0.05)}, ${al(k.c.accent, lead ? 0.5 : 0.2)})` }} />
                            <span style={{ position: 'relative', width: k.u * 3, color: lead ? k.c.accent : k.c.muted, fontWeight: 800, fontSize: k.tx * 2.4 }}>{Math.round(rank[i]) + 1}</span>
                            <span style={{ position: 'relative', flex: 1, fontSize: k.tx * 2.8, fontWeight: 650 }}>{row.text}</span>
                            <span style={{ position: 'relative', fontSize: k.tx * 2.6, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{withValue(row.detail, cur[i])}</span>
                        </div>
                    );
                })}
            </div>
        </ChartScene>
    );
}

export function OdometerDigits(p: LaunchProps) {
    const k = useKit(p);
    const digits = String(Math.max(0, Math.round(p.metric))).split('').map(Number);
    const h = k.u * 15;
    const settleAt = (i: number) => 0.1 + i * 0.1;
    const hit = settleAt(digits.length - 1) + 1.2;
    const commaAt = (i: number) => (digits.length - i - 1) % 3 === 0 && i < digits.length - 1;
    const land = k.pop(hit, 9);
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.46} />
            <Col k={k} gap={3.5}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ display: 'flex', alignItems: 'center', fontFamily: k.display, fontWeight: 900, fontSize: h * 0.85, lineHeight: 1, transform: `scale(${k.s < hit ? 1 : 1 + 0.06 * (1 - land)})` }}>
                    {digits.map((digit, i) => {
                        // The wheel keeps spinning past the target a little and springs back; only the 4 visible numbers are drawn.
                        const pos = digit + 10 * (1 - k.pop(settleAt(i), 15));
                        const first = Math.floor(pos) - 1;
                        return (
                            <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ display: 'block', height: h, width: h * 0.62, overflow: 'hidden', borderRadius: k.u * 1.2, background: `linear-gradient(${k.c.surface}, ${k.c.bg})`, border: `1px solid ${al(k.c.accent, 0.3)}`, boxShadow: `0 ${k.u * 2}px ${k.u * 5}px #000a, 0 0 ${k.u * 3}px ${al(k.c.accent, 0.15)}`, margin: `0 ${k.u * 0.4}px`, position: 'relative' }}>
                                    {[0, 1, 2, 3].map((n) => (
                                        <span key={n} style={{ position: 'absolute', left: 0, right: 0, top: (first + n - pos) * h, height: h, lineHeight: `${h}px`, textAlign: 'center' }}>{(((first + n) % 10) + 10) % 10}</span>
                                    ))}
                                    <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(#000b, transparent 30%, transparent 70%, #000b)` }} />
                                    <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: al(k.c.accent, 0.25) }} />
                                </span>
                                {commaAt(i) && <span style={{ color: k.c.muted }}>,</span>}
                            </span>
                        );
                    })}
                    <span style={{ color: k.c.accent, marginLeft: k.u, textShadow: `0 0 ${k.u * 4}px ${al(k.c.accent, 0.7)}`, ...rise(k, hit - 0.2, 3) }}>+</span>
                </div>
                <Rule k={k} width={24} progress={k.pop(hit)} />
                <Headline k={k} size={4.6} style={rise(k, hit)}>{p.headline}</Headline>
                <Sub k={k} style={rise(k, hit + 0.15)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function MetricsGrid(p: LaunchProps) {
    const k = useKit(p);
    const stats = listOf(p.items, [], 4);
    const hit = 1.4; // the last figure has counted up
    return (
        <Stage p={p}>
            <Atmosphere k={k} a={0.22} />
            <Col k={k} gap={4}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <Headline k={k} size={5.4} style={rise(k, 0.1)}>{p.headline}</Headline>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${k.stacked ? 2 : Math.min(4, stats.length)}, 1fr)`, gap: k.u * 2, width: k.stacked ? '86%' : '72%' }}>
                    {stats.map((stat, i) => {
                        const t = easeOut(k.ramp(0.25 + i * 0.1, 1.3 + i * 0.05));
                        const bob = Math.sin(k.s * 1.3 + i * 1.7) * k.u * 0.35;
                        const [pre, post] = affixes(stat.detail);
                        return (
                            <div key={i} style={{ ...glass(k, { padding: `${k.u * 3}px ${k.u * 2.4}px`, textAlign: 'center', position: 'relative', overflow: 'hidden' }), ...rise(k, 0.2 + i * 0.1, 5), transform: `translateY(${(1 - k.pop(0.2 + i * 0.1, 11)) * k.u * 5 + bob}px) scale(${0.94 + 0.06 * k.pop(0.2 + i * 0.1, 11)})` }}>
                                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: k.u * 0.5, background: `linear-gradient(90deg, transparent, ${k.c.accent}, transparent)`, opacity: t }} />
                                <div style={{ fontFamily: k.display, fontWeight: 900, fontSize: k.tx * 7, fontVariantNumeric: 'tabular-nums', color: k.c.text, textShadow: `0 0 ${k.u * 3}px ${al(k.c.accent, 0.35 * t)}` }}>{pre}{compact(numberIn(stat.detail) * t)}<span style={{ color: k.c.accent }}>{post}</span></div>
                                <div style={{ marginTop: k.u, color: k.c.muted, fontSize: k.tx * 2.3 }}>{stat.text}</div>
                            </div>
                        );
                    })}
                </div>
                <Sub k={k} style={rise(k, hit - 0.2)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}
