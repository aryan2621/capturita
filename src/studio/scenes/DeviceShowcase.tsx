import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { frameLayout } from './layout';
import { bodyFont, displayFont, type Brand, type RecordingInfo, type SceneAssets, type Segment } from './assets';
import { RecordingVideo } from './RecordingVideo';

export type DeviceKind = 'macbook' | 'browser' | 'window';
export type HeadlinePlacement = 'side' | 'below' | 'none';

export interface DeviceShowcaseProps {
    device: DeviceKind;
    segment: Segment;
    headline: string;
    detail: string;
    placement: HeadlinePlacement;
    url: string;
    brand: Brand;
    recording: RecordingInfo;
    assets: SceneAssets;
}

/** Traffic lights, drawn (no artwork). */
function Lights({ size }: { size: number }) {
    return (
        <div style={{ display: 'flex', gap: size * 0.7 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
                <div key={color} style={{ width: size, height: size, borderRadius: size, background: color }} />
            ))}
        </div>
    );
}

/** The device frame around `screen`, `width` px wide; the screen keeps the recording's aspect. */
function Device({ kind, width, aspect, url, brand, children }: { kind: DeviceKind; width: number; aspect: number; url: string; brand: Brand; children: ReactNode }) {
    const u = width / 100;
    if (kind === 'macbook') {
        const bezel = u * 1.6;
        const screenWidth = width - bezel * 2;
        return (
            <div style={{ width, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width, padding: bezel, paddingTop: bezel * 1.4, background: '#0d0d0f', borderRadius: `${u * 2.4}px ${u * 2.4}px ${u * 0.6}px ${u * 0.6}px`, boxShadow: `0 0 0 ${u * 0.25}px #3a3b40 inset`, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: bezel * 0.45, left: '50%', width: u * 0.7, height: u * 0.7, marginLeft: -u * 0.35, borderRadius: u, background: '#1f2126' }} />
                    <div style={{ width: screenWidth, height: screenWidth / aspect, overflow: 'hidden', borderRadius: u * 0.4, background: '#000' }}>{children}</div>
                </div>
                {/* Hinge and base: a slim lip wider than the lid, with a thumb notch. */}
                <div style={{ width: width * 1.14, height: u * 2.2, marginTop: -u * 0.1, borderRadius: `0 0 ${u * 3}px ${u * 3}px`, background: 'linear-gradient(#e6e7ea, #b9bbc1 55%, #8d9097)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: '50%', width: u * 14, height: u * 0.9, marginLeft: -u * 7, borderRadius: `0 0 ${u}px ${u}px`, background: '#a4a7ad' }} />
                </div>
            </div>
        );
    }
    const bar = kind === 'browser' ? u * 5.2 : u * 3.6;
    return (
        <div style={{ width, borderRadius: u * 1.4, overflow: 'hidden', background: brand.colors.surface, boxShadow: `0 0 0 ${u * 0.12}px rgba(255,255,255,0.12) inset` }}>
            <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: u * 2, padding: `0 ${u * 1.6}px`, background: 'rgba(255,255,255,0.06)' }}>
                <Lights size={u * 1.1} />
                {kind === 'browser' && (
                    <div
                        style={{
                            flex: 1,
                            height: bar * 0.56,
                            borderRadius: bar,
                            background: 'rgba(0,0,0,0.28)',
                            color: brand.colors.muted,
                            fontFamily: bodyFont(brand),
                            fontSize: u * 1.5,
                            lineHeight: 1.2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: u * 6,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {url}
                    </div>
                )}
            </div>
            <div style={{ width, height: width / aspect, overflow: 'hidden', background: '#000' }}>{children}</div>
        </div>
    );
}

/**
 * The recording playing inside a drawn device. The device tilts up and rises in on a spring,
 * then the camera pushes in slowly; an optional headline sits beside or under it.
 */
export function DeviceShowcase({ device, segment, headline, detail, placement, url, brand, recording, assets }: DeviceShowcaseProps) {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const unit = layout.unit;
    const t = layout.text;
    const { colors } = brand;
    const aspect = recording.width / recording.height;
    const hasText = placement !== 'none' && (headline.trim() || detail.trim());
    // Frames too narrow for side by side put the text under the device.
    const side = hasText && placement === 'side' && !layout.stacked;

    const enter = spring({ frame, fps, config: { damping: 20, stiffness: 70, mass: 1.1 } });
    const textIn = spring({ frame: frame - 12, fps, config: { damping: 200 } });
    const push = interpolate(frame, [0, durationInFrames], [1, 1.07]);
    const exit = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Fit the device: by width, leaving room for text beside or under it, and by height.
    // `reach` is how much wider than the screen the frame is drawn (the laptop's base); `chrome`
    // how much taller. Sizes leave room for the push-in (up to 7%).
    const reach = device === 'macbook' ? 1.14 : 1;
    const chrome = device === 'macbook' ? 1.18 : device === 'browser' ? 1.07 : 1.05;
    const maxWidth = (width * (side ? 0.5 : layout.portrait ? 0.84 : 0.7)) / reach;
    const maxHeight = height * (hasText && !side ? 0.56 : 0.72);
    const deviceWidth = Math.min(maxWidth, (maxHeight / chrome) * aspect);

    const text = hasText && (
        <div
            style={{
                maxWidth: side ? width * 0.27 : layout.portrait ? width * 0.84 : width * 0.7,
                overflowWrap: 'break-word',
                textAlign: side ? 'left' : 'center',
                opacity: textIn,
                transform: `translateY(${(1 - textIn) * unit * 3}px)`,
            }}
        >
            {headline.trim() && <div style={{ fontFamily: displayFont(brand), color: colors.text, fontSize: t * (side ? 6.4 : 5.6), fontWeight: 750, lineHeight: 1.08, letterSpacing: -t * 0.12 }}>{headline}</div>}
            {detail.trim() && <div style={{ fontFamily: bodyFont(brand), color: colors.muted, fontSize: t * 2.8, fontWeight: 450, lineHeight: 1.35, marginTop: t * 2 }}>{detail}</div>}
            <div style={{ width: t * 8 * textIn, height: t * 0.5, borderRadius: t, background: colors.accent, marginTop: t * 2.6, marginLeft: side ? 0 : 'auto', marginRight: side ? 0 : 'auto' }} />
        </div>
    );

    return (
        <AbsoluteFill style={{ background: `radial-gradient(110% 90% at 50% 100%, ${colors.surface} 0%, ${colors.bg} 70%)`, lineHeight: 1.2, opacity: exit }}>
            <AbsoluteFill
                style={{
                    flexDirection: side ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: side ? unit * 6 : unit * 4,
                    transform: `scale(${push})`,
                }}
            >
                {side && text}
                <div style={{ perspective: width * 1.4 }}>
                    <div
                        style={{
                            transform: `translateY(${(1 - enter) * height * 0.22}px) rotateX(${(1 - enter) * 24}deg) scale(${0.92 + 0.08 * enter})`,
                            transformOrigin: '50% 100%',
                            opacity: Math.min(1, enter * 1.6),
                            filter: `drop-shadow(0 ${unit * 3}px ${unit * 4}px rgba(0,0,0,0.45))`,
                        }}
                    >
                        <Device kind={device} width={deviceWidth} aspect={aspect} url={url} brand={brand}>
                            <RecordingVideo recording={recording} assets={assets} segment={segment} />
                        </Device>
                    </div>
                </div>
                {!side && text}
            </AbsoluteFill>
        </AbsoluteFill>
    );
}
