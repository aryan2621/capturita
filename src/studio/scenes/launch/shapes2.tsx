// More abstract shape-animation scenes (see catalog-shapes.ts); shared helpers come from shapes.tsx.
import type { CSSProperties } from 'react';
import { Kicker, Headline, Rule, Stage, Sub, easeOut, seeded, useKit, type LaunchProps } from './kit';
import { Aura, Canvas, Lockup, Shock, TAU, al, clamp01, glow, polar, shortSide } from './shapes';

export function ShapeRipple(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const cell = M / 8.5;
    const cols = Math.ceil(k.width / cell) + 1;
    const rows = Math.ceil(k.height / cell) + 1;
    const [cx, cy] = [k.width / 2, k.height / 2];
    const clear: [number, number] = k.stacked ? [k.width * 0.4, k.height * 0.12] : [k.width * 0.26, k.height * 0.17];
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={M * 0.8} a={0.18} scale={k.pop(0.3, 14)} />
            <Canvas k={k}>
                {Array.from({ length: cols * rows }, (_, n) => {
                    const dx = (n % cols - (cols - 1) / 2) * cell;
                    const dy = (Math.floor(n / cols) - (rows - 1) / 2) * cell;
                    const dist = Math.hypot(dx, dy) / cell;
                    const delay = 0.35 + dist * 0.07;
                    const a = k.pop(delay, 9);
                    const inClear = Math.abs(dx) < clear[0] && Math.abs(dy) < clear[1];
                    const pulse = Math.exp(-((k.s - delay - 0.1) ** 2) / 0.03);
                    const keep = seeded(n) < 0.09;
                    const vanish = inClear ? 1 - clamp01((k.s - delay - 0.35) / 0.4) : 1;
                    if (vanish <= 0) return null;
                    const size = cell * 0.55 * a * (1 + pulse * 0.45 + 0.05 * Math.sin(k.s * 1.5 - dist * 0.5)) * (inClear ? vanish : 1);
                    return (
                        <rect key={n} x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.18}
                            transform={`translate(${cx + dx} ${cy + dy}) rotate(${(1 - a) * 90})`}
                            fill={keep ? al(k.c.accent, 0.5 + pulse * 0.4) : al(pulse > 0.05 ? k.c.accent : k.c.muted, 0.12 + pulse * 0.75)} stroke={al(k.c.muted, 0.22)} strokeWidth={k.u * 0.15}
                            style={pulse > 0.2 || keep ? glow(k, k.c.accent, 1.5 + pulse * 2) : undefined} />
                    );
                })}
                <Shock k={k} x={cx} y={cy} r0={cell} r1={M * 0.4} t0={0.35} t1={1.1} width={0.5} />
            </Canvas>
            <Lockup k={k} p={p} t0={1.2} place="center" maxW={clear[0] * 1.8} size={5.6} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

export function ShapeIris(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const [cx, cy] = [k.width / 2, k.height / 2];
    const N = 7;
    const open = k.pop(0.35, 11);
    const r = Math.max(M * 0.02, M * 0.4 * open);
    const reach = Math.hypot(k.width, k.height) * 0.6;
    const half = r * Math.tan(Math.PI / N) * 1.9;
    const blade = (i: number) => {
        const th = (i / N) * TAU + (1 - open) * 0.6 + k.s * 0.04;
        const [tx, ty] = polar(cx, cy, r, th);
        const [dx, dy] = [-Math.sin(th), Math.cos(th)];
        const [fa, fb] = [polar(cx, cy, reach, th + (TAU / N) * 0.75), polar(cx, cy, reach, th - (TAU / N) * 0.75)];
        return `${tx - dx * half},${ty - dy * half} ${tx + dx * half},${ty + dy * half} ${fa[0]},${fa[1]} ${fb[0]},${fb[1]}`;
    };
    return (
        <Stage p={p}>
            <Canvas k={k}>
                <defs>
                    <radialGradient id="si-light"><stop offset="0" stopColor={k.c.accent} stopOpacity="0.55" /><stop offset="0.7" stopColor={k.c.accent} stopOpacity="0.18" /><stop offset="1" stopColor={k.c.bg} stopOpacity="0" /></radialGradient>
                </defs>
                <circle cx={cx} cy={cy} r={r * 1.5 + M * 0.05} fill="url(#si-light)" />
                {Array.from({ length: N }, (_, i) => (
                    <polygon key={i} points={blade(i)} fill={i % 2 ? k.c.surface : k.c.bg} stroke={al(k.c.accent, 0.35)} strokeWidth={k.u * 0.2} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 ${k.u * 2}px ${al('#000000', 0.55)})` }} />
                ))}
                <circle cx={cx} cy={cy} r={r * 1.04} fill="none" stroke={al(k.c.accent, 0.5 * open)} strokeWidth={k.u * 0.2} />
                <Shock k={k} x={cx} y={cy} r0={r} r1={M * 0.9} t0={0.9} t1={2} a={0.5} />
            </Canvas>
            <Lockup k={k} p={p} t0={1.2} place="center" maxW={M * 0.6} size={4.8} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

/** Distance from the centre at angle `a` for a regular polygon with n corners (circumradius 1, corner at angle 0). */
const polyR = (n: number) => (a: number) => {
    const w = TAU / n;
    return Math.cos(Math.PI / n) / Math.cos((((a % w) + w) % w) - Math.PI / n);
};
const SHAPES: ((a: number) => number)[] = [
    () => 1,
    (a) => 0.9 * polyR(4)(a + Math.PI / 4),
    (a) => 1.04 * (1 - 0.5 * Math.abs(Math.sin(2.5 * (a + Math.PI / 2))) ** 0.85),
    (a) => 0.98 * polyR(6)(a + Math.PI / 2),
];
const SAMPLES = 96;
const ANGLES = Array.from({ length: SAMPLES }, (_, i) => -Math.PI / 2 + (i / SAMPLES) * TAU);

export function ShapeMorph(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const side = !k.stacked;
    const cx = side ? k.width * 0.3 : k.width / 2;
    const cy = side ? k.height / 2 : k.height * 0.36;
    const R = M * (side ? 0.26 : 0.24);
    const STAGES = [0.6, 1.3, 2.0];
    const points = (lag: number, scale: number) => {
        const t = STAGES.map((s) => k.pop(s + lag, 9));
        const rot = -(t[0] * 0.2 + t[1] * 0.35 + t[2] * 0.3);
        return ANGLES.map((a) => {
            const r = SHAPES[0](a) + (SHAPES[1](a) - SHAPES[0](a)) * t[0] + (SHAPES[2](a) - SHAPES[1](a)) * t[1] + (SHAPES[3](a) - SHAPES[2](a)) * t[2];
            return polar(cx, cy, R * scale * r * k.pop(lag, 12), a + rot).join(',');
        }).join(' ');
    };
    const hit = k.s - 2;
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={R * 2.4} a={0.26} scale={k.pop(0, 12)} />
            <Canvas k={k}>
                <defs>
                    <linearGradient id="sm-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={k.c.text} stopOpacity="0.55" /><stop offset="0.5" stopColor={k.c.accent} /><stop offset="1" stopColor={k.c.accent} stopOpacity="0.8" /></linearGradient>
                </defs>
                <polygon points={points(0.2, 1.46)} fill="none" stroke={al(k.c.muted, 0.2)} strokeWidth={k.u * 0.2} strokeLinejoin="round" />
                <polygon points={points(0.1, 1.22)} fill="none" stroke={al(k.c.accent, 0.45)} strokeWidth={k.u * 0.25} strokeLinejoin="round" />
                <g style={{ filter: `drop-shadow(0 ${k.u * 3}px ${k.u * 5}px ${al(k.c.bg, 0.8)}) drop-shadow(0 0 ${k.u * 5}px ${al(k.c.accent, 0.5)})` }}>
                    <polygon points={points(0, 1)} fill="url(#sm-fill)" strokeLinejoin="round" stroke={al(k.c.text, 0.35)} strokeWidth={k.u * 0.2} />
                </g>
                {hit > 0 && Array.from({ length: 8 }, (_, i) => {
                    const t = easeOut(hit / 1.2);
                    const [x, y] = polar(cx, cy, R * (1.1 + t * (0.5 + 0.5 * seeded(i))), (i / 8) * TAU + 0.3);
                    return <circle key={i} cx={x} cy={y} r={M * 0.008 * (1 - t)} fill={i % 2 ? k.c.text : k.c.accent} />;
                })}
                <Shock k={k} x={cx} y={cy} r0={R} r1={R * 2} t0={2} />
            </Canvas>
            <Lockup k={k} p={p} t0={2.1} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

export function ShapeBurst(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const [cx, cy] = [k.width / 2, k.height / 2];
    const HIT = 0.8;
    const ax = k.stacked ? 1 : 1.5;
    const charge = k.ramp(0.1, HIT);
    const spin = 1 - easeOut(k.ramp(HIT, HIT + 2.2));
    const pieces = Array.from({ length: 56 }, (_, i) => {
        const q = k.pop(HIT + seeded(i + 7) * 0.05, 12);
        const [a, rt, sz] = [seeded(i) * TAU, M * (0.34 + 0.4 * seeded(i + 99)), M * (0.012 + 0.03 * seeded(i + 5))];
        const x = cx + Math.cos(a) * rt * ax * q;
        const y = cy + Math.sin(a) * rt * q + Math.sin(k.s * 1.3 + i) * M * 0.006 * q;
        const col = seeded(i + 31);
        const fill = col < 0.45 ? k.c.accent : col < 0.6 ? al(k.c.text, 0.85) : col < 0.8 ? al(k.c.muted, 0.6) : al(k.c.surface, 1);
        const style: CSSProperties | undefined = col < 0.45 ? glow(k, k.c.accent, 1.2) : undefined;
        const sc = sz * Math.min(1.4, q);
        const rot = (seeded(i + 13) * 360 + (seeded(i + 3) - 0.5) * 900 * spin) % 360;
        const kind = i % 4;
        return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`} style={style}>
                {kind === 0 && <circle r={sc * 0.8} fill={fill} />}
                {kind === 1 && <rect x={-sc} y={-sc * 0.45} width={sc * 2} height={sc * 0.9} rx={sc * 0.2} fill={fill} />}
                {kind === 2 && <polygon points={`0,${-sc} ${sc * 0.9},${sc * 0.7} ${-sc * 0.9},${sc * 0.7}`} fill={fill} />}
                {kind === 3 && <circle r={sc} fill="none" stroke={col < 0.45 ? k.c.accent : k.c.muted} strokeWidth={k.u * 0.3} />}
            </g>
        );
    });
    return (
        <Stage p={p}>
            <Aura k={k} x={cx} y={cy} r={M * 0.8} a={0.2 + 0.25 * Math.exp(-Math.abs(k.s - HIT) * 3)} scale={0.6 + charge * 0.4} />
            <Canvas k={k}>
                {k.s < HIT + 0.2 && <circle cx={cx} cy={cy} r={M * (0.02 + 0.045 * easeOut(charge)) * (1 - 0.15 * Math.sin(charge * 40) * charge) * (k.s > HIT ? 1 - (k.s - HIT) * 5 : 1)} fill={k.c.accent} style={glow(k, k.c.accent, 4 + charge * 6)} />}
                {pieces}
                <Shock k={k} x={cx} y={cy} r0={M * 0.05} r1={M * 1.1} t0={HIT} t1={1.9} width={0.6} />
                <Shock k={k} x={cx} y={cy} r0={M * 0.05} r1={M * 0.8} t0={HIT + 0.12} t1={1.9} a={0.4} />
            </Canvas>
            <Lockup k={k} p={p} t0={1.2} place="center" maxW={M * 0.6 * ax} size={5.6} />
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

export function ShapeRibbons(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const ribbon = (top: number, h: number, left: number, w: number, bg: string, delay: number, drift: number, extra?: CSSProperties) => {
        const a = k.pop(delay, 11);
        return <div style={{ position: 'absolute', top: `${top}%`, height: `${h}%`, left: `${left}%`, width: `${w}%`, background: bg, transform: `translateX(${(1 - a) * -115 + (k.s * drift)}%) skewX(-22deg)`, borderRadius: k.u * 0.4, ...extra }} />;
    };
    const mainIn = k.pop(0.45, 10);
    const sweep = k.ramp(0.9, 1.6, -60, 160);
    const copy = k.stacked ? 'center' : 'left';
    return (
        <Stage p={p}>
            <div style={{ position: 'absolute', inset: 0, perspective: M * 1.6 }}>
                <div style={{ position: 'absolute', inset: 0, transform: `rotateY(-16deg) rotateX(8deg) rotateZ(-8deg) scale(1.2)` }}>
                    {ribbon(14, 9, 14, 72, al(k.c.muted, 0.14), 0.3, 0.4)}
                    {ribbon(24, 10, 6, 88, al(k.c.accent, 0.3), 0.2, -0.3)}
                    {ribbon(33, 3.2, 10, 70, k.c.accent, 0.1, 0.6, { boxShadow: `0 0 ${k.u * 4}px ${al(k.c.accent, 0.7)}` })}
                    {ribbon(66.5, 3.2, 20, 70, al(k.c.text, 0.8), 0.35, -0.5)}
                    {ribbon(72, 11, 12, 76, al(k.c.accent, 0.5), 0.25, 0.3, { boxShadow: `0 0 ${k.u * 5}px ${al(k.c.accent, 0.4)}` })}
                    {ribbon(86, 6, 24, 62, al(k.c.muted, 0.2), 0.4, -0.4)}
                    <div style={{ position: 'absolute', top: '49%', left: '8%', width: '84%', overflow: 'hidden', transform: `translate(${(1 - mainIn) * -115}%, -50%) skewX(-22deg)`, background: `linear-gradient(120deg, ${k.c.surface}, ${k.c.bg})`, border: `${k.u * 0.25}px solid ${al(k.c.accent, 0.7)}`, borderRadius: k.u * 0.6, boxShadow: `0 ${k.u * 3}px ${k.u * 8}px ${al('#000000', 0.55)}, 0 0 ${k.u * 6}px ${al(k.c.accent, 0.3)}` }}>
                        <div style={{ position: 'absolute', top: 0, bottom: 0, width: '16%', left: `${sweep}%`, background: `linear-gradient(90deg, transparent, ${al(k.c.text, 0.28)}, transparent)` }} />
                        <div style={{ transform: 'skewX(22deg)', display: 'flex', flexDirection: 'column', alignItems: k.stacked ? 'center' : 'flex-start', textAlign: copy, gap: k.u * 1.6, padding: `${k.u * 4}px ${k.u * 8}px` }}>
                            <Kicker k={k} style={{ textAlign: copy, opacity: k.pop(0.8) }}>{p.eyebrow}</Kicker>
                            {p.headline && <Headline k={k} size={5.4} style={{ textAlign: copy, maxWidth: '100%', opacity: k.pop(0.95), transform: `translateX(${(1 - k.pop(0.95, 12)) * k.u * 6}px)` }}>{p.headline}</Headline>}
                            <Rule k={k} width={12} progress={k.pop(1.1)} />
                            <Sub k={k} style={{ textAlign: copy, maxWidth: '100%', opacity: k.pop(1.2) }}>{p.subtitle}</Sub>
                        </div>
                    </div>
                </div>
            </div>
        </Stage>
    );
}

// ---------------------------------------------------------------------------------------------

/** Isometric stack: columns whose height steps down from the back corner, as unit cubes. */
const CUBES = (() => {
    const list: [number, number, number][] = [];
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3 - Math.max(x, y); z++) list.push([x, y, z]);
    return list.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]) || a[2] - b[2]);
})();
const COS30 = Math.cos(Math.PI / 6);

export function ShapeCubes(p: LaunchProps) {
    const k = useKit(p);
    const M = shortSide(k);
    const side = !k.stacked;
    const [ox, oy, s] = [side ? k.width * 0.27 : k.width / 2, side ? k.height / 2 : k.height * 0.37, M * (side ? 0.105 : 0.1)];
    const P = (x: number, y: number, z: number) => `${ox + (x - y) * COS30 * s},${oy + ((x + y) / 2 - z + 0.5) * s}`;
    const HIT = 2.1;
    const flash = Math.exp(-Math.max(0, k.s - HIT) * 3) * (k.s >= HIT ? 1 : 0);
    const bob = Math.sin(k.s * 1.4) * k.u * 0.3 * k.ramp(HIT, HIT + 0.5);
    return (
        <Stage p={p}>
            <Aura k={k} x={ox} y={oy} r={M * 0.6} a={0.2 + flash * 0.2} scale={k.pop(0, 14)} />
            <Canvas k={k}>
                <defs><filter id="sc-blur"><feGaussianBlur stdDeviation={k.u * 2} /></filter></defs>
                <polygon points={[P(-0.2, -0.2, -0.1), P(3.4, -0.2, -0.1), P(3.4, 3.4, -0.1), P(-0.2, 3.4, -0.1)].join(' ')} fill="#000" opacity={0.35 * k.pop(0.1)} filter="url(#sc-blur)" />
                <g transform={`translate(0 ${bob})`}>
                    {CUBES.map(([x, y, z], o) => {
                        const a = k.pop(0.2 + o * 0.13, 13);
                        const lvl = 0.4 + 0.6 * (z / 2);
                        const top = z === 2;
                        const faces: [string, number][] = [
                            [`${P(x, y, z + 1)} ${P(x + 1, y, z + 1)} ${P(x + 1, y + 1, z + 1)} ${P(x, y + 1, z + 1)}`, top ? 1 : 0.75 * lvl],
                            [`${P(x, y + 1, z + 1)} ${P(x + 1, y + 1, z + 1)} ${P(x + 1, y + 1, z)} ${P(x, y + 1, z)}`, 0.35 * lvl],
                            [`${P(x + 1, y, z + 1)} ${P(x + 1, y + 1, z + 1)} ${P(x + 1, y + 1, z)} ${P(x + 1, y, z)}`, 0.12 * lvl],
                        ];
                        return (
                            <g key={o} opacity={Math.min(1, a * 3)} transform={`translate(0 ${-(1 - a) * s * 5})`} style={top ? glow(k, k.c.accent, 1 + flash * 5) : undefined}>
                                {faces.map(([pts, alpha], f) => (
                                    <g key={f}>
                                        <polygon points={pts} fill={k.c.surface} stroke={al(k.c.accent, 0.5)} strokeWidth={k.u * 0.18} strokeLinejoin="round" />
                                        <polygon points={pts} fill={al(k.c.accent, alpha)} />
                                    </g>
                                ))}
                            </g>
                        );
                    })}
                </g>
                <Shock k={k} x={ox} y={oy - s * 1.5} r0={s} r1={M * 0.5} t0={HIT} t1={3} />
            </Canvas>
            <Lockup k={k} p={p} t0={2.2} place="side" />
        </Stage>
    );
}
