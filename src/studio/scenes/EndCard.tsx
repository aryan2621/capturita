import { useBeatSnap } from './beat';
import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { AbsoluteFill, Img, random } from 'remotion';
import { useVideoConfig } from './clock';
import './fonts';
import { BrandTexture, Depth, useExit } from './SceneBase';
import { Cursor, Glow, Sweep, bowed, easeOut, inOut, useTiming } from './deviceParts';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

type SocialNetwork = 'x' | 'github' | 'linkedin' | 'youtube' | 'instagram';

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

/** Short marks for each network: drawn as text so no third-party artwork ships with scenes. */
const NETWORK_MARK: Record<SocialNetwork, string> = { x: '𝕏', github: 'GH', linkedin: 'in', youtube: '▶', instagram: 'IG' };

/** Frames at which the button is pressed (about 1 s in, the scene's key moment) and the address starts typing. */
const PRESS = 30;
const TYPE_FROM = 34;
const SPARKS = 10;

type Ctx = ReturnType<typeof useTiming>;

/** The call-to-action: it pops in with a sheen, a pointer curves onto it and presses it, and sparks fly off. */
function CtaButton({ label, size, unit, brand, appear, timing }: { label: string; size: number; unit: number; brand: Brand; appear: number; timing: Ctx }) {
    const { pop, ramp } = timing;
    const { colors } = brand;
    const press = ramp(PRESS, PRESS + 3) * (1 - ramp(PRESS, PRESS + 9));
    const burst = ramp(PRESS, PRESS + 20, easeOut);
    // The pointer's offset from its resting spot on the button: in from below right.
    const away = bowed({ x: unit * 14, y: unit * 10 }, { x: 0, y: 0 }, ramp(PRESS - 16, PRESS, inOut), 0.25);
    return (
        <div style={{ position: 'relative', marginTop: unit * 5 }}>
            <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(${colors.accent}, ${colors.accent}dd)`, color: colors.bg, fontSize: size, fontWeight: 700, lineHeight: 1.2, padding: `${size * 0.6}px ${size * 1.3}px`, borderRadius: size * 2, boxShadow: `0 ${unit * (0.8 - press * 0.6)}px ${unit * 3}px ${colors.accent}66, 0 0 ${unit * 5 * burst * (1 - burst)}px ${colors.accent}, 0 1px 0 #ffffff66 inset`, transform: `scale(${pop(appear) * (1 - press * 0.06)})`, whiteSpace: 'nowrap' }}>
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: size * 12, height: size * 12, marginLeft: -size * 6, marginTop: -size * 6, borderRadius: '50%', background: colors.bg, opacity: (1 - burst) * 0.35 * (burst > 0 ? 1 : 0), transform: `scale(${burst})` }} />
                <span style={{ position: 'relative' }}>{label}</span>
                <Sweep t={ramp(appear + 4, appear + 22, (x) => x)} strength={0.35} />
            </div>
            <div style={{ position: 'absolute', left: '60%', top: '55%' }}>
                {Array.from({ length: SPARKS }, (_, i) => {
                    const a = (i / SPARKS) * Math.PI * 2 + random(`spark-a-${i}`);
                    const reach = unit * (6 + random(`spark-r-${i}`) * 7) * burst;
                    return <span key={i} style={{ position: 'absolute', left: Math.cos(a) * reach, top: Math.sin(a) * reach, width: unit * 0.9, height: unit * 0.9, borderRadius: '50%', background: i % 2 ? colors.text : colors.accent, boxShadow: `0 0 ${unit}px ${colors.accent}`, opacity: burst > 0 ? 1 - burst : 0 }} />;
                })}
                <Cursor {...away} size={unit * 4} press={press} opacity={ramp(PRESS - 16, PRESS - 12) * (1 - ramp(PRESS + 10, PRESS + 18))} />
            </div>
        </div>
    );
}

/** The address typed out in mono with a caret that blinks once it's done. */
function TypedAddress({ address, unit, brand, frame }: { address: string; unit: number; brand: Brand; frame: number }) {
    const typed = Math.max(0, Math.min(address.length, Math.floor((frame - TYPE_FROM) / 1.1)));
    const caret = frame >= TYPE_FROM - 4 && (typed < address.length || Math.floor(frame / 9) % 2 === 0);
    return (
        <div style={{ marginTop: unit * 3.5, color: brand.colors.muted, fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace", fontSize: unit * 3.2, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'pre', minHeight: unit * 3.9 }}>
            {address.slice(0, typed)}
            <span style={{ display: 'inline-block', width: unit * 0.35, height: unit * 3.4, marginLeft: unit * 0.3, verticalAlign: 'text-bottom', background: brand.colors.accent, boxShadow: `0 0 ${unit}px ${brand.colors.accent}`, opacity: caret ? 1 : 0 }} />
        </div>
    );
}

/** The scannable code on a white card that tilts in, its modules sweeping on diagonally. */
function QrCard({ code, size, unit, timing }: { code: ReturnType<typeof qrcode>; size: number; unit: number; timing: Ctx }) {
    const { pop, ramp } = timing;
    const p = pop(8);
    return (
        <div style={{ position: 'relative', overflow: 'hidden', background: '#ffffff', padding: size * 0.07, borderRadius: unit * 2, boxShadow: `0 ${unit * 1.4}px ${unit * 5}px rgba(0,0,0,0.35)`, opacity: Math.min(1, p * 2), transform: `scale(${0.8 + p * 0.2}) rotate(${(1 - p) * 6}deg)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <QrCode code={code} size={size} reveal={ramp(10, 34, (x) => x)} />
            <div style={{ color: '#333', fontSize: unit * 2, fontWeight: 600, lineHeight: 1.2, marginTop: size * 0.05 }}>Scan to open</div>
            <Sweep t={ramp(30, 50, (x) => x)} strength={0.4} />
        </div>
    );
}

/** The closing card: logo, headline, a call-to-action button that gets pressed, the address typed out, a QR code and socials. */
export function EndCard({ headline, cta, url, showQr, socials, transparent, brand, assets }: EndCardProps) {
    const timing = useTiming();
    const { frame, fps, glide, pop, ramp } = timing;
    const { width, height } = useVideoConfig();
    const portrait = height > width * 1.05;
    // Portrait frames have height to spare: everything is drawn a third larger.
    const unit = (Math.min(width, height) / 100) * (portrait ? 1.35 : 1);
    const { colors } = brand;
    const address = url.trim();
    const withQr = showQr && address.length > 0;
    const links = (Array.isArray(socials) ? socials : []).filter((s) => s?.handle?.trim()).slice(0, 4);
    const snap = useBeatSnap();
    const onBeat = (f: number) => snap(f / fps) * fps; // entrance frame moved onto a nearby beat
    const exit = useExit();

    const qr = useMemo(() => {
        if (!withQr) return null;
        const code = qrcode(0, 'M');
        code.addData(/^https?:\/\//i.test(address) ? address : `https://${address}`);
        code.make();
        return code;
    }, [withQr, address]);

    const headlineIn = glide(onBeat(3));
    const logoIn = glide(0);
    const flash = ramp(PRESS, PRESS + 24, easeOut);

    const main = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: portrait ? 'center' : 'flex-start', textAlign: portrait ? 'center' : 'left', maxWidth: portrait ? width * 0.86 : width * 0.5 }}>
            {brand.logo && <Img src={assetUrl(assets, brand.logo)} style={{ height: unit * 8, width: 'auto', objectFit: 'contain', marginBottom: unit * 4, opacity: logoIn, transform: `translateY(${(1 - logoIn) * unit * 2}px)` }} />}
            <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: unit * (portrait ? 9 : 8.5), fontWeight: 800, lineHeight: 1.08, letterSpacing: -unit * 0.2, opacity: headlineIn, transform: `translateY(${(1 - headlineIn) * unit * 3}px)` }}>{headline}</div>
            {cta && <CtaButton label={cta} size={unit * (portrait ? 4.2 : 3.6)} unit={unit} brand={brand} appear={onBeat(8)} timing={timing} />}
            {address && <TypedAddress address={address} unit={unit} brand={brand} frame={frame} />}
        </div>
    );

    return (
        <AbsoluteFill style={{ background: transparent ? 'transparent' : `radial-gradient(120% 120% at 80% 10%, ${colors.surface} 0%, ${colors.bg} 60%)`, fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}>
                <BrandTexture brand={brand} transparent={transparent} />
                <Glow x={width * (portrait ? 0.5 : 0.35)} y={height * (portrait ? 0.4 : 0.5)} r={Math.max(width, height) * 0.45} color={`${colors.accent}44`} opacity={pop(0) * (0.65 + 0.35 * Math.sin(flash * Math.PI))} scale={1 + 0.08 * Math.sin(flash * Math.PI)} />
            </Depth>
            <Depth z={1}>
                <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: unit * 6 }}>
                    <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: unit * (portrait ? 7 : 10) }}>
                        {main}
                        {qr && <QrCard code={qr} size={unit * 30} unit={unit} timing={timing} />}
                    </div>
                </AbsoluteFill>
                {links.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: height * (portrait ? 0.07 : 0.08), display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: unit * 3, padding: `0 ${unit * 5}px` }}>
                        {links.map((link, i) => {
                            const p = glide(44 + i * 3);
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: unit * 1.2, opacity: p, transform: `translateY(${(1 - p) * unit * 2}px)` }}>
                                    <div style={{ width: unit * 4.4, height: unit * 4.4, borderRadius: unit * 1.2, background: colors.surface, border: `1px solid ${colors.muted}33`, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: unit * 2, fontWeight: 800, lineHeight: 1 }}>{NETWORK_MARK[link.network] ?? '•'}</div>
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
