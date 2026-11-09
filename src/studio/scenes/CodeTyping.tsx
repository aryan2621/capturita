import { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { useVideoConfig } from './clock';
import { fontStack, useFontsReady } from './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { Landing, Lights, Sweep, useTiming } from './deviceParts';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface CodeTypingProps {
    heading: string;
    fileName: string;
    code: string;
    speed: number;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const KEYWORDS = new Set(
    'const let var function return if else for while import from export default class new await async try catch throw def print fn pub use mut struct impl match type interface extends public private static void int string bool true false null None True False self this'.split(' ')
);

type Token = { text: string; kind: 'plain' | 'keyword' | 'string' | 'number' | 'comment' | 'fn' };

/** Splits code into coloured runs: comments, strings, numbers, keywords and function names. Enough for a title card, not a full highlighter. */
function tokenize(code: string): Token[] {
    const out: Token[] = [];
    const re = /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+|[^\sA-Za-z_$\d"'`#/]+|\/)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) {
        if (m[1]) out.push({ text: m[1], kind: 'comment' });
        else if (m[2]) out.push({ text: m[2], kind: 'string' });
        else if (m[3]) out.push({ text: m[3], kind: 'number' });
        else if (m[4]) out.push({ text: m[4], kind: KEYWORDS.has(m[4]) ? 'keyword' : code[re.lastIndex] === '(' ? 'fn' : 'plain' });
        else out.push({ text: m[0], kind: 'plain' });
    }
    return out;
}

/** The code's first frame: the window has landed by then. */
const TYPE_FROM = 10;

/** The window is always dark, so its text doesn't follow the brand's (possibly inverted) text colour. */
const INK = { plain: '#e6e8f0', string: '#9ece6a', number: '#ff9e64', comment: '#7a819c', fn: '#7dcfff', bar: '#171a23', body: '#0f1117', faint: '#c0c4d6' };

/** An editor window where code types itself out, with line numbers, a live cursor position, a blinking caret and simple syntax colours. */
export function CodeTyping({ heading, fileName, code, speed, transparent, brand }: CodeTypingProps) {
    const { frame, fps, glide, ramp } = useTiming();
    const { width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const { unit: u, text: t } = layout;
    const { colors } = brand;
    const exit = useExit();
    useFontsReady(['mono', 'geist-mono']);
    const source = code.replace(/\t/g, '    ');
    const lines = source.split('\n');
    const tokens = useMemo(() => tokenize(source), [source]);
    const longest = Math.max(20, ...lines.map((l) => l.length));
    const innerW = width - layout.safeX * 2;
    const headH = heading ? t * 10 : 0;
    const winW = Math.min(innerW, t * 140);
    const chrome = u * 4.6 + u * 3.6; // title bar and status bar
    const bodyH = height - layout.safeY * 2 - headH - u * 6 - chrome;
    const gutterCh = String(lines.length).length + 1.4;
    // Mono glyphs are about 0.6 em wide: fit the longest line and every line.
    const fontSize = Math.min(t * 3.4, (winW - u * 8) / ((longest + gutterCh) * 0.6), bodyH / (lines.length * 1.5));
    const lineH = fontSize * 1.5;
    const perSecond = Math.max(5, Number(speed) || 40);
    const typed = Math.max(0, Math.floor(((frame - TYPE_FROM) / fps) * perSecond));
    const done = typed >= source.length;
    const doneAt = TYPE_FROM + Math.ceil((source.length / perSecond) * fps);
    const seen = source.slice(0, typed).split('\n');
    const [row, col] = [seen.length - 1, seen[seen.length - 1].length];
    const palette: Record<Token['kind'], string> = { ...INK, keyword: colors.accent };
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6);
    const mono = fontStack(brand.fonts.body === 'geist-mono' ? 'geist-mono' : 'mono');

    let left = typed;
    const runs = tokens.flatMap((token, i) => {
        if (left <= 0) return [];
        const text = token.text.slice(0, left);
        left -= token.text.length;
        return [
            <span key={i} style={{ color: palette[token.kind], fontStyle: token.kind === 'comment' ? 'italic' : 'normal' }}>
                {text}
            </span>,
        ];
    });
    const caretOn = !done || Math.floor(frame / 12) % 2 === 0;
    const status = { fontFamily: fontStack('mono'), fontSize: u * 1.5, lineHeight: 1.2, color: INK.faint };

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} transparent={transparent} /></Depth>
            <Depth z={1} style={{ alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
                {heading && <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * 3, opacity: glide(0), transform: `translateY(${(1 - glide(0)) * u * 3}px)` }}>{heading}</div>}
                <Landing brand={brand} u={u} outerH={lineH * lines.length + chrome}>
                    <div style={{ position: 'relative', width: winW, borderRadius: u * 1.8, overflow: 'hidden', background: INK.body, border: `1px solid ${colors.muted}33`, boxShadow: `0 ${u * 4}px ${u * 10}px rgba(0,0,0,0.5), 0 0 ${u * 8 * ramp(doneAt, doneAt + 14)}px ${colors.accent}44` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: u * 2, height: u * 4.6, padding: `0 ${u * 1.8}px`, background: INK.bar }}>
                            <Lights size={u * 1.1} />
                            {fileName && (
                                <span style={{ ...status, fontSize: u * 1.8, padding: `${u * 0.7}px ${u * 1.6}px`, borderRadius: `${u * 0.8}px ${u * 0.8}px 0 0`, background: INK.body, boxShadow: `inset 0 ${-u * 0.25}px 0 ${colors.accent}`, alignSelf: 'flex-end' }}>{fileName}</span>
                            )}
                        </div>
                        <div style={{ position: 'relative', display: 'flex', padding: `${u * 2.4}px ${u * 3}px`, fontFamily: mono, fontSize, lineHeight: 1.5 }}>
                            <div style={{ position: 'absolute', left: 0, right: 0, top: u * 2.4 + row * lineH, height: lineH, background: `${colors.accent}14`, boxShadow: `inset ${u * 0.3}px 0 0 ${colors.accent}` }} />
                            <pre style={{ position: 'relative', margin: 0, width: `${gutterCh}ch`, flex: 'none', textAlign: 'left', color: INK.comment, font: 'inherit' }}>{lines.map((_, i) => i + 1).join('\n')}</pre>
                            <pre style={{ position: 'relative', margin: 0, font: 'inherit', whiteSpace: 'pre', minHeight: lineH * lines.length }}>
                                {runs}
                                <span style={{ display: 'inline-block', width: fontSize * 0.55, height: fontSize * 1.15, marginBottom: -fontSize * 0.2, background: colors.accent, boxShadow: `0 0 ${fontSize * 0.8}px ${colors.accent}`, opacity: caretOn ? 1 : 0 }} />
                            </pre>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: u * 3.6, padding: `0 ${u * 1.8}px`, background: INK.bar, borderTop: '1px solid #ffffff10' }}>
                            <span style={status}>Ln {row + 1}, Col {col + 1}</span>
                            <span style={{ ...status, color: done ? colors.accent : INK.comment }}>{done ? '● Saved' : 'Typing…'}</span>
                        </div>
                        <Sweep t={ramp(doneAt, doneAt + 18, (x) => x)} strength={0.1} />
                    </div>
                </Landing>
            </Depth>
        </AbsoluteFill>
    );
}
