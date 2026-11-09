import { useBeatSnap } from './beat';
import { KineticFrame, Mask, accentSet, bare, csv, wordStyle } from './kinetic';
import { al, hitFlash, useHero, type Kit } from './hero';
import { fitSize } from './text';
import type { Brand } from './assets';
import { AUTHORED_FPS as FPS } from './fps';

type KineticTypeMode = 'mask-slide' | 'scale-slam' | 'split-letters' | 'word-swap' | 'marquee';
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

const FIRST = 2; // frames before the first word moves
const LAND = 10; // frames a word takes to land
const SWAP_FRAMES = 24;
/** Frames between one word starting and the next. */
const stagger = (mode?: string) => (mode === 'mask-slide' ? 2 : 3);

/** Seconds until the first emphasised word lands (else the last), for a sound on it. */
export function kineticTypeBeat({ text, emphasis, mode }: { text?: string; emphasis?: string; mode?: string }) {
    const words = String(text ?? '').split(/\s+/).filter(Boolean);
    const accents = new Set(csv(emphasis).map(bare));
    const at = Math.max(0, words.findIndex((w) => accents.has(bare(w))));
    const index = mode === 'word-swap' || mode === 'marquee' ? 0 : at < 0 ? words.length - 1 : at;
    return (FIRST + index * stagger(mode) + LAND) / FPS;
}

/**
 * Text-only hero type: masked rise, scale slam, letter-by-letter, swapped words, or a marquee.
 * Words spring in with a little overshoot; emphasised words glow and flare the light behind the type.
 */
export function KineticType({ text, emphasis, mode, swaps, transparent, brand }: KineticTypeProps) {
    const { p, k } = useHero(brand, transparent);
    const kind: KineticTypeMode = MODES.includes(mode) ? mode : 'mask-slide';
    const rows = String(text ?? '').split('\n').map((r) => r.trim()).filter(Boolean).slice(0, 4);
    const accents = accentSet(emphasis);
    const swapWords = kind === 'word-swap' ? csv(swaps).slice(0, 6) : [];
    const widest = swapWords.reduce((a, b) => (b.length > a.length ? b : a), '');
    // Size on the longest line (for word-swap, the lead-in plus the widest swap word).
    const sizeText = kind === 'word-swap' ? `${rows[0] ?? ''} ${widest}` : kind === 'marquee' ? 'wide' : rows.join('\n');
    const fontSize = Math.min(
        k.u * (k.portrait ? 14 : rows.length > 2 ? 10 : 13),
        fitSize(sizeText, k.width * (k.portrait && kind !== 'marquee' ? 0.9 : 0.86), brand.fonts.display, 999),
        (k.height * 0.7) / (Math.max(1, rows.length) * 1.2),
    );
    const colorOf = (word: string) => (accents.has(bare(word)) ? k.c.accent : k.c.text);
    const common = { k, fontSize, colorOf };

    let content;
    if (kind === 'marquee') {
        content = <Marquee {...common} rows={rows} />;
    } else if (kind === 'word-swap') {
        content = <WordSwap {...common} lead={rows[0] ?? ''} swapWords={swapWords} />;
    } else {
        let at = 0;
        content = rows.map((row, line) => {
            const words = row.split(/\s+/);
            const start = at;
            at += words.length;
            return (
                <div key={line} style={{ display: 'flex', flexWrap: k.portrait ? 'wrap' : 'nowrap', justifyContent: 'center', maxWidth: k.width * 0.9, columnGap: fontSize * 0.26, rowGap: fontSize * 0.08 }}>
                    <Words {...common} words={words} start={start} kind={kind} />
                </div>
            );
        });
    }
    return (
        <KineticFrame p={p} k={k} fontSize={fontSize} hitAt={kineticTypeBeat({ text, emphasis, mode: kind })} rule={kind !== 'marquee'}>
            {content}
        </KineticFrame>
    );
}

interface TypeProps {
    k: Kit;
    fontSize: number;
    colorOf: (word: string) => string;
}

function Words({ k, fontSize, colorOf, words, start, kind }: TypeProps & { words: string[]; start: number; kind: KineticTypeMode }) {
    const snap = useBeatSnap();
    const first = snap(FIRST / FPS); // entrance moved onto a nearby beat
    return (
        <>
            {words.map((word, w) => {
                const index = start + w;
                const color = colorOf(word);
                const accent = color === k.c.accent;
                const glowAt = (seconds: number) => (accent ? 0.3 + hitFlash(k, seconds + LAND / FPS) * 0.5 : 0);
                if (kind === 'scale-slam') {
                    const at = first + (index * stagger(kind)) / FPS;
                    const t = k.pop(at, 11);
                    return <span key={w} style={{ ...wordStyle(k, fontSize, color, glowAt(at)), display: 'inline-block', opacity: Math.min(1, t * 4), transform: `scale(${1.3 - t * 0.3})` }}>{word}</span>;
                }
                if (kind === 'split-letters') {
                    return (
                        <span key={w} style={{ display: 'inline-flex' }}>
                            {[...word].map((ch, c) => {
                                const at = first + ((start * 4 + w * 2 + c) * 0.8) / FPS;
                                const t = k.pop(at, 13);
                                return <span key={c} style={{ ...wordStyle(k, fontSize, color, glowAt(at)), display: 'inline-block', opacity: Math.min(1, t * 2), transform: `translateY(${(1 - t) * k.u * 3}px) scale(${0.8 + 0.2 * t})` }}>{ch}</span>;
                            })}
                        </span>
                    );
                }
                // mask-slide: rise from 110% inside an overflow-hidden line.
                const at = first + (index * stagger(kind)) / FPS;
                const t = k.pop(at, 16);
                return (
                    <Mask key={w} fontSize={fontSize}>
                        <span style={{ ...wordStyle(k, fontSize, color, glowAt(at)), display: 'inline-block', transform: `translateY(${(1 - t) * 110}%) rotate(${(1 - t) * 3}deg)`, transformOrigin: 'left bottom' }}>{word}</span>
                    </Mask>
                );
            })}
        </>
    );
}

/** A fixed lead-in with the swapped words taking turns after it: the old one leaves upward, the new one rises (with overshoot) from below. */
function WordSwap({ k, fontSize, colorOf, lead, swapWords }: TypeProps & { lead: string; swapWords: string[] }) {
    const slot = Math.max(0, Math.floor((k.frame - FIRST) / SWAP_FRAMES));
    const index = swapWords.length ? slot % swapWords.length : 0;
    const local = k.frame - FIRST - slot * SWAP_FRAMES;
    const enter = k.pop((FIRST + slot * SWAP_FRAMES) / FPS, 14);
    const leave = Math.max(0, (local - (SWAP_FRAMES - 6)) / 6);
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: fontSize * 0.26, flexWrap: 'wrap', justifyContent: 'center', maxWidth: k.width * 0.9 }}>
            <Words k={k} fontSize={fontSize} colorOf={colorOf} words={lead.split(/\s+/)} start={0} kind="mask-slide" />
            <Mask fontSize={fontSize}>
                <span style={{ ...wordStyle(k, fontSize, k.c.accent, 0.4), display: 'inline-block', transform: `translateY(${(1 - enter) * 110 - Math.min(1, leave) * 110}%)` }}>{swapWords[index] ?? ''}</span>
            </Mask>
        </div>
    );
}

/** Each line scrolls sideways, alternate lines the other way and the odd ones outlined; lines repeat to fill the width. */
function Marquee({ k, fontSize, colorOf, rows }: TypeProps & { rows: string[] }) {
    const gap = fontSize * 0.6;
    return (
        <>
            {rows.map((row, line) => {
                const words = row.split(/\s+/);
                const unitWidth = row.length * fontSize * 0.56 + words.length * gap * 0.4 + gap;
                const copies = Math.ceil((k.width * 2) / unitWidth) + 1;
                const offset = ((k.frame * fontSize * 0.11) % unitWidth) * (line % 2 ? 1 : -1) - (line % 2 ? unitWidth : 0);
                const outlined = line % 2 === 1;
                const enter = k.pop(line * 0.06, 14);
                return (
                    <div key={line} style={{ width: k.width, overflow: 'hidden', whiteSpace: 'pre', opacity: Math.min(1, enter * 2), transform: `translateY(${(1 - enter) * fontSize * 0.4}px)`, maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}>
                        <div style={{ display: 'inline-flex', gap, transform: `translateX(${offset}px)` }}>
                            {Array.from({ length: copies }, (_, i) => (
                                <span key={i} style={{ display: 'inline-flex', gap: fontSize * 0.26 }}>
                                    {words.map((word, w) => {
                                        const color = colorOf(word);
                                        const accent = color === k.c.accent;
                                        const style = wordStyle(k, fontSize, outlined && !accent ? 'transparent' : color, accent ? 0.35 : 0);
                                        return <span key={w} style={outlined && !accent ? { ...style, WebkitTextStroke: `${Math.max(1.5, fontSize * 0.016)}px ${al(k.c.text, 0.55)}` } : style}>{word}</span>;
                                    })}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
}
