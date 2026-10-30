import { grow } from './layout';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export interface NotificationsProps {
    heading: string;
    items: { title: string; text: string }[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last notification has landed, for a sound. */
export const NOTIFICATIONS_BEAT = 2.6;

/** Toasts that drop in from the top and push the earlier ones down, fading as they age. */
export function Notifications({ heading, items, transparent, brand }: NotificationsProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const list = (items ?? []).slice(0, 4);
    const at = (i: number) => 10 + (i / Math.max(1, list.length - 1)) * NOTIFICATIONS_BEAT * fps * 0.8;
    const headIn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
    const cardH = u * 11;
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: Math.min(width * 0.62, u * 80) }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: u * 4.6, fontWeight: 800, color: colors.text, opacity: headIn, marginBottom: u * 3 }}>{heading}</div>
                    <div style={{ position: 'relative', height: cardH * (list.length + 0.2) }}>
                        {list.map((n, i) => {
                            const drop = spring({ frame: frame - at(i), fps, config: { damping: 16, stiffness: 140 } });
                            // Each later notification pushes this one down a slot (springing as it arrives).
                            const slot = list.reduce((sum, _, j) => (j > i ? sum + spring({ frame: frame - at(j), fps, config: { damping: 16, stiffness: 140 } }) : sum), 0);
                            const age = Math.min(1, slot / 3);
                            return (
                                <div
                                    key={i}
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        top: 0,
                                        height: cardH * 0.9,
                                        padding: `${u * 1.4}px ${u * 2.2}px`,
                                        boxSizing: 'border-box',
                                        borderRadius: u * 1.8,
                                        background: colors.surface,
                                        borderLeft: `${u * 0.6}px solid ${colors.accent}`,
                                        opacity: Math.min(1, drop * 2) * (1 - age * 0.45),
                                        transform: `translateY(${(slot + (1 - drop) * -1.5) * cardH}px) scale(${1 - age * 0.04})`,
                                    }}
                                >
                                    <div style={{ fontSize: u * 2.8, fontWeight: 700, color: colors.text }}>{n.title}</div>
                                    <div style={{ fontSize: u * 2.3, color: colors.muted, marginTop: u * 0.5 }}>{n.text}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
