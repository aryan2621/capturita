// What the two kinetic type scenes share: emphasis parsing, the word style, the mask words rise through, and the frame with its glow and closing rule.
import type { CSSProperties, ReactNode } from 'react';
import { Aura, Rule, Stage, al, hitFlash, shortSide, type Kit } from './hero';
import type { LaunchProps } from './launch/kit';

export const bare = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
export const csv = (value: unknown) => String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
/** The words drawn in the accent colour (comma-separated emphasis), matched ignoring case and punctuation. */
export const accentSet = (emphasis: unknown) => new Set(csv(emphasis).map(bare));

/** A word's type: heavy display face, tight leading, accent words with a soft glow (`lit` 0–1). */
export const wordStyle = (k: Kit, fontSize: number, color: string, lit = 0): CSSProperties => ({
    fontFamily: k.display,
    fontSize,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: -fontSize * 0.02,
    whiteSpace: 'pre',
    color,
    textShadow: lit > 0 ? `0 0 ${fontSize * 0.28}px ${al(k.c.accent, lit)}` : undefined,
});

/** The clipped line a word rises (or rolls) through. */
export const Mask = ({ fontSize, children }: { fontSize: number; children: ReactNode }) => (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: `${fontSize * 0.04}px 0 ${fontSize * 0.14}px` }}>{children}</span>
);

/** Stage, accent light that flares on the key word (`hitAt` seconds), the text, and a short rule drawn under it once it has landed. */
export function KineticFrame({ p, k, fontSize, hitAt, rule = true, children }: { p: LaunchProps; k: Kit; fontSize: number; hitAt: number; rule?: boolean; children: ReactNode }) {
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.75} a={0.14 + hitFlash(k, hitAt) * 0.24} scale={k.pop(0, 16)} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fontSize * 0.08 }}>
                {children}
                {rule && <div style={{ marginTop: fontSize * 0.3 }}><Rule k={k} width={14} progress={k.pop(hitAt + 0.1, 14)} /></div>}
            </div>
        </Stage>
    );
}
