import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Player, Thumbnail } from '@remotion/player';
import { Clock3, Plus, Search, X } from 'lucide-react';
import { Button, IconButton, TextInput } from '../components/ui';
import { SCENE_FPS, SCENES } from './scenes';
import { LAUNCH_CATEGORIES, LAUNCH_SCENES, type LaunchScene } from './scenes/launch/catalog';
import type { SceneEnv } from './scenes/assets';
import { sceneInputProps } from './sceneEnv';

const ALL = 'All';
/** The size previews are drawn at; cards scale it down. */
const FRAME = { width: 1280, height: 720 };

const inputsFor = (scene: LaunchScene, env: SceneEnv) => sceneInputProps({ scene: scene.id, props: SCENES[scene.id].defaultProps } as never, env);
const frames = (scene: LaunchScene) => Math.round(scene.duration * SCENE_FPS);

/** Renders its child only once scrolled near view, so 50 live previews don't all mount at once. */
function Lazy({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [seen, setSeen] = useState(false);
    useEffect(() => {
        const node = ref.current;
        if (!node || seen) return;
        const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { rootMargin: '240px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [seen]);
    return <div ref={ref} className='aspect-video w-full overflow-hidden rounded-lg bg-black/30'>{seen ? children : null}</div>;
}

/** A still of the real scene, from near its end where the layout is complete, scaled to the card. */
const Still = memo(function Still({ scene, env }: { scene: LaunchScene; env: SceneEnv }) {
    return (
        <Lazy>
            <Thumbnail
                component={SCENES[scene.id].component}
                inputProps={inputsFor(scene, env)}
                compositionWidth={FRAME.width}
                compositionHeight={FRAME.height}
                durationInFrames={frames(scene)}
                fps={SCENE_FPS}
                frameToDisplay={Math.round(frames(scene) * 0.7)}
                style={{ width: '100%', height: '100%' }}
            />
        </Lazy>
    );
});

function Live({ scene, env }: { scene: LaunchScene; env: SceneEnv }) {
    return (
        <div className='aspect-video w-full overflow-hidden rounded-xl border border-line bg-black/30'>
            <Player
                key={scene.id}
                component={SCENES[scene.id].component}
                inputProps={inputsFor(scene, env)}
                compositionWidth={FRAME.width}
                compositionHeight={FRAME.height}
                durationInFrames={frames(scene)}
                fps={SCENE_FPS}
                autoPlay
                loop
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
}

export function SceneLibrary({ env, onClose, onAdd }: { env: SceneEnv; onClose: () => void; onAdd: (id: string) => void }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string>(ALL);
    const [selectedId, setSelectedId] = useState(LAUNCH_SCENES[0].id);
    const count = (name: string) => (name === ALL ? LAUNCH_SCENES.length : LAUNCH_SCENES.filter((s) => s.category === name).length);
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return LAUNCH_SCENES.filter((s) => (category === ALL || s.category === category) && (!needle || `${s.title} ${s.description} ${s.category} ${s.beat} ${s.tags.join(' ')}`.toLowerCase().includes(needle)));
    }, [category, query]);
    const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0];

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            onClose();
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    return createPortal(
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm' onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <section role='dialog' aria-modal='true' aria-label='Scene library' className='flex h-[min(860px,calc(100vh-32px))] w-[min(1360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl'>
                <nav aria-label='Scene categories' className='flex w-48 shrink-0 flex-col gap-0.5 border-r border-line bg-bg/30 p-3 max-md:hidden'>
                    <h2 className='px-2 pb-2 pt-1 text-sm font-semibold text-fg'>Scene library</h2>
                    {[ALL, ...LAUNCH_CATEGORIES].map((name) => (
                        <button key={name} type='button' onClick={() => setCategory(name)} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${category === name ? 'bg-accent/15 font-semibold text-accent' : 'text-muted hover:bg-panel-2 hover:text-fg'}`}>
                            {name}<span className='text-[10px] opacity-70'>{count(name)}</span>
                        </button>
                    ))}
                </nav>

                <div className='flex min-w-0 flex-1 flex-col'>
                    <header className='flex shrink-0 items-center gap-3 border-b border-line px-5 py-3'>
                        <Search className='h-4 w-4 shrink-0 text-muted' />
                        <div className='flex-1'><TextInput autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Search 50 scenes: hook, chart, terminal, CTA…' aria-label='Search scenes' /></div>
                        <IconButton label='Close scene library' onClick={onClose}><X className='h-4 w-4' /></IconButton>
                    </header>

                    <div className='grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] max-lg:grid-cols-1'>
                        <div className='min-h-0 overflow-y-auto p-5'>
                            {filtered.length === 0 ? (
                                <p className='mt-20 text-center text-sm text-muted'>No scenes match “{query.trim()}”.</p>
                            ) : (
                                <div className='grid grid-cols-2 gap-3 xl:grid-cols-3'>
                                    {filtered.map((s) => (
                                        <button key={s.id} type='button' onClick={() => setSelectedId(s.id)} onDoubleClick={() => onAdd(s.id)} aria-pressed={selected?.id === s.id} className={`rounded-xl border p-2 text-left transition-all hover:-translate-y-0.5 ${selected?.id === s.id ? 'border-accent bg-accent/5 shadow-md shadow-accent/10' : 'border-line hover:border-fg/25'}`}>
                                            <Still scene={s} env={env} />
                                            <div className='mt-2 flex items-center justify-between gap-2 px-0.5'>
                                                <span className='truncate text-xs font-semibold text-fg'>{s.title}</span>
                                                <span className='shrink-0 text-[10px] text-muted'>{s.duration}s</span>
                                            </div>
                                            <div className='px-0.5 text-[10px] text-muted'>{s.beat} · {s.category}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <aside className='flex min-h-0 flex-col gap-3 overflow-y-auto border-l border-line bg-bg/30 p-5 max-lg:hidden'>
                            {selected ? (
                                <>
                                    <Live scene={selected} env={env} />
                                    <div>
                                        <h3 className='text-base font-semibold text-fg'>{selected.title}</h3>
                                        <div className='mt-1 flex flex-wrap gap-1'>{selected.tags.map((t) => <span key={t} className='rounded-md bg-panel-2 px-1.5 py-0.5 text-[10px] text-muted'>{t}</span>)}</div>
                                    </div>
                                    <p className='text-xs leading-5 text-muted'>{selected.description}</p>
                                    <div className='rounded-lg border border-line bg-panel p-3'>
                                        <div className='flex items-center gap-1.5 text-[11px] font-semibold text-fg'><Clock3 className='h-3.5 w-3.5 text-accent' />{selected.duration}s · {selected.difficulty}</div>
                                        <p className='mt-1.5 text-xs leading-5 text-muted'>{selected.choreography}</p>
                                    </div>
                                    <p className='text-[11px] leading-4 text-muted'><span className='font-semibold text-fg'>Tip: </span>{selected.tip}</p>
                                    <Button className='mt-auto' onClick={() => onAdd(selected.id)}><Plus className='h-4 w-4' /> Add at playhead</Button>
                                </>
                            ) : null}
                        </aside>
                    </div>
                </div>
            </section>
        </div>,
        document.body
    );
}
