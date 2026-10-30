import { grow } from './layout';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export interface CountdownProps {
    label: string;
    /** Where the clock starts; it counts down one second per second. */
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    /** A line under the clock, e.g. the launch date. */
    note: string;
    transparent?: boolean;
    brand: Brand;
}

/** Seconds until the boxes have landed, for a sound. */
export const COUNTDOWN_BEAT = 0.9;

/** A launch clock: days, hours, minutes and seconds in boxes, the seconds ticking down. */
export function Countdown({ label, days, hours, minutes, seconds, note, transparent, brand }: CountdownProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const u = (Math.min(width, height) / 100) * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const start = Math.max(0, (Number(days) || 0) * 86400 + (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0));
    const left = Math.max(0, start - Math.floor(frame / fps));
    const parts = [
        ['Days', Math.floor(left / 86400)],
        ['Hours', Math.floor((left % 86400) / 3600)],
        ['Minutes', Math.floor((left % 3600) / 60)],
        ['Seconds', left % 60],
    ] as const;
    const labelIn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
    const noteIn = spring({ frame: frame - 14 - COUNTDOWN_BEAT * fps, fps, config: { damping: 200 } });
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 4 }}>
                    <div style={{ fontFamily: displayFont(brand), fontSize: u * 5, fontWeight: 800, color: colors.text, opacity: labelIn, textAlign: 'center' }}>{label}</div>
                    <div style={{ display: 'flex', gap: u * 2.4 }}>
                        {parts.map(([name, value], i) => {
                            const p = spring({ frame: frame - 6 - i * 4, fps, config: { damping: 16, stiffness: 150 } });
                            return (
                                <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 1, opacity: Math.min(1, p), transform: `translateY(${(1 - Math.min(1, p)) * u * 3}px)` }}>
                                    <div style={{ width: u * 17, padding: `${u * 2}px 0`, borderRadius: u * 1.6, background: colors.surface, border: `${u * 0.2}px solid ${colors.muted}44`, textAlign: 'center', fontFamily: displayFont(brand), fontWeight: 800, fontSize: u * 10, color: i === 3 ? colors.accent : colors.text, fontVariantNumeric: 'tabular-nums' }}>{String(value).padStart(2, '0')}</div>
                                    <div style={{ fontSize: u * 2, color: colors.muted, textTransform: 'uppercase', letterSpacing: u * 0.2 }}>{name}</div>
                                </div>
                            );
                        })}
                    </div>
                    {note && <div style={{ fontSize: u * 3.2, color: colors.muted, opacity: noteIn }}>{note}</div>}
                </div>
            </Depth>
        </AbsoluteFill>
    );
}
