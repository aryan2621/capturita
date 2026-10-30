import { useBeatSnap } from './beat';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { fitSize } from './text';
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
const mono = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Seconds until the ring has opened out, for a sound. */
export const FEATURE_ORBIT_BEAT = 0.8;

/**
 * Features as chips on a tilted ring that opens out under the heading and turns slowly. Plain CSS 3D
 * (translate3d under a perspective), so it needs no WebGL; chips at the back are smaller and dimmer.
 */
export function FeatureOrbit({ heading, features, transparent, brand }: FeatureOrbitProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const snap = useBeatSnap();
    const onBeat = (f: number) => snap(f / fps) * fps; // entrance frame moved onto a nearby beat
    const unit = Math.min(width, height) / 100;
    const { colors } = brand;
    const exit = useExit();
    const portrait = height > width * 1.05;

    const chips = (Array.isArray(features) ? features : []).map((f) => String(f?.text ?? '').trim()).filter(Boolean).slice(0, 8);
    const count = Math.max(1, chips.length);
    const open = spring({ frame: frame - onBeat(4), fps, config: { damping: 18, stiffness: 90 } });
    const radius = width * (portrait ? 0.29 : 0.3) * open;
    const longest = Math.max(1, ...chips.map((c) => Math.min(MAX_CHARS, c.length)));
    // Size so the widest chip, centred on the side of the ring, stays inside the frame (half its width: ~0.6em a character plus padding).
    const chipSize = Math.min(unit * (portrait ? 5 : 4.2), (width * 0.45 - width * (portrait ? 0.29 : 0.3)) / ((longest * 0.6 + 3.4) / 2));
    const spin = -0.6 + (1 - open) * -1.4 + frame * TURN;
    const cy = height * (portrait ? 0.58 : 0.56);
    const headSize = Math.min(unit * (portrait ? 9 : 7.5), fitSize(String(heading || ' '), width * 0.84 * (String(heading).length > 18 ? 1.7 : 1), brand.fonts.display, 999));
    const lift = interpolate(frame, [0, 16], [unit * 2.4, 0], clamp);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1}>
                <div style={{ position: 'absolute', left: width * 0.08, right: width * 0.08, top: height * (portrait ? 0.14 : 0.13), textAlign: 'center', fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, letterSpacing: -headSize * 0.02, color: colors.text, opacity: open, transform: `translateY(${lift}px)` }}>
                    {heading}
                </div>
                <div style={{ position: 'absolute', inset: 0, perspective: PERSPECTIVE, perspectiveOrigin: `50% ${(cy / height) * 100}%` }}>
                    {chips.map((text, i) => {
                        const a = spin + (i / count) * Math.PI * 2;
                        const front = (Math.sin(a) + 1) / 2; // 1 at the front of the ring, 0 at the back
                        const x = Math.cos(a) * radius;
                        const z = (front - 0.5) * radius;
                        const y = (front - 0.5) * radius * (portrait ? 0.9 : 0.4);
                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left: width / 2,
                                    top: cy,
                                    zIndex: Math.round(front * 100),
                                    transform: `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -50%)`,
                                    opacity: open * (0.35 + front * 0.65),
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: chipSize * 0.5, padding: `${chipSize * 0.5}px ${chipSize * 0.9}px`, borderRadius: chipSize * 2, background: colors.surface, border: `1px solid ${colors.muted}44`, boxShadow: '0 12px 32px #0004', color: colors.text, fontSize: chipSize, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    <span style={{ width: chipSize * 0.5, height: chipSize * 0.5, borderRadius: '50%', background: colors.accent, flex: 'none' }} />
                                    {mono(text, MAX_CHARS)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
