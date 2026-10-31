import { grow } from './layout';
import { Aura, Stage, al, card, easeOut, glow, hitFlash, inkGradient, useHero, type Kit } from './hero';
import type { Brand } from './assets';

export interface CountdownProps {
    label: string;
    /** Where the clock starts; it counts down one second per second. */
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    /** A line under the clock, e.g. the launch date. */
    note: string;
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the boxes have landed, for a sound. */
export const COUNTDOWN_BEAT = 0.55;
const TICK = 8 / 30;

const UNITS = [['Days', 86400, Infinity], ['Hours', 3600, 24], ['Minutes', 60, 60], ['Seconds', 1, 60]] as const;
const valueOf = (left: number, size: number, mod: number) => Math.floor(left / size) % mod;

/** One clock digit pair: when the value changed this second, the old digits slide up and out as the new ones rise in. */
function Digits({ k, now, before, size }: { k: Kit; now: number; before: number; size: number }) {
    const slide = before === now ? 1 : easeOut(((k.frame % k.fps) + 1) / (TICK * k.fps));
    const text = (v: number) => String(v).padStart(2, '0');
    const line = { height: size * 1.05, display: 'flex', alignItems: 'center', justifyContent: 'center' };
    return (
        <div style={{ height: size * 1.05, overflow: 'hidden' }}>
            <div style={{ transform: `translateY(${-slide * size * 1.05}px)` }}>
                <div style={line}>{text(before)}</div>
                <div style={line}>{text(now)}</div>
            </div>
        </div>
    );
}

/** A launch clock: days, hours, minutes and seconds in boxes, the seconds ticking down with a flip and a pulse. */
export function Countdown({ label, days, hours, minutes, seconds, note, transparent, brand }: CountdownProps) {
    const { p, k } = useHero(brand, transparent);
    const u = k.u * grow(k.width, k.height);
    const start = Math.max(0, (Number(days) || 0) * 86400 + (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0));
    const elapsed = Math.floor(k.frame / k.fps);
    const left = Math.max(0, start - elapsed);
    const prev = Math.max(0, start - Math.max(0, elapsed - 1));
    const tick = elapsed > 0 && elapsed <= start ? hitFlash(k, elapsed + 0.03, 9) : 0;
    const labelIn = k.pop(0, 14);
    const noteIn = k.pop(COUNTDOWN_BEAT, 14);
    const boxW = u * 16.5;
    const digit = u * 9.5;
    const landed = hitFlash(k, COUNTDOWN_BEAT);

    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={Math.min(k.width, k.height) * 0.75} a={0.2 + landed * 0.15 + tick * 0.1} scale={labelIn} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 4 }}>
                <div style={{ fontFamily: k.display, fontSize: u * 5, fontWeight: 800, letterSpacing: -u * 0.1, color: k.c.text, opacity: Math.min(1, labelIn * 1.5), transform: `translateY(${(1 - labelIn) * u * 2.5}px)`, textAlign: 'center' }}>{label}</div>
                <div style={{ display: 'flex', gap: u * 2.6 }}>
                    {UNITS.map(([name, size, mod], i) => {
                        const a = k.pop(0.05 + i * 0.07, 11);
                        const seconds = i === 3;
                        return (
                            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 1.2, opacity: Math.min(1, a * 2), transform: `translateY(${(1 - a) * u * 5}px) scale(${0.85 + 0.15 * a})` }}>
                                <div style={{ ...card(k, { width: boxW, borderRadius: u * 1.8, position: 'relative', overflow: 'hidden', border: `1px solid ${al(seconds ? k.c.accent : k.c.muted, seconds ? 0.35 + tick * 0.5 : 0.25)}` }), fontFamily: k.display, fontWeight: 800, fontSize: digit, letterSpacing: -digit * 0.02, fontVariantNumeric: 'tabular-nums', ...(seconds ? glow(k, al(k.c.accent, 0.15 + tick * 0.45), 2.5) : {}) }}>
                                    <div style={{ ...inkGradient(k), ...(seconds ? { backgroundImage: `linear-gradient(180deg, ${k.c.accent}, ${k.c.accent})` } : {}) }}>
                                        <Digits k={k} now={valueOf(left, size, mod)} before={valueOf(prev, size, mod)} size={digit} />
                                    </div>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: u * 0.25, background: al(k.c.bg, 0.55) }} />
                                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${al(k.c.text, 0.07)}, transparent 45%)`, pointerEvents: 'none' }} />
                                </div>
                                <div style={{ fontSize: u * 2, fontWeight: 600, color: k.c.muted, textTransform: 'uppercase', letterSpacing: u * 0.25 }}>{name}</div>
                            </div>
                        );
                    })}
                </div>
                {note && <div style={{ fontSize: u * 3.2, color: k.c.muted, opacity: noteIn, transform: `translateY(${(1 - noteIn) * u * 2}px)` }}>{note}</div>}
            </div>
        </Stage>
    );
}
