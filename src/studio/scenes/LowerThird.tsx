import { Img } from 'remotion';
import { BrandTexture } from './SceneBase';
import { Sheen, al, card, glow, useHero } from './hero';
import { assetUrl, type Brand, type SceneAssets } from './assets';

export type LowerThirdSide = 'left' | 'right';

/** 'bar' is the card with an accent bar; 'minimal' is plain text over the video; 'pill' is a rounded accent pill. */
export type LowerThirdStyle = 'bar' | 'minimal' | 'pill';

export interface LowerThirdProps {
    name: string;
    title: string;
    side: LowerThirdSide;
    style?: LowerThirdStyle;
    logo: boolean;
    /** Transparent background (always, as an overlay). */
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const EXIT_FRAMES = 14;

/** Text that rises out of a mask line, so it reads as sliding up from under the card's edge. */
function MaskLine({ rise, children, style }: { rise: number; children: string; style: React.CSSProperties }) {
    return (
        <div style={{ overflow: 'hidden', maxWidth: '100%' }}>
            <div style={{ ...style, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', transform: `translateY(${(1 - Math.min(1, rise)) * 110}%)` }}>{children}</div>
        </div>
    );
}

/** A name and title bar in the brand's colours that slides in near the bottom corner, lands with a sheen, and slides back out. */
export function LowerThird({ name, title, side, style = 'bar', logo, transparent, brand, assets }: LowerThirdProps) {
    const { k } = useHero(brand, transparent);
    const u = k.tx;
    const right = side === 'right';
    const pill = style === 'pill';
    const minimal = style === 'minimal';
    // Text gets what's left of the safe width after the bar, padding and logo.
    const showLogo = logo && !!brand.logo;
    const safeX = k.width * (k.portrait ? 0.08 : 0.06);
    const safeY = k.height * (k.portrait ? 0.07 : 0.06);
    const textRoom = k.width - safeX * 2 - u * (0.8 + 0.8 + 6 + (showLogo ? 8 : 0));

    const bar = k.pop(0, 16);
    const slide = k.pop(0.08, 13);
    const reveal = k.ramp(0.08, 0.4);
    const rise = k.pop(0.22, 14);
    const riseTitle = k.pop(0.3, 14);
    const exit = k.ramp((k.dur - EXIT_FRAMES) / k.fps, k.dur / k.fps);
    // Slides in from (and back out to) its own edge.
    const away = (1 - slide) + exit;
    const shift = (right ? 1 : -1) * away * u * 50;
    const surface = pill ? { background: `linear-gradient(120deg, ${k.c.accent}, ${al(k.c.accent, 0.8)})`, boxShadow: `0 ${u * 0.8}px ${u * 3}px ${al(k.c.accent, 0.45)}` } : minimal ? {} : card(k, { borderRadius: u, border: `1px solid ${al(k.c.muted, 0.22)}` });

    return (
        <div style={{ position: 'absolute', inset: 0, background: transparent ? 'transparent' : k.c.bg, fontFamily: k.body, lineHeight: 1.2 }}>
            <BrandTexture brand={brand} transparent={transparent} />
            <div
                style={{
                    position: 'absolute',
                    // Tall frames sit it higher, clear of a phone's bottom UI.
                    bottom: Math.max(safeY, k.height * (k.portrait ? 0.16 : 0.1)),
                    [right ? 'right' : 'left']: safeX,
                    maxWidth: k.width - safeX * 2,
                    display: 'flex',
                    flexDirection: right ? 'row-reverse' : 'row',
                    alignItems: 'stretch',
                    transform: `translateX(${shift}px)`,
                    opacity: Math.min(1, 1 - Math.min(1, exit * 1.6)) * Math.min(1, slide * 3),
                }}
            >
                {!pill && <div style={{ width: u * 0.8, background: `linear-gradient(180deg, ${k.c.accent}, ${al(k.c.accent, 0.5)})`, borderRadius: u * 0.4, transformOrigin: 'bottom', transform: `scaleY(${Math.min(1.05, bar)})`, ...glow(k, k.c.accent, 1.2) }} />}
                <div
                    style={{
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: right ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        gap: u * 2,
                        padding: `${u * 1.8}px ${u * 3}px`,
                        [right ? 'marginRight' : 'marginLeft']: pill ? 0 : u * 0.8,
                        borderRadius: pill ? u * 6 : u,
                        // Wiped open from the bar side; cleared once open so the shadow isn't clipped.
                        clipPath: reveal < 1 ? `inset(0 ${right ? 0 : (1 - reveal) * 100}% 0 ${right ? (1 - reveal) * 100 : 0}%)` : undefined,
                        textShadow: minimal ? `0 ${u * 0.2}px ${u}px rgba(0,0,0,0.6)` : undefined,
                        ...surface,
                    }}
                >
                    {!minimal && <Sheen k={k} from={0.2} />}
                    {showLogo && <Img src={assetUrl(assets, brand.logo!)} style={{ height: u * 6, width: 'auto', objectFit: 'contain', opacity: Math.min(1, rise * 2), transform: `scale(${0.7 + 0.3 * rise})` }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: right ? 'flex-end' : 'flex-start', minWidth: 0, maxWidth: textRoom }}>
                        <MaskLine rise={rise} style={{ color: pill ? k.c.bg : k.c.text, fontFamily: k.display, fontSize: u * 4.2, fontWeight: 700, lineHeight: 1.15 }}>{name}</MaskLine>
                        {minimal && <div style={{ height: u * 0.4, width: u * 12 * bar, borderRadius: u, background: k.c.accent, margin: `${u * 0.5}px 0`, ...glow(k, k.c.accent, 1) }} />}
                        {title && <div style={{ marginTop: minimal ? 0 : u * 0.5, maxWidth: '100%' }}><MaskLine rise={riseTitle} style={{ color: pill ? al(k.c.bg, 0.8) : k.c.muted, fontSize: u * 2.6, fontWeight: 500, lineHeight: 1.25 }}>{title}</MaskLine></div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
