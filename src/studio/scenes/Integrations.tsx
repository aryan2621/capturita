import { al } from './launch/shapes';
import { Badge, Stage, easeOut, staggerAt, surface, take, useScene } from './proofParts';
import type { Brand } from './assets';

export interface IntegrationsProps {
    center: string;
    items: { text: string }[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last connection is made, for a sound. */
export const INTEGRATIONS_BEAT = 1.4;

/** Your product in the middle, the tools it connects to placed round it; a line draws to each and a pulse keeps travelling along it. */
export function Integrations({ center, items, transparent, brand }: IntegrationsProps) {
    const s = useScene(brand);
    const { u, c, width, height } = s;
    const nodes = take(items, 8);
    const ry = Math.min(width, height) * 0.34;
    // Wide frames get an ellipse so the pills use the width.
    const rx = s.layout.stacked ? ry : Math.min(width * 0.36, ry * 1.7);
    const hub = s.pop(0.02);
    const at = (i: number) => staggerAt(i, nodes.length, INTEGRATIONS_BEAT - 0.25);
    const angle = (i: number) => (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return (
        <Stage s={s} transparent={transparent}>
            <div style={{ position: 'relative', width: 0, height: 0 }}>
                <svg width={width} height={height} style={{ position: 'absolute', left: -width / 2, top: -height / 2, overflow: 'visible' }}>
                    <ellipse cx={width / 2} cy={height / 2} rx={rx * hub} ry={ry * hub} fill='none' stroke={al(c.muted, 0.2)} strokeWidth={u * 0.2} strokeDasharray={`${u} ${u * 1.4}`} />
                    {nodes.map((_, i) => {
                        const [x, y] = [Math.cos(angle(i)) * rx, Math.sin(angle(i)) * ry];
                        const draw = easeOut(s.ramp(at(i), at(i) + 0.3));
                        // Pulses leave the hub in turn once connected, a calm loop.
                        const pulse = ((s.seconds - at(i) - 0.3) / 1.6 + i / nodes.length) % 1;
                        return (
                            <g key={i}>
                                <line x1={width / 2} y1={height / 2} x2={width / 2 + x * draw} y2={height / 2 + y * draw} stroke={c.accent} strokeOpacity={0.55} strokeWidth={u * 0.3} />
                                {draw >= 1 && pulse >= 0 && <circle cx={width / 2 + x * pulse} cy={height / 2 + y * pulse} r={u * 0.55} fill={c.text} opacity={Math.sin(pulse * Math.PI)} style={{ filter: `drop-shadow(0 0 ${u}px ${c.accent})` }} />}
                            </g>
                        );
                    })}
                </svg>
                {nodes.map((node, i) => {
                    const p = s.pop(at(i) + 0.2);
                    return (
                        <div key={i} style={{ ...surface(s, { radius: 5 }), position: 'absolute', left: Math.cos(angle(i)) * rx, top: Math.sin(angle(i)) * ry, display: 'flex', alignItems: 'center', gap: u * 1.2, padding: `${u * 0.9}px ${u * 2.4}px ${u * 0.9}px ${u * 1}px`, color: c.text, fontSize: u * 2.8, fontWeight: 600, whiteSpace: 'nowrap', opacity: Math.min(1, p * 2), transform: `translate(-50%, -50%) scale(${Math.max(0, p)})` }}>
                            <Badge s={s} size={u * 4.4} label={node.text || '?'} solid={false} />
                            {node.text}
                        </div>
                    );
                })}
                <div style={{ position: 'absolute', transform: `translate(-50%, -50%) scale(${Math.max(0, hub)})` }}>
                    <div style={{ position: 'absolute', inset: -u * 6, borderRadius: '50%', background: `radial-gradient(closest-side, ${al(c.accent, 0.5)}, transparent)` }} />
                    <div style={{ position: 'relative', padding: `${u * 2.4}px ${u * 4.4}px`, borderRadius: u * 2.4, background: `linear-gradient(145deg, ${al(c.text, 0.35)}, ${c.accent} 45%)`, color: c.bg, fontFamily: s.display, fontWeight: 800, fontSize: u * 4.6, whiteSpace: 'nowrap', boxShadow: `0 ${u}px ${u * 3}px ${al('#000000', 0.4)}, 0 0 ${u * 5}px ${al(c.accent, 0.6)}` }}>{center}</div>
                </div>
            </div>
        </Stage>
    );
}
