import { al } from './launch/shapes';
import { Heading, Ping, Sheen, Stage, Tick, surface, take, useScene, type Scene } from './proofParts';
import type { Brand, SceneAssets } from './assets';

export interface PricingTier {
    name: string;
    price: string;
    period: string;
    features: string;
    highlight: 'yes' | 'no';
}

export interface PricingProps {
    heading: string;
    tiers: PricingTier[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Seconds until the popular plan lifts: after the last card has risen. */
export const popularAt = (plans: number) => 0.55 + 0.1 * plans;

interface PlanProps { s: Scene; tier: PricingTier; i: number; hitAt: number; row: boolean; width: number; anyHot: boolean }

function Plan({ s, tier, i, hitAt, row, width, anyHot }: PlanProps) {
    const { u, t, c } = s;
    const hot = tier.highlight === 'yes';
    const rise = s.pop(0.12 + i * 0.1);
    const focus = s.pop(hitAt);
    const lift = hot ? focus : 0;
    const dim = anyHot && !hot ? 0.2 * focus : 0;
    const features = tier.features.split(';').map((f) => f.trim()).filter(Boolean).slice(0, row ? 6 : 3);
    return (
        <div style={{ position: 'relative', width, opacity: Math.min(1, rise * 2) * (1 - dim), transform: `translateY(${(1 - rise) * u * 12 - lift * u * 2.5}px) scale(${1 + lift * 0.04 - dim * 0.1})` }}>
            {hot && <div style={{ position: 'absolute', inset: -u * 3, borderRadius: u * 5, background: `radial-gradient(closest-side, ${al(c.accent, 0.4)}, transparent)`, opacity: lift }} />}
            <div style={{ ...surface(s, { hot }), position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: row ? u * 3.4 : `${u * 2.2}px ${u * 3}px`, display: 'flex', flexDirection: row ? 'column' : 'row', alignItems: row ? 'flex-start' : 'center', justifyContent: 'space-between', gap: u * 2 }}>
                {hot && <Sheen s={s} at={hitAt} />}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: u * 1.2 }}>
                        <span style={{ color: c.text, fontSize: t * 3.2, fontWeight: 700 }}>{tier.name}</span>
                        {hot && <span style={{ background: c.accent, color: c.bg, fontSize: t * 1.9, fontWeight: 700, padding: `${u * 0.4}px ${u * 1.2}px`, borderRadius: u * 2, transform: `scale(${lift})`, boxShadow: `0 0 ${u * 2}px ${al(c.accent, 0.6)}` }}>Popular</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: u * 0.6, marginTop: u * 1.2, transform: `scale(${0.9 + 0.1 * rise})`, transformOrigin: 'left bottom' }}>
                        <span style={{ color: c.text, fontFamily: s.display, fontSize: t * (row ? 8 : 6), fontWeight: 800, lineHeight: 1, letterSpacing: -t * 0.15 }}>{tier.price}</span>
                        {tier.period && <span style={{ color: c.muted, fontSize: t * 2.6, fontWeight: 500 }}>{tier.period}</span>}
                    </div>
                </div>
                {features.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: u * 0.9, marginTop: row ? u * 1.5 : 0, maxWidth: row ? undefined : '55%' }}>
                        {features.map((feature, f) => {
                            const p = s.ramp(0.3 + i * 0.1 + f * 0.06, 0.5 + i * 0.1 + f * 0.06);
                            return (
                                <div key={f} style={{ display: 'flex', gap: u, alignItems: 'center', color: c.text, fontSize: t * 2.5, fontWeight: 500, lineHeight: 1.25, opacity: p, transform: `translateX(${(1 - p) * u * 2}px)` }}>
                                    <Tick size={t * 2.6} color={c.accent} progress={p} />
                                    {feature}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {hot && <Ping s={s} name="Pricing" at={hitAt} size={width} h={row ? width * 1.1 : s.u * 14} />}
        </div>
    );
}

/** 1–3 price plans as cards that rise in turn; the highlighted plan lifts with an accent ring, glow and a light sweep while the others step back. Features are separated by ";". */
export function Pricing({ heading, tiers, transparent, brand }: PricingProps) {
    const s = useScene(brand);
    const list = take(tiers, 3).filter((tier) => tier?.name?.trim());
    const n = Math.max(1, list.length);
    const row = !s.layout.stacked;
    const gap = s.u * 2.4;
    const width = row ? Math.min((s.innerW - gap * (n - 1)) / n, s.t * 46) : Math.min(s.innerW, s.t * 80);
    return (
        <Stage s={s} transparent={transparent} at={[50, 55]}>
            <Heading s={s} text={heading} size={6.5} />
            <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', alignItems: row ? 'flex-end' : 'stretch', gap }}>
                {list.map((tier, i) => <Plan key={i} s={s} tier={tier} i={i} hitAt={popularAt(n)} row={row} width={width} anyHot={list.some((x) => x.highlight === 'yes')} />)}
            </div>
        </Stage>
    );
}
