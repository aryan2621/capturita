import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';
import { fitSize } from './text';

export type StatFormat = 'int' | 'compact' | 'percent' | 'currency';
export type StatChart = 'none' | 'bars' | 'line' | 'progress';

export interface Stat {
    value: number;
    label: string;
    prefix: string;
    suffix: string;
    format: StatFormat;
}

export interface StatCounterProps {
    heading: string;
    stats: Stat[];
    chart: StatChart;
    chartData: { label: string; value: number }[];
    transparent?: boolean;
    brand: Brand;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** A number as its format shows it. Percent takes the number itself (98 → 98%). */
export function formatStat(value: number, format: StatFormat, final: number) {
    const fraction = Number.isInteger(final) ? 0 : Math.min(2, String(final).split('.')[1]?.length ?? 0);
    switch (format) {
        case 'compact':
            return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
        case 'percent':
            return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(value / 100);
        case 'currency':
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(value);
        default:
            return new Intl.NumberFormat('en-US', { minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(value);
    }
}

/** One to three numbers counting up with springs, each with a label; optionally a bar, line or progress chart. */
export function StatCounter({ heading, stats, chart, chartData, transparent, brand }: StatCounterProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const portrait = height > width * 1.05;
    // Portrait frames have height to spare: everything is drawn a third larger.
    const unit = (Math.min(width, height) / 100) * (portrait ? 1.3 : 1);
    const { colors } = brand;

    const items = (Array.isArray(stats) ? stats : []).slice(0, 3);
    const points = (Array.isArray(chartData) ? chartData : []).slice(0, 8).map((p) => ({ label: String(p?.label ?? ''), value: num(p?.value) }));
    const showChart = chart !== 'none' && points.length > 0;
    const exit = useExit();
    const headingIn = spring({ frame, fps, config: { damping: 200 } });
    // Fewer, bigger numbers when there's room; smaller when a chart shares the frame.
    const rowGap = unit * (portrait ? 5 : 9);
    // Side by side, each stat gets an equal share of the width; its number shrinks to fit it.
    const colWidth = portrait ? width * 0.84 : (width * 0.9 - rowGap * (items.length - 1)) / Math.max(1, items.length);
    const finalText = (stat: Stat) => `${stat?.prefix ?? ''}${formatStat(num(stat?.value), stat?.format ?? 'int', num(stat?.value))}${stat?.suffix ?? ''}`;
    const valueSize = fitSize(items.map(finalText).join('\n'), colWidth, brand.fonts.display, unit * (showChart ? 10 : items.length === 1 ? 20 : portrait ? 13 : 12));
    const chartWidth = portrait ? width * 0.84 : width * (items.length ? 0.62 : 0.8);
    const chartHeight = portrait ? height * 0.26 : height * (items.length ? 0.32 : 0.55);

    return (
        <AbsoluteFill
            style={{
                background: transparent ? 'transparent' : `radial-gradient(110% 100% at 50% 0%, ${colors.surface} 0%, ${colors.bg} 65%)`,
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: bodyFont(brand),
                lineHeight: 1.2,
                opacity: exit,
            }}
        >
            <BrandTexture brand={brand} transparent={transparent} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: unit * (portrait ? 6 : 5) }}>
                {heading && (
                    <div style={{ color: colors.muted, fontSize: unit * 3.4, fontWeight: 600, lineHeight: 1.2, letterSpacing: unit * 0.3, textTransform: 'uppercase', opacity: headingIn, textAlign: 'center' }}>
                        {heading}
                    </div>
                )}
                {items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: portrait ? 'center' : 'flex-start', gap: rowGap }}>
                        {items.map((stat, i) => (
                            <Counter key={i} stat={stat} frame={frame - 6 - i * 6} fps={fps} size={valueSize} width={colWidth} unit={unit} brand={brand} />
                        ))}
                    </div>
                )}
                {showChart && (
                    <div style={{ width: chartWidth, height: chartHeight }}>
                        {chart === 'bars' && <Bars points={points} frame={frame - 14} fps={fps} width={chartWidth} height={chartHeight} unit={unit} brand={brand} />}
                        {chart === 'line' && <Line points={points} frame={frame - 14} width={chartWidth} height={chartHeight} unit={unit} brand={brand} />}
                        {chart === 'progress' && <Progress points={points} frame={frame - 14} fps={fps} width={chartWidth} height={chartHeight} unit={unit} brand={brand} />}
                    </div>
                )}
            </div>
        </AbsoluteFill>
    );
}

function Counter({ stat, frame, fps, size, width, unit, brand }: { stat: Stat; frame: number; fps: number; size: number; width: number; unit: number; brand: Brand }) {
    const { colors } = brand;
    const final = num(stat?.value);
    const format: StatFormat = stat?.format ?? 'int';
    const p = spring({ frame, fps, config: { damping: 30, stiffness: 60 }, durationInFrames: 50 });
    const appear = interpolate(frame, [0, 6], [0, 1], clamp);
    const current = format === 'compact' || !Number.isInteger(final) ? final * p : Math.round(final * p);
    const text = (value: number) => `${stat?.prefix ?? ''}${formatStat(value, format, final)}${stat?.suffix ?? ''}`;
    const landed = interpolate(frame, [40, 46, 54], [0, 1, 0], clamp);
    const valueStyle = { fontFamily: displayFont(brand), fontSize: size, fontWeight: 800, lineHeight: 1, letterSpacing: -size * 0.02, fontVariantNumeric: 'tabular-nums' as const, gridArea: '1 / 1', textAlign: 'center' as const, whiteSpace: 'nowrap' as const };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: appear, transform: `translateY(${(1 - appear) * unit * 2}px) scale(${1 + landed * 0.03})` }}>
            {/* The final value, hidden, holds the width so the count doesn't shift as digits change. */}
            <div style={{ display: 'grid' }}>
                <span style={{ ...valueStyle, visibility: 'hidden' }}>{text(final)}</span>
                <span style={{ ...valueStyle, color: colors.text }}>{text(current)}</span>
            </div>
            <div style={{ height: unit * 0.5, width: unit * 8 * p, background: colors.accent, borderRadius: unit, marginTop: unit * 1.6 }} />
            {stat?.label && <div style={{ color: colors.muted, fontSize: unit * 3, fontWeight: 500, lineHeight: 1.25, marginTop: unit * 1.4, textAlign: 'center', maxWidth: width }}>{stat.label}</div>}
        </div>
    );
}

type ChartProps = { points: { label: string; value: number }[]; frame: number; width: number; height: number; unit: number; brand: Brand };

function Bars({ points, frame, fps, width, height, unit, brand }: ChartProps & { fps: number }) {
    const { colors } = brand;
    const max = Math.max(1, ...points.map((p) => p.value));
    const gap = unit * 2;
    const labelRoom = unit * 5;
    const barWidth = (width - gap * (points.length - 1)) / points.length;
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap, width, height }}>
            {points.map((point, i) => {
                const p = spring({ frame: frame - i * 3, fps, config: { damping: 16, stiffness: 120 } });
                const full = ((height - labelRoom - unit * 4) * Math.max(0, point.value)) / max;
                const last = i === points.length - 1;
                return (
                    <div key={i} style={{ width: barWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <div style={{ color: colors.text, fontSize: unit * 2.4, fontWeight: 700, lineHeight: 1.2, marginBottom: unit * 0.8, opacity: interpolate(p, [0.6, 1], [0, 1], clamp), fontVariantNumeric: 'tabular-nums' }}>
                            {new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(point.value)}
                        </div>
                        <div style={{ width: '100%', height: Math.max(0, full * p), background: last ? colors.accent : colors.surface, borderRadius: `${unit * 0.8}px ${unit * 0.8}px 0 0`, boxShadow: last ? 'none' : `inset 0 0 0 ${unit * 0.15}px ${colors.accent}55` }} />
                        <div style={{ height: labelRoom, display: 'flex', alignItems: 'center', color: colors.muted, fontSize: unit * 2.2, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{point.label}</div>
                    </div>
                );
            })}
        </div>
    );
}

function Line({ points, frame, width, height, unit, brand }: ChartProps) {
    const { colors } = brand;
    const values = points.map((p) => p.value);
    const max = Math.max(...values);
    const min = Math.min(0, ...values);
    const pad = unit * 2;
    const labelRoom = unit * 5;
    const plotHeight = height - labelRoom - pad * 2;
    const xs = points.map((_, i) => pad + (points.length === 1 ? (width - pad * 2) / 2 : (i * (width - pad * 2)) / (points.length - 1)));
    const ys = values.map((v) => pad + plotHeight - ((v - min) / Math.max(1e-9, max - min)) * plotHeight);
    const segments = xs.slice(1).map((x, i) => Math.hypot(x - xs[i], ys[i + 1] - ys[i]));
    const total = segments.reduce((a, b) => a + b, 0) || 1;
    const draw = interpolate(frame, [0, 36], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 2) });
    const path = xs.map((x, i) => `${i ? 'L' : 'M'}${x},${ys[i]}`).join(' ');
    const area = `${path} L${xs[xs.length - 1]},${pad + plotHeight} L${xs[0]},${pad + plotHeight} Z`;
    // How far along the line each point sits, so its dot pops as the line reaches it.
    let run = 0;
    const reach = xs.map((_, i) => (i === 0 ? 0 : (run += segments[i - 1]) / total));
    return (
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id='stat-area' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={colors.accent} stopOpacity={0.35} />
                    <stop offset='100%' stopColor={colors.accent} stopOpacity={0} />
                </linearGradient>
            </defs>
            <line x1={pad} x2={width - pad} y1={pad + plotHeight} y2={pad + plotHeight} stroke={colors.muted} strokeOpacity={0.35} strokeWidth={unit * 0.15} />
            <path d={area} fill='url(#stat-area)' opacity={interpolate(draw, [0.5, 1], [0, 1], clamp)} />
            <path d={path} fill='none' stroke={colors.accent} strokeWidth={unit * 0.6} strokeLinejoin='round' strokeLinecap='round' strokeDasharray={total} strokeDashoffset={total * (1 - draw)} />
            {xs.map((x, i) => {
                const dot = interpolate(draw, [reach[i] - 0.02, reach[i] + 0.08], [0, 1], clamp);
                return (
                    <g key={i}>
                        <circle cx={x} cy={ys[i]} r={unit * 0.9 * dot} fill={colors.bg} stroke={colors.accent} strokeWidth={unit * 0.4} />
                        <text x={x} y={pad + plotHeight + labelRoom * 0.65} textAnchor='middle' fill={colors.muted} fontSize={unit * 2.2} fontWeight={500} fontFamily={bodyFont(brand)}>
                            {points[i].label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

/** Progress bars, one per point; values are percentages (0–100). */
function Progress({ points, frame, fps, width, height, unit, brand }: ChartProps & { fps: number }) {
    const { colors } = brand;
    const rows = points.slice(0, 5);
    const rowHeight = Math.min(unit * 9, height / rows.length);
    return (
        <div style={{ width, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            {rows.map((point, i) => {
                const p = spring({ frame: frame - i * 4, fps, config: { damping: 30, stiffness: 70 } });
                const share = Math.min(100, Math.max(0, point.value));
                return (
                    <div key={i} style={{ height: rowHeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: unit * 0.8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.text, fontSize: unit * 2.6, fontWeight: 600, lineHeight: 1.2 }}>
                            <span>{point.label}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{Math.round(share * p)}%</span>
                        </div>
                        <div style={{ height: unit * 1.4, borderRadius: unit, background: colors.surface, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${share * p}%`, background: colors.accent, borderRadius: unit }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
