import { SceneImage } from './SceneBase';
import { al } from './launch/shapes';
import { Heading, Stage, surface, take, useScene, type Scene } from './proofParts';
import type { Brand, SceneAssets } from './assets';

export interface LogoWallProps {
    heading: string;
    logos: { logo: string }[];
    style: 'grid' | 'marquee';
    mono: boolean;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const PLACEHOLDERS = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark'];

interface TileProps { s: Scene; logo: string; index: number; height: number; mono: boolean; brand: Brand; assets: SceneAssets; /** 0 to 1: how lit the tile is by the passing spotlight. */ lit?: number; entrance?: number }

function Tile({ s, logo, index, height, mono, brand, assets, lit = 0, entrance = 1 }: TileProps) {
    const { u, c } = s;
    return (
        <div style={{ ...surface(s, { radius: 1.8, alpha: 0.6 + 0.3 * lit }), height, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${u * 2}px`, borderColor: lit > 0.02 ? al(c.accent, 0.25 + 0.6 * lit) : undefined, boxShadow: `${surface(s).boxShadow}, 0 0 ${u * 4 * lit}px ${al(c.accent, 0.5 * lit)}`, opacity: Math.min(1, entrance * 2), transform: `translateY(${(1 - entrance) * u * 5 - lit * u * 0.6}px) scale(${0.9 + 0.1 * entrance + 0.03 * lit})` }}>
            {logo ? (
                <SceneImage src={logo} assets={assets} brand={brand} fit='contain' label='Logo' style={{ height: '70%', width: '100%', maxWidth: height * 3, filter: mono ? 'grayscale(1) brightness(1.6) contrast(0.9)' : 'none' }} />
            ) : (
                <span style={{ color: lit > 0.3 ? c.text : c.muted, fontFamily: s.display, fontSize: height * 0.34, fontWeight: 800, letterSpacing: -0.5 }}>{PLACEHOLDERS[index % PLACEHOLDERS.length]}</span>
            )}
        </div>
    );
}

/** "Trusted by" logos: a grid whose tiles spring in and are swept by a spotlight, or two rows gliding past in opposite directions. */
export function LogoWall({ heading, logos, style, mono, transparent, brand, assets }: LogoWallProps) {
    const s = useScene(brand);
    const { u, t, layout } = s;
    const list = take(logos, 12).filter((l) => l?.logo);
    const shown = list.length ? list : PLACEHOLDERS.map(() => ({ logo: '' }));
    const tileH = t * (layout.portrait ? 7 : 8);
    const tileProps = { s, height: tileH, mono, brand, assets };

    const marquee = () => {
        const half = Math.ceil(shown.length / 2);
        const rows = [shown.slice(0, half), shown.slice(half).length ? shown.slice(half) : shown.slice(0, half)];
        const itemW = tileH * 3;
        return (
            <div style={{ width: s.width, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: u * 4, padding: `${u * 2}px 0`, maskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)' }}>
                {rows.map((row, r) => {
                    const loop = row.length * (itemW + u * 6);
                    const offset = ((s.frame * u * 0.35 * (r === 0 ? 1 : -1)) % loop + loop) % loop;
                    const slide = s.pop(0.08 + r * 0.1);
                    return (
                        <div key={r} style={{ display: 'flex', gap: u * 6, opacity: Math.min(1, slide * 2), transform: `translateX(${-offset + (1 - slide) * (r ? -1 : 1) * u * 20}px)` }}>
                            {[...row, ...row, ...row, ...row].map((l, i) => <div key={i} style={{ width: itemW, flexShrink: 0 }}><Tile {...tileProps} logo={l.logo} index={i} /></div>)}
                        </div>
                    );
                })}
            </div>
        );
    };

    const grid = () => {
        const cols = layout.portrait ? 2 : shown.length <= 6 ? 3 : Math.min(4, Math.ceil(Math.sqrt(shown.length * 1.6)));
        // The spotlight visits each tile in turn once they are all in.
        const sweep = (i: number) => Math.max(0, 1 - Math.abs(s.seconds - (0.5 + shown.length * 0.04 + i * 0.1)) / 0.35);
        return (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${u * 4}px ${u * 6}px`, width: Math.min(s.innerW, cols * tileH * 3.6) }}>
                {shown.map((l, i) => <Tile key={i} {...tileProps} logo={l.logo} index={i} entrance={s.pop(0.1 + i * 0.05)} lit={sweep(i)} />)}
            </div>
        );
    };

    return (
        <Stage s={s} transparent={transparent}>
            <Heading s={s} text={heading} size={5} muted />
            {style === 'marquee' ? marquee() : grid()}
        </Stage>
    );
}
