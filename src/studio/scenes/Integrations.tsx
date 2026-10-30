import { grow } from './layout';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export interface IntegrationsProps {
    center: string;
    items: { text: string }[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last connection is made, for a sound. */
export const INTEGRATIONS_BEAT = 1.8;

/** Your product in the middle, the tools it connects to placed round it; a line draws to each. */
export function Integrations({ center, items, transparent, brand }: IntegrationsProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const nodes = (items ?? []).slice(0, 8);
    const radius = Math.min(width, height) * 0.34;
    const hubIn = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 140 } });
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: 0, height: 0 }}>
                    <svg width={width} height={height} style={{ position: 'absolute', left: -width / 2, top: -height / 2 }}>
                        {nodes.map((_, i) => {
                            const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
                            const at = 12 + (i / Math.max(1, nodes.length - 1)) * INTEGRATIONS_BEAT * fps * 0.8;
                            const draw = interpolate(frame, [at, at + 14], [0, 1], clamp);
                            return <line key={i} x1={width / 2} y1={height / 2} x2={width / 2 + Math.cos(angle) * radius * draw} y2={height / 2 + Math.sin(angle) * radius * draw} stroke={colors.accent} strokeOpacity={0.5} strokeWidth={u * 0.3} />;
                        })}
                    </svg>
                    {nodes.map((node, i) => {
                        const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
                        const at = 12 + (i / Math.max(1, nodes.length - 1)) * INTEGRATIONS_BEAT * fps * 0.8;
                        const p = spring({ frame: frame - at - 8, fps, config: { damping: 14, stiffness: 150 } });
                        return (
                            <div key={i} style={{ position: 'absolute', left: Math.cos(angle) * radius, top: Math.sin(angle) * radius, transform: `translate(-50%, -50%) scale(${Math.max(0, Math.min(1.08, p))})`, padding: `${u * 1.2}px ${u * 2.4}px`, borderRadius: u * 5, background: colors.surface, border: `${u * 0.2}px solid ${colors.accent}88`, color: colors.text, fontSize: u * 2.8, fontWeight: 600, whiteSpace: 'nowrap', opacity: Math.min(1, p) }}>{node.text}</div>
                        );
                    })}
                    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(-50%, -50%) scale(${Math.min(1.05, hubIn)})`, padding: `${u * 2.4}px ${u * 4.4}px`, borderRadius: u * 2.4, background: colors.accent, color: colors.bg, fontFamily: displayFont(brand), fontWeight: 800, fontSize: u * 4.6, whiteSpace: 'nowrap', boxShadow: `0 0 ${u * 5}px ${colors.accent}66` }}>{center}</div>
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
