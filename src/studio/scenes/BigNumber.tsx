import { useBeatSnap } from './beat';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand } from './assets';

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
    if (!m) return { pre: value, num: null as number | null, decimals: 0, post: '' };
    const raw = m[0].replace(/,/g, '');
    return { pre: value.slice(0, m.index), num: Number(raw), decimals: raw.split('.')[1]?.length ?? 0, post: value.slice(m.index + m[0].length), commas: m[0].includes(',') };
}

/** Seconds until the count lands, for a sound. */
export const BIG_NUMBER_BEAT = 1.4;

/** Huge type with a ticking count: the figure counts up with an ease-out, then the label rises under it. */
export function BigNumber({ value, label, glow, transparent, brand }: BigNumberProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const snap = useBeatSnap();
    const onBeat = (f: number) => snap(f / fps) * fps; // entrance frame moved onto a nearby beat
    const unit = Math.min(width, height) / 100;
    const { colors } = brand;
    const exit = useExit();

    const { pre, num, decimals, post, commas } = split(String(value ?? '')) as ReturnType<typeof split> & { commas?: boolean };
    const progress = interpolate(frame, [4, 4 + BIG_NUMBER_BEAT * fps], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 4) });
    const shown = num === null ? '' : (num * progress).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: !!commas });
    const text = `${pre}${shown}${post}`;
    // Size on the final text so the figure doesn't resize while it ticks; 0.68 leaves room for wide faces (mono) that the measure underestimates.
    const fontSize = Math.min(unit * 34, fitSize(String(value || ' '), width * 0.68, brand.fonts.display, 999));

    const enter = spring({ frame: frame - onBeat(2), fps, config: { damping: 200 } });
    const labelIn = spring({ frame: frame - 4 - BIG_NUMBER_BEAT * fps * 0.6, fps, config: { damping: 200 } });

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fontSize * 0.08, opacity: enter, transform: `translateY(${(1 - enter) * unit * 2.4}px)` }}>
                    <div
                        style={{
                            fontFamily: displayFont(brand),
                            fontSize,
                            fontWeight: 800,
                            lineHeight: 1,
                            letterSpacing: -fontSize * 0.03,
                            color: colors.accent,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'pre',
                            textShadow: glow ? `0 0 ${fontSize * 0.35}px ${colors.accent}66` : undefined,
                        }}
                    >
                        {text}
                    </div>
                    <div style={{ fontSize: Math.max(unit * 3.2, fontSize * 0.16), color: colors.text, opacity: labelIn, transform: `translateY(${(1 - labelIn) * unit * 2.4}px)`, textAlign: 'center', maxWidth: width * 0.8 }}>{label}</div>
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
