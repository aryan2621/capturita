import { Img } from 'remotion';
import { Aura, Rule, Stage, al, hitFlash, useHero } from './hero';
import { heroTextFx } from './atmosphere';
import { fitSize } from './text';
import { assetUrl, type Brand, type SceneAssets } from './assets';

export interface TitleRevealProps {
    eyebrow: string;
    title: string;
    subtitle: string;
    /** A soft glow behind the title. */
    glow?: boolean;
    /** Red and cyan fringes on the title. */
    aberration?: boolean;
    /** Transparent background, for overlays rendered with alpha. */
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const FIRST_LETTER = 2 / 30;
/** Seconds a letter takes to settle after it starts. */
const SETTLE = 0.22;

/** A generated title card: logo and eyebrow pop in, the title rises letter by letter with a landing flash, the accent line draws, the subtitle follows. */
export function TitleReveal({ eyebrow, title, subtitle, glow, aberration, transparent, brand, assets }: TitleRevealProps) {
    const { p, k } = useHero(brand, transparent);
    const unit = k.tx;
    // The title wraps between words where it can't fit on one line; its size fits the longest word.
    const words = title.split(/(\s+)/).filter(Boolean);
    const longestWord = words.reduce((a, w) => (w.trim().length > a.length ? w.trim() : a), '');
    const room = k.width - k.width * (k.portrait ? 0.16 : 0.12);
    // Short titles stay on one line; the longest word always fits (measured with the real font).
    const titleSize = Math.min(fitSize(longestWord, room * 0.9, brand.fonts.display, unit * 13), room / (Math.min(title.length, 14) * 0.56));
    // The whole title lands within ~8 frames however long it is.
    const stagger = Math.min(0.8, 8 / Math.max(1, title.length)) / 30;
    const landed = FIRST_LETTER + Math.max(0, title.length - 1) * stagger + SETTLE;

    const intro = k.pop(0, 14);
    const lineIn = k.pop(landed - 0.1, 14);
    const subIn = k.pop(landed, 14);
    const flash = hitFlash(k, landed);
    let charIndex = 0;

    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={Math.min(k.width, k.height) * (glow ? 0.8 : 0.65)} a={(glow ? 0.3 : 0.16) + flash * 0.2} scale={intro} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {brand.logo && <Img src={assetUrl(assets, brand.logo)} style={{ height: unit * 7, width: 'auto', marginBottom: unit * 3, opacity: intro, transform: `scale(${0.8 + 0.2 * intro})`, objectFit: 'contain' }} />}
                {eyebrow && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: unit * 2, maxWidth: room, opacity: Math.min(1, intro * 1.5), transform: `translateY(${(1 - intro) * unit * 1.5}px)` }}>
                        <Rule k={k} width={4} progress={intro} />
                        <div style={{ color: k.c.muted, fontSize: unit * 2.6, fontWeight: 600, letterSpacing: unit * 0.6, textTransform: 'uppercase', textAlign: 'center' }}>{eyebrow}</div>
                        <Rule k={k} width={4} progress={intro} />
                    </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: room, marginTop: unit * 1.5, fontFamily: k.display }}>
                    {words.map((word, w) => (
                        // Each word clips its own letters as they rise, and never breaks inside.
                        <span key={w} style={{ display: 'flex', overflow: 'hidden', padding: `${unit}px 0` }}>
                            {[...word].map((char) => {
                                const i = charIndex++;
                                const rise = k.pop(FIRST_LETTER + i * stagger, 11);
                                return (
                                    <span key={i} style={{ color: k.c.text, fontSize: titleSize, fontWeight: 800, lineHeight: 1.1, letterSpacing: -titleSize * 0.023, display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${(1 - rise) * 110}%)`, ...heroTextFx(unit, { glow, aberration }, k.c.accent) }}>{char}</span>
                                );
                            })}
                        </span>
                    ))}
                </div>
                <div style={{ marginTop: unit * 1.5, filter: `drop-shadow(0 0 ${unit * (1 + flash * 3)}px ${al(k.c.accent, 0.5 + flash * 0.5)})` }}>
                    <Rule k={k} width={30} progress={lineIn} />
                </div>
                <div style={{ color: k.c.muted, fontSize: unit * 4, fontWeight: 500, lineHeight: 1.3, marginTop: unit * 3, maxWidth: room, textAlign: 'center', opacity: Math.min(1, subIn * 1.5), transform: `translateY(${(1 - subIn) * unit * 3}px)` }}>{subtitle}</div>
            </div>
        </Stage>
    );
}
