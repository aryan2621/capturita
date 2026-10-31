import { SceneImage } from './SceneBase';
import { al } from './launch/shapes';
import { STAR_PATH, Sheen, Stage, surface, useScene, type Scene } from './proofParts';
import type { Brand, SceneAssets } from './assets';

export interface TestimonialProps {
    quote: string;
    name: string;
    role: string;
    avatar: string;
    rating: number;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Star i starts filling at 0.2s + 0.1s * i: the scene's beat is the last one (see its entry in index.ts). */
const starAt = (i: number) => 0.2 + i * 0.1;
const WORD_FROM = 0.3;
const WORD_STEP = 0.05;

function Stars({ s, stars }: { s: Scene; stars: number }) {
    const size = s.t * 4;
    return (
        <div style={{ position: 'relative', display: 'flex', gap: s.u * 0.8, marginBottom: s.u * 3 }}>
            {Array.from({ length: 5 }, (_, i) => {
                const lit = i < stars;
                const p = lit ? s.pop(starAt(i)) : s.pop(starAt(i), { stiffness: 200, damping: 30 }) * 0.5;
                return (
                    <svg key={i} width={size} height={size} viewBox='0 0 24 24' style={{ transform: `scale(${0.5 + p * 0.5})`, filter: lit ? `drop-shadow(0 0 ${s.u * 0.8}px ${al(s.c.accent, 0.8)})` : undefined }}>
                        <path d={STAR_PATH} fill={lit ? s.c.accent : 'none'} fillOpacity={Math.min(1, p)} stroke={s.c.accent} strokeWidth={1.2} strokeOpacity={lit ? 1 : 0.3} strokeLinejoin='round' />
                    </svg>
                );
            })}
        </div>
    );
}

/** A customer quote: a ghost quote mark behind, stars popping in (a ring on the last), the words sharpening in one by one, then who said it. */
export function Testimonial({ quote, name, role, avatar, rating, transparent, brand, assets }: TestimonialProps) {
    const s = useScene(brand);
    const { u, t, c } = s;
    const words = quote.trim().split(/\s+/).filter(Boolean);
    // Longer quotes get smaller type so they stay within about five lines.
    const quoteSize = Math.min(t * 6, t * 6 * Math.sqrt(60 / Math.max(60, quote.length)));
    const stars = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    const mark = s.pop(0, { stiffness: 140, damping: 13, mass: 0.9 });
    const byAt = WORD_FROM + words.length * WORD_STEP + 0.1;
    const by = s.pop(byAt);
    return (
        <Stage s={s} transparent={transparent} at={[22, 18]}>
            <div style={{ position: 'absolute', left: '50%', top: '38%', transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * mark}) rotate(${(1 - mark) * -14}deg)`, color: c.accent, opacity: 0.13 * Math.min(1, mark), fontFamily: s.display, fontSize: t * 46, fontWeight: 800, lineHeight: 0.8, pointerEvents: 'none' }}>“</div>
            <div style={{ position: 'relative', maxWidth: Math.min(s.innerW, t * 120), display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                {stars > 0 && <Stars s={s} stars={stars} />}
                <div style={{ color: c.text, fontFamily: s.display, fontSize: quoteSize, fontWeight: 650, lineHeight: 1.25, letterSpacing: -quoteSize * 0.01, textShadow: `0 ${u * 0.5}px ${u * 3}px ${al(c.bg, 0.5)}` }}>
                    {words.map((word, i) => {
                        const p = s.ramp(WORD_FROM + i * WORD_STEP, WORD_FROM + i * WORD_STEP + 0.25);
                        return <span key={i} style={{ display: 'inline-block', opacity: p, filter: p < 1 ? `blur(${(1 - p) * u * 0.5}px)` : undefined, transform: `translateY(${(1 - p) * u * 1.8}px)`, marginRight: '0.28em' }}>{word}</span>;
                    })}
                </div>
                {(name || role) && (
                    <div style={{ ...surface(s, { radius: 5 }), position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: u * 2, marginTop: t * 5, padding: `${u * 1.2}px ${u * 3}px ${u * 1.2}px ${avatar ? u * 1.2 : u * 3}px`, opacity: Math.min(1, by * 1.6), transform: `translateY(${(1 - by) * u * 4}px) scale(${0.94 + 0.06 * by})` }}>
                        <Sheen s={s} at={byAt + 0.1} />
                        {avatar && <SceneImage src={avatar} assets={assets} brand={brand} style={{ width: t * 7, height: t * 7, borderRadius: '50%', border: `${u * 0.4}px solid ${c.accent}`, boxShadow: `0 0 ${u * 2}px ${al(c.accent, 0.5)}` }} />}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ color: c.text, fontSize: t * 3.4, fontWeight: 700 }}>{name}</div>
                            {role && <div style={{ color: c.muted, fontSize: t * 2.8, fontWeight: 500 }}>{role}</div>}
                        </div>
                    </div>
                )}
            </div>
        </Stage>
    );
}
