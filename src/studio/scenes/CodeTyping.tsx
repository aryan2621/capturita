import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontStack, useFontsReady } from './fonts';
import { BrandTexture, sceneGradient, useExit } from './SceneBase';
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

/** An editor window where code types itself out, with a blinking caret and simple syntax colours. */
export function CodeTyping({ heading, fileName, code, speed, transparent, brand }: CodeTypingProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit;
    const t = layout.text;
    const { colors } = brand;
    const exit = useExit();
    useFontsReady(['mono', 'geist-mono']);
    const source = code.replace(/\t/g, '    ');
    const lines = source.split('\n');
    const longest = Math.max(20, ...lines.map((l) => l.length));
    const innerW = width - layout.safeX * 2;
    const headH = heading ? t * 10 : 0;
    const winW = Math.min(innerW, t * 140);
    const bodyH = height - layout.safeY * 2 - headH - u * 6;
    // Mono glyphs are about 0.6 em wide: fit the longest line and every line.
    const fontSize = Math.min(t * 3.4, (winW - u * 8) / (longest * 0.6), bodyH / (lines.length * 1.5));
    const typed = Math.max(0, Math.floor(((frame - 10) / fps) * Math.max(5, Number(speed) || 40)));
    const open = spring({ frame, fps, config: { damping: 200 } });
    const palette: Record<Token['kind'], string> = { plain: colors.text, keyword: colors.accent, string: '#9ece6a', number: '#ff9e64', comment: colors.muted, fn: '#7dcfff' };
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6);

    let left = typed;
    const runs = tokenize(source).flatMap((token, i) => {
        if (left <= 0) return [];
        const text = token.text.slice(0, left);
        left -= token.text.length;
        return [
            <span key={i} style={{ color: palette[token.kind], fontStyle: token.kind === 'comment' ? 'italic' : 'normal' }}>
                {text}
            </span>,
        ];
    });
    const done = typed >= source.length;
    const caretOn = !done || Math.floor(frame / 12) % 2 === 0;

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {heading && <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * 3, opacity: open }}>{heading}</div>}
            <div style={{ width: winW, borderRadius: u * 1.8, overflow: 'hidden', background: '#0f1117', border: `1px solid ${colors.muted}33`, boxShadow: `0 ${u * 3}px ${u * 8}px rgba(0,0,0,0.45)`, transform: `translateY(${(1 - open) * u * 4}px) scale(${0.96 + open * 0.04})`, opacity: open }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: u * 0.8, height: u * 4.6, padding: `0 ${u * 1.8}px`, background: '#171a23' }}>
                    {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                        <span key={c} style={{ width: u * 1.1, height: u * 1.1, borderRadius: '50%', background: c }} />
                    ))}
                    {fileName && <span style={{ marginLeft: u * 2, color: '#c0c4d6', fontSize: u * 1.8, lineHeight: 1.2, fontFamily: fontStack('mono') }}>{fileName}</span>}
                </div>
                <pre style={{ margin: 0, padding: `${u * 3}px ${u * 4}px`, fontFamily: fontStack(brand.fonts.body === 'geist-mono' ? 'geist-mono' : 'mono'), fontSize, lineHeight: 1.5, whiteSpace: 'pre', minHeight: fontSize * 1.5 * lines.length }}>
                    {runs}
                    <span style={{ display: 'inline-block', width: fontSize * 0.55, height: fontSize * 1.15, marginBottom: -fontSize * 0.2, background: colors.accent, opacity: caretOn ? 1 : 0 }} />
                </pre>
            </div>
        </AbsoluteFill>
    );
}
