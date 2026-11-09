import { useBeatPulse, useBeatSnap } from './beat';
import { KineticFrame, Mask, accentSet, bare, csv, wordStyle } from './kinetic';
import { al, hitFlash, useHero, type Kit } from './hero';
import type { Brand } from './assets';

type KineticStyle = 'punch' | 'stack' | 'slot' | 'sweep';
const STYLES: KineticStyle[] = ['punch', 'stack', 'slot', 'sweep'];

export interface KineticStatementProps {
    lines: { text: string }[];
    /** Words drawn in the accent colour, comma separated; matched ignoring case and punctuation. */
    emphasis: string;
    style: KineticStyle;
    transparent?: boolean;
    brand: Brand;
}

const FIRST = 2; // frames before the first word moves
const WORD_STEP = 3;
const LINE_STEP = 8;
const STACK_WORD_STEP = 2;
/** Frames a word takes to land. */
const LAND = 8;

const rowsOf = (lines: unknown) => (Array.isArray(lines) ? lines : []).map((line) => String(line?.text ?? '').trim()).filter(Boolean).slice(0, 4);
/** Frame a word starts moving: stack builds line by line, the others run word by word across all lines. */
const startFrame = (style: string | undefined, line: number, w: number, at: number) => (style === 'stack' ? FIRST + line * LINE_STEP + w * STACK_WORD_STEP : FIRST + at * WORD_STEP);

/** Seconds until the first emphasised word lands (else the last word), for a sound on it. Same timing as the render. */
export function kineticBeat({ lines, emphasis, style }: { lines?: { text?: string }[]; emphasis?: string; style?: string }) {
    const accents = new Set(csv(emphasis).map(bare));
    let at = 0;
    let last = FIRST;
    for (const [line, row] of rowsOf(lines).entries()) {
        for (const [w, word] of row.split(/\s+/).entries()) {
            const start = startFrame(style, line, w, at++);
            if (accents.has(bare(word))) return (start + LAND) / 30;
            last = start;
        }
    }
    return (last + LAND) / 30;
}

/**
 * One to four short lines, animated word by word: punched in, stacked up line by line, rolled in
 * like a slot machine, or with a highlight swept behind the accent words. Accent words flare as they land.
 */
export function KineticStatement({ lines, emphasis, style, transparent, brand }: KineticStatementProps) {
    const { p, k } = useHero(brand, transparent);
    const snap = useBeatSnap();
    const pulse = useBeatPulse(0.2);
    const kind: KineticStyle = STYLES.includes(style) ? style : 'punch';
    const rows = rowsOf(lines);
    const accents = accentSet(emphasis);

    // Fit the longest line across ~86% of the width (display faces run ~0.55em a character), capped so short lines don't get huge.
    // Portrait frames let lines wrap, so they're sized for about half a line (or the longest word).
    const longest = Math.max(1, ...rows.map((row) => row.length));
    const longestWord = Math.max(1, ...rows.flatMap((row) => row.split(/\s+/).map((word) => word.length)));
    const fitChars = k.portrait ? Math.max(longestWord, Math.ceil(longest / 2)) : longest;
    const rowCount = k.portrait ? rows.reduce((n, row) => n + Math.ceil(row.length / fitChars), 0) : rows.length;
    const fontSize = Math.min(k.u * (k.portrait ? 16 : rows.length > 2 ? 10 : 12.5), (k.width * 0.86) / (fitChars * 0.56), (k.height * 0.7) / (rowCount * 1.15));

    let index = 0;
    return (
        <KineticFrame p={p} k={k} fontSize={fontSize} hitAt={kineticBeat({ lines, emphasis, style: kind })}>
            {rows.map((row, line) => (
                <div key={line} style={{ display: 'flex', flexWrap: k.portrait ? 'wrap' : 'nowrap', maxWidth: k.width * 0.9, justifyContent: 'center', columnGap: fontSize * 0.26, rowGap: fontSize * 0.08 }}>
                    {row.split(/\s+/).map((word, w) => {
                        const accent = accents.has(bare(word));
                        const usual = startFrame(kind, line, w, index++);
                        // Only accent words lock to the music: they land on a beat and pulse on the ones after.
                        const start = (accent ? snap(usual / k.fps) : usual / k.fps);
                        const view = <Word key={w} k={k} word={word} accent={accent} kind={kind} start={start} fontSize={fontSize} />;
                        return accent ? <span key={w} style={{ display: 'inline-block', transform: `scale(${1 + pulse * 0.04})` }}>{view}</span> : view;
                    })}
                </div>
            ))}
        </KineticFrame>
    );
}

function Word({ k, word, accent, kind, start, fontSize }: { k: Kit; word: string; accent: boolean; kind: KineticStyle; start: number; fontSize: number }) {
    const color = accent && kind !== 'sweep' ? k.c.accent : k.c.text;
    const lit = accent && kind !== 'sweep' ? 0.35 + hitFlash(k, start + LAND / 30) * 0.5 : 0;
    const text = wordStyle(k, fontSize, color, lit);

    if (kind === 'punch') {
        const t = k.pop(start, 11);
        return <span style={{ ...text, display: 'inline-block', opacity: Math.min(1, t * 4), transform: `scale(${1.7 - t * 0.7})`, filter: `blur(${Math.max(0, 1 - t) * fontSize * 0.06}px)` }}>{word}</span>;
    }
    if (kind === 'stack' || kind === 'slot') {
        // Stack rises from below; slot rolls down from above and overshoots.
        const t = k.pop(start, kind === 'slot' ? 10 : 20);
        return <Mask fontSize={fontSize}><span style={{ ...text, display: 'inline-block', transform: `translateY(${(1 - t) * (kind === 'slot' ? -110 : 110)}%)` }}>{word}</span></Mask>;
    }
    // Sweep: words fade up; accent words get a highlight swept in behind them, turning the text to the background colour.
    const t = k.pop(start, 18);
    const sweep = accent ? Math.min(1, k.pop(start + 0.2, 20)) : 0;
    return (
        <span style={{ position: 'relative', display: 'inline-block', opacity: Math.min(1, t * 2), transform: `translateY(${(1 - t) * fontSize * 0.25}px)` }}>
            {accent && <span style={{ position: 'absolute', left: -fontSize * 0.08, right: -fontSize * 0.08, top: fontSize * 0.08, bottom: fontSize * 0.02, background: k.c.accent, borderRadius: fontSize * 0.08, transform: `scaleX(${sweep})`, transformOrigin: 'left center', boxShadow: `0 0 ${fontSize * 0.35}px ${al(k.c.accent, 0.5)}` }} />}
            <span style={{ ...text, position: 'relative', color: sweep > 0.5 ? k.c.bg : k.c.text }}>{word}</span>
        </span>
    );
}
