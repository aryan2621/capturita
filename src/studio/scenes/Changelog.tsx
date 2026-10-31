import { al } from './launch/shapes';
import { Heading, Ping, Sheen, Stage, Tick, staggerAt, surface, take, useScene, type Scene } from './proofParts';
import type { Brand } from './assets';

type Entry = { version: string; text: string };

export interface ChangelogProps {
    heading: string;
    entries: Entry[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last entry has landed, for a sound. */
export const CHANGELOG_BEAT = 1.5;

function Row({ s, entry, at, newest }: { s: Scene; entry: Entry; at: number; newest: boolean }) {
    const { u, c } = s;
    const slide = s.pop(at);
    const tick = s.pop(at + 0.12);
    return (
        <div style={{ ...surface(s, { radius: 1.8, hot: newest && slide > 0.5 }), position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: u * 2, padding: `${u * 1.6}px ${u * 2.2}px`, opacity: Math.min(1, slide * 2), transform: `translateX(${(1 - slide) * u * 9}px)` }}>
            {newest && <Sheen s={s} at={at + 0.1} />}
            <span style={{ padding: `${u * 0.5}px ${u * 1.4}px`, borderRadius: u * 5, background: `linear-gradient(150deg, ${al(c.text, 0.3)}, ${c.accent} 60%)`, color: c.bg, fontWeight: 800, fontSize: u * 2.2, fontVariantNumeric: 'tabular-nums', boxShadow: newest ? `0 0 ${u * 2}px ${al(c.accent, 0.6)}` : undefined }}>{entry.version}</span>
            <span style={{ flex: 1, color: c.text, fontSize: u * 3 }}>{entry.text}</span>
            <span style={{ transform: `scale(${0.7 + 0.3 * Math.max(0, tick)})` }}><Tick size={u * 3.4} color={c.accent} progress={Math.min(1, tick)} /></span>
            {newest && <Ping s={s} name="Changelog" at={at + 0.1} size={u * 40} h={u * 8} />}
        </div>
    );
}

/** A "what's new" list on a timeline: a spine fills down it as each version card springs in and ticks off, the newest lit with a sweep and ring. */
export function Changelog({ heading, entries, transparent, brand }: ChangelogProps) {
    const s = useScene(brand);
    const { u, c } = s;
    const rows = take(entries, 5);
    const at = (i: number) => staggerAt(i, rows.length, CHANGELOG_BEAT);
    const spine = s.ramp(at(0), at(rows.length - 1) + 0.2);
    return (
        <Stage s={s} transparent={transparent} at={[35, 45]}>
            <div style={{ width: Math.min(s.innerW, u * 110) }}>
                <Heading s={s} text={heading} size={5.4} />
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: u * 2.2, paddingLeft: u * 5 }}>
                    <div style={{ position: 'absolute', left: u * 1.5, top: u * 2, bottom: u * 2, width: u * 0.4, borderRadius: 99, background: al(c.muted, 0.22) }}>
                        <div style={{ height: `${spine * 100}%`, borderRadius: 99, background: c.accent, boxShadow: `0 0 ${u * 1.6}px ${c.accent}` }} />
                    </div>
                    {rows.map((entry, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            <i style={{ position: 'absolute', left: -u * 3.9, top: '50%', width: u * 1.6, height: u * 1.6, margin: `${-u * 0.8}px 0 0 0`, borderRadius: '50%', background: c.accent, boxShadow: `0 0 ${u * 2}px ${c.accent}`, transform: `scale(${Math.max(0, s.pop(at(i)))})` }} />
                            <Row s={s} entry={entry} at={at(i)} newest={i === rows.length - 1} />
                        </div>
                    ))}
                </div>
            </div>
        </Stage>
    );
}
