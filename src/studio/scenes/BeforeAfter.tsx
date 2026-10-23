import { evolvePath } from '@remotion/paths';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import './fonts';
import { BrandTexture, clamp, SceneImage, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface BeforeAfterProps {
    heading: string;
    before: string;
    after: string;
    beforeLabel: string;
    afterLabel: string;
    direction: 'horizontal' | 'vertical';
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Two pictures on top of each other; a divider sweeps across to reveal the "after", then settles in the middle. */
export function BeforeAfter({ heading, before, after, beforeLabel, afterLabel, direction, transparent, brand, assets }: BeforeAfterProps) {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit;
    const t = layout.text;
    const { colors } = brand;
    const exit = useExit();
    const vertical = direction === 'vertical';
    const innerW = width - layout.safeX * 2;
    const headH = heading ? t * 10 : 0;
    const maxH = height - layout.safeY * 2 - headH;
    const boxW = Math.min(innerW, maxH * (layout.portrait ? 0.75 : 1.6));
    const boxH = Math.min(maxH, boxW / (layout.portrait ? 0.75 : 1.6));
    const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };
    const mid = Math.max(40, durationInFrames * 0.45);
    // The divider's position, 1 = all "before", 0 = all "after".
    const split = frame < mid ? interpolate(frame, [12, mid], [1, 0.08], ease) : interpolate(frame, [mid, mid + 24], [0.08, 0.5], ease);
    const lineIn = interpolate(frame, [4, 18], [0, 1], clamp);
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    const length = vertical ? boxW : boxH;
    const line = evolvePath(lineIn, `M 0 0 L 0 ${length}`);
    const labelStyle = (show: number): React.CSSProperties => ({ position: 'absolute', top: u * 2, padding: `${u * 0.8}px ${u * 1.8}px`, borderRadius: u * 3, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: t * 2.3, fontWeight: 700, lineHeight: 1.2, opacity: show });
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {heading && <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * 3, opacity: headIn }}>{heading}</div>}
            <div style={{ position: 'relative', width: boxW, height: boxH, borderRadius: u * 2, overflow: 'hidden', boxShadow: `0 ${u * 3}px ${u * 8}px rgba(0,0,0,0.4)`, opacity: headIn }}>
                <SceneImage src={after} assets={assets} brand={brand} label='Add the "after" image' style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <div style={{ position: 'absolute', inset: 0, clipPath: vertical ? `inset(0 0 ${(1 - split) * 100}% 0)` : `inset(0 ${(1 - split) * 100}% 0 0)` }}>
                    <SceneImage src={before} assets={assets} brand={brand} label='Add the "before" image' style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                </div>
                {beforeLabel && <span style={{ ...labelStyle(interpolate(split, [0.15, 0.3], [0, 1], clamp)), left: u * 2 }}>{beforeLabel}</span>}
                {afterLabel && <span style={{ ...labelStyle(interpolate(split, [0.7, 0.85], [1, 0], clamp)), right: u * 2 }}>{afterLabel}</span>}
                <svg
                    width={vertical ? boxW : u * 2}
                    height={vertical ? u * 2 : boxH}
                    viewBox={vertical ? `0 ${-u} ${boxW} ${u * 2}` : `${-u} 0 ${u * 2} ${boxH}`}
                    style={{ position: 'absolute', left: vertical ? 0 : `calc(${split * 100}% - ${u}px)`, top: vertical ? `calc(${split * 100}% - ${u}px)` : 0, overflow: 'visible' }}
                >
                    <path d={vertical ? `M 0 0 L ${boxW} 0` : 'M 0 0 L 0 ' + boxH} stroke='#fff' strokeWidth={u * 0.5} strokeDasharray={line.strokeDasharray} strokeDashoffset={line.strokeDashoffset} />
                </svg>
                <div
                    style={{
                        position: 'absolute',
                        left: vertical ? '50%' : `${split * 100}%`,
                        top: vertical ? `${split * 100}%` : '50%',
                        width: u * 6,
                        height: u * 6,
                        marginLeft: -u * 3,
                        marginTop: -u * 3,
                        borderRadius: '50%',
                        background: '#fff',
                        color: colors.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: u * 2.6,
                        fontWeight: 800,
                        lineHeight: 1,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                        transform: `scale(${lineIn}) rotate(${vertical ? 90 : 0}deg)`,
                    }}
                >
                    ‹ ›
                </div>
            </div>
        </AbsoluteFill>
    );
}
