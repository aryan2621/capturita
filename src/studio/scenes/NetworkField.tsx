import { noise2D } from '@remotion/noise';
import { useContext } from 'react';
import { random } from 'remotion';
import { CalmContext } from './SceneBase';
import { al } from './launch/shapes';
import { Stage, easeOut, useScene, type Scene } from './proofParts';
import { fitSize } from './text';
import type { Brand } from './assets';

export interface NetworkFieldProps {
    heading: string;
    subtitle: string;
    /** How many points drift in the field (12-60). */
    density: number;
    transparent?: boolean;
    brand: Brand;
}

const SEED = 'network-field';
/** Seconds the scan ring takes to cross the field from the centre; points flare as it passes. */
const SCAN = 1.1;

interface Point { x: number; y: number; r: number; at: number; layer: 0 | 1 | 2 }

/** Seeded points on three depth layers (far ones small and dim, near ones big and bright); they drift on noise unless the scene is calm. */
function fieldPoints(s: Scene, count: number, calm: boolean): Point[] {
    const { width, height, u } = s;
    return Array.from({ length: count }, (_, i) => {
        const layer = (i % 3) as 0 | 1 | 2;
        const drift = calm ? 0 : s.frame * 0.004 * (0.6 + layer * 0.4);
        return {
            x: random(`${SEED}-x-${i}`) * width + noise2D(`${SEED}-dx`, i * 0.37, drift) * width * 0.08,
            y: random(`${SEED}-y-${i}`) * height + noise2D(`${SEED}-dy`, i * 0.37, drift) * height * 0.08,
            r: u * (0.25 + random(`${SEED}-r-${i}`) * 0.3) * (0.6 + layer * 0.55),
            at: random(`${SEED}-t-${i}`) * 0.5,
            layer,
        };
    });
}

/**
 * Points drifting on noise, joined by thin lines when they come close, in the brand's one accent
 * colour, on three depth layers. A ring scans out from the heading and lights the points as it
 * passes. Seeded, so every render draws the same field. Use it where a scene needs a quiet,
 * techy backdrop under a heading.
 */
export function NetworkField({ heading, subtitle, density, transparent, brand }: NetworkFieldProps) {
    const s = useScene(brand, false);
    const { width, height, u, c } = s;
    const calm = useContext(CalmContext);
    const count = Math.round(Math.min(60, Math.max(12, Number(density) || 36)));
    const reach = Math.min(width, height) * 0.27;
    const points = fieldPoints(s, count, calm);
    const links: { a: Point; b: Point; strength: number; id: number }[] = [];
    for (let a = 0; a < count; a++)
        for (let b = a + 1; b < count; b++) {
            const d = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
            if (d < reach) links.push({ a: points[a], b: points[b], strength: 1 - d / reach, id: a * 100 + b });
        }
    const grown = s.ramp(0.1, 0.9);
    const scan = easeOut(s.ramp(0.15, 0.15 + SCAN)) * Math.hypot(width, height) / 2;
    const flare = (p: Point) => Math.exp(-(((Math.hypot(p.x - width / 2, p.y - height / 2) - scan) / (u * 6)) ** 2)) * (1 - s.ramp(0.15, 0.15 + SCAN));
    const enter = s.pop(0.05);
    const headSize = Math.min(u * 9, fitSize(String(heading || ' '), width * 0.8 * (String(heading).length > 18 ? 1.7 : 1), brand.fonts.display, 999));
    return (
        <Stage s={s} transparent={transparent} at={[50, 50]}>
            <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
                {links.map(({ a, b, strength, id }) => (
                    <line key={id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.accent} strokeWidth={u * 0.16} opacity={strength * 0.7 * grown} />
                ))}
                {/* Packets run along some links, but only when the scene isn't calm: moving points are what calm switches off. */}
                {!calm && links.filter((l) => l.id % 5 === 0).map(({ a, b, id }) => {
                    const p = (s.seconds * 0.5 + random(`${SEED}-p-${id}`)) % 1;
                    return <circle key={id} cx={a.x + (b.x - a.x) * p} cy={a.y + (b.y - a.y) * p} r={u * 0.35} fill={c.text} opacity={Math.sin(p * Math.PI) * grown} />;
                })}
                {points.map((p, i) => {
                    const born = s.pop(p.at);
                    const hot = flare(p);
                    return (
                        <g key={i} opacity={[0.5, 0.8, 1][p.layer]}>
                            {(p.layer === 2 || hot > 0.05) && <circle cx={p.x} cy={p.y} r={p.r * (3 + 4 * hot) * Math.max(0, born)} fill={al(c.accent, 0.14 + 0.3 * hot)} />}
                            <circle cx={p.x} cy={p.y} r={p.r * Math.max(0, born) * (1 + 0.8 * hot)} fill={hot > 0.3 ? c.text : c.accent} />
                        </g>
                    );
                })}
            </svg>
            <div style={{ position: 'relative', textAlign: 'center', maxWidth: width * 0.8, padding: u * 4, opacity: Math.min(1, enter * 1.5), transform: `translateY(${(1 - enter) * u * 3}px) scale(${0.96 + 0.04 * enter})` }}>
                <div style={{ position: 'absolute', inset: -u * 4, background: transparent ? undefined : `radial-gradient(closest-side, ${al(c.bg, 0.75)}, transparent)` }} />
                <div style={{ position: 'relative', fontFamily: s.display, fontSize: headSize, fontWeight: 800, lineHeight: 1.1, letterSpacing: -headSize * 0.02, color: c.text, textShadow: `0 0 ${u * 5}px ${al(c.accent, 0.35)}` }}>{heading}</div>
                {subtitle && <div style={{ position: 'relative', marginTop: headSize * 0.25, fontSize: Math.max(u * 2.8, headSize * 0.32), color: c.muted }}>{subtitle}</div>}
            </div>
        </Stage>
    );
}
