import type { CSSProperties } from 'react';
import { Easing, interpolate } from 'remotion';
import { clamp, SceneImage } from './SceneBase';
import { al } from './launch/shapes';
import { Heading, Ping, Stage, easeOut, headRoom, useScene, type Scene } from './proofParts';
import type { Brand, SceneAssets } from './assets';

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

/** The divider starts moving at 0.4s (the scene's beat), reaches the far end, then springs back to the middle. */
const SWEEP_FROM = 0.4;
const SWEEP_TO = 1.7;
const END_SPLIT = 0.06;

/** Where the divider is: 1 = all "before", 0 = all "after". */
function splitAt(s: Scene) {
    const sweep = interpolate(s.seconds, [SWEEP_FROM, SWEEP_TO], [1, END_SPLIT], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    return sweep + (0.5 - END_SPLIT) * s.pop(SWEEP_TO - 0.05, { stiffness: 140, damping: 12, mass: 0.8 });
}

function Label({ s, text, show, side }: { s: Scene; text: string; show: number; side: 'left' | 'right' }) {
    if (!text) return null;
    return (
        <span style={{ position: 'absolute', top: s.u * 2, [side]: s.u * 2, display: 'flex', alignItems: 'center', gap: s.u * 0.9, padding: `${s.u * 0.8}px ${s.u * 1.8}px`, borderRadius: s.u * 3, background: al('#000000', 0.55), backdropFilter: `blur(${s.u}px)`, border: `1px solid ${al('#ffffff', 0.18)}`, color: '#fff', fontSize: s.t * 2.3, fontWeight: 700, opacity: show, transform: `translateY(${(1 - show) * -s.u * 1.5}px)` }}>
            <i style={{ width: s.u * 0.9, height: s.u * 0.9, borderRadius: '50%', background: s.c.accent, boxShadow: `0 0 ${s.u}px ${s.c.accent}` }} />
            {text}
        </span>
    );
}

/** Two pictures on top of each other; a glowing divider sweeps across to reveal the "after", then settles in the middle. */
export function BeforeAfter({ heading, before, after, beforeLabel, afterLabel, direction, transparent, brand, assets }: BeforeAfterProps) {
    const s = useScene(brand, false);
    const { u, c } = s;
    const vertical = direction === 'vertical';
    const ratio = s.layout.portrait ? 0.75 : 1.6;
    const maxH = s.height - s.layout.safeY * 2 - headRoom(s, heading);
    const boxW = Math.min(s.innerW, maxH * ratio);
    const boxH = Math.min(maxH, boxW / ratio);
    const split = splitAt(s);
    const born = s.pop(0);
    const lineIn = easeOut(s.ramp(0.08, 0.4));
    const along = `${split * 100}%`;
    const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
    const handleAt: CSSProperties = vertical ? { left: '50%', top: along } : { left: along, top: '50%' };
    return (
        <Stage s={s} transparent={transparent} at={[50, 60]}>
            <Heading s={s} text={heading} />
            <div style={{ position: 'relative', width: boxW, height: boxH, opacity: Math.min(1, born * 2), transform: `scale(${0.92 + 0.08 * born})` }}>
                <div style={{ position: 'absolute', inset: -u * 2, borderRadius: u * 4, background: `radial-gradient(closest-side, ${al(c.accent, 0.3)}, transparent)` }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: u * 2, overflow: 'hidden', border: `1px solid ${al(c.text, 0.2)}`, boxShadow: `0 ${u * 3}px ${u * 8}px ${al('#000000', 0.5)}` }}>
                    <SceneImage src={after} assets={assets} brand={brand} label='Add the "after" image' style={fill} />
                    <div style={{ position: 'absolute', inset: 0, clipPath: vertical ? `inset(0 0 ${(1 - split) * 100}% 0)` : `inset(0 ${(1 - split) * 100}% 0 0)` }}>
                        <SceneImage src={before} assets={assets} brand={brand} label='Add the "before" image' style={fill} />
                    </div>
                    <Label s={s} text={beforeLabel} side='left' show={interpolate(split, [0.15, 0.3], [0, 1], clamp)} />
                    <Label s={s} text={afterLabel} side='right' show={interpolate(split, [0.7, 0.85], [1, 0], clamp)} />
                    <div style={{ position: 'absolute', ...(vertical ? { left: 0, right: 0, top: along, height: u * 0.5, transform: `translateY(-50%) scaleX(${lineIn})` } : { top: 0, bottom: 0, left: along, width: u * 0.5, transform: `translateX(-50%) scaleY(${lineIn})` }), background: '#fff', boxShadow: `0 0 ${u * 3}px ${c.accent}, 0 0 ${u * 1}px #fff` }} />
                </div>
                <div style={{ position: 'absolute', ...handleAt, width: u * 6.4, height: u * 6.4, margin: -u * 3.2, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: c.bg, fontSize: u * 2.6, fontWeight: 800, boxShadow: `0 ${u * 0.6}px ${u * 2}px ${al('#000000', 0.4)}, 0 0 ${u * 4}px ${al(c.accent, 0.7)}`, transform: `scale(${lineIn}) rotate(${vertical ? 90 : 0}deg)` }}>‹ ›</div>
                <div style={{ position: 'absolute', ...handleAt }}><Ping s={s} at={SWEEP_TO} size={u * 14} /></div>
            </div>
        </Stage>
    );
}
