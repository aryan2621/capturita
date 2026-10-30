import { useBeatPulse, useBeatSnap } from './beat';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, useExit } from './SceneBase';
import { bodyFont, displayFont, type Brand } from './assets';

export type KineticStyle = 'punch' | 'stack' | 'slot' | 'sweep';

export interface KineticStatementProps {
    lines: { text: string }[];
    /** Words drawn in the accent colour, comma separated; matched ignoring case and punctuation. */
    emphasis: string;
    style: KineticStyle;
    transparent?: boolean;
    brand: Brand;
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const bare = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Seconds until the first emphasised word lands (else the last word), for a sound on it. Same timing as the render. */
export function kineticBeat({ lines, emphasis, style }: { lines?: { text?: string }[]; emphasis?: string; style?: string }) {
    const rows = (Array.isArray(lines) ? lines : []).map((line) => String(line?.text ?? '').trim()).filter(Boolean).slice(0, 4);
    const accents = new Set(String(emphasis ?? '').split(',').map(bare).filter(Boolean));
    let at = 0;
    let last = 4;
    for (const [line, row] of rows.entries()) {
        for (const [w, word] of row.split(/\s+/).entries()) {
            const start = style === 'stack' ? 4 + line * 12 + w * 2 : 4 + at++ * 4;
            if (accents.has(bare(word))) return (start + 8) / 30;
            last = start;
        }
    }
    return (last + 8) / 30;
}

/**
 * One to four short lines, animated word by word: punched in, stacked up line by line, rolled in
 * like a slot machine, or with a highlight swept behind the accent words.
 */
export function KineticStatement({ lines, emphasis, style, transparent, brand }: KineticStatementProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const unit = Math.min(width, height) / 100;
    const { colors } = brand;
    const kind: KineticStyle = ['punch', 'stack', 'slot', 'sweep'].includes(style) ? style : 'punch';

    const rows = (Array.isArray(lines) ? lines : []).map((line) => String(line?.text ?? '').trim()).filter(Boolean).slice(0, 4);
    const accentWords = new Set(emphasis.split(',').map(bare).filter(Boolean));
    // Fit the longest line across ~86% of the width (display faces run ~0.55em a character), capped so short lines don't get huge.
    // Portrait frames let lines wrap, so they're sized for about half a line (or the longest word).
    const portrait = height > width * 1.05;
    const longest = Math.max(1, ...rows.map((row) => row.length));
    const longestWord = Math.max(1, ...rows.flatMap((row) => row.split(/\s+/).map((word) => word.length)));
    const fitChars = portrait ? Math.max(longestWord, Math.ceil(longest / 2)) : longest;
    const rowCount = portrait ? rows.reduce((n, row) => n + Math.ceil(row.length / fitChars), 0) : rows.length;
    const fontSize = Math.min(unit * (portrait ? 16 : rows.length > 2 ? 10 : 12.5), (width * 0.86) / (fitChars * 0.56), (height * 0.7) / (rowCount * 1.15));

    const exit = useExit();
    const exitLift = (1 - exit) * -unit * 2;

    const snap = useBeatSnap();
    const pulse = useBeatPulse(0.2);
    let index = 0;
    return (
        <AbsoluteFill
            style={{
                background: transparent ? 'transparent' : `linear-gradient(160deg, ${colors.bg} 0%, ${colors.surface} 140%)`,
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: bodyFont(brand),
                lineHeight: 1.2,
                opacity: exit,
            }}
        >
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fontSize * 0.08, transform: `translateY(${exitLift}px)` }}>
                {rows.map((row, line) => (
                    <div key={line} style={{ display: 'flex', flexWrap: portrait ? 'wrap' : 'nowrap', maxWidth: width * 0.9, justifyContent: 'center', columnGap: fontSize * 0.26, rowGap: fontSize * 0.08 }}>
                        {row.split(/\s+/).map((word, w) => {
                            const at = index++;
                            // Stack builds line by line; the others run word by word across all lines.
                            const accent = accentWords.has(bare(word));
                            const usual = kind === 'stack' ? 4 + line * 12 + w * 2 : 4 + at * 4;
                            // Only accent words lock to the music: they land on a beat and pulse on the ones after.
                            const start = accent ? snap(usual / fps) * fps : usual;
                            const word_ = <Word key={w} word={word} accent={accent} kind={kind} frame={frame - start} fps={fps} fontSize={fontSize} brand={brand} />;
                            return accent ? <span key={w} style={{ display: 'inline-block', transform: `scale(${1 + pulse * 0.04})` }}>{word_}</span> : word_;
                        })}
                    </div>
                ))}
            </div>
            </Depth>
        </AbsoluteFill>
    );
}

function Word({ word, accent, kind, frame, fps, fontSize, brand }: { word: string; accent: boolean; kind: KineticStyle; frame: number; fps: number; fontSize: number; brand: Brand }) {
    const { colors } = brand;
    const text = { fontFamily: displayFont(brand), fontSize, fontWeight: 800, lineHeight: 1.1, letterSpacing: -fontSize * 0.02, whiteSpace: 'pre' as const };
    const color = accent && kind !== 'sweep' ? colors.accent : colors.text;

    if (kind === 'punch') {
        const p = spring({ frame, fps, config: { damping: 13, stiffness: 180 } });
        const opacity = interpolate(frame, [0, 4], [0, 1], clamp);
        return <span style={{ ...text, color, display: 'inline-block', opacity, transform: `scale(${1.7 - p * 0.7})`, filter: `blur(${Math.max(0, 1 - p) * fontSize * 0.06}px)` }}>{word}</span>;
    }
    if (kind === 'stack' || kind === 'slot') {
        const p = spring({ frame, fps, config: kind === 'slot' ? { damping: 11, stiffness: 150 } : { damping: 200 } });
        const from = kind === 'slot' ? -110 : 110;
        return (
            // The mask that words rise (stack) or roll (slot) into.
            <span style={{ display: 'inline-block', overflow: 'hidden', padding: `${fontSize * 0.04}px 0 ${fontSize * 0.1}px` }}>
                <span style={{ ...text, color, display: 'inline-block', transform: `translateY(${(1 - p) * from}%)` }}>{word}</span>
            </span>
        );
    }
    // Sweep: words fade up; accent words get a highlight swept in behind them, turning the text to the background colour.
    const p = spring({ frame, fps, config: { damping: 200 } });
    const sweep = accent ? interpolate(frame, [6, 16], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) }) : 0;
    return (
        <span style={{ position: 'relative', display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * fontSize * 0.25}px)` }}>
            {accent && (
                <span
                    style={{
                        position: 'absolute',
                        left: -fontSize * 0.08,
                        right: -fontSize * 0.08,
                        top: fontSize * 0.08,
                        bottom: fontSize * 0.02,
                        background: colors.accent,
                        borderRadius: fontSize * 0.08,
                        transform: `scaleX(${sweep})`,
                        transformOrigin: 'left center',
                    }}
                />
            )}
            <span style={{ ...text, position: 'relative', color: sweep > 0.5 ? colors.bg : colors.text }}>{word}</span>
        </span>
    );
}
