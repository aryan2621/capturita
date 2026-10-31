import { al } from './launch/shapes';
import { Heading, Stage, easeOut, staggerAt, surface, take, useScene, type Scene } from './proofParts';
import type { Brand } from './assets';

type Place = { name: string; x: number; y: number };

export interface LocationsProps {
    heading: string;
    /** x and y are percentages of the map area (0 left/top, 100 right/bottom). */
    places: Place[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last pin has dropped, for a sound. */
export const LOCATIONS_BEAT = 1.5;
/** How long a pin's ripple spreads, and how far (in units). */
const RIPPLE = 0.9;
const RIPPLE_REACH = 26;

interface MapBox { w: number; h: number; step: number; cols: number; rows: number }

/** Dots of the map: each brightens as a pin's ripple passes over it. */
function DotGrid({ s, box, pins, at }: { s: Scene; box: MapBox; pins: Place[]; at: (i: number) => number }) {
    const { u, c } = s;
    const waves = pins.map((pin, i) => ({ x: (pin.x / 100) * box.w, y: (pin.y / 100) * box.h, p: s.ramp(at(i), at(i) + RIPPLE) }));
    return (
        <svg width={box.w} height={box.h} style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: box.cols * box.rows }, (_, i) => {
                const x = (i % box.cols) * box.step + box.step / 2;
                const y = Math.floor(i / box.cols) * box.step + box.step / 2;
                const lit = waves.reduce((m, w) => (w.p > 0 && w.p < 1 ? Math.max(m, Math.exp(-(((Math.hypot(x - w.x, y - w.y) - easeOut(w.p) * u * RIPPLE_REACH) / (u * 3)) ** 2)) * (1 - w.p)) : m), 0);
                return <circle key={i} cx={x} cy={y} r={u * (0.28 + 0.3 * lit)} fill={lit > 0.05 ? c.accent : c.muted} opacity={0.3 + 0.7 * lit} />;
            })}
        </svg>
    );
}

function Pin({ s, pin, at }: { s: Scene; pin: Place; at: number }) {
    const { u, c } = s;
    const drop = s.pop(at, { stiffness: 260, damping: 11, mass: 0.7 });
    const label = s.pop(at + 0.08);
    const flip = pin.x > 62;
    return (
        <div style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%` }}>
            <i style={{ position: 'absolute', left: -u * 1.1, top: -u * 1.1 - (1 - Math.min(1, drop)) * u * 9, width: u * 2.2, height: u * 2.2, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${c.text}, ${c.accent} 55%)`, opacity: Math.min(1, drop * 2), boxShadow: `0 0 ${u * 2.4}px ${c.accent}`, transform: `scale(${Math.max(0, drop)})` }} />
            <span style={{ ...surface(s, { radius: 1.2 }), position: 'absolute', top: -u * 1.9, [flip ? 'right' : 'left']: u * 2, whiteSpace: 'nowrap', padding: `${u * 0.5}px ${u * 1.3}px`, fontSize: u * 2.2, fontWeight: 600, color: c.text, opacity: Math.min(1, label * 1.6), transform: `translateX(${(1 - label) * (flip ? 1 : -1) * u * 2}px)` }}>{pin.name}</span>
        </div>
    );
}

/** A dot-grid map in a panel: pins drop in with a bounce, each sending a ripple that lights the dots and a route that draws on to the next pin. */
export function Locations({ heading, places, transparent, brand }: LocationsProps) {
    const s = useScene(brand);
    const { u, c } = s;
    const pins = take(places, 8);
    const step = u * 3;
    const w = s.width * 0.8;
    const h = s.height * 0.55;
    const box: MapBox = { w: Math.floor(w / step) * step, h: Math.floor(h / step) * step, step, cols: Math.floor(w / step), rows: Math.floor(h / step) };
    const at = (i: number) => staggerAt(i, pins.length, LOCATIONS_BEAT);
    const panel = s.pop(0);
    return (
        <Stage s={s} transparent={transparent} gap={u * 3}>
            <Heading s={s} text={heading} size={5.2} />
            <div style={{ ...surface(s, { radius: 3, alpha: 0.5 }), position: 'relative', width: box.w, height: box.h, opacity: Math.min(1, panel * 2), transform: `scale(${0.94 + 0.06 * panel})` }}>
                <DotGrid s={s} box={box} pins={pins} at={at} />
                <svg width={box.w} height={box.h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                    {pins.slice(1).map((pin, j) => {
                        const from = pins[j];
                        const [x1, y1, x2, y2] = [(from.x / 100) * box.w, (from.y / 100) * box.h, (pin.x / 100) * box.w, (pin.y / 100) * box.h];
                        const lift = Math.hypot(x2 - x1, y2 - y1) * 0.25;
                        return <path key={j} d={`M${x1},${y1} Q${(x1 + x2) / 2},${(y1 + y2) / 2 - lift} ${x2},${y2}`} pathLength={1} fill='none' stroke={al(c.accent, 0.55)} strokeWidth={u * 0.22} strokeLinecap='round' strokeDasharray='1' strokeDashoffset={1 - s.ramp(at(j + 1) - 0.25, at(j + 1))} />;
                    })}
                </svg>
                {pins.map((pin, i) => <Pin key={i} s={s} pin={pin} at={at(i)} />)}
            </div>
        </Stage>
    );
}
