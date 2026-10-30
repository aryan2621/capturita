import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import { BrandTexture, clamp, sceneGradient, useExit } from './SceneBase';
import { frameLayout, grow } from './layout';
import { fitSize } from './text';
import { bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export interface HowItWorksProps {
    heading: string;
    steps: { title: string; text: string }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** Frames between one step appearing and the next. */
const STEP_FRAMES = 14;

/** 2–4 numbered steps joined by a line that draws itself from one to the next. */
export function HowItWorks({ heading, steps, transparent, brand }: HowItWorksProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
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
    const headIn = spring({ frame, fps, config: { damping: 200 } });
    const headSize = fitSize(heading, innerW, brand.fonts.display, t * 6.5);

    const step = (item: { title: string; text: string }, i: number) => {
        const at = 10 + i * STEP_FRAMES;
        const pop = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 150 } });
        const textIn = spring({ frame: frame - at - 4, fps, config: { damping: 200 } });
        // The line to the next step draws while this step settles.
        const draw = interpolate(frame, [at + 6, at + STEP_FRAMES + 4], [0, 1], clamp);
        const last = i === n - 1;
        const number = (
            <div style={{ width: badge, height: badge, flexShrink: 0, borderRadius: badge, background: colors.accent, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: displayFont(brand), fontSize: badge * 0.5, fontWeight: 800, lineHeight: 1, transform: `scale(${pop})`, position: 'relative', zIndex: 1 }}>{i + 1}</div>
        );
        const words = (
            <div style={{ opacity: textIn, transform: `translateY(${(1 - textIn) * u * 2}px)`, minWidth: 0 }}>
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: t * (vertical ? 3.8 : 3.6), fontWeight: 750, lineHeight: 1.15 }}>{item.title}</div>
                {item.text && <div style={{ color: colors.muted, fontSize: t * (vertical ? 2.7 : 2.6), fontWeight: 500, lineHeight: 1.3, marginTop: u * 0.8 }}>{item.text}</div>}
            </div>
        );
        if (vertical) {
            return (
                <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: u * 3, paddingBottom: last ? 0 : u * 4 }}>
                    {!last && <div style={{ position: 'absolute', left: badge / 2 - lineW / 2, top: badge, bottom: 0, width: lineW, background: colors.accent, borderRadius: lineW, transformOrigin: 'top', transform: `scaleY(${draw})`, opacity: 0.55 }} />}
                    {number}
                    <div style={{ paddingTop: badge * 0.1 }}>{words}</div>
                </div>
            );
        }
        return (
            <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: u * 3, padding: `0 ${u * 2}px` }}>
                {!last && <div style={{ position: 'absolute', left: `calc(50% + ${badge / 2}px)`, width: `calc(100% - ${badge}px)`, top: badge / 2 - lineW / 2, height: lineW, background: colors.accent, borderRadius: lineW, transformOrigin: 'left', transform: `scaleX(${draw})`, opacity: 0.55 }} />}
                {number}
                {words}
            </div>
        );
    };

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit, alignItems: vertical ? 'flex-start' : 'center', justifyContent: 'center', padding: `${layout.safeY}px ${layout.safeX}px` }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {heading && (
                <div style={{ color: colors.text, fontFamily: displayFont(brand), fontSize: headSize, fontWeight: 800, lineHeight: 1.1, textAlign: vertical ? 'left' : 'center', alignSelf: vertical ? 'flex-start' : 'center', marginBottom: t * 4, opacity: headIn, transform: `translateY(${(1 - headIn) * u * 3}px)` }}>{heading}</div>
            )}
            <div style={{ display: vertical ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: `repeat(${n}, 1fr)`, width: vertical ? undefined : innerW }}>{list.map(step)}</div>
        </AbsoluteFill>
    );
}
