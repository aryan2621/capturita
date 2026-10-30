import { evolvePath } from '@remotion/paths';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

type Mark = 'yes' | 'no' | 'partial';

export interface ComparisonProps {
    heading: string;
    us: string;
    them: string;
    rows: { feature: string; us: Mark; them: Mark }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const PATHS: Record<Mark, string> = { yes: 'M 4 12.5 L 9.5 18 L 20 6', no: 'M 6 6 L 18 18 M 18 6 L 6 18', partial: 'M 5 12 L 19 12' };

/** A tick, cross or dash that draws itself. */
function MarkIcon({ mark, progress, size, color }: { mark: Mark; progress: number; size: number; color: string }) {
    const d = PATHS[mark] ?? PATHS.no;
    // Each stroke of the cross draws in turn.
    const parts = d.split(/(?=M)/);
    return (
        <svg width={size} height={size} viewBox='0 0 24 24'>
            {parts.map((part, i) => {
                const p = interpolate(progress, [i / parts.length, (i + 1) / parts.length], [0, 1], clamp);
                const evolved = evolvePath(p, part.trim());
                return <path key={i} d={part} fill='none' stroke={color} strokeWidth={2.8} strokeLinecap='round' strokeLinejoin='round' strokeDasharray={evolved.strokeDasharray} strokeDashoffset={evolved.strokeDashoffset} />;
            })}
        </svg>
    );
}

/** Us vs them: a table whose rows slide in while ticks and crosses draw; our column is highlighted. */
export function Comparison({ heading, us, them, rows, transparent, brand }: ComparisonProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit * grow(width, height);
    const t = layout.text * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const list = (Array.isArray(rows) ? rows : []).filter((r) => r?.feature?.trim()).slice(0, 6);
    const innerW = Math.min(width - layout.safeX * 2, t * 130);
    const colW = Math.min(t * 18, innerW * 0.22);
    const headH = heading ? t * 10 : 0;
    const rowH = Math.min(t * 9, (height - layout.safeY * 2 - headH - t * 8) / Math.max(1, list.length));
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    // Once the rows have landed, our column glows up one time.
    const glow = spring({ frame: frame - 18 - list.length * 5, fps, config: { damping: 14, stiffness: 120 } });
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6);
    const color = (mark: Mark, ours: boolean) => (mark === 'yes' ? (ours ? colors.accent : colors.text) : mark === 'partial' ? colors.muted : `${colors.muted}aa`);

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {heading && <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', marginBottom: t * 3, opacity: headIn }}>{heading}</div>}
            <div style={{ position: 'relative', width: innerW }}>
                {/* Our column's highlight, behind the rows. */}
                <div style={{ position: 'absolute', right: colW, top: -u, bottom: -u, width: colW, borderRadius: u * 2, background: `${colors.accent}22`, border: `1px solid ${colors.accent}66`, opacity: headIn, boxShadow: `0 0 ${u * 5 * glow}px ${colors.accent}55` }} />
                <div style={{ display: 'flex', height: t * 7, alignItems: 'center', opacity: headIn }}>
                    <div style={{ flex: 1 }} />
                    <div style={{ width: colW, textAlign: 'center', color: colors.accent, fontSize: t * 3, fontWeight: 800, lineHeight: 1.2 }}>{us}</div>
                    <div style={{ width: colW, textAlign: 'center', color: colors.muted, fontSize: t * 2.8, fontWeight: 600, lineHeight: 1.2 }}>{them}</div>
                </div>
                {list.map((row, i) => {
                    const slide = spring({ frame: frame - 10 - i * 5, fps, config: { damping: 200 } });
                    const draw = interpolate(frame, [16 + i * 5, 30 + i * 5], [0, 1], clamp);
                    return (
                        <div key={i} style={{ display: 'flex', height: rowH, alignItems: 'center', borderTop: `1px solid ${colors.muted}26`, opacity: slide, transform: `translateX(${(1 - slide) * -u * 6}px)` }}>
                            <div style={{ flex: 1, color: colors.text, fontSize: t * 3, fontWeight: 600, lineHeight: 1.2, paddingRight: u * 2 }}>{row.feature}</div>
                            <div style={{ width: colW, display: 'flex', justifyContent: 'center' }}>
                                <MarkIcon mark={row.us} progress={draw} size={Math.min(rowH * 0.6, t * 5)} color={color(row.us, true)} />
                            </div>
                            <div style={{ width: colW, display: 'flex', justifyContent: 'center' }}>
                                <MarkIcon mark={row.them} progress={draw} size={Math.min(rowH * 0.6, t * 5)} color={color(row.them, false)} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
}
