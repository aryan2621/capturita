import { al } from './launch/shapes';
import { Ping, STAR_PATH, Sheen, Stage, useScene, type Scene } from './proofParts';
import type { Brand } from './assets';

export interface SocialProofProps {
    /** 0–5, halves allowed. */
    rating: number;
    reviews: string;
    badge: string;
    transparent?: boolean;
    brand: Brand;
}

const starAt = (i: number) => 0.1 + i * 0.2;

/** Seconds until the last star lights, for a sound. */
export const SOCIAL_PROOF_BEAT = starAt(4) + 0.1;

function Star({ s, i, fill, size }: { s: Scene; i: number; fill: number; size: number }) {
    const p = s.pop(starAt(i));
    const lit = s.ramp(starAt(i), starAt(i) + 0.25) * fill;
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' style={{ transform: `scale(${Math.max(0, p)}) rotate(${(1 - Math.min(1, p)) * -25}deg)`, filter: lit > 0 ? `drop-shadow(0 0 ${s.u * 1.4 * lit}px ${al(s.c.accent, 0.85)})` : undefined, overflow: 'visible' }}>
            <defs>
                <linearGradient id={`sp-fill-${i}`} x1='0' y1='0' x2='1' y2='1'><stop offset='0' stopColor={s.c.text} /><stop offset='0.55' stopColor={s.c.accent} /></linearGradient>
                {/* the star spans x 2–22 of its box, so a partial fill is measured across that, not the whole box */}
                <clipPath id={`sp-clip-${i}`}><rect width={2 + 20 * lit} height={24} /></clipPath>
            </defs>
            <path d={STAR_PATH} fill={al(s.c.surface, 0.9)} stroke={al(s.c.accent, 0.7)} strokeWidth={0.9} strokeLinejoin='round' />
            <path d={STAR_PATH} fill={`url(#sp-fill-${i})`} clipPath={`url(#sp-clip-${i})`} />
        </svg>
    );
}

/** Five stars that pop and fill one by one while the rating counts up, a ring on the last star, then the review count and a badge. */
export function SocialProof({ rating, reviews, badge, transparent, brand }: SocialProofProps) {
    const s = useScene(brand);
    const { u, c } = s;
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    const size = Math.min(u * 11, s.width * 0.14);
    const counted = value * s.ramp(starAt(0), starAt(4) + 0.2);
    const number = s.pop(starAt(0));
    const lower = s.pop(SOCIAL_PROOF_BEAT + 0.05);
    const badgeIn = s.pop(SOCIAL_PROOF_BEAT + 0.2);
    return (
        <Stage s={s} transparent={transparent} gap={u * 3}>
            <div style={{ position: 'relative', display: 'flex', gap: size * 0.12 }}>
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} s={s} i={i} fill={Math.max(0, Math.min(1, value - i))} size={size} />)}
                <div style={{ position: 'absolute', left: '50%', top: '50%' }}><Ping s={s} name="SocialProof" at={starAt(4)} size={size * 3} dur={1} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: u * 1.2, opacity: Math.min(1, number * 1.5), transform: `translateY(${(1 - number) * u * 3}px)` }}>
                <span style={{ fontFamily: s.display, fontSize: u * 13, fontWeight: 800, lineHeight: 1, color: c.text, fontVariantNumeric: 'tabular-nums', letterSpacing: -u * 0.3, textShadow: `0 0 ${u * 5}px ${al(c.accent, 0.35)}` }}>{counted.toFixed(1)}</span>
                <span style={{ fontSize: u * 4, fontWeight: 600, color: c.muted }}>/ 5</span>
            </div>
            <div style={{ fontSize: u * 3.4, color: c.muted, opacity: Math.min(1, lower * 1.5), transform: `translateY(${(1 - lower) * u * 2}px)` }}>{reviews}</div>
            {badge && (
                <div style={{ position: 'relative', overflow: 'hidden', padding: `${u}px ${u * 2.8}px`, borderRadius: u * 5, background: al(c.accent, 0.12), border: `${u * 0.25}px solid ${c.accent}`, boxShadow: `0 0 ${u * 4}px ${al(c.accent, 0.35)}`, color: c.accent, fontWeight: 700, fontSize: u * 2.8, opacity: Math.min(1, badgeIn * 1.5), transform: `scale(${0.8 + 0.2 * badgeIn})` }}>
                    <Sheen s={s} at={SOCIAL_PROOF_BEAT + 0.3} />
                    {badge}
                </div>
            )}
        </Stage>
    );
}
