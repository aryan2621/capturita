// Typography, social proof and call-to-action scenes: layered, spring-driven, with the headline integrated in each composition.
import { SceneImage } from '../SceneBase';
import { Check, Col, Cursor, Headline, Kicker, Pill, Rule, Stage, Sub, Win, card, easeOut, listOf, mono, seeded, typed, useKit, type LaunchProps } from './kit';
import { Ping, Slot, enter, glide } from './product';
import { Aura, Lockup, TAU, al, clamp01, glow, shortSide } from './shapes';

/** Time since `t0` as a 0→1 flash that decays: the glow after a "hit". */
const flashAfter = (s: number, t0: number, rate = 5) => (s < t0 ? 0 : Math.exp(-(s - t0) * rate));

// ---- typography ----

export function WordFlip(p: LaunchProps) {
    const k = useKit(p);
    const words = listOf(p.items, [], 5);
    const per = Math.min(0.7, Math.max(0.45, (k.seconds - 1.2) / words.length));
    const T0 = 0.25;
    const at = (i: number) => T0 + i * per;
    const size = k.tx * 10;
    const since = k.s - T0;
    const pulse = since < 0 || since > per * words.length ? 0 : Math.exp(-(since % per) * 6);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.75} a={0.18 + 0.25 * pulse} scale={k.pop(0, 14)} />
            <Col k={k} gap={0.6}>
                <Kicker k={k} style={{ marginBottom: k.u * 2, ...enter(k, 0) }}>{p.eyebrow}</Kicker>
                <div style={{ fontFamily: k.display, fontWeight: 850, fontSize: size, letterSpacing: -k.u * 0.3, textAlign: 'center', lineHeight: 1.1, ...enter(k, 0.05, { y: 4 }) }}>{p.headline}</div>
                <div style={{ position: 'relative', height: size * 1.25, width: '92%', overflow: 'hidden', fontFamily: k.display, fontWeight: 900, fontSize: size, color: k.c.accent, textAlign: 'center', textShadow: `0 0 ${k.u * (3 + 5 * pulse)}px ${al(k.c.accent, 0.35 + 0.3 * pulse)}` }}>
                    {words.map((w, i) => {
                        // The word rises in on a spring while the previous one is pushed out the top.
                        const a = clamp01(k.pop(at(i), 12));
                        const out = i < words.length - 1 ? clamp01(k.pop(at(i + 1), 12)) : 0;
                        return <div key={i} style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - a) * 110 - out * 110}%)`, opacity: a * (1 - out) }}>{w.text}</div>;
                    })}
                </div>
                <div style={{ marginTop: k.u }}><Rule k={k} progress={k.pop(0.3)} /></div>
                <Sub k={k} style={{ marginTop: k.u * 2, ...enter(k, 0.6) }}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function HighlightSweep(p: LaunchProps) {
    const k = useKit(p);
    const words = p.headline.split(' ');
    const split = Math.max(1, words.length - 2);
    const SWEEP = 0.6;
    const sweep = easeOut(k.ramp(SWEEP, SWEEP + 0.5));
    const flash = flashAfter(k.s, SWEEP + 0.4);
    const word = (w: string, i: number) => <span key={i} style={{ display: 'inline-block', marginRight: '0.25em', ...enter(k, 0.05 + i * 0.06, { y: 2 }) }}>{w}</span>;
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.8} a={0.16 + flash * 0.22} scale={k.pop(0, 14)} />
            <Col k={k}>
                <Kicker k={k} style={enter(k, 0)}>{p.eyebrow}</Kicker>
                <Headline k={k} size={9}>
                    {words.slice(0, split).map(word)}
                    <span style={{ position: 'relative', display: 'inline-block', padding: `0 ${k.u * 1.4}px` }}>
                        <span style={{ position: 'absolute', inset: `${k.u * 0.4}px 0`, borderRadius: k.u * 1.2, background: k.c.accent, transformOrigin: 'left', transform: `scaleX(${sweep}) skewX(-6deg)`, boxShadow: `0 0 ${k.u * (3 + flash * 6)}px ${al(k.c.accent, 0.5 + flash * 0.3)}` }} />
                        <span style={{ position: 'relative', color: sweep > 0.5 ? '#fff' : k.c.text }}>{words.slice(split).map((w, i) => word(w, split + i))}</span>
                    </span>
                </Headline>
                <Sub k={k} style={enter(k, 1.1)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=?';

export function ScrambleResolve(p: LaunchProps) {
    const k = useKit(p);
    const text = p.headline;
    const T0 = 0.15;
    const done = T0 + Math.min(1.5, 0.4 + text.length * 0.045);
    const t = k.ramp(T0, done);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.8} a={0.14 + 0.3 * flashAfter(k.s, done, 4)} scale={k.pop(0, 14)} />
            <Col k={k}>
                <Kicker k={k} style={enter(k, 0)}>{p.eyebrow}</Kicker>
                <Headline k={k} size={9} style={{ ...mono(k), fontSize: k.tx * 8, fontWeight: 800, letterSpacing: 0 }}>
                    {text.split('').map((ch, i) => {
                        if (ch === ' ') return ' ';
                        const age = k.s - (T0 + (i / text.length) * (done - T0));
                        if (age < 0) return <span key={i} style={{ color: k.c.accent, opacity: 0.45 }}>{GLYPHS[Math.floor(seeded(i * 31 + Math.floor(k.frame / 2)) * GLYPHS.length)]}</span>;
                        return <span key={i} style={{ textShadow: `0 0 ${k.u * 3 * Math.exp(-age * 6)}px ${k.c.accent}` }}>{ch}</span>;
                    })}
                </Headline>
                <div style={{ ...mono(k), fontSize: k.tx * 1.9, color: k.c.muted, letterSpacing: k.u * 0.3 }}>{t >= 1 ? 'RESOLVED' : `DECODING ${Math.round(t * 100)}%`}</div>
                <Rule k={k} progress={t} />
                <Sub k={k} style={enter(k, done + 0.1)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function FeatureListDrop(p: LaunchProps) {
    const k = useKit(p);
    const lines = listOf(p.items, [], 6);
    return (
        <Stage p={p}>
            <Lockup k={k} p={p} t0={0.1} place={k.stacked ? 'top' : 'sideLeft'} size={5.4} />
            <Slot k={k} side="right" below>
                <div style={{ display: 'flex', flexDirection: 'column', gap: k.u * 1.4, width: k.stacked ? '88%' : '90%' }}>
                    {lines.map((line, i) => {
                        const a = k.pop(0.25 + i * 0.2, 11);
                        return (
                            <div key={i} style={{ ...card(k, { position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: k.u * 2, padding: `${k.u * 1.5}px ${k.u * 2.2}px` }), fontSize: k.tx * 3, fontWeight: 650, opacity: Math.min(1, a * 1.5), transform: `translateY(${(a - 1) * k.u * 8}px) scale(${0.96 + 0.04 * Math.min(a, 1)})` }}>
                                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: k.u * 0.5, borderRadius: k.u, background: k.c.accent }} />
                                <Check k={k} size={3.6} progress={k.ramp(0.45 + i * 0.2, 0.7 + i * 0.2)} />
                                <span>{line.text}</span>
                                {line.detail && <span style={{ marginLeft: 'auto', color: k.c.muted, fontSize: k.tx * 2.1 }}>{line.detail}</span>}
                            </div>
                        );
                    })}
                </div>
            </Slot>
        </Stage>
    );
}

// ---- social proof ----

export function QuoteWall(p: LaunchProps) {
    const k = useKit(p);
    const quotes = listOf(p.items, [], 6).map((q, i) => ({ ...q, i }));
    const drift = k.ramp(0, k.seconds, 0, k.u * 2.5);
    return (
        <Stage p={p}>
            <Lockup k={k} p={p} t0={0.1} place={k.stacked ? 'top' : 'sideLeft'} size={5.2} />
            <Slot k={k} side="right" below>
                <div style={{ display: 'flex', gap: k.u * 1.8, width: k.stacked ? '90%' : '92%', alignItems: 'flex-start' }}>
                    {[0, 1].map((c) => (
                        <div key={c} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: k.u * 1.8, marginTop: c ? k.u * 5 : 0, transform: `translateY(${c ? drift : -drift}px)` }}>
                            {quotes.filter((q) => q.i % 2 === c).map((q) => {
                                const a = k.pop(0.15 + q.i * 0.1, 12);
                                return (
                                    <div key={q.i} style={{ ...card(k, { padding: k.u * 2.2 }), opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - a) * k.u * 5}px) scale(${0.95 + 0.05 * a})` }}>
                                        <div style={{ fontFamily: k.display, fontSize: k.tx * 6, lineHeight: 0.6, color: k.c.accent, height: k.tx * 3 }}>“</div>
                                        <div style={{ fontSize: k.tx * 2.3, lineHeight: 1.4 }}>{q.text}</div>
                                        {q.detail && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.2, marginTop: k.u * 1.6, color: k.c.muted, fontSize: k.tx * 1.9 }}>
                                                <span style={{ width: k.u * 3, height: k.u * 3, borderRadius: '50%', background: `linear-gradient(135deg, ${k.c.accent}, ${al(k.c.accent, 0.4)})`, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{q.detail.charAt(0)}</span>{q.detail}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </Slot>
        </Stage>
    );
}

export function GithubStars(p: LaunchProps) {
    const k = useKit(p);
    const HIT = 1.6;
    const count = easeOut(k.ramp(0.2, HIT));
    const burst = k.ramp(HIT, HIT + 0.7);
    const flare = flashAfter(k.s, HIT, 4);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.8} a={0.18 + flare * 0.25} scale={k.pop(0, 14)} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={enter(k, 0)}>{p.eyebrow}</Kicker>
                <div style={{ ...card(k, { display: 'flex', alignItems: 'center', gap: k.u * 3, padding: `${k.u * 3}px ${k.u * 5}px`, borderColor: al(k.c.accent, 0.3 + flare * 0.6), boxShadow: `0 ${k.u * 3}px ${k.u * 9}px #000a, 0 0 ${k.u * (4 + flare * 8)}px ${al(k.c.accent, 0.25 + flare * 0.3)}` }), ...enter(k, 0.05, { y: 4, scale: 0.06 }) }}>
                    <div style={{ position: 'relative', width: k.u * 11, height: k.u * 11 }}>
                        <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 ${k.u * (1 + flare * 4)}px #f4c655)`, transform: `rotate(${(1 - count) * -40}deg) scale(${(0.6 + 0.4 * count) * (1 + flare * 0.2)})` }}>
                            <path d="M12 2l2.9 6.3 6.8.8-5 4.7 1.3 6.8L12 17.3 6 20.6l1.3-6.8-5-4.7 6.8-.8z" fill="#f4c655" />
                        </svg>
                        <Ping k={k} t0={HIT} r={20} />
                        {burst > 0 && burst < 1 && Array.from({ length: 8 }, (_, i) => {
                            const a = (i / 8) * TAU + 0.3;
                            const d = k.u * (6 + 10 * easeOut(burst));
                            return <span key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: k.u * 0.9, height: k.u * 0.9, marginLeft: -k.u * 0.45, borderRadius: '50%', background: i % 2 ? k.c.text : k.c.accent, opacity: 1 - burst, transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(${1 - burst * 0.6})` }} />;
                        })}
                    </div>
                    <div>
                        <div style={{ fontFamily: k.display, fontWeight: 900, fontSize: k.tx * 11, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{Math.round(p.metric * count).toLocaleString()}</div>
                        <div style={{ color: k.c.muted, fontSize: k.tx * 2.5, marginTop: k.u }}>{p.headline}</div>
                        <div style={{ height: k.u * 0.7, marginTop: k.u * 1.4, borderRadius: k.u, background: al(k.c.muted, 0.2) }}><div style={{ width: `${count * 100}%`, height: '100%', borderRadius: k.u, background: k.c.accent, boxShadow: `0 0 ${k.u * 2}px ${al(k.c.accent, 0.6)}` }} /></div>
                    </div>
                </div>
                <Sub k={k} style={enter(k, 0.6)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

const MEDAL_STAR = 'M50 30l5.5 11.5 12.5 1.5-9.2 8.6 2.4 12.4L50 57l-11.2 6 2.4-12.4-9.2-8.6 12.5-1.5z';

export function AwardBadges(p: LaunchProps) {
    const k = useKit(p);
    const badges = listOf(p.items, [], 4);
    const medal = k.u * (k.stacked ? 13 : 10);
    return (
        <Stage p={p}>
            <Lockup k={k} p={p} t0={0.1} place={k.stacked ? 'top' : 'sideLeft'} size={5.4} />
            <Slot k={k} side="right" below>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: k.u * 2, width: k.stacked ? '88%' : '90%' }}>
                    {badges.map((b, i) => {
                        const t = 0.2 + i * 0.18;
                        const a = k.pop(t, 11);
                        const shine = k.ramp(t + 0.2, t + 0.9, -60, 160);
                        return (
                            <div key={i} style={{ ...card(k, { position: 'relative', overflow: 'hidden', padding: `${k.u * 2.4}px ${k.u * 1.6}px`, textAlign: 'center', borderColor: al(k.c.accent, 0.5) }), opacity: Math.min(1, a * 1.6), transform: `translateY(${(1 - a) * -k.u * 6}px) scale(${0.8 + 0.2 * a}) rotate(${(1 - a) * -8}deg)` }}>
                                <svg width={medal} height={medal} viewBox="0 0 100 100" style={glow(k, k.c.accent, 1.5 + 2.5 * flashAfter(k.s, t + 0.1, 4))}>
                                    <path d="M34 62l-8 30 14-7 10 8 4-26zM66 62l8 30-14-7-10 8-4-26z" fill={al(k.c.muted, 0.7)} />
                                    <circle cx="50" cy="42" r="30" fill={k.c.accent} />
                                    <circle cx="50" cy="42" r="30" fill="none" stroke={al(k.c.text, 0.55)} strokeWidth="1.4" />
                                    <circle cx="50" cy="42" r="25" fill="none" stroke={al(k.c.text, 0.3)} strokeWidth="0.8" strokeDasharray="2 2" />
                                    <path d={MEDAL_STAR} fill="#fff" />
                                </svg>
                                <div style={{ fontWeight: 800, fontSize: k.tx * 2.7, marginTop: k.u * 1.2 }}>{b.text}</div>
                                {b.detail && <div style={{ color: k.c.muted, fontSize: k.tx * 2, marginTop: k.u * 0.5 }}>{b.detail}</div>}
                                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${shine - 14}%, ${al(k.c.text, 0.14)} ${shine}%, transparent ${shine + 14}%)` }} />
                            </div>
                        );
                    })}
                </div>
            </Slot>
        </Stage>
    );
}

// ---- calls to action ----

export function UrlTyped(p: LaunchProps) {
    const k = useKit(p);
    const TYPE0 = 0.25;
    const typeEnd = TYPE0 + Math.min(1.4, p.date.length * 0.07);
    const LOAD = typeEnd + 0.25;
    const load = k.ramp(LOAD, LOAD + 0.6);
    const page = k.pop(LOAD + 0.5, 13);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.85} a={0.22} scale={k.pop(0, 14)} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={enter(k, 0)}>{p.eyebrow}</Kicker>
                <div style={{ width: k.stacked ? '88%' : '60%', ...enter(k, 0.05, { y: 4, scale: 0.06 }) }}>
                    <Win k={k} title="" width="100%" height={k.u * 38}>
                        <div style={{ padding: `${k.u * 1.6}px ${k.u * 2}px`, borderBottom: `1px solid ${al(k.c.muted, 0.13)}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.2, padding: `${k.u * 1.2}px ${k.u * 2}px`, borderRadius: 999, background: al(k.c.bg, 0.67), border: `1px solid ${al(k.c.accent, load > 0 ? 0.6 : 0.2)}`, ...mono(k) }}>
                                <span style={{ color: '#7fe3a8' }}>🔒</span><span>{typed(p.date, k.ramp(TYPE0, typeEnd))}</span><span style={{ color: k.c.accent, opacity: load > 0 ? 0 : k.frame % 16 < 9 ? 1 : 0 }}>|</span>
                            </div>
                            <div style={{ height: k.u * 0.35, marginTop: k.u, background: k.c.accent, boxShadow: `0 0 ${k.u * 2}px ${al(k.c.accent, 0.7)}`, transformOrigin: 'left', transform: `scaleX(${load})`, opacity: 1 - k.ramp(LOAD + 0.6, LOAD + 0.8) }} />
                        </div>
                        <div style={{ position: 'absolute', inset: 0, top: k.u * 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: k.u * 3, background: `radial-gradient(circle at 50% 30%, ${al(k.c.accent, 0.2)}, transparent 60%)`, opacity: Math.min(1, page * 1.6), transform: `translateY(${(1 - page) * k.u * 3}px)` }}>
                            <Headline k={k} size={6}>{p.headline}</Headline>
                            <div style={{ position: 'relative', padding: `${k.u * 1.4}px ${k.u * 3.4}px`, borderRadius: k.u * 1.4, background: k.c.accent, color: '#fff', fontWeight: 750, fontSize: k.tx * 2.6, boxShadow: `0 ${k.u}px ${k.u * 4}px ${al(k.c.accent, 0.5)}` }}>Get started<Ping k={k} t0={LOAD + 0.8} r={10} /></div>
                        </div>
                    </Win>
                </div>
                <Sub k={k} style={enter(k, 0.4)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function WaitlistEmail(p: LaunchProps) {
    const k = useKit(p);
    const email = p.date || 'you@company.com';
    const PRESS = 2;
    const ok = k.pop(PRESS + 0.1, 11);
    const done = k.s > PRESS + 0.1;
    const burst = k.ramp(PRESS + 0.1, PRESS + 0.9);
    const [cx, cy] = glide(k, 0.5, PRESS - 0.05, [104, 175], [88, 55], 8);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={k.height / 2} r={shortSide(k) * 0.8} a={0.18 + 0.25 * flashAfter(k.s, PRESS + 0.1, 4)} scale={k.pop(0, 14)} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={enter(k, 0)}>{p.eyebrow}</Kicker>
                <Headline k={k} size={7} style={enter(k, 0.1, { y: 4 })}>{p.headline}</Headline>
                <div style={{ position: 'relative', width: k.stacked ? '86%' : '50%', ...enter(k, 0.25, { y: 4 }) }}>
                    <div style={{ ...card(k, { display: 'flex', alignItems: 'center', gap: k.u * 1.6, padding: k.u * 1.4, borderRadius: 999, borderColor: done ? k.c.accent : al(k.c.muted, 0.27), boxShadow: `0 ${k.u * 2}px ${k.u * 7}px #0008, 0 0 ${k.u * 5 * ok}px ${al(k.c.accent, 0.35)}` }) }}>
                        <div style={{ flex: 1, padding: `0 ${k.u * 2.4}px`, ...mono(k), fontSize: k.tx * 2.7, color: done ? k.c.muted : k.c.text }}>{typed(email, k.ramp(0.3, 1.5))}{!done && <span style={{ color: k.c.accent }}>|</span>}</div>
                        <div style={{ padding: `${k.u * 1.6}px ${k.u * 3.2}px`, borderRadius: 999, background: done ? '#2fbf7a' : k.c.accent, color: '#fff', fontWeight: 750, fontSize: k.tx * 2.5, transform: `scale(${k.s > PRESS && k.s < PRESS + 0.15 ? 0.94 : 1})`, whiteSpace: 'nowrap' }}>{done ? '✓ You’re in' : 'Join waitlist'}</div>
                    </div>
                    {burst > 0 && burst < 1 && Array.from({ length: 10 }, (_, i) => {
                        const a = (i / 10) * TAU + seeded(i) * 0.5;
                        const d = k.u * (8 + 12 * seeded(i + 9)) * easeOut(burst);
                        return <span key={i} style={{ position: 'absolute', left: '86%', top: '50%', width: k.u * 1, height: k.u * 1, borderRadius: '50%', background: i % 3 ? k.c.accent : k.c.text, opacity: 1 - burst, transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + burst * burst * k.u * 4}px)` }} />;
                    })}
                    <Cursor k={k} x={cx} y={cy} press={k.ramp(PRESS, PRESS + 0.3)} />
                </div>
                <Sub k={k} style={enter(k, 0.4)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function LaunchDateBadge(p: LaunchProps) {
    const k = useKit(p);
    const land = k.pop(0.1, 9);
    const size = k.u * 46;
    const ring = `${p.eyebrow || 'LAUNCHING'} · ${p.eyebrow || 'LAUNCHING'} · `.toUpperCase();
    return (
        <Stage p={p}>
            <Slot k={k}>
                <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center', opacity: Math.min(1, land * 2), transform: `scale(${0.4 + 0.6 * land}) rotate(${(1 - land) * -40}deg)` }}>
                    <Ping k={k} t0={0.3} r={34} />
                    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', transform: `rotate(${k.s * 12}deg)` }}>
                        <defs><path id="ldRing" d="M50 50 m-43 0 a43 43 0 1 1 86 0 a43 43 0 1 1 -86 0" /></defs>
                        <circle cx="50" cy="50" r="48.5" fill="none" stroke={al(k.c.accent, 0.4)} strokeWidth="0.4" strokeDasharray="1.5 2.5" />
                        <text fill={k.c.muted} fontSize="6.4" fontWeight="700" letterSpacing="2.4"><textPath href="#ldRing">{ring}</textPath></text>
                    </svg>
                    <div style={{ width: '74%', height: '74%', borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${al(k.c.text, 0.35)}, ${k.c.accent} 45%, ${al(k.c.accent, 0.75)})`, display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: `0 ${k.u * 2}px ${k.u * 5}px #0008, 0 0 ${k.u * (7 + Math.sin(k.s * 3) * 2)}px ${al(k.c.accent, 0.55)}` }}>
                        <div style={{ fontFamily: k.display, fontWeight: 900, fontSize: k.u * Math.min(9, 50 / Math.max(5, p.date.length)), color: '#fff', lineHeight: 1, padding: '0 8%', textWrap: 'balance' }}>{p.date}</div>
                    </div>
                </div>
            </Slot>
            <Lockup k={k} p={{ ...p, eyebrow: '' }} t0={0.5} size={5.4} />
        </Stage>
    );
}

export function ButtonPress(p: LaunchProps) {
    const k = useKit(p);
    const PRESS = 1.3;
    const flash = flashAfter(k.s, PRESS, 4);
    const [cx, cy] = glide(k, 0.1, PRESS, [70, 170], [62, 62], 10);
    const scale = k.s < PRESS ? 1 + Math.sin(k.s * 5) * 0.015 : k.s < PRESS + 0.12 ? 1 - (0.07 * (k.s - PRESS)) / 0.12 : 0.93 + 0.07 * k.pop(PRESS + 0.12, 8);
    const y = k.height * (k.stacked ? 0.66 : 0.68);
    return (
        <Stage p={p}>
            <Aura k={k} x={k.width / 2} y={y} r={shortSide(k) * 0.6} a={0.2 + flash * 0.3} scale={k.pop(0, 14)} />
            <Lockup k={k} p={p} t0={0.1} place="top" size={7} />
            <div style={{ position: 'absolute', left: '50%', top: y, transform: `translate(-50%, -50%) scale(${k.pop(0.15, 12)})` }}>
                {k.s < PRESS && [0, 1].map((i) => <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: k.u * 2.4, border: `${k.u * 0.4}px solid ${k.c.accent}`, opacity: 0.5 - ((k.s * 0.8 + i * 0.5) % 1) * 0.5, transform: `scale(${1 + ((k.s * 0.8 + i * 0.5) % 1) * 0.35})` }} />)}
                <div style={{ position: 'relative', padding: `${k.u * 2.6}px ${k.u * 7}px`, borderRadius: k.u * 2.4, background: `linear-gradient(${k.c.accent}, ${al(k.c.accent, 0.82)})`, color: '#fff', fontWeight: 800, fontSize: k.tx * 4, whiteSpace: 'nowrap', boxShadow: `inset 0 1px 0 ${al(k.c.text, 0.3)}, 0 ${k.u * 1.4}px ${k.u * (5 + flash * 6)}px ${al(k.c.accent, 0.55 + flash * 0.25)}`, transform: `scale(${scale})` }}>
                    {p.date || 'Get started'}
                    <Ping k={k} t0={PRESS} r={22} />
                    <Ping k={k} t0={PRESS + 0.12} r={30} />
                </div>
                <Cursor k={k} x={cx} y={cy} press={k.ramp(PRESS, PRESS + 0.3)} />
            </div>
        </Stage>
    );
}

export function QrEndCard(p: LaunchProps) {
    const k = useKit(p);
    const a = k.pop(0.05, 12);
    const SCAN0 = 0.5, SCAN1 = 1.3;
    const scan = k.ramp(SCAN0, SCAN1);
    const flash = flashAfter(k.s, SCAN1);
    const qr = k.u * (k.stacked ? 40 : 32);
    return (
        <Stage p={p}>
            <Slot k={k}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: k.u * 3.4, ...enter(k, 0.05, { y: 4, scale: 0.08 }) }}>
                    <div style={{ position: 'relative', padding: k.u * 2.2, borderRadius: k.u * 2.4, background: '#fff', boxShadow: `0 ${k.u * 3}px ${k.u * 8}px #0008, 0 0 ${k.u * (6 + flash * 8)}px ${al(k.c.accent, 0.4 + flash * 0.4)}` }}>
                        <SceneImage src={p.image} assets={p.assets} brand={p.brand} fit="contain" label="Add your QR code" style={{ width: qr, height: qr, borderRadius: k.u }} />
                        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => (
                            <div key={`${x}${y}`} style={{ position: 'absolute', [x ? 'right' : 'left']: -k.u * (1 + (1 - a) * 3), [y ? 'bottom' : 'top']: -k.u * (1 + (1 - a) * 3), width: k.u * 4, height: k.u * 4, borderStyle: 'solid', borderColor: k.c.accent, borderWidth: 0, [x ? 'borderRightWidth' : 'borderLeftWidth']: k.u * 0.7, [y ? 'borderBottomWidth' : 'borderTopWidth']: k.u * 0.7, borderRadius: k.u * 1.2 }} />
                        ))}
                        {scan > 0 && scan < 1 && <div style={{ position: 'absolute', left: k.u, right: k.u, top: `${scan * 100}%`, height: k.u * 0.5, borderRadius: k.u, background: k.c.accent, boxShadow: `0 0 ${k.u * 3}px ${k.c.accent}` }} />}
                        <Ping k={k} t0={SCAN1} r={26} />
                    </div>
                    {p.date && <Pill k={k} active style={enter(k, 0.9)}>{p.date}</Pill>}
                </div>
            </Slot>
            <Lockup k={k} p={p} t0={0.3} />
        </Stage>
    );
}
