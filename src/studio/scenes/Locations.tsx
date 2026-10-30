import { grow } from './layout';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export interface LocationsProps {
    heading: string;
    /** x and y are percentages of the map area (0 left/top, 100 right/bottom). */
    places: { name: string; x: number; y: number }[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last pin has dropped, for a sound. */
export const LOCATIONS_BEAT = 2;

/** A dot-grid map with pins that drop in one by one, each ringing once and labelled. */
export function Locations({ heading, places, transparent, brand }: LocationsProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const pins = (places ?? []).slice(0, 8);
    const mapW = width * 0.8;
    const mapH = height * 0.55;
    const step = u * 3;
    const cols = Math.floor(mapW / step);
    const rows = Math.floor(mapH / step);
    const headIn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
    const gridIn = interpolate(frame, [0, 14], [0, 1], clamp);
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 3 }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: u * 5.2, fontWeight: 800, color: colors.text, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 2}px)` }}>{heading}</div>
                    <div style={{ position: 'relative', width: cols * step, height: rows * step, opacity: gridIn }}>
                        <svg width={cols * step} height={rows * step} style={{ position: 'absolute', inset: 0 }}>
                            {Array.from({ length: cols * rows }, (_, i) => <circle key={i} cx={(i % cols) * step + step / 2} cy={Math.floor(i / cols) * step + step / 2} r={u * 0.28} fill={colors.muted} opacity={0.35} />)}
                        </svg>
                        {pins.map((pin, i) => {
                            const at = 12 + (i / Math.max(1, pins.length - 1)) * LOCATIONS_BEAT * fps * 0.8;
                            const drop = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 160 } });
                            const ring = interpolate(frame, [at, at + 22], [0, 1], clamp);
                            const label = spring({ frame: frame - at - 6, fps, config: { damping: 200 } });
                            return (
                                <div key={i} style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%` }}>
                                    <div style={{ position: 'absolute', left: -u * 4 * ring, top: -u * 4 * ring, width: u * 8 * ring, height: u * 8 * ring, borderRadius: '50%', border: `${u * 0.25}px solid ${colors.accent}`, opacity: 1 - ring }} />
                                    <div style={{ position: 'absolute', left: -u * 0.9, top: -u * 0.9 - (1 - Math.min(1, drop)) * u * 6, width: u * 1.8, height: u * 1.8, borderRadius: '50%', background: colors.accent, opacity: Math.min(1, drop), boxShadow: `0 0 ${u * 1.6}px ${colors.accent}` }} />
                                    <div style={{ position: 'absolute', left: u * 1.6, top: -u * 1.3, whiteSpace: 'nowrap', fontSize: u * 2.2, fontWeight: 600, color: colors.text, opacity: label }}>{pin.name}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
