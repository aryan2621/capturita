import { al } from './launch/shapes';
import { Badge, Heading, Ping, Stage, staggerAt, surface, take, useScene } from './proofParts';
import type { Brand } from './assets';

export interface NotificationsProps {
    heading: string;
    items: { title: string; text: string }[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last notification has landed, for a sound. */
export const NOTIFICATIONS_BEAT = 1.5;

/** Glass toasts that drop in from above with a bounce and push the earlier ones down, where they shrink, blur and dim; the newest glows and rings. */
export function Notifications({ heading, items, transparent, brand }: NotificationsProps) {
    const s = useScene(brand);
    const { u, c } = s;
    const list = take(items, 4);
    const at = (i: number) => staggerAt(i, list.length, NOTIFICATIONS_BEAT);
    const cardH = u * 11.5;
    const width = Math.min(s.innerW, u * 80);
    return (
        <Stage s={s} transparent={transparent} at={[50, 40]}>
            <Heading s={s} text={heading} size={4.6} />
            <div style={{ position: 'relative', width, height: cardH * (list.length + 0.2) }}>
                {list.map((n, i) => {
                    const drop = s.pop(at(i));
                    // Each later notification pushes this one down a slot, springing as it arrives.
                    const slot = list.reduce((sum, _, j) => (j > i ? sum + s.pop(at(j)) : sum), 0);
                    const age = Math.min(1, slot / 3);
                    const newest = i === list.length - 1;
                    return (
                        <div key={i} style={{ ...surface(s, { radius: 2, alpha: 0.7 }), position: 'absolute', left: 0, right: 0, top: 0, height: cardH * 0.9, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: u * 2, padding: `0 ${u * 2.2}px`, backdropFilter: `blur(${u * 1.2}px)`, borderColor: newest ? al(c.accent, 0.7) : undefined, boxShadow: `${surface(s).boxShadow}${newest ? `, 0 0 ${u * 5}px ${al(c.accent, 0.35 * drop)}` : ''}`, opacity: Math.min(1, drop * 2) * (1 - age * 0.45), filter: age > 0 ? `blur(${age * u * 0.18}px)` : undefined, transform: `translateY(${(slot - (1 - drop) * 1.6) * cardH}px) scale(${1 - age * 0.05})` }}>
                            <Badge s={s} size={u * 5.6} label={n.title || '!'} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: u * 2.8, fontWeight: 700, color: c.text }}>{n.title}</div>
                                <div style={{ fontSize: u * 2.3, color: c.muted, marginTop: u * 0.5 }}>{n.text}</div>
                            </div>
                            <div style={{ alignSelf: 'flex-start', marginTop: u * 1.3, fontSize: u * 1.7, fontWeight: 600, color: al(c.muted, 0.8) }}>now</div>
                            {newest && <Ping s={s} at={at(i) + 0.05} size={width * 0.9} h={cardH * 0.9} radius={`${u * 3}px`} />}
                        </div>
                    );
                })}
            </div>
        </Stage>
    );
}
