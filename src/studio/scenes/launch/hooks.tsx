// Hooks (the first 3 seconds) and problem scenes.
import { Check, Col, Headline, Kicker, Pill, Rule, Stage, Sub, easeOut, listOf, mono, seeded, typed, useKit, type Kit, type LaunchProps } from './kit';
import { al, shortSide } from './shapes';
import { HitFx, variantFor } from '../hitFx';
import { hexRgb } from '../../../lib/color';
import { Atmosphere, DANGER, Motes, Sweep, glass, rise } from './fx';

/** Pop-in with a hard scale slam: starts oversized and settles with overshoot. */
const slam = (k: Kit, delay: number, from = 1.35) => {
    const a = k.pop(delay, 11);
    return { opacity: Math.min(1, a * 3), transform: `scale(${from + (1 - from) * a}) translateY(${(1 - a) * k.u * 3}px)` };
};

export function ColdOpen(p: LaunchProps) {
    const k = useKit(p);
    const words = p.headline.split(' ');
    const hit = 1; // the accent word lands last, after the rest are already in
    const delayOf = (i: number) => (i === words.length - 1 ? hit : 0.05 + i * Math.min(0.1, 0.7 / words.length));
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} a={0.3} />
            <Col k={k} style={{ transform: `scale(${1 + k.ramp(0, k.seconds, 0, 0.04)})` }}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: k.tx * 2.4, rowGap: k.u, maxWidth: '86%' }}>
                    {words.map((word, i) => {
                        const last = i === words.length - 1;
                        return <span key={i} style={{ fontFamily: k.display, fontSize: k.tx * 11, fontWeight: 900, letterSpacing: -k.u * 0.4, lineHeight: 1, color: last ? k.c.accent : k.c.text, textShadow: last ? `0 0 ${k.u * 7}px ${al(k.c.accent, 0.55)}` : `0 ${k.u * 0.6}px ${k.u * 3}px ${al(k.c.bg, 0.6)}`, ...slam(k, delayOf(i), last ? 1.7 : 1.3) }}>{word}</span>;
                    })}
                </div>
                <Rule k={k} progress={k.pop(hit + 0.1)} />
                <Sub k={k} style={rise(k, hit + 0.25)}>{p.subtitle}</Sub>
            </Col>
            <Sweep k={k} t0={hit + 0.1} />
        </Stage>
    );
}

export function TypedQuestion(p: LaunchProps) {
    const k = useKit(p);
    const typeEnd = Math.min(1.5, 0.3 + p.headline.length * 0.045);
    const press = typeEnd + 0.2; // enter key goes down, results start to load
    const typing = k.ramp(0.3, typeEnd);
    const done = k.s >= press;
    const focus = k.pop(0, 14);
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={press} y={0.45} />
            <Col k={k} style={{ alignItems: 'stretch', width: k.stacked ? '84%' : '66%' }}>
                <Kicker k={k} style={{ textAlign: 'left', ...rise(k, 0.05) }}>{p.eyebrow}</Kicker>
                <div style={{ ...glass(k, { display: 'flex', alignItems: 'center', gap: k.u * 2, padding: `${k.u * 3}px ${k.u * 3.5}px`, borderColor: al(k.c.accent, 0.4 + 0.4 * focus), borderRadius: k.u * 2.4, boxShadow: `0 0 ${k.u * (5 + 5 * focus)}px ${al(k.c.accent, 0.3)}, 0 ${k.u * 3}px ${k.u * 10}px #000a` }), transform: `scale(${0.92 + 0.08 * focus + 0.03 * Math.sin(Math.min(1, Math.max(0, (k.s - press) * 5)) * Math.PI)})`, opacity: Math.min(1, focus * 2) }}>
                    <svg width={k.u * 4} height={k.u * 4} viewBox="0 0 24 24" fill="none" stroke={done ? k.c.accent : k.c.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
                    <div style={{ flex: 1, fontFamily: k.display, fontWeight: 700, fontSize: k.tx * 5, lineHeight: 1.15 }}>
                        {typed(p.headline, typing)}
                        <span style={{ display: 'inline-block', width: k.u * 0.5, height: k.tx * 5, marginLeft: k.u * 0.5, verticalAlign: 'middle', background: !done && Math.floor(k.s * 2.2) % 2 === 0 ? k.c.accent : 'transparent' }} />
                    </div>
                    <div style={{ ...mono(k), padding: `${k.u * 0.8}px ${k.u * 1.6}px`, borderRadius: k.u, border: `1px solid ${al(k.c.muted, 0.35)}`, color: done ? k.c.bg : k.c.muted, background: done ? k.c.accent : 'transparent', boxShadow: done ? `0 0 ${k.u * 3}px ${k.c.accent}` : 'none', transform: `scale(${done ? 0.85 + 0.15 * k.pop(press, 8) : 1})` }}>↵</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: k.u * 1.4, padding: `0 ${k.u * 2}px` }}>
                    {[72, 54, 63].map((w, i) => <div key={i} style={{ height: k.u * 1.7, width: `${w}%`, borderRadius: k.u, background: `linear-gradient(90deg, ${al(k.c.accent, 0.35)}, ${al(k.c.muted, 0.15)})`, ...rise(k, press + 0.1 + i * 0.1, 3) }} />)}
                </div>
                <Sub k={k} style={{ textAlign: 'left', maxWidth: '100%', ...rise(k, press + 0.2) }}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function ShockStat(p: LaunchProps) {
    const k = useKit(p);
    const hit = 1.5;
    const count = easeOut(k.ramp(0.1, hit));
    const punch = k.pop(hit, 9);
    const scale = k.s < hit ? 0.9 + 0.1 * count : 1 + 0.12 * (1 - punch);
    return (
        <Stage p={p}>
            <Atmosphere k={k} a={0.22 + 0.2 * count} />
            <HitFx variant={variantFor('ShockStat')} t={k.ramp(hit, hit + 0.6)} x={k.width / 2} y={k.height * 0.46} size={k.u * 40} color={k.c.accent} />
            <Col k={k}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ fontFamily: k.display, fontSize: k.tx * (k.portrait ? 22 : 26), fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: -k.u, color: k.c.text, textShadow: `0 0 ${k.u * (3 + 7 * (1 - punch) * (k.s >= hit ? 1 : 0))}px ${al(k.c.accent, 0.9)}, 0 ${k.u}px ${k.u * 4}px ${al(k.c.bg, 0.7)}`, transform: `scale(${scale})`, opacity: Math.min(1, k.s * 8) }}>
                    {Math.round(p.metric * count).toLocaleString()}<span style={{ color: k.c.accent }}>+</span>
                </div>
                <Rule k={k} width={26} progress={k.pop(hit + 0.05)} />
                <Headline k={k} size={4.2} style={rise(k, hit + 0.1)}>{p.headline}</Headline>
                <Sub k={k} style={rise(k, hit + 0.25)}>{p.subtitle}</Sub>
            </Col>
            <Sweep k={k} t0={hit + 0.05} />
        </Stage>
    );
}

export function PatternInterrupt(p: LaunchProps) {
    const k = useKit(p);
    const lock = 0.8; // the glitch is calm by here
    const settle = k.ramp(0.05, lock, 1, 0);
    const jitter = (seed: number) => (seeded(k.frame * 3 + seed) - 0.5) * 2 * settle * k.u * 2.4;
    const split = (dx: number, colour: string) => `${dx + jitter(1)}px ${jitter(2) * 0.4}px 0 ${colour}`;
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={lock} a={0.3} />
            {[0, 1, 2].map((i) => settle > 0.05 && seeded(k.frame + i * 7) > 0.35 && (
                <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${15 + seeded(i + 4) * 70}%`, height: `${3 + seeded(i + 8) * 7}%`, background: al(i === 1 ? k.c.text : k.c.accent, 0.1 * settle), transform: `translateX(${jitter(i + 20) * 6}px)` }} />
            ))}
            <Col k={k} style={{ transform: `scale(${0.8 + 0.2 * k.pop(0, 10)})` }}>
                <Kicker k={k} style={{ opacity: Math.min(1, k.s * 8) }}>{p.eyebrow}</Kicker>
                <Headline k={k} size={12} style={{ textShadow: `${split(k.u * 0.7 * (0.4 + settle), k.c.accent)}, ${split(-k.u * 0.6 * (0.4 + settle), k.c.muted)}`, transform: `translateX(${jitter(5)}px)` }}>{p.headline}</Headline>
                <Rule k={k} width={34} progress={k.pop(lock - 0.1)} />
                <Sub k={k} style={rise(k, lock)}>{p.subtitle}</Sub>
            </Col>
            <div style={{ position: 'absolute', inset: 0, background: k.c.text, opacity: k.ramp(0, 0.14, 0.6, 0), pointerEvents: 'none' }} />
        </Stage>
    );
}

export function Countdown(p: LaunchProps) {
    const k = useKit(p);
    const n = Math.max(1, Math.min(5, Math.round(p.metric) || 3));
    const start = 0.15;
    const step = Math.min(0.55, 2 / n);
    const tick = Math.min(n, Math.floor(Math.max(0, k.s - start) / step));
    const go = tick >= n;
    const hit = start + n * step;
    const tickAt = start + tick * step;
    const within = go ? 1 : (k.s - tickAt) / step;
    const size = k.u * 44;
    const punch = k.pop(tickAt, 9);
    const ticks = 36;
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.45} a={0.2 + 0.2 * (go ? 1 : within)} />
            <Col k={k}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center', opacity: Math.min(1, k.s * 8) }}>
                    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', overflow: 'visible' }}>
                        {Array.from({ length: ticks }, (_, i) => {
                            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
                            const lit = go || (i / ticks) <= (tick + within) / n;
                            return <line key={i} x1={50 + Math.cos(a) * 49} y1={50 + Math.sin(a) * 49} x2={50 + Math.cos(a) * 46.5} y2={50 + Math.sin(a) * 46.5} stroke={lit ? k.c.accent : al(k.c.muted, 0.3)} strokeWidth="0.8" strokeLinecap="round" />;
                        })}
                        <g transform="rotate(-90 50 50)">
                            <circle cx="50" cy="50" r="42" fill="none" stroke={al(k.c.muted, 0.2)} strokeWidth="2" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke={k.c.accent} strokeWidth="3.5" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={go ? 0 : 1 - within} style={{ filter: `drop-shadow(0 0 ${k.u * 0.9}px ${k.c.accent})` }} />
                        </g>
                    </svg>
                    <div style={{ fontFamily: k.display, fontSize: k.u * (go ? 18 : 25), fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: go ? k.c.accent : k.c.text, textShadow: go ? `0 0 ${k.u * 6}px ${al(k.c.accent, 0.7)}` : 'none', opacity: Math.min(1, punch * 2), transform: `scale(${1.7 - 0.7 * punch})` }}>{go ? 'GO' : n - tick}</div>
                </div>
                <Headline k={k} size={4.5} style={{ opacity: go ? Math.min(1, k.pop(hit)) : 0.55 }}>{p.date || p.headline}</Headline>
                <Sub k={k} style={rise(k, hit + 0.1)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function CinematicTitle(p: LaunchProps) {
    const k = useKit(p);
    const hit = 1.2;
    const bar = easeOut(k.ramp(0, 0.6)) * k.height * 0.11;
    const [r, g, b] = hexRgb(k.c.bg);
    const barColor = r * 0.299 + g * 0.587 + b * 0.114 > 140 ? k.c.text : '#04050a';
    const flare = k.pop(hit, 12);
    return (
        <Stage p={p}>
            <Atmosphere k={k} a={0.22} />
            <Motes k={k} n={14} colour={k.c.text} seed={4} speed={0.6} />
            <div style={{ position: 'absolute', left: '12%', right: '12%', top: '50%', height: k.u * 0.35, background: `linear-gradient(90deg, transparent, ${k.c.accent}, ${k.c.text}, ${k.c.accent}, transparent)`, opacity: k.s < hit ? 0 : 0.9 * Math.exp(-(k.s - hit) * 1.6), transform: `scaleX(${flare * 1.1})`, filter: `blur(${k.u * 0.2}px)`, boxShadow: `0 0 ${k.u * 4}px ${k.c.accent}` }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: barColor }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: barColor }} />
            <Col k={k} style={{ transform: `scale(${1 + k.ramp(0, k.seconds, 0, 0.05)})` }}>
                <Kicker k={k} style={{ opacity: k.ramp(0.35, 0.8), letterSpacing: k.u * (0.4 + k.ramp(0, k.seconds, 0, 0.8)) }}>{p.eyebrow}</Kicker>
                <Headline k={k} size={11} style={{ letterSpacing: k.u * (1.1 * (1 - easeOut(k.ramp(0.2, hit + 0.2))) + 0.05), opacity: k.ramp(0.2, 0.9), fontWeight: 700, textShadow: `0 0 ${k.u * 6}px ${al(k.c.accent, 0.35 * Math.min(1, flare))}` }}>{p.headline}</Headline>
                <Rule k={k} width={26} progress={k.pop(hit + 0.1)} />
                <Sub k={k} style={{ opacity: k.ramp(hit + 0.2, hit + 0.7) }}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function FocusPull(p: LaunchProps) {
    const k = useKit(p);
    const hit = 1;
    const sharp = Math.min(1, k.pop(0.1, 16));
    const blur = Math.max(0, 1 - k.pop(0.1, 16));
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} a={0.24} />
            {Array.from({ length: 7 }, (_, i) => {
                const size = shortSide(k) * (0.05 + seeded(i + 2) * 0.09);
                return <div key={i} style={{ position: 'absolute', left: `${8 + seeded(i + 5) * 84 + Math.sin(k.s * 0.6 + i) * 1.5}%`, top: `${8 + seeded(i + 11) * 84 + Math.cos(k.s * 0.5 + i) * 1.5}%`, width: size, height: size, borderRadius: '50%', background: al(i % 3 ? k.c.accent : k.c.text, 0.1 + 0.08 * (1 - blur)), filter: `blur(${k.u * (0.4 + 2.4 * blur + (i % 3) * 0.6)}px)`, pointerEvents: 'none' }} />;
            })}
            <Col k={k}>
                <Col k={k} style={{ filter: `blur(${blur * k.u * 2.6}px)`, opacity: 0.2 + sharp * 0.8, transform: `scale(${1 + blur * 0.12})` }}>
                    <Kicker k={k}>{p.eyebrow}</Kicker>
                    <Headline k={k} size={10} style={{ textShadow: `0 ${k.u * 0.6}px ${k.u * 3}px ${al(k.c.bg, 0.6)}` }}>{p.headline}</Headline>
                </Col>
                <Rule k={k} width={18} progress={k.pop(hit)} />
                <Sub k={k} style={rise(k, hit + 0.15)}>{p.subtitle}</Sub>
            </Col>
            <Sweep k={k} t0={hit - 0.1} t1={hit + 0.9} />
        </Stage>
    );
}

export function PersonaCallout(p: LaunchProps) {
    const k = useKit(p);
    const who = listOf(p.items, [], 5);
    const lap = 0.3; // each chip takes this long in the spotlight
    const hit = 0.5 + who.length * lap; // every chip lit
    const active = who.length ? Math.min(who.length - 1, Math.floor(Math.max(0, k.s - 0.5) / lap)) : -1;
    const settled = k.s >= hit;
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.42} />
            <Col k={k}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: k.u * 1.8, justifyContent: 'center', maxWidth: '80%' }}>
                    {who.map((item, i) => {
                        const lit = settled || (k.s >= 0.5 && i === active);
                        return <Pill key={i} k={k} active={lit} style={{ fontSize: k.tx * 3, padding: `${k.u * 1.3}px ${k.u * 2.8}px`, boxShadow: lit ? `0 0 ${k.u * 4}px ${al(k.c.accent, 0.5)}` : 'none', ...rise(k, 0.1 + i * 0.08, 3), transform: `translateY(${(1 - k.pop(0.1 + i * 0.08, 11)) * k.u * 3}px) scale(${lit && !settled ? 1.1 : 1})` }}>{item.text}</Pill>;
                    })}
                </div>
                <Headline k={k} size={8.5} style={rise(k, hit + 0.05)}>{p.headline}</Headline>
                <Sub k={k} style={rise(k, hit + 0.2)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

// ---- problem ----

export function StrikeOldWay(p: LaunchProps) {
    const k = useKit(p);
    const steps = listOf(p.items, [], 5);
    const strikeAt = (i: number) => 0.7 + i * 0.35;
    const hit = strikeAt(steps.length) + 0.1; // the headline replaces the crossed-out list
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} a={0.2} y={0.55} />
            <Col k={k} style={{ alignItems: 'flex-start', width: k.stacked ? '84%' : '60%', gap: k.u * 2 }}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                {steps.map((step, i) => {
                    const strike = easeOut(k.ramp(strikeAt(i), strikeAt(i) + 0.2));
                    const hurt = Math.sin(Math.min(1, Math.max(0, (k.s - strikeAt(i)) * 5)) * Math.PI);
                    return (
                        <div key={i} style={{ position: 'relative', alignSelf: 'stretch', padding: `${k.u * 1.6}px ${k.u * 2.4}px`, ...glass(k, { borderRadius: k.u * 1.2, borderColor: al(DANGER, 0.5 * strike + 0.1), boxShadow: `0 ${k.u}px ${k.u * 4}px #0008` }), fontSize: k.tx * 3.4, color: k.c.muted, ...rise(k, 0.1 + i * 0.1, 3), opacity: Math.min(1, k.pop(0.1 + i * 0.1) * 1.6) * (1 - strike * 0.5), transform: `translateX(${(1 - k.pop(0.1 + i * 0.1)) * -k.u * 5 + hurt * k.u * 0.8}px)` }}>
                            {step.text}
                            <div style={{ position: 'absolute', left: k.u * 1.4, top: '50%', width: `${strike * 100}%`, maxWidth: `calc(100% - ${k.u * 2.8}px)`, height: k.u * 0.5, background: DANGER, borderRadius: k.u, boxShadow: `0 0 ${k.u * 1.6}px ${al(DANGER, 0.7)}`, transform: 'rotate(-1.2deg)' }} />
                        </div>
                    );
                })}
                <Headline k={k} size={8} style={{ textAlign: 'left', marginTop: k.u * 2, ...rise(k, hit, 5) }}>{p.headline}</Headline>
            </Col>
        </Stage>
    );
}

export function ChaosCollapse(p: LaunchProps) {
    const k = useKit(p);
    const chips = listOf(p.items, [], 8);
    const hit = 1.4;
    const collapse = easeOut(k.ramp(0.6, hit));
    return (
        <Stage p={p}>
            <Atmosphere k={k} a={0.18 + 0.12 * collapse} />
            <div style={{ position: 'relative', width: '78%', height: '64%' }}>
                {chips.map((chip, i) => {
                    const z = seeded(i + 21); // depth: far chips are smaller, dimmer and drift slower
                    const x = 8 + seeded(i + 1) * 62;
                    const y = 6 + seeded(i + 40) * 78;
                    const rot = (seeded(i + 9) - 0.5) * 14 * (1 - collapse);
                    const wob = Math.sin(k.s * (1.2 + z) + i) * k.u * (0.4 + z) * (1 - collapse);
                    return <div key={i} style={{ position: 'absolute', left: `${x + (50 - x - 14) * collapse}%`, top: `${y + (46 - y) * collapse}%`, padding: `${k.u * 1.2}px ${k.u * 2}px`, ...glass(k, { borderRadius: k.u, borderColor: al(k.c.muted, 0.25) }), fontSize: k.tx * (2 + z * 0.8), color: k.c.muted, filter: z < 0.3 ? `blur(${k.u * 0.2}px)` : undefined, opacity: Math.min(1, k.pop(i * 0.05) * 1.6) * (1 - collapse) * (0.6 + 0.4 * z), transform: `translateY(${wob}px) rotate(${rot}deg) scale(${(0.8 + 0.3 * z) * (1 - collapse * 0.5)})` }}>{chip.text}</div>;
                })}
                <Col k={k} style={{ position: 'absolute', left: '50%', top: '50%', width: '70%', padding: k.u * 4, ...glass(k, { borderColor: al(k.c.accent, 0.55) }), transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * k.pop(hit - 0.1, 10)})`, opacity: Math.min(1, k.pop(hit - 0.1, 10) * 1.6) }}>
                    <Kicker k={k}>{p.eyebrow}</Kicker>
                    <Headline k={k} size={6.5}>{p.headline}</Headline>
                    <Sub k={k} style={{ maxWidth: '100%' }}>{p.subtitle}</Sub>
                </Col>
            </div>
        </Stage>
    );
}

export function BeforeAfter(p: LaunchProps) {
    const k = useKit(p);
    const [before, after] = listOf(p.items, [{ text: 'Before' }, { text: 'After' }], 2);
    const hit = 1.5;
    const wipe = easeOut(k.ramp(0.45, hit));
    const panel = (label: string, detail: string | undefined, good: boolean) => (
        <div style={{ position: 'absolute', inset: 0, padding: k.u * 4, display: 'flex', flexDirection: 'column', gap: k.u * 2, background: good ? `linear-gradient(130deg, ${al(k.c.accent, 0.4)}, ${k.c.surface} 75%)` : `linear-gradient(135deg, ${k.c.surface}, ${k.c.bg})`, filter: good ? 'none' : `saturate(${1 - wipe * 0.7})` }}>
            <Kicker k={k} style={{ textAlign: 'left', color: good ? k.c.text : k.c.muted }}>{label}</Kicker>
            <div style={{ fontFamily: k.display, fontWeight: 800, fontSize: k.tx * 4.6, color: good ? k.c.text : k.c.muted }}>{detail}</div>
            {[78, 55, 66].map((w, i) => <div key={i} style={{ height: k.u * (i ? 3 : 5), width: `${good ? w : w - (i % 2) * 24}%`, borderRadius: k.u, background: good ? `linear-gradient(90deg, ${al(k.c.text, i ? 0.35 : 0.8)}, ${al(k.c.accent, 0.4)})` : al(k.c.muted, i ? 0.2 : 0.35), boxShadow: good && !i ? `0 0 ${k.u * 2}px ${al(k.c.accent, 0.4)}` : 'none', transform: good ? 'none' : `rotate(${(i - 1) * 2}deg) translateX(${(i - 1) * k.u}px)` }} />)}
        </div>
    );
    const frameW = k.stacked ? '84%' : '70%';
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} a={0.14 + 0.16 * wipe} y={0.45} />
            <Col k={k} gap={3.5}>
                <div style={{ position: 'relative', width: frameW, height: k.u * (k.portrait ? 50 : 40), borderRadius: k.u * 2, overflow: 'hidden', border: `1px solid ${al(k.c.accent, 0.3)}`, boxShadow: `0 ${k.u * 3}px ${k.u * 10}px #000a, 0 0 ${k.u * 8 * wipe}px ${al(k.c.accent, 0.3)}`, ...rise(k, 0, 4) }}>
                    {panel(before.text, before.detail, false)}
                    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - wipe * 100}% 0 0)` }}>{panel(after.text, after.detail, true)}</div>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${wipe * 100}%`, width: k.u * 0.5, background: k.c.text, boxShadow: `0 0 ${k.u * 3}px ${k.c.accent}` }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', width: k.u * 5, height: k.u * 5, marginLeft: -k.u * 2.5, marginTop: -k.u * 2.5, borderRadius: '50%', background: k.c.accent, color: k.c.bg, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: k.tx * 2.2, boxShadow: `0 0 ${k.u * 3}px ${k.c.accent}` }}>⇆</div>
                    </div>
                </div>
                <Headline k={k} size={5.5} style={rise(k, hit)}>{p.headline}</Headline>
                <Sub k={k} style={rise(k, hit + 0.15)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function CostTicker(p: LaunchProps) {
    const k = useKit(p);
    const hit = 2;
    const run = k.ramp(0.1, hit);
    const value = Math.round(p.metric * run ** 1.6);
    const punch = k.pop(hit, 9);
    const strain = Math.sin(k.s * 9 + run * 20) * (0.4 + 2 * run);
    return (
        <Stage p={p}>
            <Atmosphere k={k} colour={DANGER} a={0.12 + 0.18 * run} y={0.5} />
            <Motes k={k} n={16} colour={DANGER} seed={2} speed={1.5} />
            <HitFx variant={variantFor('CostTicker')} t={k.ramp(hit, hit + 0.6)} x={k.width / 2} y={k.height * 0.47} size={k.u * 36} color={DANGER} />
            <Col k={k}>
                <Kicker k={k} style={{ color: DANGER, ...rise(k, 0.05) }}>{p.eyebrow}</Kicker>
                <div style={{ fontFamily: k.display, fontSize: k.tx * (k.portrait ? 19 : 24), fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: DANGER, textShadow: `0 0 ${k.u * (3 + run * 5 + (k.s >= hit ? 5 * (1 - punch) : 0))}px ${al(DANGER, 0.7)}`, transform: `translate(${strain * k.u * 0.12}px, ${strain * k.u * 0.08}px) scale(${(k.s < hit ? 0.92 + 0.08 * run : 1 + 0.1 * (1 - punch))})`, opacity: Math.min(1, k.s * 8) }}>
                    {p.date.match(/^\D+/)?.[0] ?? '$'}{value.toLocaleString()}
                </div>
                <div style={{ width: k.u * 28, height: k.u * 0.8, borderRadius: k.u, background: al(DANGER, 0.2), overflow: 'hidden' }}>
                    <div style={{ width: `${run * 100}%`, height: '100%', background: `linear-gradient(90deg, ${al(DANGER, 0.6)}, ${DANGER})`, boxShadow: `0 0 ${k.u * 2}px ${DANGER}` }} />
                </div>
                <Headline k={k} size={4.6} style={rise(k, hit)}>{p.headline}</Headline>
                <Sub k={k} style={rise(k, hit + 0.15)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function ErrorToCalm(p: LaunchProps) {
    const k = useKit(p);
    const errors = listOf(p.items, [], 4);
    const hit = 1.5; // the errors are swept away and the calm card lands
    const away = easeOut(k.ramp(hit - 0.4, hit));
    const calm = k.pop(hit - 0.1, 11);
    return (
        <Stage p={p}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - away }}><Atmosphere k={k} colour={DANGER} a={0.2} /></div>
            <div style={{ position: 'absolute', inset: 0, opacity: away }}><Atmosphere k={k} a={0.28} /></div>
            <div style={{ position: 'relative', width: k.stacked ? '84%' : '60%', height: k.u * 46 }}>
                {errors.map((error, i) => {
                    const a = k.pop(i * 0.12, 11);
                    const shake = Math.sin(k.frame * 1.9 + i * 2) * k.u * 0.5 * (1 - away);
                    return (
                        <div key={i} style={{ position: 'absolute', left: `${i * 9}%`, top: `${i * 16}%`, right: `${(errors.length - 1 - i) * 9}%`, display: 'flex', alignItems: 'center', gap: k.u * 1.6, padding: k.u * 2.2, borderRadius: k.u * 1.2, border: `1px solid ${al(DANGER, 0.55)}`, background: `linear-gradient(135deg, #2f1822, #1c0f17)`, boxShadow: `0 ${k.u * 2}px ${k.u * 6}px #000a, 0 0 ${k.u * 4}px ${al(DANGER, 0.2)}`, color: '#ffb1b5', fontSize: k.tx * 2.7, opacity: Math.min(1, a * 1.6) * (1 - away), transform: `translate(${shake + away * k.u * (8 + i * 3)}px, ${(1 - a) * -k.u * 5}px) scale(${0.9 + 0.1 * a}) rotate(${away * (i - 1) * 4}deg)` }}>
                            <span style={{ fontWeight: 900, color: DANGER }}>⚠</span>{error.text}
                        </div>
                    );
                })}
                <Col k={k} style={{ position: 'absolute', inset: 0, justifyContent: 'center', padding: k.u * 4, ...glass(k, { borderColor: al(k.c.accent, 0.6) }), opacity: Math.min(1, calm * 1.6), transform: `scale(${0.8 + 0.2 * calm})` }}>
                    <Check k={k} size={9} progress={k.ramp(hit, hit + 0.35)} />
                    <Kicker k={k}>{p.eyebrow}</Kicker>
                    <Headline k={k} size={6}>{p.headline}</Headline>
                    <Sub k={k} style={{ maxWidth: '100%' }}>{p.subtitle}</Sub>
                </Col>
            </div>
        </Stage>
    );
}
