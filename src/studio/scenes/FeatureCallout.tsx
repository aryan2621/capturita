import { AbsoluteFill, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, useExit } from './SceneBase';
import { frameLayout, type FrameLayout } from './layout';
import { Sweep, easeOut, useTiming, type Pt } from './deviceParts';
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

interface Box extends Pt {
    width: number;
    height: number;
}

/** Where the label card goes and where its arrow runs: beside the ring (above or below it when stacked). */
interface CardSpot {
    x: number;
    top?: number;
    bottom?: number;
    width: number;
    from: Pt;
    to: Pt;
    /** Which way the card slides in from: 1 is down or right, -1 up or left. */
    slide: number;
    vertical: boolean;
}

/**
 * The card sits beside the ring, vertically centred on it, with an arrow between them. When
 * stacked it spans the safe width above or below the ring, with a vertical arrow; `above`
 * anchors it by its bottom edge so its height doesn't matter.
 */
function placeCard(ring: Box, frame: { width: number; height: number }, layout: FrameLayout, onRight: boolean, above: boolean): CardSpot {
    const { width, height } = frame;
    const { unit, safeX, safeY } = layout;
    const pad = unit * 1.2;
    const ringMid = ring.y + ring.height / 2;
    if (layout.stacked) {
        const cardW = Math.min(width * 0.84, width - safeX * 2);
        const x = (width - cardW) / 2;
        const gap = unit * 5;
        const ax = Math.min(x + cardW - unit * 6, Math.max(x + unit * 6, ring.x + ring.width / 2));
        if (above) {
            const edge = Math.max(height * 0.3, Math.min(height - safeY, ring.y - pad - gap));
            return { x, bottom: height - edge, width: cardW, from: { x: ax, y: edge }, to: { x: ax, y: ring.y - pad }, slide: -1, vertical: true };
        }
        const edge = Math.min(height * 0.62, Math.max(safeY, ring.y + ring.height + pad + gap));
        return { x, top: edge, width: cardW, from: { x: ax, y: edge }, to: { x: ax, y: ring.y + ring.height + pad }, slide: 1, vertical: true };
    }
    const cardW = width * 0.24;
    const gap = unit * 7;
    const x = onRight ? Math.min(width - cardW - safeX, ring.x + ring.width + pad + gap) : Math.max(safeX, ring.x - pad - gap - cardW);
    const top = Math.min(height - unit * 24, Math.max(safeY, ringMid - unit * 8));
    return {
        x,
        top,
        width: cardW,
        from: { x: onRight ? x : x + cardW, y: Math.min(top + unit * 14, Math.max(top + unit * 3, ringMid)) },
        to: { x: onRight ? ring.x + ring.width + pad : ring.x - pad, y: ringMid },
        slide: onRight ? 1 : -1,
        vertical: false,
    };
}

/** A curved arrow that draws itself from `from` to `to` as `p` runs 0 → 1, ending in a head. */
function Arrow({ from, to, p, color, unit, width, height }: { from: Pt; to: Pt; p: number; color: string; unit: number; width: number; height: number }) {
    if (p <= 0) return null;
    const ctrl = { x: (from.x + to.x) / 2 + (from.y - to.y) * 0.2, y: (from.y + to.y) / 2 + (to.x - from.x) * 0.2 };
    const angle = Math.atan2(to.y - ctrl.y, to.x - ctrl.x);
    const head = unit * 1.6;
    const tip = (spread: number) => `${to.x - head * Math.cos(angle + spread)},${to.y - head * Math.sin(angle + spread)}`;
    return (
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0, overflow: 'visible', filter: `drop-shadow(0 0 ${unit * 0.8}px ${color})` }}>
            <path d={`M${from.x},${from.y}Q${ctrl.x},${ctrl.y} ${to.x},${to.y}`} fill='none' stroke={color} strokeWidth={unit * 0.4} strokeLinecap='round' pathLength={1} strokeDasharray='1 1' strokeDashoffset={1 - p} />
            {p > 0.92 && <polygon points={`${to.x},${to.y} ${tip(-0.5)} ${tip(0.5)}`} fill={color} />}
        </svg>
    );
}

/**
 * A frame (or short stretch) of the recording that zooms toward a target, dims everything
 * around it, rings it, and points a label card at it.
 */
export function FeatureCallout({ segment, target, label, detail, motion, brand, recording, assets }: FeatureCalloutProps) {
    const { glide, pop, ramp } = useTiming();
    const size = useVideoConfig();
    const { width, height } = size;
    const layout = frameLayout(width, height);
    const { unit, text: t, stacked } = layout;
    const { colors } = brand;
    const exit = useExit();

    // The recording, fitted with a margin and centred.
    const aspect = recording.width / recording.height;
    const videoWidth = Math.min(width * 0.86, height * 0.86 * aspect);
    const videoHeight = videoWidth / aspect;
    const left = (width - videoWidth) / 2;
    const top = (height - videoHeight) / 2;
    const rect: Box = { x: left + target.x * videoWidth, y: top + target.y * videoHeight, width: target.width * videoWidth, height: target.height * videoHeight };
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

    // Zoom so the target fills about a third of the frame, sliding it toward the side opposite the card.
    const onRight = target.x + target.width / 2 <= 0.6;
    const above = target.y + target.height / 2 > 0.5;
    const zoomTo = Math.min(3.2, Math.max(1, stacked ? Math.min((width * 0.6) / rect.width, (height * 0.3) / rect.height) : Math.min((width * 0.34) / rect.width, (height * 0.42) / rect.height)));
    const zoomIn = glide(2);
    const scale = 1 + (zoomTo - 1) * zoomIn;
    const goal = stacked ? { x: width / 2, y: height * (above ? 0.64 : 0.36) } : { x: width * (onRight ? 0.36 : 0.64), y: height / 2 };
    const shift = { x: (goal.x - center.x) * zoomIn, y: (goal.y - center.y) * zoomIn };
    const ring: Box = { x: center.x + shift.x + (rect.x - center.x) * scale, y: center.y + shift.y + (rect.y - center.y) * scale, width: rect.width * scale, height: rect.height * scale };

    const spot = glide(12);
    const lock = pop(14);
    const card = pop(20);
    const spec = placeCard(ring, size, layout, onRight, above);
    const pad = unit * 1.2;
    const slide = (1 - card) * t * 4 * spec.slide;
    const ping = ramp(14, 34, easeOut);

    return (
        <AbsoluteFill style={{ background: colors.bg, overflow: 'hidden', lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} /></Depth>
            <Depth z={1}>
                <div style={{ position: 'absolute', left, top, width: videoWidth, height: videoHeight, transformOrigin: `${center.x - left}px ${center.y - top}px`, transform: `translate(${shift.x}px, ${shift.y}px) scale(${scale})`, borderRadius: unit * 0.8, overflow: 'hidden', boxShadow: `0 ${unit * 2}px ${unit * 5}px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)` }}>
                    <RecordingVideo recording={recording} assets={assets} segment={segment} still={motion === 'still'} />
                </div>
                {/* Spotlight: everything outside the ring dims; the ring snaps on with a ping of light. */}
                <div style={{ position: 'absolute', left: ring.x - pad, top: ring.y - pad, width: ring.width + pad * 2, height: ring.height + pad * 2, borderRadius: unit * 1.2, boxShadow: `0 0 0 ${Math.max(width, height) * 2}px rgba(0,0,0,${0.6 * spot}), 0 0 ${unit * 3 * lock}px ${colors.accent}88`, border: `${unit * 0.45}px solid ${colors.accent}`, opacity: Math.min(1, lock * 2), transform: `scale(${1 + (1 - Math.min(lock, 1.4)) * 0.18})` }}>
                    <Sweep t={ramp(18, 40, (x) => x)} strength={0.18} />
                </div>
                <div style={{ position: 'absolute', left: ring.x - pad, top: ring.y - pad, width: ring.width + pad * 2, height: ring.height + pad * 2, borderRadius: unit * 1.2, border: `${unit * 0.3}px solid ${colors.accent}`, opacity: (1 - ping) * (ping > 0 ? 0.8 : 0), transform: `scale(${1 + ping * 0.35})` }} />
                <Arrow from={spec.from} to={spec.to} p={ramp(22, 34, easeOut)} color={colors.accent} unit={unit} width={width} height={height} />
                <div style={{ position: 'absolute', left: spec.x, top: spec.top, bottom: spec.bottom, width: spec.width, boxSizing: 'border-box', padding: `${t * 2.4}px ${t * 2.8}px`, borderRadius: unit * 1.6, background: colors.surface, boxShadow: `0 ${unit * 1.5}px ${unit * 4}px rgba(0,0,0,0.4), 0 0 ${unit * 4}px ${colors.accent}33, 0 0 0 ${unit * 0.12}px rgba(255,255,255,0.12) inset`, opacity: Math.min(1, card * 2), transform: `${spec.vertical ? 'translateY' : 'translateX'}(${slide}px) scale(${0.92 + 0.08 * card})` }}>
                    <div style={{ width: t * 4 * card, height: t * 0.45, borderRadius: t, background: colors.accent, boxShadow: `0 0 ${t * 1.5}px ${colors.accent}`, marginBottom: t * 1.6 }} />
                    {label.trim() && <div style={{ fontFamily: displayFont(brand), color: colors.text, fontSize: t * 3.8, fontWeight: 700, lineHeight: 1.12, overflowWrap: 'break-word' }}>{label}</div>}
                    {detail.trim() && <div style={{ fontFamily: bodyFont(brand), color: colors.muted, fontSize: t * 2.3, fontWeight: 450, lineHeight: 1.35, marginTop: t * 1.2, overflowWrap: 'break-word' }}>{detail}</div>}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
