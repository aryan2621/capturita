import { useBeatSnap } from './beat';
import { Aura, Canvas, Hit, Rule, Stage, al, easeOutQuart, hitFlash, inkGradient, shortSide, useHero } from './hero';
import { fitSize } from './text';
import type { Brand } from './assets';

export interface BigNumberProps {
    /** The figure, e.g. "10x", "$4.2M", "98%"; its digits tick up from zero, the rest stays put. */
    value: string;
    label: string;
    /** A soft glow behind the figure; off by default. */
    glow: boolean;
    transparent?: boolean;
    brand: Brand;
}

/** Digits (with thousands commas / one decimal point) of the first number in the value, split around it. */
function split(value: string) {
    const m = /\d[\d,]*(?:\.\d+)?/.exec(value);
    if (!m) return { pre: value, num: null, decimals: 0, post: '', commas: false };
    const raw = m[0].replace(/,/g, '');
    return { pre: value.slice(0, m.index), num: Number(raw), decimals: raw.split('.')[1]?.length ?? 0, post: value.slice(m.index + m[0].length), commas: m[0].includes(',') };
}

const COUNT_FROM = 4 / 30;
/** Seconds the count runs, so it lands at BIG_NUMBER_BEAT + COUNT_FROM (what the scene's beat adds up to). */
export const BIG_NUMBER_BEAT = 1;
const HIT = COUNT_FROM + BIG_NUMBER_BEAT;

/** Huge gradient type that counts up with an ease-out and lands with a flash and a ring; the label rises under it. */
export function BigNumber({ value, label, glow: lit, transparent, brand }: BigNumberProps) {
    const { p, k } = useHero(brand, transparent);
    const snap = useBeatSnap();
    const M = shortSide(k);
    const [cx, cy] = [k.width / 2, k.height * 0.46];

    const { pre, num, decimals, post, commas } = split(String(value ?? ''));
    const count = easeOutQuart(k.ramp(COUNT_FROM, HIT));
    const shown = num === null ? '' : (num * count).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: commas });
    // Sized on the final text so the figure doesn't resize while it ticks; 0.68 leaves room for wide faces the measure underestimates.
    const fontSize = Math.min(k.u * 34, fitSize(String(value || ' '), k.width * 0.68, brand.fonts.display, 999));

    const enter = k.pop(snap(0.03), 12);
    const hit = hitFlash(k, HIT);
    const labelIn = k.pop(HIT - 0.35, 14);
    const halo = lit ? `drop-shadow(0 0 ${fontSize * 0.18}px ${al(k.c.accent, 0.75)}) drop-shadow(0 0 ${fontSize * 0.5}px ${al(k.c.accent, 0.4)})` : `drop-shadow(0 ${fontSize * 0.05}px ${fontSize * 0.12}px ${al(k.c.bg, 0.7)})`;

    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={M * 0.75} a={(lit ? 0.38 : 0.2) + hit * 0.25} scale={enter} />
            <Canvas k={k}>
                {[0.46, 0.62].map((r, i) => <circle key={i} cx={cx} cy={cy} r={M * r * k.pop(0.05 + i * 0.1, 14)} fill="none" stroke={al(k.c.muted, 0.22 - i * 0.07)} strokeWidth={k.u * 0.18} strokeDasharray={i ? `${k.u} ${k.u * 1.4}` : undefined} />)}
            </Canvas>
            <Hit k={k} name="BigNumber" x={cx} y={cy} t0={HIT} size={M * 0.6} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fontSize * 0.1, transform: `translateY(${(1 - enter) * k.u * 3}px) scale(${(0.88 + 0.12 * enter) * (1 + hit * 0.05)})`, opacity: Math.min(1, enter * 2) }}>
                <div style={{ filter: halo }}>
                    <div style={{ ...inkGradient(k), fontFamily: k.display, fontSize, fontWeight: 800, lineHeight: 1.05, letterSpacing: -fontSize * 0.03, fontVariantNumeric: 'tabular-nums', whiteSpace: 'pre' }}>{`${pre}${shown}${post}`}</div>
                </div>
                <Rule k={k} width={14} progress={labelIn} />
                <div style={{ fontSize: Math.max(k.u * 3.2, fontSize * 0.16), color: k.c.text, opacity: labelIn, transform: `translateY(${(1 - labelIn) * k.u * 2.4}px)`, textAlign: 'center', maxWidth: k.width * 0.8, marginTop: fontSize * 0.04 }}>{label}</div>
            </div>
        </Stage>
    );
}
