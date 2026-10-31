import { AbsoluteFill, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { fitSize } from './text';
import { Glow, Ring, easeOut, useTiming } from './deviceParts';
import { bodyFont, displayFont, type Brand } from './assets';

export interface FeatureOrbitProps {
    heading: string;
    features: { text: string }[];
    transparent?: boolean;
    brand: Brand;
}

const PERSPECTIVE = 1400;
const TURN = 0.016; // radians a frame: one lap in about 13 s
const MAX_CHARS = 20;
const RING_STEPS = 72;
const mono = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Seconds until the ring has opened out, for a sound. */
export const FEATURE_ORBIT_BEAT = 0.3;

/** A point on the ring at angle `a`, seen under the perspective: where it lands on screen, how big it draws, and 1 at the front, 0 at the back. */
function project(a: number, radius: number, lean: number, cx: number, cy: number) {
    const front = (Math.sin(a) + 1) / 2;
    const z = (front - 0.5) * radius;
    const scale = PERSPECTIVE / (PERSPECTIVE - z);
    return { x: cx + Math.cos(a) * radius * scale, y: cy + (front - 0.5) * radius * lean * scale, scale, front };
}

/**
 * Features as chips on a tilted ring that spins open under the heading and keeps turning slowly.
 * The perspective is computed here (not CSS 3D), so the ring's outline and the chips share it;
 * chips at the back are smaller and dimmer, the one in front glows.
 */
export function FeatureOrbit({ heading, features, transparent, brand }: FeatureOrbitProps) {
    const { frame, pop, glide, ramp } = useTiming();
    const { width, height } = useVideoConfig();
    const unit = Math.min(width, height) / 100;
    const { colors } = brand;
    const exit = useExit();
    const portrait = height > width * 1.05;

    const chips = (Array.isArray(features) ? features : []).map((f) => String(f?.text ?? '').trim()).filter(Boolean).slice(0, 8);
    const count = Math.max(1, chips.length);
    const open = pop(0);
    const ringShare = portrait ? 0.29 : 0.3;
    const radius = width * ringShare * open;
    const lean = portrait ? 0.9 : 0.4;
    const longest = Math.max(1, ...chips.map((c) => Math.min(MAX_CHARS, c.length)));
    // Size so the widest chip, centred on the side of the ring, stays inside the frame (half its width: ~0.6em a character plus padding).
    const chipSize = Math.min(unit * (portrait ? 5 : 4.2), (width * 0.45 - width * ringShare) / ((longest * 0.6 + 3.4) / 2));
    // The ring spins in fast, slows onto the steady turn.
    const spin = -0.6 - 2.4 * (1 - ramp(0, 28, easeOut)) + frame * TURN;
    const [cx, cy] = [width / 2, height * (portrait ? 0.58 : 0.56)];
    const headSize = Math.min(unit * (portrait ? 9 : 7.5), fitSize(String(heading || ' '), width * 0.84 * (String(heading).length > 18 ? 1.7 : 1), brand.fonts.display, 999));
    const headIn = glide(0);

    const ring = Array.from({ length: RING_STEPS }, (_, i) => [project((i / RING_STEPS) * Math.PI * 2, radius, lean, cx, cy), project(((i + 1) / RING_STEPS) * Math.PI * 2, radius, lean, cx, cy)]);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={0.4}>
                <Glow x={cx} y={cy} r={width * 0.34} color={`${colors.accent}40`} opacity={Math.min(1, open)} />
                <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
                    {ring.map(([a, b], i) => (
                        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.accent} strokeWidth={unit * 0.22 * a.scale} strokeLinecap='round' opacity={Math.min(1, open) * (0.1 + a.front * 0.5)} />
                    ))}
                </svg>
                <div style={{ position: 'absolute', left: cx - unit * 2.2, top: cy - unit * 2.2, width: unit * 4.4, height: unit * 4.4, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${colors.text}, ${colors.accent} 55%)`, boxShadow: `0 0 ${unit * 5}px ${colors.accent}`, transform: `scale(${pop(0)})` }} />
                <Ring x={cx} y={cy} r0={unit * 2} r1={radius * 1.5 + unit * 4} t={ramp(4, 30)} color={colors.accent} width={unit * 0.5} />
            </Depth>
            <Depth z={1}>
                <div style={{ position: 'absolute', left: width * 0.08, right: width * 0.08, top: height * (portrait ? 0.14 : 0.13), textAlign: 'center', fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, letterSpacing: -headSize * 0.02, color: colors.text, opacity: headIn, transform: `translateY(${(1 - headIn) * unit * 3}px)` }}>
                    {heading}
                </div>
                {chips.map((text, i) => {
                    const p = project(spin + (i / count) * Math.PI * 2, radius, lean, cx, cy);
                    const lead = Math.max(0, (p.front - 0.8) / 0.2);
                    return (
                        <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, zIndex: Math.round(p.front * 100), transform: `translate(-50%, -50%) scale(${p.scale})`, opacity: Math.min(1, open * 2) * (0.35 + p.front * 0.65) }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: chipSize * 0.5, padding: `${chipSize * 0.5}px ${chipSize * 0.9}px`, borderRadius: chipSize * 2, background: colors.surface, border: `1px solid ${lead > 0 ? colors.accent : `${colors.muted}44`}`, boxShadow: `0 ${chipSize * 0.4}px ${chipSize}px #0005, 0 0 ${chipSize * 1.6 * lead}px ${colors.accent}77, 0 1px 0 #ffffff14 inset`, color: colors.text, fontSize: chipSize, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                <span style={{ width: chipSize * 0.5, height: chipSize * 0.5, borderRadius: '50%', background: colors.accent, boxShadow: `0 0 ${chipSize * 0.6}px ${colors.accent}`, flex: 'none' }} />
                                {mono(text, MAX_CHARS)}
                            </div>
                        </div>
                    );
                })}
            </Depth>
        </AbsoluteFill>
    );
}
