import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { frameLayout } from './layout';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export type LowerThirdSide = 'left' | 'right';

export interface LowerThirdProps {
    name: string;
    title: string;
    side: LowerThirdSide;
    logo: boolean;
    /** Transparent background (always, as an overlay). */
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** A name and title bar in the brand's colours that slides in near the bottom corner and back out. */
export function LowerThird({ name, title, side, logo, transparent, brand, assets }: LowerThirdProps) {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const unit = layout.text;
    const { colors } = brand;
    const right = side === 'right';
    // Text gets what's left of the safe width after the bar, padding and logo.
    const showLogo = logo && !!brand.logo;
    const textRoom = width - layout.safeX * 2 - unit * (0.8 + 0.8 + 6 + (showLogo ? 8 : 0));

    const bar = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 });
    const card = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 160 } });
    const text = spring({ frame: frame - 12, fps, config: { damping: 200 } });
    const exit = spring({ frame: frame - (durationInFrames - 16), fps, config: { damping: 200 }, durationInFrames: 14 });
    // Slides in from (and back out to) its own edge.
    const away = (1 - card) + exit;
    const shift = (right ? 1 : -1) * away * unit * 50;

    return (
        <AbsoluteFill style={{ background: transparent ? 'transparent' : colors.bg, fontFamily: bodyFont(brand), lineHeight: 1.2 }}>
            <div
                style={{
                    position: 'absolute',
                    // Tall frames sit it higher, clear of a phone's bottom UI.
                    bottom: Math.max(layout.safeY, height * (layout.portrait ? 0.16 : 0.1)),
                    [right ? 'right' : 'left']: layout.safeX,
                    maxWidth: width - layout.safeX * 2,
                    display: 'flex',
                    flexDirection: right ? 'row-reverse' : 'row',
                    alignItems: 'stretch',
                    transform: `translateX(${shift}px)`,
                    opacity: interpolate(away, [0, 0.6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                }}
            >
                <div style={{ width: unit * 0.8, background: colors.accent, borderRadius: unit * 0.4, transform: `scaleY(${bar * (1 - exit)})` }} />
                <div
                    style={{
                        display: 'flex',
                        flexDirection: right ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        gap: unit * 2,
                        background: colors.surface,
                        padding: `${unit * 1.8}px ${unit * 3}px`,
                        [right ? 'marginRight' : 'marginLeft']: unit * 0.8,
                        borderRadius: unit * 1,
                        boxShadow: `0 ${unit * 0.6}px ${unit * 3}px rgba(0,0,0,0.28)`,
                    }}
                >
                    {showLogo && <Img src={assetUrl(assets, brand.logo!)} style={{ height: unit * 6, width: 'auto', objectFit: 'contain', opacity: text }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: right ? 'flex-end' : 'flex-start', minWidth: 0, maxWidth: textRoom, opacity: text, transform: `translateY(${(1 - text) * unit * 1.5}px)` }}>
                        <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: unit * 4.2, fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{name}</div>
                        {title && <div style={{ color: colors.muted, fontSize: unit * 2.6, fontWeight: 500, lineHeight: 1.25, marginTop: unit * 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{title}</div>}
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
}
