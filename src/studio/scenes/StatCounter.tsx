import { useBeatPulse } from './beat';
import { ChartPlot, cleanPoints } from './Chart';
import { Aura, Rule, Stage, al, card, clamp01, easeOutQuart, glow, hitFlash, inkGradient, useHero, type Kit } from './hero';
import { fitSize } from './text';
import type { Brand } from './assets';

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

const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const COUNT_SECONDS = 1.1;
/** Seconds between one number starting and the next. */
const STAGGER = 0.12;
const FIRST = 0.1;

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

/** One to three numbers counting up and landing with a ring, each with a label; optionally a bar, line or progress chart. */
export function StatCounter({ heading, stats, chart, chartData, transparent, brand }: StatCounterProps) {
    const { p, k } = useHero(brand, transparent);
    const { width, height } = k;
    // Portrait frames have height to spare: everything is drawn a third larger.
    const u = k.u * (k.portrait ? 1.3 : 1);
    const items = (Array.isArray(stats) ? stats : []).slice(0, 3);
    const points = cleanPoints(chartData);
    const showChart = chart !== 'none' && points.length > 0;
    const headingIn = k.pop(0, 14);
    const rowGap = u * (k.portrait ? 5 : 6);
    // Side by side, each stat gets an equal share of the width; its number shrinks to fit it.
    const colWidth = k.portrait ? width * 0.84 : (width * 0.9 - rowGap * (items.length - 1)) / Math.max(1, items.length);
    const finalText = (stat: Stat) => `${stat?.prefix ?? ''}${formatStat(num(stat?.value), stat?.format ?? 'int', num(stat?.value))}${stat?.suffix ?? ''}`;
    const valueSize = fitSize(items.map(finalText).join('\n'), colWidth, brand.fonts.display, u * (showChart ? 10 : items.length === 1 ? 20 : k.portrait ? 13 : 12));
    const chartWidth = k.portrait ? width * 0.84 : width * (items.length ? 0.62 : 0.8);
    const chartHeight = k.portrait ? height * 0.26 : height * (items.length ? 0.32 : 0.55);
    const lastLanding = FIRST + (items.length - 1) * STAGGER + COUNT_SECONDS;

    return (
        <Stage p={p}>
            <Aura k={k} x={width / 2} y={height * 0.45} r={Math.min(width, height) * 0.8} a={0.16 + hitFlash(k, lastLanding) * 0.14} scale={headingIn} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * (k.portrait ? 6 : 5) }}>
                {heading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: u * 2, color: k.c.muted, fontSize: u * 3.2, fontWeight: 600, letterSpacing: u * 0.3, textTransform: 'uppercase', opacity: headingIn, textAlign: 'center' }}>
                        <Rule k={k} width={4} progress={headingIn} />
                        {heading}
                        <Rule k={k} width={4} progress={headingIn} />
                    </div>
                )}
                {items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: k.portrait ? 'column' : 'row', alignItems: k.portrait ? 'center' : 'flex-start', gap: rowGap }}>
                        {items.map((stat, i) => (
                            <Counter key={i} k={k} stat={stat} start={FIRST + i * STAGGER} size={valueSize} width={colWidth} u={u} divider={i > 0 && !k.portrait} />
                        ))}
                    </div>
                )}
                {showChart && (
                    <div style={{ ...card(k, { padding: u * 3, width: chartWidth + u * 6 }), opacity: Math.min(1, k.pop(0.25, 14) * 1.5), transform: `translateY(${(1 - k.pop(0.25, 14)) * u * 4}px)` }}>
                        {chart === 'progress' ? <Progress k={k} points={points} width={chartWidth} height={chartHeight} u={u} />
                            : <ChartPlot k={k} kind={chart === 'line' ? 'line' : 'bars'} points={points} width={chartWidth} height={chartHeight} from={0.3} to={1.3} format={(v) => formatStat(v, 'compact', v)} />}
                    </div>
                )}
            </div>
        </Stage>
    );
}

function Counter({ k, stat, start, size, width, u, divider }: { k: Kit; stat: Stat; start: number; size: number; width: number; u: number; divider: boolean }) {
    const final = num(stat?.value);
    const format: StatFormat = stat?.format ?? 'int';
    const pulse = useBeatPulse(0.25);
    const land = start + COUNT_SECONDS;
    const count = easeOutQuart(k.ramp(start, land));
    const appear = k.pop(start - 0.05, 13);
    const hit = hitFlash(k, land, 6);
    const ring = k.ramp(land, land + 0.7);
    const current = format === 'compact' || !Number.isInteger(final) ? final * count : Math.round(final * count);
    const text = (value: number) => `${stat?.prefix ?? ''}${formatStat(value, format, final)}${stat?.suffix ?? ''}`;
    const valueStyle = { fontFamily: k.display, fontSize: size, fontWeight: 800, lineHeight: 1.05, letterSpacing: -size * 0.02, fontVariantNumeric: 'tabular-nums' as const, gridArea: '1 / 1', textAlign: 'center' as const, whiteSpace: 'nowrap' as const };
    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: Math.min(1, appear * 2), transform: `translateY(${(1 - appear) * u * 3}px) scale(${(0.9 + 0.1 * appear) * (1 + hit * 0.04 + pulse * 0.025)})` }}>
            {divider && <div style={{ position: 'absolute', left: -u * 3, top: '10%', bottom: '10%', width: 1, background: `linear-gradient(transparent, ${al(k.c.muted, 0.4)}, transparent)` }} />}
            {ring > 0 && ring < 1 && <div style={{ position: 'absolute', left: '50%', top: size / 2, width: size * 1.2, height: size * 1.2, marginLeft: -size * 0.6, marginTop: -size * 0.6, borderRadius: '50%', border: `${u * 0.3}px solid ${k.c.accent}`, opacity: 0.6 * (1 - ring), transform: `scale(${0.6 + easeOutQuart(ring) * 1.2})` }} />}
            {/* The final value, hidden, holds the width so the count doesn't shift as digits change. */}
            <div style={{ display: 'grid', filter: `drop-shadow(0 ${u * 0.5}px ${u * 1.5}px ${al(k.c.bg, 0.7)}) drop-shadow(0 0 ${u * (1.5 + hit * 3)}px ${al(k.c.accent, 0.3 + hit * 0.4)})` }}>
                <span style={{ ...valueStyle, visibility: 'hidden' }}>{text(final)}</span>
                <span style={{ ...valueStyle, ...inkGradient(k) }}>{text(current)}</span>
            </div>
            <div style={{ marginTop: u * 1.4 }}><Rule k={k} width={8} progress={count} /></div>
            {stat?.label && <div style={{ color: k.c.muted, fontSize: u * 3, fontWeight: 500, lineHeight: 1.25, marginTop: u * 1.4, textAlign: 'center', maxWidth: width }}>{stat.label}</div>}
        </div>
    );
}

/** Progress bars, one per point; values are percentages (0–100). */
function Progress({ k, points, width, height, u }: { k: Kit; points: { label: string; value: number }[]; width: number; height: number; u: number }) {
    const rows = points.slice(0, 5);
    const rowHeight = Math.min(u * 9.5, height / rows.length);
    return (
        <div style={{ width, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {rows.map((point, i) => {
                const share = clamp01(point.value / 100) * 100;
                const grow = easeOutQuart(k.ramp(0.3 + i * 0.1, 1.3 + i * 0.1));
                const row = k.pop(0.25 + i * 0.08, 14);
                return (
                    <div key={i} style={{ height: rowHeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: u * 0.9, opacity: Math.min(1, row * 2) }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: k.c.text, fontSize: u * 2.6, fontWeight: 600, lineHeight: 1.2 }}>
                            <span>{point.label}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', color: k.c.accent }}>{Math.round(share * grow)}%</span>
                        </div>
                        <div style={{ position: 'relative', height: u * 1.5, borderRadius: u, background: al(k.c.muted, 0.18) }}>
                            <div style={{ height: '100%', width: `${share * grow}%`, background: `linear-gradient(90deg, ${al(k.c.accent, 0.5)}, ${k.c.accent})`, borderRadius: u, ...glow(k, k.c.accent, 1.2) }} />
                            <div style={{ position: 'absolute', top: '50%', left: `${share * grow}%`, width: u * 2.2, height: u * 2.2, marginLeft: -u * 1.1, marginTop: -u * 1.1, borderRadius: '50%', background: k.c.text, boxShadow: `0 0 ${u * 2}px ${k.c.accent}`, opacity: grow > 0 ? 1 : 0 }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
