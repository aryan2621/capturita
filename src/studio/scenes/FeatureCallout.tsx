import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { bodyFont, displayFont, type Brand, type RecordingInfo, type SceneAssets, type Segment, type TargetRect } from './assets';
import { RecordingVideo } from './RecordingVideo';

export type CalloutMotion = 'still' | 'play';

export interface FeatureCalloutProps {
    segment: Segment;
    target: TargetRect;
    label: string;
    detail: string;
    motion: CalloutMotion;
    brand: Brand;
    recording: RecordingInfo;
    assets: SceneAssets;
}

/**
 * A frame (or short stretch) of the recording that zooms toward a target, dims everything
 * around it, rings it, and points a label card at it.
 */
export function FeatureCallout({ segment, target, label, detail, motion, brand, recording, assets }: FeatureCalloutProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const unit = layout.unit;
    const t = layout.text;
    const { stacked } = layout;
    const { colors } = brand;

    // The recording, fitted with a margin and centred.
    const aspect = recording.width / recording.height;
    const videoWidth = Math.min(width * 0.86, height * 0.86 * aspect);
    const videoHeight = videoWidth / aspect;
    const left = (width - videoWidth) / 2;
    const top = (height - videoHeight) / 2;
    const rect = { x: left + target.x * videoWidth, y: top + target.y * videoHeight, width: target.width * videoWidth, height: target.height * videoHeight };
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

    // The card goes on the side of the target with more room (above or below it when stacked).
    // Zoom so the target fills about a third of the frame, sliding it toward the other side's
    // middle so the card fits beside it.
    const onRight = target.x + target.width / 2 <= 0.6;
    const above = target.y + target.height / 2 > 0.5;
    const zoomTo = stacked
        ? Math.min(3.2, Math.max(1, Math.min((width * 0.6) / rect.width, (height * 0.3) / rect.height)))
        : Math.min(3.2, Math.max(1, Math.min((width * 0.34) / rect.width, (height * 0.42) / rect.height)));
    const zoomIn = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 34 });
    const scale = 1 + (zoomTo - 1) * zoomIn;
    const goal = stacked ? { x: width / 2, y: height * (above ? 0.64 : 0.36) } : { x: width * (onRight ? 0.36 : 0.64), y: height / 2 };
    const shift = { x: (goal.x - center.x) * zoomIn, y: (goal.y - center.y) * zoomIn };
    const toScreen = (x: number, y: number) => ({ x: center.x + shift.x + (x - center.x) * scale, y: center.y + shift.y + (y - center.y) * scale });
    const a = toScreen(rect.x, rect.y);
    const ring = { x: a.x, y: a.y, width: rect.width * scale, height: rect.height * scale };

    const spot = spring({ frame: frame - 30, fps, config: { damping: 200 } });
    const card = spring({ frame: frame - 40, fps, config: { damping: 16, stiffness: 120 } });
    const exit = useExit();
    const pad = unit * 1.2;
    const radius = unit * 1.2;

    // The card sits beside the ring, vertically centred on it, with an arrow between them. When
    // stacked it spans the safe width above or below the ring, with a vertical arrow; `above`
    // anchors it by its bottom edge so its height doesn't matter.
    const cardWidth = stacked ? Math.min(width * 0.84, width - layout.safeX * 2) : width * 0.24;
    const gap = unit * (stacked ? 5 : 7);
    const ringMid = ring.y + ring.height / 2;
    const ringCenterX = ring.x + ring.width / 2;
    let cardX: number;
    let cardTop: number | undefined;
    let cardBottom: number | undefined;
    let arrowFrom: { x: number; y: number };
    let arrowTo: { x: number; y: number };
    if (stacked) {
        cardX = (width - cardWidth) / 2;
        const x = Math.min(cardX + cardWidth - unit * 6, Math.max(cardX + unit * 6, ringCenterX));
        if (above) {
            const edge = Math.max(height * 0.3, Math.min(height - layout.safeY, ring.y - pad - gap));
            cardBottom = height - edge;
            arrowFrom = { x, y: edge };
            arrowTo = { x, y: ring.y - pad };
        } else {
            const edge = Math.min(height * 0.62, Math.max(layout.safeY, ring.y + ring.height + pad + gap));
            cardTop = edge;
            arrowFrom = { x, y: edge };
            arrowTo = { x, y: ring.y + ring.height + pad };
        }
    } else {
        cardX = onRight ? Math.min(width - cardWidth - layout.safeX, ring.x + ring.width + pad + gap) : Math.max(layout.safeX, ring.x - pad - gap - cardWidth);
        cardTop = Math.min(height - unit * 24, Math.max(layout.safeY, ringMid - unit * 8));
        arrowFrom = { x: onRight ? cardX : cardX + cardWidth, y: Math.min(cardTop + unit * 14, Math.max(cardTop + unit * 3, ringMid)) };
        arrowTo = { x: onRight ? ring.x + ring.width + pad : ring.x - pad, y: ringMid };
    }
    const slide = (1 - card) * t * 4;
    const arrowEnd = { x: arrowFrom.x + (arrowTo.x - arrowFrom.x) * card, y: arrowFrom.y + (arrowTo.y - arrowFrom.y) * card };
    const angle = Math.atan2(arrowTo.y - arrowFrom.y, arrowTo.x - arrowFrom.x);
    const head = unit * 1.4;

    return (
        <AbsoluteFill style={{ background: colors.bg, overflow: 'hidden', lineHeight: 1.2, opacity: exit }}>
            <BrandTexture brand={brand} />
            <div
                style={{
                    position: 'absolute',
                    left,
                    top,
                    width: videoWidth,
                    height: videoHeight,
                    transformOrigin: `${center.x - left}px ${center.y - top}px`,
                    transform: `translate(${shift.x}px, ${shift.y}px) scale(${scale})`,
                    borderRadius: unit * 0.8,
                    overflow: 'hidden',
                    boxShadow: `0 ${unit * 2}px ${unit * 5}px rgba(0,0,0,0.4)`,
                }}
            >
                <RecordingVideo recording={recording} assets={assets} segment={segment} still={motion === 'still'} />
            </div>
            {/* Spotlight: everything outside the ring dims; the ring glows in the accent. */}
            <div
                style={{
                    position: 'absolute',
                    left: ring.x - pad,
                    top: ring.y - pad,
                    width: ring.width + pad * 2,
                    height: ring.height + pad * 2,
                    borderRadius: radius,
                    boxShadow: `0 0 0 ${Math.max(width, height) * 2}px rgba(0,0,0,${0.58 * spot})`,
                    border: `${unit * 0.45}px solid ${colors.accent}`,
                    opacity: spot,
                    outline: `${unit * 0.9 * (1 - spot) + unit * 0.3}px solid ${colors.accent}33`,
                    outlineOffset: unit * 0.4,
                }}
            />
            <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: card > 0.02 ? 1 : 0 }}>
                <line x1={arrowFrom.x} y1={arrowFrom.y} x2={arrowEnd.x} y2={arrowEnd.y} stroke={colors.accent} strokeWidth={unit * 0.4} strokeLinecap='round' />
                {card > 0.9 && (
                    <polygon
                        points={[
                            [arrowTo.x, arrowTo.y],
                            [arrowTo.x - head * Math.cos(angle - 0.5), arrowTo.y - head * Math.sin(angle - 0.5)],
                            [arrowTo.x - head * Math.cos(angle + 0.5), arrowTo.y - head * Math.sin(angle + 0.5)],
                        ]
                            .map((p) => p.join(','))
                            .join(' ')}
                        fill={colors.accent}
                    />
                )}
            </svg>
            <div
                style={{
                    position: 'absolute',
                    left: cardX,
                    top: cardTop,
                    bottom: cardBottom,
                    width: cardWidth,
                    boxSizing: 'border-box',
                    padding: `${t * 2.4}px ${t * 2.8}px`,
                    borderRadius: unit * 1.6,
                    background: colors.surface,
                    boxShadow: `0 ${unit * 1.5}px ${unit * 4}px rgba(0,0,0,0.35), 0 0 0 ${unit * 0.12}px rgba(255,255,255,0.1) inset`,
                    opacity: Math.min(1, card),
                    transform: `${stacked ? `translateY(${(above ? -1 : 1) * slide}px)` : `translateX(${(onRight ? 1 : -1) * slide}px)`} scale(${0.94 + 0.06 * card})`,
                }}
            >
                <div style={{ width: t * 4, height: t * 0.45, borderRadius: t, background: colors.accent, marginBottom: t * 1.6 }} />
                {label.trim() && <div style={{ fontFamily: displayFont(brand), color: colors.text, fontSize: t * 3.8, fontWeight: 700, lineHeight: 1.12, overflowWrap: 'break-word' }}>{label}</div>}
                {detail.trim() && <div style={{ fontFamily: bodyFont(brand), color: colors.muted, fontSize: t * 2.3, fontWeight: 450, lineHeight: 1.35, marginTop: t * 1.2, overflowWrap: 'break-word' }}>{detail}</div>}
            </div>
        </AbsoluteFill>
    );
}
