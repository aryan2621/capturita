import { interpolate } from 'remotion';
import { clamp } from './SceneBase';
import { al } from './launch/shapes';
import { Heading, Stage, headRoom, surface, take, useScene, type Scene } from './proofParts';
import type { Brand, SceneAssets } from './assets';

type Mark = 'yes' | 'no' | 'partial';

export interface ComparisonProps {
    heading: string;
    us: string;
    them: string;
    rows: { feature: string; us: Mark; them: Mark }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Each stroke of a mark, drawn one after the other. */
const STROKES: Record<Mark, string[]> = { yes: ['M 4 12.5 L 9.5 18 L 20 6'], no: ['M 6 6 L 18 18', 'M 18 6 L 6 18'], partial: ['M 5 12 L 19 12'] };

function MarkIcon({ mark, progress, size, color }: { mark: Mark; progress: number; size: number; color: string }) {
    const strokes = STROKES[mark] ?? STROKES.no;
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' style={{ overflow: 'visible' }}>
            {strokes.map((d, i) => {
                const p = interpolate(progress, [i / strokes.length, (i + 1) / strokes.length], [0, 1], clamp);
                return <path key={i} d={d} pathLength={1} fill='none' stroke={color} strokeWidth={2.8} strokeLinecap='round' strokeLinejoin='round' strokeDasharray='1' strokeDashoffset={1 - p} opacity={p > 0 ? 1 : 0} />;
            })}
        </svg>
    );
}

function Cell({ s, mark, ours, width, size, draw }: { s: Scene; mark: Mark; ours: boolean; width: number; size: number; draw: number }) {
    const win = ours && mark === 'yes';
    const color = win ? s.c.bg : mark === 'yes' ? s.c.text : mark === 'partial' ? s.c.muted : al(s.c.muted, 0.67);
    return (
        <div style={{ width, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: size * 1.5, height: size * 1.5, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: win ? s.c.accent : 'transparent', boxShadow: win ? `0 0 ${s.u * 2.4 * draw}px ${al(s.c.accent, 0.7)}` : undefined, transform: `scale(${win ? 0.6 + 0.4 * draw : 1})` }}>
                <MarkIcon mark={mark} progress={draw} size={size} color={color} />
            </div>
        </div>
    );
}

/** Us vs them: a panel whose rows slide in while ticks and crosses draw; our column rises as a lit pillar and flashes once the last row lands. */
export function Comparison({ heading, us, them, rows, transparent, brand }: ComparisonProps) {
    const s = useScene(brand);
    const { u, t, c } = s;
    const list = take(rows, 6).filter((r) => r?.feature?.trim());
    const width = Math.min(s.innerW, t * 130);
    const colW = Math.min(t * 18, width * 0.22);
    const rowH = Math.min(t * 9, (s.height - s.layout.safeY * 2 - headRoom(s, heading) - t * 8) / Math.max(1, list.length));
    const lastRow = 0.2 + list.length * 0.09;
    const pillar = s.pop(0.1);
    const flash = s.pop(lastRow + 0.25);
    const head = s.pop(0.05);
    return (
        <Stage s={s} transparent={transparent} at={[62, 50]}>
            <Heading s={s} text={heading} />
            <div style={{ position: 'relative', width }}>
                <div style={{ ...surface(s), padding: `0 ${u * 2}px` }}>
                    <div style={{ display: 'flex', height: t * 7, alignItems: 'center', opacity: Math.min(1, head * 1.5), transform: `translateY(${(1 - head) * -u * 2}px)` }}>
                        <div style={{ flex: 1 }} />
                        <div style={{ width: colW, textAlign: 'center', color: c.accent, fontSize: t * 3, fontWeight: 800 }}>{us}</div>
                        <div style={{ width: colW, textAlign: 'center', color: c.muted, fontSize: t * 2.8, fontWeight: 600 }}>{them}</div>
                    </div>
                    {list.map((row, i) => {
                        const slide = s.pop(0.15 + i * 0.09);
                        const draw = s.ramp(0.22 + i * 0.09, 0.5 + i * 0.09);
                        return (
                            <div key={i} style={{ display: 'flex', height: rowH, alignItems: 'center', borderTop: `1px solid ${al(c.muted, 0.18)}`, opacity: Math.min(1, slide * 2), transform: `translateX(${(1 - slide) * -u * 6}px)` }}>
                                <div style={{ flex: 1, color: c.text, fontSize: t * 3, fontWeight: 600, paddingRight: u * 2 }}>{row.feature}</div>
                                <Cell s={s} mark={row.us} ours width={colW} size={Math.min(rowH * 0.42, t * 3.4)} draw={draw} />
                                <Cell s={s} mark={row.them} ours={false} width={colW} size={Math.min(rowH * 0.42, t * 3.4)} draw={draw} />
                            </div>
                        );
                    })}
                </div>
                <div style={{ position: 'absolute', right: colW + u * 2, top: -u * 1.6, bottom: -u * 1.6, width: colW, borderRadius: u * 2.2, background: `linear-gradient(180deg, ${al(c.accent, 0.34)}, ${al(c.accent, 0.12)})`, border: `1px solid ${al(c.accent, 0.6 + 0.4 * flash)}`, boxShadow: `0 0 ${u * (3 + 5 * flash)}px ${al(c.accent, 0.45 + 0.3 * flash)}`, opacity: Math.min(1, pillar * 2), pointerEvents: 'none', transform: `scaleY(${pillar})` }} />
            </div>
        </Stage>
    );
}
