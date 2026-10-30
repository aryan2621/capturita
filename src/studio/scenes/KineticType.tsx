import { useBeatSnap } from './beat';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, clamp, sceneGradient, useExit } from './SceneBase';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand } from './assets';

export type KineticTypeMode = 'mask-slide' | 'scale-slam' | 'split-letters' | 'word-swap' | 'marquee';
const MODES: KineticTypeMode[] = ['mask-slide', 'scale-slam', 'split-letters', 'word-swap', 'marquee'];

export interface KineticTypeProps {
    /** Short lines, one per row. In word-swap the first line is the lead-in the swapped words follow. */
    text: string;
    /** Words drawn in the accent colour, comma separated; matched ignoring case and punctuation. */
    emphasis: string;
    mode: KineticTypeMode;
    /** word-swap: the words that take turns after the lead-in, comma separated. */
    swaps: string;
    transparent?: boolean;
    brand: Brand;
}

const bare = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const list = (value: unknown) => String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const FPS = 30;
const WORD_STAGGER = 3.3; // 110 ms
const SWAP_FRAMES = 30;

/** Seconds until the first emphasised word lands (else the last), for a sound on it. */
export function kineticTypeBeat({ text, emphasis, mode }: { text?: string; emphasis?: string; mode?: string }) {
    const words = String(text ?? '').split(/\s+/).filter(Boolean);
    const accents = new Set(list(emphasis).map(bare));
    const stagger = mode === 'mask-slide' ? 1.65 : WORD_STAGGER;
    const at = Math.max(0, words.findIndex((w) => accents.has(bare(w))));
    return (4 + (mode === 'word-swap' || mode === 'marquee' ? 0 : (at < 0 ? words.length - 1 : at) * stagger) + 10) / FPS;
}

/**
 * Text-only hero type. Words enter from one direction only, with a small drift and ease-out
 * (closed-form springs, no bounce): masked rise, scale slam, letter-by-letter, swapped words, or a marquee.
 */
export function KineticType({ text, emphasis, mode, swaps, transparent, brand }: KineticTypeProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const unit = Math.min(width, height) / 100;
    const { colors } = brand;
    const kind: KineticTypeMode = MODES.includes(mode) ? mode : 'mask-slide';
    const rows = String(text ?? '').split('\n').map((r) => r.trim()).filter(Boolean).slice(0, 4);
    const accents = new Set(list(emphasis).map(bare));
    const exit = useExit();

    const swapWords = kind === 'word-swap' ? list(swaps).slice(0, 6) : [];
    const widest = swapWords.reduce((a, b) => (b.length > a.length ? b : a), '');
    // Size on the longest line (for word-swap, the lead-in plus the widest swap word).
    const sizeText = kind === 'word-swap' ? `${rows[0] ?? ''} ${widest}` : kind === 'marquee' ? 'wide' : rows.join('\n');
    const portrait = height > width * 1.05;
    const fontSize = Math.min(
        unit * (portrait ? 14 : rows.length > 2 ? 10 : 13),
        fitSize(sizeText, width * (portrait && kind !== 'marquee' ? 0.9 : 0.86), brand.fonts.display, 999),
        (height * 0.7) / (Math.max(1, rows.length) * 1.2),
    );
    const type = { fontFamily: displayFont(brand), fontSize, fontWeight: 800, lineHeight: 1.1, letterSpacing: -fontSize * 0.02, whiteSpace: 'pre' as const };
    const colorOf = (word: string) => (accents.has(bare(word)) ? colors.accent : colors.text);
    const drift = unit * 2.4; // ~24-34 px at 1080p

    let content;
    if (kind === 'marquee') {
        content = <Marquee rows={rows} frame={frame} width={width} fontSize={fontSize} type={type} colorOf={colorOf} gap={fontSize * 0.6} />;
    } else if (kind === 'word-swap') {
        const lead = rows[0] ?? '';
        const slot = Math.max(0, Math.floor((frame - 4) / SWAP_FRAMES));
        const index = swapWords.length ? slot % swapWords.length : 0;
        const local = frame - 4 - slot * SWAP_FRAMES;
        // Old word leaves upward, quicker; the new one rises from below.
        const enter = spring({ frame: local, fps, config: { damping: 200 } });
        const leave = interpolate(local, [SWAP_FRAMES - 6, SWAP_FRAMES], [0, 1], clamp);
        const cur = swapWords[index] ?? '';
        content = (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: fontSize * 0.26, flexWrap: 'wrap', justifyContent: 'center', maxWidth: width * 0.9 }}>
                <Words words={lead.split(/\s+/)} start={0} kind="mask-slide" frame={frame} fps={fps} type={type} colorOf={colorOf} drift={drift} fontSize={fontSize} />
                <span style={{ display: 'inline-block', overflow: 'hidden', padding: `${fontSize * 0.04}px 0 ${fontSize * 0.1}px` }}>
                    <span style={{ ...type, display: 'inline-block', color: colors.accent, transform: `translateY(${(1 - enter) * 105 - leave * 105}%)` }}>{cur}</span>
                </span>
            </div>
        );
    } else {
        let at = 0;
        content = rows.map((row, line) => {
            const words = row.split(/\s+/);
            const start = at;
            at += words.length;
            return (
                <div key={line} style={{ display: 'flex', flexWrap: portrait ? 'wrap' : 'nowrap', justifyContent: 'center', maxWidth: width * 0.9, columnGap: fontSize * 0.26, rowGap: fontSize * 0.08 }}>
                    <Words words={words} start={start} kind={kind} frame={frame} fps={fps} type={type} colorOf={colorOf} drift={drift} fontSize={fontSize} />
                </div>
            );
        });
    }

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fontSize * 0.08 }}>{content}</div>
            </Depth>
        </AbsoluteFill>
    );
}

function Words({ words, start, kind, frame, fps, type, colorOf, drift, fontSize }: { words: string[]; start: number; kind: KineticTypeMode; frame: number; fps: number; type: React.CSSProperties; colorOf: (w: string) => string; drift: number; fontSize: number }) {
    const snap = useBeatSnap();
    const onBeat = (f: number) => snap(f / fps) * fps; // entrance frame moved onto a nearby beat
    return (
        <>
            {words.map((word, w) => {
                const index = start + w;
                const color = colorOf(word);
                if (kind === 'scale-slam') {
                    const local = frame - onBeat(4) - index * WORD_STAGGER;
                    const p = spring({ frame: local, fps, config: { damping: 20, stiffness: 170 } });
                    return <span key={w} style={{ ...type, color, display: 'inline-block', opacity: interpolate(local, [0, 4], [0, 1], clamp), transform: `scale(${1.22 - p * 0.22})` }}>{word}</span>;
                }
                if (kind === 'split-letters') {
                    return (
                        <span key={w} style={{ display: 'inline-flex' }}>
                            {[...word].map((ch, c) => {
                                const local = frame - onBeat(4) - (start * 4 + w * 2 + c) * 1.2;
                                const p = spring({ frame: local, fps, config: { damping: 200 } });
                                return <span key={c} style={{ ...type, color, display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * drift}px)` }}>{ch}</span>;
                            })}
                        </span>
                    );
                }
                // mask-slide: rise from 105% inside an overflow-hidden line, 55 ms a word.
                const local = frame - onBeat(4) - index * 1.65;
                const p = spring({ frame: local, fps, config: { damping: 200 } });
                return (
                    <span key={w} style={{ display: 'inline-block', overflow: 'hidden', padding: `${fontSize * 0.04}px 0 ${fontSize * 0.1}px` }}>
                        <span style={{ ...type, color, display: 'inline-block', transform: `translateY(${(1 - p) * 105}%) rotate(${(1 - p) * 2}deg)`, transformOrigin: 'left bottom' }}>{word}</span>
                    </span>
                );
            })}
        </>
    );
}

/** Each line scrolls sideways forever, alternate lines the other way; lines are repeated to fill the width. */
function Marquee({ rows, frame, width, fontSize, type, colorOf, gap }: { rows: string[]; frame: number; width: number; fontSize: number; type: React.CSSProperties; colorOf: (w: string) => string; gap: number }) {
    return (
        <>
            {rows.map((row, line) => {
                const words = row.split(/\s+/);
                const unitWidth = row.length * fontSize * 0.56 + words.length * gap * 0.4 + gap;
                const copies = Math.ceil((width * 2) / unitWidth) + 1;
                const offset = ((frame * fontSize * 0.09) % unitWidth) * (line % 2 ? 1 : -1) - (line % 2 ? unitWidth : 0);
                return (
                    <div key={line} style={{ width, overflow: 'hidden', whiteSpace: 'pre' }}>
                        <div style={{ display: 'inline-flex', gap, transform: `translateX(${offset}px)` }}>
                            {Array.from({ length: copies }, (_, i) => (
                                <span key={i} style={{ display: 'inline-flex', gap: fontSize * 0.26 }}>
                                    {words.map((word, w) => <span key={w} style={{ ...type, color: colorOf(word) }}>{word}</span>)}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
}
