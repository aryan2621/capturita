import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

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

/** Seconds until the last bar or the end of the line lands, for a sound. */
export const CHART_BEAT = 1.6;

/** Growth at a glance: bars rise one after another, or a line draws itself across, with the values popping in. */
export function Chart({ heading, kind, points, unit, transparent, brand }: ChartProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const unitPx = Math.min(width, height) / 100;
    const { colors } = brand;
    const exit = useExit();
    const data = (points ?? []).filter((p) => Number.isFinite(Number(p.value))).slice(0, 8).map((p) => ({ label: String(p.label ?? ''), value: Number(p.value) }));
    const max = Math.max(1, ...data.map((p) => p.value));

    const headIn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
    const chartW = width * 0.78;
    const chartH = height * 0.5;
    const slot = chartW / Math.max(1, data.length);
    // Each bar starts a little after the one before; the line draws over the same stretch.
    const start = (i: number) => 8 + (i / Math.max(1, data.length - 1)) * CHART_BEAT * fps * 0.7;
    const grow = (i: number) => spring({ frame: frame - start(i), fps, config: { damping: 18, stiffness: 120 } });
    const draw = interpolate(frame, [8, 8 + CHART_BEAT * fps], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
    const x = (i: number) => slot * (i + 0.5);
    const y = (v: number) => chartH - (v / max) * chartH * 0.92;
    const path = data.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
    const shown = (v: number) => `${Math.round(v * 10) / 10}${unit ?? ''}`;

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: unitPx * 4 }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: unitPx * 5.2, fontWeight: 800, color: colors.text, opacity: headIn, transform: `translateY(${(1 - headIn) * unitPx * 2}px)`, textAlign: 'center', maxWidth: width * 0.8 }}>{heading}</div>
                    <svg width={chartW} height={chartH + unitPx * 8} viewBox={`0 ${-unitPx * 3} ${chartW} ${chartH + unitPx * 8}`} style={{ overflow: 'visible' }}>
                        <line x1={0} x2={chartW} y1={chartH} y2={chartH} stroke={colors.muted} strokeOpacity={0.4} strokeWidth={unitPx * 0.2} />
                        {kind === 'line' && data.length > 1 && <path d={path} fill="none" stroke={colors.accent} strokeWidth={unitPx * 0.7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />}
                        {data.map((p, i) => {
                            const g = Math.min(1.08, grow(i));
                            const last = i === data.length - 1;
                            return (
                                <g key={i}>
                                    {kind === 'bars' ? (
                                        <rect x={x(i) - slot * 0.3} width={slot * 0.6} y={chartH - (chartH - y(p.value)) * g} height={(chartH - y(p.value)) * g} rx={unitPx * 0.8} fill={last ? colors.accent : colors.surface} stroke={colors.accent} strokeWidth={unitPx * 0.2} />
                                    ) : (
                                        <circle cx={x(i)} cy={y(p.value)} r={unitPx * 1.1 * Math.max(0, Math.min(1, g))} fill={colors.accent} />
                                    )}
                                    <text x={x(i)} y={(kind === 'bars' ? chartH - (chartH - y(p.value)) * g : y(p.value)) - unitPx * 1.6} textAnchor="middle" fontSize={unitPx * 2.6} fontWeight={700} fill={colors.text} opacity={Math.max(0, Math.min(1, g))} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {shown(p.value * Math.min(1, g))}
                                    </text>
                                    <text x={x(i)} y={chartH + unitPx * 3.4} textAnchor="middle" fontSize={unitPx * 2.2} fill={colors.muted}>{p.label}</text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
