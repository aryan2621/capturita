import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface WaveformProps {
    audio: string;
    /** Seconds into the file where the scene starts. */
    from: number;
    look: 'bars' | 'mirror' | 'circle';
    title: string;
    subtitle: string;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const BARS = 48;

/** Bars that move with an audio file (a podcast clip, a voice note, a song), under a title. Silent itself: put the same file on an audio lane to hear it. */
export function Waveform(props: WaveformProps) {
    return props.audio ? <WithAudio {...props} /> : <WaveformView {...props} values={null} />;
}

function WithAudio(props: WaveformProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const data = useAudioData(assetUrl(props.assets, props.audio));
    // Low bins carry most energy; a square root evens the bars out.
    const at = frame + Math.round((Number(props.from) || 0) * fps);
    const values = data ? visualizeAudio({ fps, frame: at, audioData: data, numberOfSamples: 64, smoothing: true }).slice(0, BARS).map((v) => Math.min(1, Math.sqrt(v) * 1.6)) : null;
    return <WaveformView {...props} values={values} />;
}

function WaveformView({ look, title, subtitle, transparent, brand, values: heard }: WaveformProps & { values: number[] | null }) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit;
    const t = layout.text;
    const { colors } = brand;
    const exit = useExit();
    // A quiet ripple stands in until there's audio.
    const values = heard ?? Array.from({ length: BARS }, (_, i) => 0.15 + 0.1 * Math.sin(frame / 6 + i / 3));
    const innerW = width - layout.safeX * 2;
    const titleIn = spring({ frame, fps, config: { damping: 200 } });
    const grow = spring({ frame: frame - 6, fps, config: { damping: 200 } });
    const titleSize = fitSize(title, innerW, brand.fonts.display, t * 6);

    const bars = () => {
        if (look === 'circle') {
            const r = Math.min(width, height) * 0.2;
            const box = r * 2 + u * 24;
            return (
                <svg width={box} height={box} viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}>
                    <circle r={r * 0.92} fill={colors.surface} />
                    {values.map((v, i) => {
                        const a = (i / values.length) * Math.PI * 2 - Math.PI / 2;
                        const len = u * (1 + v * 11) * grow;
                        return <line key={i} x1={Math.cos(a) * r} y1={Math.sin(a) * r} x2={Math.cos(a) * (r + len)} y2={Math.sin(a) * (r + len)} stroke={colors.accent} strokeWidth={u * 0.9} strokeLinecap='round' />;
                    })}
                </svg>
            );
        }
        const barW = Math.min(innerW / values.length, u * 3);
        const maxH = Math.min(height * 0.32, u * 30);
        const mirror = look === 'mirror';
        return (
            <div style={{ display: 'flex', alignItems: mirror ? 'center' : 'flex-end', gap: barW * 0.35, height: maxH }}>
                {values.map((v, i) => (
                    <div key={i} style={{ width: barW * 0.65, height: Math.max(u * 0.6, v * maxH * grow), borderRadius: barW, background: i % 6 === 0 ? colors.text : colors.accent, opacity: 0.6 + v * 0.4 }} />
                ))}
            </div>
        );
    };

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px`, gap: t * 4, flexDirection: 'column' }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {bars()}
            {(title || subtitle) && (
                <div style={{ textAlign: 'center', opacity: titleIn, transform: `translateY(${(1 - titleIn) * u * 2}px)` }}>
                    {title && <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: titleSize, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>}
                    {subtitle && <div style={{ color: colors.muted, fontSize: t * 3, fontWeight: 500, lineHeight: 1.3, marginTop: u * 1.2 }}>{subtitle}</div>}
                </div>
            )}
        </AbsoluteFill>
    );
}
