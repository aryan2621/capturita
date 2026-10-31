import type { CSSProperties } from 'react';
import { al } from './launch/shapes';
import { Heading, Stage, Tick, headRoom, surface, take, useScene, type Scene } from './proofParts';
import type { Brand, SceneAssets } from './assets';

type Status = 'done' | 'now' | 'next';

export interface RoadmapProps {
    heading: string;
    milestones: { when: string; title: string; status: Status }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** The line is drawn between these times (the first is also when it starts; the end is the scene's beat). */
const LINE_FROM = 0.15;
const LINE_TO = 0.9;
const STATUS_LABEL: Record<Status, string> = { done: '✓ Shipped', now: '● In progress', next: '' };

interface StopProps { s: Scene; m: RoadmapProps['milestones'][number]; reachedAt: number; vertical: boolean; dot: number; step: number; i: number }

function Stop({ s, m, reachedAt, vertical, dot, step, i }: StopProps) {
    const { u, c } = s;
    const land = s.pop(reachedAt);
    const text = s.pop(reachedAt + 0.05);
    const now = m.status === 'now';
    const pending = m.status === 'next';
    const when = s.t * (vertical ? 3 : 2.6);
    const place: CSSProperties = vertical ? { left: 0, right: 0, top: step * i + step / 2 - dot / 2 } : { top: 0, left: step * i, width: step };
    return (
        <div style={{ position: 'absolute', display: 'flex', flexDirection: vertical ? 'row' : 'column', alignItems: 'center', gap: u * 2.4, ...place }}>
            <div style={{ position: 'relative', width: dot, height: dot, flexShrink: 0, transform: `scale(${land})` }}>
                {now && <div style={{ position: 'absolute', inset: -dot * 0.5, borderRadius: '50%', background: `radial-gradient(closest-side, ${al(c.accent, 0.55)}, transparent)`, opacity: land }} />}
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxSizing: 'border-box', border: `${u * 0.5}px solid ${pending ? al(c.accent, 0.55) : c.accent}`, background: pending ? c.bg : c.accent, boxShadow: pending ? undefined : `0 0 ${u * 2.5}px ${al(c.accent, 0.7)}` }} />
                {m.status === 'done' && <div style={{ position: 'absolute', inset: '18%' }}><Tick size={dot * 0.64} color={c.bg} progress={land} width={3.4} /></div>}
            </div>
            <div style={{ ...surface(s, { hot: now, alpha: pending ? 0.5 : 0.86 }), textAlign: vertical ? 'left' : 'center', opacity: Math.min(1, text * 1.6), transform: `translateY(${(1 - text) * u * 3}px)`, margin: vertical ? 0 : `0 ${u}px`, padding: `${u * 1.8}px ${u * 2}px` }}>
                {STATUS_LABEL[m.status] && <div style={{ color: c.accent, fontSize: when * 0.9, fontWeight: 700, marginBottom: u * 0.6 }}>{STATUS_LABEL[m.status]}</div>}
                {m.when && <div style={{ color: pending ? c.muted : c.accent, fontSize: when, fontWeight: 700, letterSpacing: when * 0.06, textTransform: 'uppercase', marginBottom: u * 0.6 }}>{m.when}</div>}
                <div style={{ color: pending ? c.muted : c.text, fontFamily: s.display, fontSize: s.t * (vertical ? 5 : 4.2), fontWeight: 750, lineHeight: 1.15 }}>{m.title}</div>
            </div>
        </div>
    );
}

/** Milestones on a line that a glowing head draws from one to the next: done ones fill, the current one rings, later ones stay outlined. Vertical in tall frames. */
export function Roadmap({ heading, milestones, transparent, brand }: RoadmapProps) {
    const s = useScene(brand);
    const { u, c } = s;
    const list = take(milestones, 5).filter((m) => m?.title?.trim());
    const n = Math.max(1, list.length);
    const vertical = s.layout.stacked;
    const dot = s.t * (vertical ? 3.6 : 3);
    const step = vertical ? Math.min((s.height - s.layout.safeY * 2 - headRoom(s, heading, 7)) / n, s.t * 26) : s.innerW / n;
    const line = s.ramp(LINE_FROM, LINE_TO);
    const length = step * (n - 1);
    const rail = (extent: number, background: string, shadow?: string): CSSProperties => ({ position: 'absolute', borderRadius: 99, background, boxShadow: shadow, ...(vertical ? { left: dot / 2 - u * 0.25, top: step / 2, width: u * 0.5, height: extent } : { top: dot / 2 - u * 0.25, left: step / 2, height: u * 0.5, width: extent }) });
    const head: CSSProperties = vertical ? { left: dot / 2, top: step / 2 + length * line } : { top: dot / 2, left: step / 2 + length * line };
    // Linear, so a milestone lands exactly when the head reaches its centre.
    const reachedAt = (i: number) => LINE_FROM + (n > 1 ? (i / (n - 1)) * (LINE_TO - LINE_FROM) : 0);
    return (
        <Stage s={s} transparent={transparent} at={[50, 55]}>
            <Heading s={s} text={heading} size={7} />
            <div style={{ position: 'relative', width: vertical ? Math.min(s.innerW, s.t * 75) : s.innerW, height: vertical ? step * n : s.t * 30 }}>
                <div style={rail(length, al(c.muted, 0.27))} />
                <div style={rail(length * line, `linear-gradient(${vertical ? 180 : 90}deg, ${al(c.accent, 0.6)}, ${c.accent})`, `0 0 ${u * 2}px ${al(c.accent, 0.7)}`)} />
                {line > 0 && line < 1 && <div style={{ position: 'absolute', width: u * 2.2, height: u * 2.2, margin: -u * 1.1, borderRadius: '50%', background: c.text, boxShadow: `0 0 ${u * 3}px ${c.accent}, 0 0 ${u * 6}px ${al(c.accent, 0.6)}`, ...head }} />}
                {list.map((m, i) => <Stop key={i} s={s} m={m} i={i} reachedAt={reachedAt(i)} vertical={vertical} dot={dot} step={step} />)}
            </div>
        </Stage>
    );
}
