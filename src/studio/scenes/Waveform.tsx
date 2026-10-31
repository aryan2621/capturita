import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { al } from './launch/shapes';
import { Heading, SMOOTH, Stage, easeOut, useScene, type Scene } from './proofParts';
import { assetUrl, type Brand, type SceneAssets } from './assets';

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
    return props.audio ? <WithAudio {...props} /> : <WaveformView {...props} heard={null} />;
}

/** Neighbour average, so one noisy bin never spikes a lone bar. */
const smoothed = (v: number[]) => v.map((x, i) => (v[i - 1] ?? x) * 0.25 + x * 0.5 + (v[i + 1] ?? x) * 0.25);

function WithAudio(props: WaveformProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const data = useAudioData(assetUrl(props.assets, props.audio));
    // Low bins carry most energy; a square root evens the bars out.
    const at = frame + Math.round((Number(props.from) || 0) * fps);
    const heard = data ? smoothed(visualizeAudio({ fps, frame: at, audioData: data, numberOfSamples: 64, smoothing: true }).slice(0, BARS).map((v) => Math.min(1, Math.sqrt(v) * 1.6))) : null;
    return <WaveformView {...props} heard={heard} />;
}

/** Bars rise from the middle outward as the scene opens. */
const entrance = (s: Scene, i: number, n: number) => easeOut(s.ramp(0.04 + (Math.abs(i - n / 2) / n) * 0.5, 0.3 + (Math.abs(i - n / 2) / n) * 0.5));

function Bars({ s, values, mirror }: { s: Scene; values: number[]; mirror: boolean }) {
    const { u, c } = s;
    const barW = Math.min(s.innerW / values.length, u * 3);
    const maxH = Math.min(s.height * 0.32, u * 30);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: mirror ? 'center' : 'flex-end', gap: barW * 0.35, height: maxH }}>
                {values.map((v, i) => {
                    const h = Math.max(u * 0.6, v * maxH * entrance(s, i, values.length));
                    return <div key={i} style={{ width: barW * 0.65, height: h, borderRadius: barW, background: `linear-gradient(0deg, ${c.accent}, ${i % 6 === 0 ? c.text : al(c.accent, 0.75)})`, boxShadow: `0 0 ${u * (0.6 + 1.6 * v)}px ${al(c.accent, 0.3 + 0.4 * v)}` }} />;
                })}
            </div>
            {!mirror && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: barW * 0.35, height: maxH * 0.3, opacity: 0.22, maskImage: 'linear-gradient(180deg, #000, transparent)', WebkitMaskImage: 'linear-gradient(180deg, #000, transparent)' }}>
                    {values.map((v, i) => <div key={i} style={{ width: barW * 0.65, height: Math.max(u * 0.4, v * maxH * 0.3 * entrance(s, i, values.length)), borderRadius: barW, background: c.accent }} />)}
                </div>
            )}
        </div>
    );
}

function Ring({ s, values }: { s: Scene; values: number[] }) {
    const { u, c } = s;
    const r = Math.min(s.width, s.height) * 0.2;
    const box = r * 2 + u * 24;
    const turn = s.seconds * 6;
    return (
        <svg width={box} height={box} viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`} style={{ overflow: 'visible' }}>
            <circle r={r * 0.92} fill={c.surface} stroke={al(c.accent, 0.5)} strokeWidth={u * 0.3} style={{ filter: `drop-shadow(0 0 ${u * 3}px ${al(c.accent, 0.5)})` }} />
            <g transform={`rotate(${turn})`}>
                {values.map((v, i) => {
                    const a = (i / values.length) * Math.PI * 2 - Math.PI / 2;
                    const len = u * (1 + v * 11) * entrance(s, i, values.length);
                    return <line key={i} x1={Math.cos(a) * r} y1={Math.sin(a) * r} x2={Math.cos(a) * (r + len)} y2={Math.sin(a) * (r + len)} stroke={i % 6 === 0 ? c.text : c.accent} strokeWidth={u * 0.9} strokeLinecap='round' />;
                })}
            </g>
        </svg>
    );
}

function WaveformView({ look, title, subtitle, transparent, brand, heard }: WaveformProps & { heard: number[] | null }) {
    const s = useScene(brand, false);
    const { u, t, c } = s;
    // A quiet ripple stands in until there's audio.
    const values = heard ?? Array.from({ length: BARS }, (_, i) => 0.18 + 0.12 * Math.sin(s.frame / 7 - i / 2.5) * Math.sin(i / 7 + 1));
    const energy = values.reduce((sum, v) => sum + v, 0) / values.length;
    const text = s.pop(0.12, SMOOTH);
    return (
        <Stage s={s} transparent={transparent} gap={t * 4} at={[50, 40]}>
            <div style={{ position: 'absolute', left: '50%', top: '40%', width: s.width * 0.6, height: s.width * 0.6, marginLeft: -s.width * 0.3, marginTop: -s.width * 0.3, borderRadius: '50%', background: `radial-gradient(closest-side, ${al(c.accent, 0.3)}, transparent)`, transform: `scale(${0.8 + energy * 0.9})` }} />
            {look === 'circle' ? <Ring s={s} values={values} /> : <Bars s={s} values={values} mirror={look === 'mirror'} />}
            {(title || subtitle) && (
                <div style={{ textAlign: 'center' }}>
                    <Heading s={s} text={title} rule={false} />
                    {subtitle && <div style={{ color: c.muted, fontSize: t * 3, fontWeight: 500, lineHeight: 1.3, marginTop: title ? -t * 1.5 : 0, opacity: Math.min(1, text * 1.5), transform: `translateY(${(1 - text) * u * 3}px)` }}>{subtitle}</div>}
                </div>
            )}
        </Stage>
    );
}
