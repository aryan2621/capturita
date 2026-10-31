import { al } from './launch/shapes';
import { Heading, Ping, Stage, staggerAt, surface, take, useScene, type Scene } from './proofParts';
import type { Brand } from './assets';

type Item = { q: string; a: string };

export interface FaqProps {
    heading: string;
    items: Item[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last answer opens, for a sound. */
export const FAQ_BEAT = 1.8;
/** A card rises this long before its answer opens. */
const LEAD = 0.25;

function Card({ s, item, rise, open, last, width }: { s: Scene; item: Item; rise: number; open: number; last: boolean; width: number }) {
    const { u, c } = s;
    const open01 = Math.max(0, Math.min(1, open));
    return (
        <div style={{ ...surface(s, { radius: 1.8, hot: open01 > 0.5 && last }), position: 'relative', padding: `${u * 1.8}px ${u * 2.4}px`, opacity: Math.min(1, rise * 2), transform: `translateY(${(1 - rise) * u * 7}px) scale(${0.96 + 0.04 * rise})` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: u * 1.6, fontSize: u * 3.2, fontWeight: 700, color: c.text }}>
                <span style={{ width: u * 4.4, height: u * 4.4, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: al(c.accent, 0.16), color: c.accent, fontSize: u * 2.4, fontWeight: 800 }}>Q</span>
                <span style={{ flex: 1 }}>{item.q}</span>
                <span style={{ color: c.accent, fontSize: u * 3.6, fontWeight: 600, lineHeight: 1, transform: `rotate(${open * 45}deg)` }}>+</span>
            </div>
            {/* grid rows animate from 0fr to 1fr, so the card grows to fit whatever the answer's length is */}
            <div style={{ display: 'grid', gridTemplateRows: `${open01}fr`, opacity: open01 }}>
                <div style={{ minHeight: 0, overflow: 'hidden' }}>
                    <div style={{ marginTop: u * 1.2, paddingLeft: u * 6, fontSize: u * 2.7, color: c.muted, lineHeight: 1.3 }}>{item.a}</div>
                </div>
            </div>
            {last && <Ping s={s} at={FAQ_BEAT} size={width} h={u * 9} radius={`${u * 2}px`} />}
        </div>
    );
}

/** Question cards that rise in one by one, each answer opening under its question as the + turns to a cross. */
export function Faq({ heading, items, transparent, brand }: FaqProps) {
    const s = useScene(brand);
    const cards = take(items, 4);
    const width = Math.min(s.innerW, s.u * 110);
    return (
        <Stage s={s} transparent={transparent} at={[40, 45]}>
            <div style={{ width }}>
                <Heading s={s} text={heading} size={5.4} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: s.u * 2 }}>
                    {cards.map((card, i) => {
                        const at = staggerAt(i, cards.length, FAQ_BEAT - LEAD);
                        return <Card key={i} s={s} item={card} rise={s.pop(at)} open={s.pop(at + LEAD, { stiffness: 200, damping: 26 })} last={i === cards.length - 1} width={width} />;
                    })}
                </div>
            </div>
        </Stage>
    );
}
