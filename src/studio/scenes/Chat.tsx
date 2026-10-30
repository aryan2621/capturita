import { grow } from './layout';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export interface ChatProps {
    heading: string;
    messages: { from: 'user' | 'bot'; text: string }[];
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the last message has landed, for a sound. */
export const CHAT_BEAT = 3;

/** A conversation: bubbles pop in one after another, the user's on the right, the reply on the left. */
export function Chat({ heading, messages, transparent, brand }: ChatProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const list = (messages ?? []).slice(0, 5);
    const headIn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.25, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: u * 1.6, width: Math.min(width * 0.7, u * 90) }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: u * 4.6, fontWeight: 800, color: colors.text, opacity: headIn, marginBottom: u }}>{heading}</div>
                    {list.map((m, i) => {
                        const at = 10 + (i / Math.max(1, list.length - 1)) * CHAT_BEAT * fps * 0.8;
                        const pop = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 160 } });
                        const mine = m.from === 'user';
                        return (
                            <div
                                key={i}
                                style={{
                                    alignSelf: mine ? 'flex-end' : 'flex-start',
                                    maxWidth: '78%',
                                    padding: `${u * 1.5}px ${u * 2.2}px`,
                                    borderRadius: u * 2.2,
                                    borderBottomRightRadius: mine ? u * 0.6 : u * 2.2,
                                    borderBottomLeftRadius: mine ? u * 2.2 : u * 0.6,
                                    background: mine ? colors.accent : colors.surface,
                                    color: mine ? colors.bg : colors.text,
                                    fontSize: u * 2.9,
                                    fontWeight: 600,
                                    opacity: Math.min(1, pop * 2),
                                    transform: `scale(${0.8 + 0.2 * pop}) translateY(${(1 - pop) * u * 2}px)`,
                                    transformOrigin: mine ? 'bottom right' : 'bottom left',
                                }}
                            >
                                {m.text}
                            </div>
                        );
                    })}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
