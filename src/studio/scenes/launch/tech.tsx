// Code, terminal and AI scenes.
import type { ReactNode } from 'react';
import { Check, Col, Headline, Kicker, Stage, Sub, Win, easeOut, listOf, mono, seeded, typed, useKit, type Kit, type LaunchProps } from './kit';
import { al } from './shapes';
import { Atmosphere, Caret, OK, glass, rise } from './fx';

const TERMINAL_BG = '#0a0c14';

/** A terminal window with the eyebrow above and the caption below; `hit` is when its result lands. */
function TerminalFrame({ p, k, title, hit, children, height = 40 }: { p: LaunchProps; k: Kit; title: string; hit: number; children: ReactNode; height?: number }) {
    const a = k.pop(0.05, 14);
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.48} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <Win k={k} title={title} width={k.stacked ? '88%' : '62%'} height={k.u * height} style={{ background: TERMINAL_BG, borderColor: al(k.c.accent, 0.3), boxShadow: `0 ${k.u * 3}px ${k.u * 10}px #000b, 0 0 ${k.u * (6 + 5 * k.pop(hit, 10))}px ${al(k.c.accent, 0.2)}`, opacity: Math.min(1, a * 2), transform: `translateY(${(1 - a) * k.u * 5}px) scale(${0.94 + 0.06 * a})` }}>
                    <div style={{ ...mono(k), padding: k.u * 2.6, color: '#d6dcf5', display: 'flex', flexDirection: 'column', gap: k.u * 1.1, lineHeight: 1.45 }}>{children}</div>
                </Win>
                <Headline k={k} size={4.6} style={rise(k, hit)}>{p.headline}</Headline>
                <Sub k={k} style={{ fontSize: k.tx * 2.6, ...rise(k, hit + 0.12) }}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

const Prompt = ({ k, mark = '❯' }: { k: Kit; mark?: string }) => <span style={{ color: k.c.accent }}>{mark} </span>;
const Success = ({ k, at, children }: { k: Kit; at: number; children: ReactNode }) => <div style={{ color: OK, ...rise(k, at, 2) }}>✓ {children}</div>;

export function TerminalSession(p: LaunchProps) {
    const k = useKit(p);
    const lines = listOf(p.items, [], 4);
    const per = 0.65;
    const startOf = (i: number) => 0.25 + i * per;
    const hit = startOf(lines.length - 1) + per; // the last command has succeeded
    return (
        <TerminalFrame p={p} k={k} title="zsh" hit={hit}>
            {lines.map((line, i) => {
                const t0 = startOf(i);
                const done = k.s > t0 + per * 0.55;
                if (k.s < t0) return null;
                return (
                    <div key={i}>
                        <div><Prompt k={k} />{typed(line.text, k.ramp(t0, t0 + per * 0.5))}{!done && <Caret k={k} colour={k.c.text} />}</div>
                        {done && line.detail && <Success k={k} at={t0 + per * 0.55}>{line.detail}</Success>}
                    </div>
                );
            })}
            {k.s > hit && <div><Prompt k={k} /><Caret k={k} colour={k.c.text} /></div>}
        </TerminalFrame>
    );
}

export function OneCommandInstall(p: LaunchProps) {
    const k = useKit(p);
    const command = p.items[0]?.text || 'npm create launch@latest';
    const run = 1; // enter pressed; the install starts
    const hit = 2.5;
    const progress = easeOut(k.ramp(run, hit));
    const done = k.s >= hit;
    return (
        <TerminalFrame p={p} k={k} title="install" hit={hit} height={30}>
            <div><Prompt k={k} mark="$" />{typed(command, k.ramp(0.2, run - 0.1))}{!done && <Caret k={k} colour={k.c.text} />}</div>
            {k.s > run && (
                <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 1.6 }}>
                    <div style={{ flex: 1, height: k.u * 1.1, borderRadius: k.u, background: al(k.c.muted, 0.2), overflow: 'hidden' }}><div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: k.u, background: `linear-gradient(90deg, ${al(k.c.accent, 0.6)}, ${k.c.accent})`, boxShadow: `0 0 ${k.u * 2}px ${k.c.accent}` }} /></div>
                    <span style={{ color: k.c.muted, fontVariantNumeric: 'tabular-nums' }}>{Math.round(progress * 100)}%</span>
                </div>
            )}
            {done && <Success k={k} at={hit}>{p.items[0]?.detail || 'Ready in 4s'}</Success>}
        </TerminalFrame>
    );
}

/** The ✦ mark, spinning while the model is working. */
const Spark = ({ k, busy }: { k: Kit; busy: boolean }) => <span style={{ display: 'inline-block', transform: busy ? `rotate(${k.frame * 8}deg)` : 'none' }}>✦</span>;

export function AiPromptToResult(p: LaunchProps) {
    const k = useKit(p);
    const send = Math.min(1.3, 0.3 + p.headline.length * 0.03); // enter pressed
    const hit = send + 0.45; // the answer starts streaming
    const stream = k.ramp(hit, hit + 1.8);
    const press = k.pop(send, 8);
    const sent = k.s >= send;
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.55} />
            <Col k={k} style={{ alignItems: 'stretch', width: k.stacked ? '86%' : '58%' }} gap={2.4}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ ...glass(k, { padding: `${k.u * 2.4}px ${k.u * 3}px`, display: 'flex', alignItems: 'center', gap: k.u * 2, borderRadius: k.u * 2.2, borderColor: al(k.c.accent, sent ? 0.4 : 0.75) }), ...rise(k, 0.08, 4) }}>
                    <div style={{ flex: 1, fontSize: k.tx * 3, minHeight: k.tx * 3.6 }}>{typed(p.headline, k.ramp(0.25, send))}{!sent && <Caret k={k} colour={k.c.text} />}</div>
                    <div style={{ width: k.u * 5, height: k.u * 5, borderRadius: k.u * 1.4, background: k.c.accent, color: k.c.bg, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: k.tx * 2.6, transform: `scale(${sent ? 0.8 + 0.2 * press : 1})`, boxShadow: sent ? `0 0 ${k.u * 4}px ${k.c.accent}` : 'none' }}>↑</div>
                </div>
                {sent && (
                    <div style={{ ...glass(k, { padding: k.u * 3, borderLeft: `${k.u * 0.5}px solid ${k.c.accent}` }), ...rise(k, send + 0.15, 4) }}>
                        <div style={{ color: k.c.accent, fontWeight: 700, fontSize: k.tx * 2, marginBottom: k.u * 1.2 }}><Spark k={k} busy={stream < 1} /> {k.s < hit ? 'Thinking…' : stream < 1 ? 'Writing…' : 'Done in 2.1s'}</div>
                        {k.s < hit
                            ? [80, 55].map((w, i) => <div key={i} style={{ height: k.u * 1.6, width: `${w}%`, margin: `${k.u}px 0`, borderRadius: k.u, background: `linear-gradient(90deg, ${al(k.c.accent, 0.12)}, ${al(k.c.accent, 0.4)}, ${al(k.c.accent, 0.12)})`, backgroundSize: '200% 100%', backgroundPosition: `${200 - ((k.s * 120 + i * 40) % 200)}% 0` }} />)
                            : <div style={{ fontSize: k.tx * 2.8, lineHeight: 1.5, color: k.c.text }}>{typed(p.subtitle, stream)}{stream < 1 && <Caret k={k} />}</div>}
                    </div>
                )}
            </Col>
        </Stage>
    );
}

export function AiAgentSteps(p: LaunchProps) {
    const k = useKit(p);
    const steps = listOf(p.items, [], 5);
    const per = 0.45;
    const startOf = (i: number) => 0.35 + i * per;
    const hit = startOf(steps.length); // every step is done
    const overall = k.ramp(startOf(0), hit);
    const size = k.u * 3.6;
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.5} />
            <Col k={k} gap={3}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <Headline k={k} size={5.5} style={rise(k, 0.1)}>{p.headline}</Headline>
                <div style={{ ...glass(k, { width: k.stacked ? '86%' : '50%', padding: k.u * 2.6, borderColor: al(k.c.accent, 0.35 + 0.4 * k.pop(hit, 10)) }), display: 'flex', flexDirection: 'column', gap: k.u * 1.6, ...rise(k, 0.15, 5) }}>
                    <div style={{ height: k.u * 0.5, borderRadius: k.u, background: al(k.c.muted, 0.2), overflow: 'hidden', marginBottom: k.u * 0.6 }}><div style={{ width: `${overall * 100}%`, height: '100%', background: `linear-gradient(90deg, ${al(k.c.accent, 0.5)}, ${k.c.accent})`, boxShadow: `0 0 ${k.u * 1.5}px ${k.c.accent}` }} /></div>
                    {steps.map((step, i) => {
                        const t0 = startOf(i);
                        const active = k.s >= t0 && k.s < t0 + per;
                        const done = k.s >= t0 + per;
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: k.u * 2, fontSize: k.tx * 2.8, opacity: k.s < t0 - 0.15 ? 0.4 : 1, padding: `${k.u * 0.6}px ${k.u}px`, margin: `0 -${k.u}px`, borderRadius: k.u, background: active ? al(k.c.accent, 0.14) : 'transparent', transform: `translateX(${active ? k.u * 0.8 : 0}px)` }}>
                                {done ? <Check k={k} size={3.6} progress={k.ramp(t0 + per, t0 + per + 0.2)} /> : (
                                    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: active ? `rotate(${k.frame * 14}deg)` : 'none' }}><circle cx="12" cy="12" r="10" fill="none" stroke={al(k.c.muted, 0.33)} strokeWidth="2.4" /><path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke={active ? k.c.accent : 'transparent'} strokeWidth="2.6" strokeLinecap="round" /></svg>
                                )}
                                <span style={{ flex: 1, color: done || active ? k.c.text : k.c.muted }}>{step.text}</span>
                                {step.detail && done && <span style={{ color: k.c.muted, fontSize: k.tx * 2 }}>{step.detail}</span>}
                            </div>
                        );
                    })}
                </div>
                <Sub k={k} style={rise(k, hit)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

/** JSON-ish text with string values picked out in green. */
const colourStrings = (text: string) => text.split(/("[^"]*")/).map((part, i) => (i % 2 ? <span key={i} style={{ color: OK }}>{part}</span> : part));

export function ApiRequestResponse(p: LaunchProps) {
    const k = useKit(p);
    const out = { from: 0.55, to: 1.15 };
    const back = { from: 1.3, to: 1.9 };
    const hit = back.to;
    const arrived = k.s >= hit;
    const panel = (title: string, body: string, live: boolean, delay: number) => (
        <div style={{ ...glass(k, { flex: 1, padding: k.u * 2, borderColor: live ? k.c.accent : al(k.c.muted, 0.25) }), ...mono(k), fontSize: k.tx * 2.1, whiteSpace: 'pre', lineHeight: 1.5, ...rise(k, delay, 4) }}>
            <div style={{ color: k.c.accent, fontWeight: 700, marginBottom: k.u }}>{title}</div>{colourStrings(body)}
        </div>
    );
    /** A glowing packet with a tail, `dir` 1 going right and -1 coming back. */
    const packet = (t: number, colour: string, dir: 1 | -1) => t > 0 && t < 1 && (
        <div style={{ position: 'absolute', left: `${dir === 1 ? t * 100 : 100 - t * 100}%`, top: '50%', width: k.u * 1.8, height: k.u * 1.8, marginLeft: -k.u * 0.9, marginTop: -k.u * 0.9, borderRadius: '50%', background: colour, boxShadow: `0 0 ${k.u * 2.4}px ${colour}, ${-dir * k.u * 2}px 0 ${k.u * 1.6}px ${al(colour, 0.5)}` }} />
    );
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.48} />
            <Col k={k} gap={3.5}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ display: 'flex', alignItems: 'stretch', width: k.stacked ? '90%' : '72%' }}>
                    {panel('POST /launch', `{\n  "name": "${p.items[0]?.text || 'My product'}",\n  "ready": true\n}`, k.s < back.from, 0.1)}
                    <div style={{ position: 'relative', width: '14%' }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: `linear-gradient(90deg, ${al(k.c.accent, 0.5)}, ${al(OK, 0.5)})`, opacity: 0.5 }} />
                        {packet(k.ramp(out.from, out.to), k.c.accent, 1)}
                        {packet(k.ramp(back.from, back.to), OK, -1)}
                    </div>
                    {panel(arrived ? '200 OK' : '···', arrived ? `{\n  "status": "live",\n  "url": "${p.items[0]?.detail || 'launch.app'}"\n}` : '\n\n', arrived, 0.2)}
                </div>
                <Headline k={k} size={4.6} style={rise(k, hit)}>{p.headline}</Headline>
                <Sub k={k} style={{ fontSize: k.tx * 2.6, ...rise(k, hit + 0.12) }}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}

export function AiVoiceWave(p: LaunchProps) {
    const k = useKit(p);
    const start = 0.4; // mic goes live
    const hit = 2.3; // transcript complete, the wave calms
    const active = k.s > start && k.s < hit;
    const level = active ? 0.55 + 0.45 * Math.sin(k.s * 3) ** 2 : 0.1;
    const bars = 41;
    const ripple = (offset: number) => (k.s * 1.1 + offset) % 1;
    const orb = k.pop(0.05, 10);
    return (
        <Stage p={p}>
            <Atmosphere k={k} hit={hit} y={0.4} a={0.16 + 0.14 * (active ? level : 0)} />
            <Col k={k} gap={3.5}>
                <Kicker k={k} style={rise(k, 0.05)}>{p.eyebrow}</Kicker>
                <div style={{ position: 'relative', width: k.u * 14, height: k.u * 14, display: 'grid', placeItems: 'center', transform: `scale(${orb})` }}>
                    {[0, 0.5].map((o) => <div key={o} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `${k.u * 0.4}px solid ${k.c.accent}`, opacity: active ? 1 - ripple(o) : 0, transform: `scale(${1 + ripple(o) * 1.1})` }} />)}
                    <div style={{ width: k.u * 11, height: k.u * 11, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${al(k.c.text, 0.5)}, ${k.c.accent} 55%)`, display: 'grid', placeItems: 'center', boxShadow: `0 0 ${k.u * (5 + 4 * level)}px ${al(k.c.accent, 0.7)}`, transform: `scale(${1 + (active ? 0.05 * level : 0)})` }}>
                        <svg width={k.u * 5} height={k.u * 5} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" fill="#fff" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: k.u * 0.7, height: k.u * 12 }}>
                    {Array.from({ length: bars }, (_, i) => {
                        const shape = Math.sin((i / (bars - 1)) * Math.PI);
                        const h = 0.1 + shape * level * (0.4 + 0.6 * Math.abs(Math.sin(k.s * 7 + i * 1.7 + seeded(i) * 6)));
                        return <div key={i} style={{ width: k.u * 0.6, height: `${h * 100}%`, borderRadius: k.u, background: k.c.accent, opacity: (0.35 + shape * 0.65) * Math.min(1, k.s * 4), boxShadow: active && shape > 0.6 ? `0 0 ${k.u}px ${al(k.c.accent, 0.6)}` : 'none' }} />;
                    })}
                </div>
                <Headline k={k} size={5.5} style={{ minHeight: k.tx * 6 }}>{typed(p.headline, k.ramp(start + 0.2, hit))}{k.s < hit && <Caret k={k} />}</Headline>
                <Sub k={k} style={rise(k, hit)}>{p.subtitle}</Sub>
            </Col>
        </Stage>
    );
}
