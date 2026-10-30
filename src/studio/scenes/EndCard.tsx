import { useBeatSnap } from './beat';
import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, useExit } from './SceneBase';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export type SocialNetwork = 'x' | 'github' | 'linkedin' | 'youtube' | 'instagram';

export interface EndCardProps {
    headline: string;
    cta: string;
    url: string;
    showQr: boolean;
    socials: { network: SocialNetwork; handle: string }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Short marks for each network: drawn as text so no third-party artwork ships with scenes. */
const NETWORK_MARK: Record<SocialNetwork, string> = { x: '𝕏', github: 'GH', linkedin: 'in', youtube: '▶', instagram: 'IG' };

/** Frames at which the button is pressed and the address starts typing. */
const PRESS = 46;
const TYPE_FROM = 56;

/** The closing card: logo, headline, a call-to-action button that gets pressed, the address typed out, a QR code and socials. */
export function EndCard({ headline, cta, url, showQr, socials, transparent, brand, assets }: EndCardProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const portrait = height > width * 1.05;
    // Portrait frames have height to spare: everything is drawn a third larger.
    const unit = (Math.min(width, height) / 100) * (portrait ? 1.35 : 1);
    const { colors } = brand;
    const address = url.trim();
    const withQr = showQr && address.length > 0;
    const links = (Array.isArray(socials) ? socials : []).filter((s) => s?.handle?.trim()).slice(0, 4);

    const snap = useBeatSnap();
    const onBeat = (f: number) => snap(f / fps) * fps; // entrance frame moved onto a nearby beat
    const logoIn = spring({ frame, fps, config: { damping: 200 } });
    const headlineIn = spring({ frame: frame - onBeat(6), fps, config: { damping: 200 } });
    const buttonIn = spring({ frame: frame - onBeat(16), fps, config: { damping: 13, stiffness: 160 } });
    // The pointer glides onto the button, presses it, and the button answers with a ripple.
    const pointer = spring({ frame: frame - 28, fps, config: { damping: 200 }, durationInFrames: PRESS - 28 });
    const press = interpolate(frame, [PRESS, PRESS + 3, PRESS + 9], [0, 1, 0], clamp);
    const ripple = interpolate(frame, [PRESS, PRESS + 18], [0, 1], clamp);
    const pointerOut = interpolate(frame, [PRESS + 10, PRESS + 18], [1, 0], clamp);
    const typed = Math.max(0, Math.min(address.length, Math.floor((frame - TYPE_FROM) / 1.4)));
    const caret = frame >= TYPE_FROM - 6 && (typed < address.length || Math.floor(frame / 9) % 2 === 0);
    const qrIn = spring({ frame: frame - 24, fps, config: { damping: 18, stiffness: 120 } });
    const exit = useExit();

    const qr = useMemo(() => {
        if (!withQr) return null;
        const code = qrcode(0, 'M');
        code.addData(/^https?:\/\//i.test(address) ? address : `https://${address}`);
        code.make();
        return code;
    }, [withQr, address]);

    const buttonFont = unit * (portrait ? 4.2 : 3.6);
    const qrSize = unit * 30;

    const main = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: portrait ? 'center' : 'flex-start', textAlign: portrait ? 'center' : 'left', maxWidth: portrait ? width * 0.86 : width * 0.5 }}>
            {brand.logo && <Img src={assetUrl(assets, brand.logo)} style={{ height: unit * 8, width: 'auto', objectFit: 'contain', marginBottom: unit * 4, opacity: logoIn, transform: `translateY(${(1 - logoIn) * unit * 2}px)` }} />}
            <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: unit * (portrait ? 9 : 8.5), fontWeight: 800, lineHeight: 1.08, letterSpacing: -unit * 0.2, opacity: headlineIn, transform: `translateY(${(1 - headlineIn) * unit * 3}px)` }}>
                {headline}
            </div>
            {cta && (
                <div style={{ position: 'relative', marginTop: unit * 5 }}>
                    <div
                        style={{
                            position: 'relative',
                            overflow: 'hidden',
                            background: colors.accent,
                            color: colors.bg,
                            fontSize: buttonFont,
                            fontWeight: 700,
                            lineHeight: 1.2,
                            padding: `${buttonFont * 0.6}px ${buttonFont * 1.3}px`,
                            borderRadius: buttonFont * 2,
                            boxShadow: `0 ${unit * (0.8 - press * 0.6)}px ${unit * 3}px ${colors.accent}66`,
                            transform: `scale(${buttonIn * (1 - press * 0.06)})`,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: buttonFont * 12,
                                height: buttonFont * 12,
                                marginLeft: -buttonFont * 6,
                                marginTop: -buttonFont * 6,
                                borderRadius: '50%',
                                background: colors.bg,
                                opacity: (1 - ripple) * 0.35 * (frame >= PRESS ? 1 : 0),
                                transform: `scale(${ripple})`,
                            }}
                        />
                        <span style={{ position: 'relative' }}>{cta}</span>
                    </div>
                    {/* Pointer: from below right onto the button's middle. */}
                    <svg
                        width={unit * 4}
                        height={unit * 4}
                        viewBox='0 0 24 24'
                        style={{
                            position: 'absolute',
                            left: '60%',
                            top: '55%',
                            opacity: Math.min(interpolate(frame, [28, 32], [0, 1], clamp), pointerOut),
                            transform: `translate(${(1 - pointer) * unit * 14}px, ${(1 - pointer) * unit * 10}px) scale(${1 - press * 0.12})`,
                        }}
                    >
                        <path d='M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z' fill='#fff' stroke='#111' strokeWidth={1.4} strokeLinejoin='round' />
                    </svg>
                </div>
            )}
            {address && (
                <div style={{ marginTop: unit * 3.5, color: colors.muted, fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace", fontSize: unit * 3.2, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'pre', minHeight: unit * 3.9 }}>
                    {address.slice(0, typed)}
                    <span style={{ display: 'inline-block', width: unit * 0.35, height: unit * 3.4, marginLeft: unit * 0.3, verticalAlign: 'text-bottom', background: colors.accent, opacity: caret ? 1 : 0 }} />
                </div>
            )}
        </div>
    );

    return (
        <AbsoluteFill
            style={{
                background: transparent ? 'transparent' : `radial-gradient(120% 120% at 80% 10%, ${colors.surface} 0%, ${colors.bg} 60%)`,
                fontFamily: bodyFont(brand),
                lineHeight: 1.2,
                opacity: exit,
            }}
        >
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1}>
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: unit * 6 }}>
                <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: unit * (portrait ? 7 : 10) }}>
                    {main}
                    {qr && (
                        <div
                            style={{
                                background: '#ffffff',
                                padding: qrSize * 0.07,
                                borderRadius: unit * 2,
                                boxShadow: `0 ${unit}px ${unit * 4}px rgba(0,0,0,0.25)`,
                                opacity: qrIn,
                                transform: `scale(${0.85 + qrIn * 0.15}) rotate(${(1 - qrIn) * 4}deg)`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <QrCode code={qr} size={qrSize} reveal={interpolate(frame, [26, 50], [0, 1], clamp)} />
                            <div style={{ color: '#333', fontSize: unit * 2, fontWeight: 600, lineHeight: 1.2, marginTop: qrSize * 0.05 }}>Scan to open</div>
                        </div>
                    )}
                </div>
            </AbsoluteFill>
            {links.length > 0 && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: height * (portrait ? 0.07 : 0.08), display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: unit * 3, padding: `0 ${unit * 5}px` }}>
                    {links.map((link, i) => {
                        const p = spring({ frame: frame - 62 - i * 4, fps, config: { damping: 200 } });
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: unit * 1.2, opacity: p, transform: `translateY(${(1 - p) * unit * 2}px)` }}>
                                <div style={{ width: unit * 4.4, height: unit * 4.4, borderRadius: unit * 1.2, background: colors.surface, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: unit * 2, fontWeight: 800, lineHeight: 1 }}>
                                    {NETWORK_MARK[link.network] ?? '•'}
                                </div>
                                <span style={{ color: colors.muted, fontSize: unit * 2.6, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{link.handle}</span>
                            </div>
                        );
                    })}
                </div>
            )}
            </Depth>
        </AbsoluteFill>
    );
}

/** The QR modules as one SVG path; `reveal` sweeps them in diagonally from the top left. */
function QrCode({ code, size, reveal }: { code: ReturnType<typeof qrcode>; size: number; reveal: number }) {
    const count = code.getModuleCount();
    let d = '';
    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (code.isDark(r, c) && (r + c) / (2 * count) <= reveal) d += `M${c},${r}h1v1h-1z`;
        }
    }
    return (
        <svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} shapeRendering='crispEdges' style={{ display: 'block' }}>
            <path d={d} fill='#111' />
        </svg>
    );
}
