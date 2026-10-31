import { SceneImage } from './SceneBase';
import { al } from './launch/shapes';
import { Heading, Sheen, Stage, headRoom, surface, take, useScene, type Scene } from './proofParts';
import type { Brand, SceneAssets } from './assets';

export interface TeamProps {
    heading: string;
    people: { name: string; role: string; photo: string }[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

interface PersonProps { s: Scene; person: TeamProps['people'][number]; i: number; width: number; photo: number; brand: Brand; assets: SceneAssets }

function Person({ s, person, i, width, photo, brand, assets }: PersonProps) {
    const { u, t, c } = s;
    const at = 0.12 + i * 0.09;
    const card = s.pop(at);
    const avatar = s.pop(at + 0.06);
    const text = s.pop(at + 0.14);
    return (
        <div style={{ width, boxSizing: 'border-box', padding: `0 ${u * 1.2}px` }}>
            <div style={{ ...surface(s), position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: `${u * 3}px ${u * 1.5}px`, opacity: Math.min(1, card * 2), transform: `translateY(${(1 - card) * u * 8}px) scale(${0.94 + 0.06 * card})` }}>
                <Sheen s={s} at={at + 0.1} />
                <div style={{ position: 'relative', width: photo, height: photo, transform: `scale(${avatar})` }}>
                    <div style={{ position: 'absolute', inset: -photo * 0.18, borderRadius: '50%', background: `radial-gradient(closest-side, ${al(c.accent, 0.4)}, transparent)` }} />
                    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', padding: u * 0.5, boxSizing: 'border-box', background: `conic-gradient(from ${200 + s.frame * 0.5}deg, ${c.accent}, ${c.muted}, ${c.accent})` }}>
                        {person.photo ? (
                            <SceneImage src={person.photo} assets={assets} brand={brand} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `linear-gradient(145deg, ${al(c.accent, 0.3)}, ${c.surface})`, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: s.display, fontSize: photo * 0.34, fontWeight: 750 }}>{initialsOf(person.name)}</div>
                        )}
                    </div>
                </div>
                <div style={{ marginTop: t * 2, opacity: Math.min(1, text * 1.6), transform: `translateY(${(1 - text) * u * 3}px)` }}>
                    <div style={{ color: c.text, fontFamily: s.display, fontSize: t * 3.2, fontWeight: 750, lineHeight: 1.15 }}>{person.name}</div>
                    {person.role && <div style={{ display: 'inline-block', color: c.accent, background: al(c.accent, 0.14), border: `1px solid ${al(c.accent, 0.3)}`, fontSize: t * 2.1, fontWeight: 650, lineHeight: 1.25, marginTop: u, padding: `${u * 0.5}px ${u * 1.4}px`, borderRadius: 99 }}>{person.role}</div>}
                </div>
            </div>
        </div>
    );
}

/** The people behind it: cards rise in one by one, each with a glowing ringed photo (or initials), a name and a role pill. */
export function Team({ heading, people, transparent, brand, assets }: TeamProps) {
    const s = useScene(brand);
    const { layout, t } = s;
    const list = take(people, 6).filter((p) => p?.name?.trim());
    const n = Math.max(1, list.length);
    const cols = layout.portrait || (layout.stacked && n === 4) ? Math.min(2, n) : layout.stacked ? Math.min(3, n) : n === 4 ? 4 : Math.min(3, n);
    const cellW = s.innerW / cols;
    const cellH = (s.height - layout.safeY * 2 - headRoom(s, heading)) / Math.ceil(n / cols);
    const photo = Math.min(cellW * 0.55, cellH - t * 10, t * 24);
    return (
        <Stage s={s} transparent={transparent} at={[50, 70]}>
            <Heading s={s} text={heading} />
            {/* Wrapping rows, centred, so a short last row sits in the middle. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: s.innerW, rowGap: t * 3 }}>
                {list.map((person, i) => <Person key={i} s={s} person={person} i={i} width={cellW} photo={photo} brand={brand} assets={assets} />)}
            </div>
        </Stage>
    );
}
