import { Aura, Shock, Stage, al, card, clamp01, easeOutQuart, glow, hitFlash, useHero, type Kit } from './hero';
import { type Brand } from './assets';

export interface ChartPoint {
    label: string;
    value: number;
}

export interface ChartProps {
    heading: string;
    kind: 'bars' | 'line';
    points: ChartPoint[];
    /** Written after each value, e.g. "%" or "k". */
    unit: string;
    transparent?: boolean;
    brand: Brand;
}

const START = 4 / 30;
/** Seconds the bars or the line take to land; the scene's beat is this plus 8 frames. */
export const CHART_BEAT = 1;
const HIT = CHART_BEAT + 8 / 30;

/** Points as drawn: finite values only, at most 8. */
export function cleanPoints(points: unknown): ChartPoint[] {
    return (Array.isArray(points) ? points : [])
        .filter((p) => Number.isFinite(Number(p?.value)))
        .slice(0, 8)
        .map((p) => ({ label: String(p.label ?? ''), value: Number(p.value) }));
}

/** A smooth open curve through the points (Catmull-Rom to bezier). */
function curve(pts: [number, number][]) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const [p0, p1, p2, p3] = [pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)]];
        d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
}

interface PlotProps {
    k: Kit;
    kind: 'bars' | 'line';
    points: ChartPoint[];
    width: number;
    height: number;
    /** Seconds at which the first bar starts (or the line starts drawing) and the last one lands. */
    from: number;
    to: number;
    format: (value: number) => string;
}

/** Bars rising one after another, or a line drawing itself across with its dots and values popping in; the last one flashes. Shared with the stat counter. */
export function ChartPlot({ k, kind, points, width, height, from, to, format }: PlotProps) {
    const { c, u } = k;
    const n = points.length;
    if (!n) return null;
    const max = Math.max(1, ...points.map((p) => p.value));
    const top = u * 5;
    const bottom = u * 5;
    const plotH = height - top - bottom;
    const slot = width / n;
    const x = (i: number) => slot * (i + 0.5);
    const y = (v: number) => top + plotH * (1 - clamp01(v / max));
    const base = top + plotH;
    const grid = k.ramp(from, from + 0.4);
    const hit = hitFlash(k, to);
    const draw = easeOutQuart(k.ramp(from, to));
    // Each bar starts a little after the one before, the last landing on `to`.
    const barStart = (i: number) => from + (n > 1 ? (i / (n - 1)) * (to - from - 0.3) : 0);
    const reach = (i: number) => (n > 1 ? i / (n - 1) : 0);
    const dots = points.map<[number, number]>((p, i) => [x(i), y(p.value)]);
    const lineD = n > 1 ? curve(dots) : '';
    const lastX = x(n - 1);
    const lastY = y(points[n - 1].value);

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id="cp-last" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.accent} /><stop offset="1" stopColor={al(c.accent, 0.55)} /></linearGradient>
                <linearGradient id="cp-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={al(c.accent, 0.4)} /><stop offset="1" stopColor={al(c.accent, 0.08)} /></linearGradient>
                <linearGradient id="cp-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={al(c.accent, 0.38)} /><stop offset="1" stopColor={al(c.accent, 0)} /></linearGradient>
                <clipPath id="cp-reveal"><rect x={0} y={0} width={x(0) + (lastX - x(0)) * draw + u} height={height} /></clipPath>
            </defs>
            {[0, 1 / 3, 2 / 3, 1].map((g, i) => (
                <line key={i} x1={0} x2={width * grid} y1={base - plotH * g} y2={base - plotH * g} stroke={al(c.muted, i ? 0.16 : 0.45)} strokeWidth={u * 0.18} strokeDasharray={i ? `${u * 0.8} ${u * 1.2}` : undefined} />
            ))}
            {kind === 'line' && n > 1 && (
                <>
                    <path d={`${lineD}L${lastX},${base}L${x(0)},${base}Z`} fill="url(#cp-area)" clipPath="url(#cp-reveal)" />
                    <path d={lineD} fill="none" stroke={c.accent} strokeWidth={u * 0.7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={glow(k, c.accent, 1.6)} />
                </>
            )}
            {points.map((point, i) => {
                const last = i === n - 1;
                // Bars grow on their own spring (overshooting); line points appear as the line reaches them.
                const g = kind === 'bars' ? k.pop(barStart(i), 12) : n > 1 ? clamp01((draw - reach(i) + 0.02) / 0.1) : k.pop(from, 12);
                const shown = clamp01(g);
                const barH = Math.max(0, (base - y(point.value)) * g);
                const topY = kind === 'bars' ? base - barH : y(point.value);
                const bw = Math.min(slot * 0.58, u * 15);
                return (
                    <g key={i}>
                        {kind === 'bars' ? (
                            <g style={last ? glow(k, c.accent, 2.2 + hit * 3) : undefined}>
                                <rect x={x(i) - bw / 2} y={topY} width={bw} height={barH} rx={u * 0.9} fill={last ? 'url(#cp-last)' : 'url(#cp-bar)'} stroke={al(c.accent, last ? 0 : 0.4)} strokeWidth={u * 0.18} />
                                {last && <rect x={x(i) - bw / 2} y={topY} width={bw} height={barH} rx={u * 0.9} fill={c.text} opacity={hit * 0.4} />}
                            </g>
                        ) : (
                            <g style={last ? glow(k, c.accent, 2 + hit * 3) : undefined}>
                                <circle cx={x(i)} cy={topY} r={u * 2.2 * shown} fill={al(c.accent, 0.18)} />
                                <circle cx={x(i)} cy={topY} r={u * 1.05 * shown} fill={last ? c.text : c.bg} stroke={c.accent} strokeWidth={u * 0.4} />
                            </g>
                        )}
                        <text x={x(i)} y={topY - u * (kind === 'bars' ? 1.4 : 3.2)} textAnchor="middle" fontSize={u * (last ? 3 : 2.6)} fontWeight={700} fill={last ? c.accent : c.text} opacity={shown} style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {format(point.value * shown)}
                        </text>
                        <text x={x(i)} y={base + u * 3.6} textAnchor="middle" fontSize={u * 2.2} fill={c.muted} opacity={grid}>{point.label}</text>
                    </g>
                );
            })}
            <Shock k={k} x={lastX} y={kind === 'bars' ? (base + lastY) / 2 : lastY} r0={u} r1={u * 14} t0={to} />
        </svg>
    );
}

/** Growth at a glance: bars rise one after another, or a line draws itself across, with the values popping in. */
export function Chart({ heading, kind, points, unit, transparent, brand }: ChartProps) {
    const { p, k } = useHero(brand, transparent);
    const data = cleanPoints(points);
    const pad = k.u * 3.5;
    const cardW = k.stacked ? k.width * 0.88 : k.width * 0.78;
    const plotW = cardW - pad * 2;
    const plotH = Math.min(k.height * 0.5, plotW * 0.62);
    const headIn = k.pop(0, 14);
    const cardIn = k.pop(0.06, 14);

    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height * 0.58} r={Math.min(k.width, k.height) * 0.7} a={0.18 + hitFlash(k, HIT) * 0.15} scale={cardIn} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 3.5 }}>
                <div style={{ fontFamily: k.display, fontSize: k.tx * 5.2, fontWeight: 800, letterSpacing: -k.u * 0.12, color: k.c.text, opacity: Math.min(1, headIn * 1.5), transform: `translateY(${(1 - headIn) * k.u * 2.5}px)`, textAlign: 'center', maxWidth: k.width * 0.8 }}>{heading}</div>
                <div style={{ ...card(k, { padding: pad, borderRadius: k.u * 2.4 }), opacity: Math.min(1, cardIn * 1.5), transform: `translateY(${(1 - cardIn) * k.u * 4}px) scale(${0.96 + 0.04 * cardIn})` }}>
                    <ChartPlot k={k} kind={kind === 'line' ? 'line' : 'bars'} points={data} width={plotW} height={plotH} from={START} to={HIT} format={(v) => `${Math.round(v * 10) / 10}${unit ?? ''}`} />
                </div>
            </div>
        </Stage>
    );
}
