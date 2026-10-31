import type { CSSProperties } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, Depth, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { Glow, Ring, Sweep, easeOut, useTiming } from './deviceParts';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface HowItWorksProps {
    heading: string;
    steps: { title: string; text: string }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Frames between one step appearing and the next. */
const STEP_FRAMES = 9;
const FIRST = 3;

/** The line to the next step: it fills with the accent colour, a bright head leading it. `draw` runs 0 → 1. */
function Connector({ vertical, draw, thickness, badge, color }: { vertical: boolean; draw: number; thickness: number; badge: number; color: string }) {
    const dot = thickness * 3.2;
    const head = draw > 0 && draw < 1 ? <div style={{ position: 'absolute', [vertical ? 'top' : 'left']: `${draw * 100}%`, [vertical ? 'left' : 'top']: thickness / 2 - dot / 2, [vertical ? 'marginTop' : 'marginLeft']: -dot / 2, width: dot, height: dot, borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${dot * 2}px ${color}` }} /> : null;
    const track: CSSProperties = vertical
        ? { left: badge / 2 - thickness / 2, top: badge, bottom: 0, width: thickness }
        : { left: `calc(50% + ${badge / 2}px)`, width: `calc(100% - ${badge}px)`, top: badge / 2 - thickness / 2, height: thickness };
    return (
        <div style={{ position: 'absolute', borderRadius: thickness, background: `${color}22`, ...track }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: thickness, background: color, boxShadow: `0 0 ${thickness * 3}px ${color}`, transformOrigin: vertical ? 'top' : 'left', transform: vertical ? `scaleY(${draw})` : `scaleX(${draw})` }} />
            {head}
        </div>
    );
}

/** 2–4 numbered steps joined by a line that draws itself from one to the next, each badge landing with a ring of light. */
export function HowItWorks({ heading, steps, transparent, brand }: HowItWorksProps) {
    const { pop, glide, ramp } = useTiming();
    const { width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit * grow(width, height);
    const t = layout.text * grow(width, height);
    const { colors } = brand;
    const exit = useExit();
    const list = (Array.isArray(steps) ? steps : []).filter((step) => step?.title?.trim()).slice(0, 4);
    const n = Math.max(1, list.length);
    // Steps side by side in a wide frame; stacked down the left in a tall or square one.
    const vertical = layout.stacked;
    const innerW = width - layout.safeX * 2;
    const badge = t * (vertical ? 6.5 : 8);
    const lineW = Math.max(2, u * 0.45);
    const headIn = glide(0);
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6.5);

    const step = (item: { title: string; text: string }, i: number) => {
        const at = FIRST + i * STEP_FRAMES;
        const pop1 = pop(at);
        const textIn = glide(at + 3);
        const last = i === n - 1;
        const panel = {
            position: 'relative',
            boxSizing: 'border-box',
            width: vertical ? undefined : '100%',
            opacity: textIn,
            transform: `translateY(${(1 - textIn) * u * 2}px)`,
            minWidth: 0,
            padding: `${u * 1.6}px ${u * 2}px`,
            borderRadius: u * 1.6,
            background: `${colors.surface}cc`,
            border: `1px solid ${colors.muted}30`,
            boxShadow: `0 ${u}px ${u * 3}px rgba(0,0,0,0.25), 0 1px 0 #ffffff14 inset`,
        } as const;
        const number = (
            <div style={{ position: 'relative', width: badge, height: badge, flexShrink: 0, zIndex: 1 }}>
                <Ring x={badge / 2} y={badge / 2} r0={badge * 0.5} r1={badge * (last ? 2.2 : 1.6)} t={ramp(at + 2, at + 22)} color={colors.accent} width={u * 0.5} />
                <div style={{ width: badge, height: badge, borderRadius: badge, background: `linear-gradient(145deg, ${colors.accent}, ${colors.accent}bb)`, color: colors.bg, boxShadow: `0 0 ${u * 3 * pop1}px ${colors.accent}88, 0 1px 0 #ffffff55 inset`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: displayFont(brand), fontSize: badge * 0.5, fontWeight: 800, lineHeight: 1, transform: `scale(${pop1})` }}>{i + 1}</div>
            </div>
        );
        const words = (
            <div style={panel}>
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: t * (vertical ? 3.8 : 3.6), fontWeight: 750, lineHeight: 1.15 }}>{item.title}</div>
                {item.text && <div style={{ color: colors.muted, fontSize: t * (vertical ? 2.7 : 2.6), fontWeight: 500, lineHeight: 1.3, marginTop: u * 0.8 }}>{item.text}</div>}
                {last && <Sweep t={ramp(at + 4, at + 26, (x) => x)} strength={0.12} />}
            </div>
        );
        // The line to the next step draws while this step settles.
        const connector = !last && <Connector vertical={vertical} draw={ramp(at + 3, at + STEP_FRAMES + 4, easeOut)} thickness={lineW} badge={badge} color={colors.accent} />;
        if (vertical) {
            return (
                <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: u * 3, paddingBottom: last ? 0 : u * 3.5 }}>
                    {connector}
                    {number}
                    {words}
                </div>
            );
        }
        return (
            <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: u * 3, padding: `0 ${u * 1.4}px` }}>
                {connector}
                {number}
                {words}
            </div>
        );
    };

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}>
                <BrandTexture brand={brand} transparent={transparent} />
                <Glow x={width / 2} y={height * 0.55} r={Math.max(width, height) * 0.45} color={`${colors.accent}1f`} opacity={headIn} />
            </Depth>
            <Depth z={1} style={{ alignItems: vertical ? 'flex-start' : 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
                {heading && (
                    <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: vertical ? 'left' : 'center', alignSelf: vertical ? 'flex-start' : 'center', marginBottom: t * 4, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 3}px)` }}>{heading}</div>
                )}
                <div style={{ display: vertical ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: `repeat(${n}, 1fr)`, width: vertical ? undefined : innerW }}>{list.map(step)}</div>
            </Depth>
        </AbsoluteFill>
    );
}
