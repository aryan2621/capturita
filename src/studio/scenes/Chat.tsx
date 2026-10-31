import { al } from './launch/shapes';
import { Badge, Heading, Stage, staggerAt, surface, take, useScene, type Scene } from './proofParts';
import type { Brand } from './assets';

type Message = { from: 'user' | 'bot'; text: string };

export interface ChatProps {
    heading: string;
    messages: Message[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last message has landed, for a sound. */
export const CHAT_BEAT = 2.4;
/** How long the reply dots bounce before a bot message appears. */
const TYPING = 0.5;

function TypingDots({ s, from, to }: { s: Scene; from: number; to: number }) {
    const show = Math.min(s.ramp(from, from + 0.1), 1 - s.ramp(to - 0.04, to + 0.06));
    if (show <= 0) return null;
    return (
        <div style={{ ...surface(s, { radius: 2.2 }), position: 'absolute', left: s.u * 7.4, bottom: 0, display: 'flex', gap: s.u * 0.7, padding: `${s.u * 1.5}px ${s.u * 2}px`, opacity: show, transform: `scale(${0.8 + 0.2 * show})`, transformOrigin: 'bottom left' }}>
            {[0, 1, 2].map((d) => <i key={d} style={{ width: s.u * 1, height: s.u * 1, borderRadius: '50%', background: s.c.muted, transform: `translateY(${Math.sin(s.seconds * 11 - d * 0.9) * s.u * 0.45}px)` }} />)}
        </div>
    );
}

function Bubble({ s, message, at, last }: { s: Scene; message: Message; at: number; last: boolean }) {
    const { u, c } = s;
    const mine = message.from === 'user';
    const pop = s.pop(at);
    const flash = last ? 1 - s.ramp(at, at + 0.7) : 0;
    const corner = `${u * 0.6}px`;
    return (
        <div style={{ position: 'relative', alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', display: 'flex', alignItems: 'flex-end', gap: u * 1.4 }}>
            {!mine && <div style={{ opacity: pop > 0 ? 1 : 0, transform: `scale(${Math.max(0, pop)})` }}><Badge s={s} size={u * 6} label='✦' /></div>}
            <div style={{ padding: `${u * 1.5}px ${u * 2.2}px`, borderRadius: u * 2.2, ...(mine ? { borderBottomRightRadius: corner } : { borderBottomLeftRadius: corner }), background: mine ? `linear-gradient(150deg, ${al(c.text, 0.3)}, ${c.accent} 60%)` : al(c.text, 0.07), border: mine ? 'none' : `1px solid ${al(c.muted, 0.22)}`, color: mine ? c.bg : c.text, fontSize: u * 2.9, fontWeight: 600, lineHeight: 1.25, boxShadow: mine ? `0 ${u * 0.6}px ${u * 2}px ${al(c.accent, 0.35 + 0.4 * flash)}` : undefined, opacity: Math.min(1, pop * 2), transform: `scale(${0.7 + 0.3 * pop}) translateY(${(1 - pop) * u * 3}px)`, transformOrigin: mine ? 'bottom right' : 'bottom left' }}>
                {message.text}
            </div>
            {!mine && <TypingDots s={s} from={Math.max(0, at - TYPING)} to={at} />}
        </div>
    );
}

/** A conversation in a chat panel: the user's bubbles on the right, replies on the left that are preceded by bouncing typing dots. */
export function Chat({ heading, messages, transparent, brand }: ChatProps) {
    const s = useScene(brand);
    const list = take(messages, 5);
    const panel = s.pop(0);
    return (
        <Stage s={s} transparent={transparent}>
            <Heading s={s} text={heading} size={4.6} />
            <div style={{ ...surface(s, { radius: 3 }), display: 'flex', flexDirection: 'column', gap: s.u * 1.6, width: Math.min(s.innerW, s.u * 90), boxSizing: 'border-box', padding: s.u * 2.6, opacity: Math.min(1, panel * 2), transform: `translateY(${(1 - panel) * s.u * 4}px)` }}>
                {list.map((m, i) => <Bubble key={i} s={s} message={m} at={staggerAt(i, list.length, CHAT_BEAT)} last={i === list.length - 1} />)}
            </div>
        </Stage>
    );
}
