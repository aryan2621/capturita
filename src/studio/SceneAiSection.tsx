import { useRef, useState } from 'react';
import { AlertTriangle, Check, Clapperboard, ImagePlus, Loader2, Music, Pencil, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage, type CursorData, type Project } from '../lib/api';
import { Button, cx, Segmented, Select, Slider } from '../components/ui';
import type { Edit } from '../editor/model';
import { applyDraft, draftVideo, MAX_DRAFT_SCENES } from './aiDraft';
import { applySceneProposals, askScenes, type Placement, type SceneProposal } from './aiScenes';
import { importSceneImage, useBrandKits } from './brandKits';
import { importMusicTrack } from '../editor/MusicPanel';
import { sceneLabel } from './scenes';
import type { SceneEnv } from './scenes/assets';
import { STYLES } from './styles';

const EXAMPLES = [
    'Make a launch intro with our logo and a title',
    'Add an end card that says try it free',
    'Point out the button I click',
    'Make the title shorter',
];

const WHERE: Record<Placement, string> = { start: 'at the start', end: 'at the end', playhead: 'at the playhead', over: 'over the video at the playhead' };

/** Scenes by asking: the AI plans and writes scenes (or changes existing ones) to review and apply. */
export function SceneAiSection({
    project,
    edit,
    cursor,
    env,
    size,
    playhead,
    onApply,
}: {
    project: Project;
    edit: Edit;
    cursor: CursorData | null;
    env: SceneEnv;
    /** Export size; scenes are checked at this aspect. */
    size: { width: number; height: number };
    playhead: () => number;
    onApply: (next: Edit, key: string) => void;
}) {
    const kits = useBrandKits();
    const [prompt, setPrompt] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [result, setResult] = useState<{ summary: string; proposals: SceneProposal[]; playhead: number; draft?: boolean } | null>(null);
    const [mode, setMode] = useState<'scenes' | 'video'>(project.kind === 'studio' ? 'video' : 'scenes');
    const [source, setSource] = useState('');
    const [sceneCount, setSceneCount] = useState(8);
    const [styleId, setStyleId] = useState(STYLES[0].id);
    // The draft's screenshots (copied into the project when picked) and song (copied in on apply, as it replaces the music file).
    const [shots, setShots] = useState<{ path: string; name: string }[]>([]);
    const [song, setSong] = useState<File | null>(null);
    const shotInput = useRef<HTMLInputElement>(null);
    const songInput = useRef<HTMLInputElement>(null);
    const addShots = async (files: FileList | null) => {
        try {
            for (const file of files ?? []) {
                const path = await importSceneImage(project.id, file);
                setShots((list) => [...list, { path, name: file.name }]);
            }
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            if (shotInput.current) shotInput.current.value = '';
        }
    };
    // A Studio video's draft replaces its timeline; a recording keeps it and gets the draft after it.
    const replace = project.kind === 'studio';
    const [chosen, setChosen] = useState<Set<string>>(new Set());

    const ask = async (request = prompt) => {
        if (!request.trim() || busy) return;
        setResult(null);
        setBusy('Planning the scenes');
        try {
            const now = playhead();
            const productName = kits.find((kit) => kit.id === edit.brandKit)?.name ?? '';
            const answer = await askScenes(request.trim(), { edit, project, cursor, env, size, productName, playhead: now, onStep: setBusy });
            setResult({ ...answer, playhead: now });
            setChosen(new Set(answer.proposals.filter((p) => p.errors.length === 0).map((p) => p.id)));
        } catch (error) {
            if (errorMessage(error) !== 'Cancelled') toast.error(errorMessage(error));
        } finally {
            setBusy(null);
        }
    };

    const draft = async () => {
        if (!source.trim() || busy) return;
        setResult(null);
        setBusy('Reading the text');
        try {
            const productName = kits.find((kit) => kit.id === edit.brandKit)?.name ?? '';
            const { facts, proposals } = await draftVideo(
                source,
                sceneCount,
                { edit, project, cursor, env, size, productName, playhead: playhead(), onStep: setBusy },
                { shots: shots.length, cinematic: styleId === 'cinematic' }
            );
            const fewer =
                proposals.length < sceneCount
                    ? ` The text supports ${proposals.length} of the ${sceneCount} asked for; add features, numbers, a quote or pricing for more.`
                    : '';
            const summary = `A ${proposals.length}-scene draft for ${facts.name || 'your product'}.${fewer} Untick any scene to leave it out.`;
            setResult({ summary, proposals, playhead: 0, draft: true });
            setChosen(new Set(proposals.filter((p) => p.errors.length === 0).map((p) => p.id)));
        } catch (error) {
            if (errorMessage(error) !== 'Cancelled') toast.error(errorMessage(error));
        } finally {
            setBusy(null);
        }
    };

    const apply = async () => {
        if (!result) return;
        const picked = result.proposals.filter((p) => chosen.has(p.id));
        const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0];
        let music = null;
        if (result.draft && song) {
            setBusy('Adding the music');
            try {
                music = await importMusicTrack(project, song, edit.audio.music);
            } catch (error) {
                toast.error(errorMessage(error));
            } finally {
                setBusy(null);
            }
        }
        const media = { screenshots: shots.map((shot) => shot.path), music };
        onApply(result.draft ? applyDraft(edit, picked, style, replace, media) : applySceneProposals(edit, picked, result.playhead), `ai-scenes-${Date.now()}`);
        toast.success(`${picked.length} scene${picked.length === 1 ? '' : 's'} applied — ⌘Z to undo`);
        setResult(null);
        setPrompt('');
    };

    const toggle = (id: string) => setChosen((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set(s).add(id)));

    return (
        <div className='space-y-3 border-t border-line pt-3'>
            <div className='flex items-center gap-2 text-xs text-muted'>
                <Clapperboard className='h-3.5 w-3.5' /> Scenes
            </div>
            {busy ? (
                <div className='flex items-center gap-2 rounded-lg bg-panel-2 p-3 text-xs text-fg'>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' /> {busy}…
                </div>
            ) : result ? (
                <div className='space-y-3'>
                    <p className='text-sm text-fg'>{result.summary}</p>
                    {result.proposals.length > 0 && (
                        <div className='max-h-[40vh] space-y-1 overflow-y-auto pr-1'>
                            {result.proposals.map((p) => {
                                const broken = p.errors.length > 0;
                                const on = chosen.has(p.id);
                                return (
                                    <div
                                        key={p.id}
                                        className={cx(
                                            'flex items-start gap-2 rounded-lg border p-2',
                                            on ? 'border-accent/50 bg-accent/10' : 'border-line opacity-70'
                                        )}
                                    >
                                        <button
                                            role='checkbox'
                                            aria-checked={on}
                                            disabled={broken}
                                            onClick={() => toggle(p.id)}
                                            className={cx(
                                                'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border',
                                                on ? 'border-accent bg-accent text-white' : 'border-line-strong',
                                                broken && 'cursor-not-allowed'
                                            )}
                                            aria-label={on ? 'Leave this scene out' : 'Include this scene'}
                                        >
                                            {on && <Check className='h-3 w-3' />}
                                        </button>
                                        <div className='min-w-0 flex-1 space-y-0.5 text-xs'>
                                            <div className='flex items-center gap-1.5 font-medium text-fg'>
                                                {p.action === 'edit' ? (
                                                    <Pencil className='h-3.5 w-3.5 text-muted' />
                                                ) : (
                                                    <Wand2 className='h-3.5 w-3.5 text-muted' />
                                                )}
                                                {result.draft
                                                    ? `${result.proposals.indexOf(p) + 1}. ${sceneLabel(p.scene)}`
                                                    : p.action === 'edit'
                                                      ? `Change the ${sceneLabel(p.scene).toLowerCase()}`
                                                      : `${sceneLabel(p.scene)} ${WHERE[p.placement]}`}
                                            </div>
                                            {p.changes.map((c) => (
                                                <p key={c.label} className='text-muted'>
                                                    <span className='text-fg'>{c.label}:</span>{' '}
                                                    {c.before !== undefined && <span className='line-through'>{c.before || '—'}</span>} {c.after || '—'}
                                                </p>
                                            ))}
                                            {p.kept.length > 0 && <p className='text-muted'>Kept your changes to {p.kept.join(', ').toLowerCase()}.</p>}
                                            {broken && (
                                                <div className='flex gap-1.5 text-warning-fg'>
                                                    <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                                                    <span>Couldn't get this right: {p.errors.join(' ')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className='flex gap-2'>
                        {result.proposals.length > 0 && (
                            <Button variant='primary' className='flex-1' onClick={apply} disabled={chosen.size === 0}>
                                <Check className='h-4 w-4' />{' '}
                                {result.draft && replace
                                    ? `Replace the timeline with ${chosen.size}`
                                    : result.draft
                                      ? `Add ${chosen.size} at the end`
                                      : `Apply ${chosen.size}`}
                            </Button>
                        )}
                        <Button variant='ghost' className={result.proposals.length ? '' : 'flex-1'} onClick={() => setResult(null)}>
                            <X className='h-4 w-4' /> {result.proposals.length ? 'Discard' : 'Back'}
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <Segmented<'scenes' | 'video'>
                        size='sm'
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'video', label: 'Whole video', hint: 'A full draft from a README or a description of the product' },
                            { value: 'scenes', label: 'Scenes', hint: 'Add or change a few scenes' },
                        ]}
                    />
                    {mode === 'video' ? (
                        <>
                            <textarea
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                rows={7}
                                placeholder='Paste your README, landing page text or a description: what it is, who it’s for, features, numbers, pricing, a customer quote, the website.'
                                className='w-full resize-y rounded-lg border border-line bg-panel-2 p-2 text-sm text-fg outline-none focus:border-accent'
                                aria-label='README or product description'
                            />
                            <Slider
                                label='Scenes'
                                value={sceneCount}
                                min={3}
                                max={MAX_DRAFT_SCENES}
                                step={1}
                                format={(v) => `up to ${v}`}
                                onChange={setSceneCount}
                            />
                            <input
                                ref={shotInput}
                                type='file'
                                multiple
                                accept='image/png,image/jpeg,image/webp,image/gif'
                                className='hidden'
                                onChange={(e) => addShots(e.target.files)}
                            />
                            <input
                                ref={songInput}
                                type='file'
                                accept='audio/*,.mp3,.m4a,.aac,.wav'
                                className='hidden'
                                onChange={(e) => (setSong(e.target.files?.[0] ?? null), (e.target.value = ''))}
                            />
                            <div className='flex gap-2'>
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    className='flex-1'
                                    onClick={() => shotInput.current?.click()}
                                    title='Shown in the feature spotlights, in order'
                                >
                                    <ImagePlus className='h-3.5 w-3.5' /> Screenshots{shots.length ? ` (${shots.length})` : ''}
                                </Button>
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    className='flex-1'
                                    onClick={() => songInput.current?.click()}
                                    title='Becomes the music; scenes are cut on its beats'
                                >
                                    <Music className='h-3.5 w-3.5' /> {song ? 'Change song' : 'Music'}
                                </Button>
                            </div>
                            {(shots.length > 0 || song) && (
                                <div className='flex flex-wrap gap-1'>
                                    {shots.map((shot, i) => (
                                        <span
                                            key={shot.path}
                                            className='flex items-center gap-1 rounded-full bg-panel-2 py-0.5 pl-2 pr-1 text-[11px] text-muted'
                                        >
                                            {i + 1}. <span className='max-w-24 truncate'>{shot.name}</span>
                                            <button
                                                onClick={() => setShots((list) => list.filter((s) => s !== shot))}
                                                className='hover:text-fg'
                                                aria-label={`Remove ${shot.name}`}
                                            >
                                                <X className='h-3 w-3' />
                                            </button>
                                        </span>
                                    ))}
                                    {song && (
                                        <span className='flex items-center gap-1 rounded-full bg-panel-2 py-0.5 pl-2 pr-1 text-[11px] text-muted'>
                                            <Music className='h-3 w-3' /> <span className='max-w-28 truncate'>{song.name}</span>
                                            <button onClick={() => setSong(null)} className='hover:text-fg' aria-label='Remove the song'>
                                                <X className='h-3 w-3' />
                                            </button>
                                        </span>
                                    )}
                                </div>
                            )}
                            <span className='block text-xs'>Style</span>
                            <Select value={styleId} onChange={(e) => setStyleId(e.target.value)} aria-label='Video style'>
                                {STYLES.map((style) => (
                                    <option key={style.id} value={style.id}>
                                        {style.label}
                                    </option>
                                ))}
                            </Select>
                            <p className='text-xs text-muted'>{(STYLES.find((st) => st.id === styleId) ?? STYLES[0]).hint}</p>
                            <Button className='w-full' onClick={draft} disabled={!source.trim()}>
                                <Wand2 className='h-4 w-4' /> Make a draft
                            </Button>
                            <p className='text-[11px] text-muted'>A minute or two with the AI on this Mac. Only facts from your text are used.</p>
                        </>
                    ) : (
                        <>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        ask();
                                    }
                                }}
                                rows={2}
                                placeholder='Describe scenes, e.g. “a launch intro with our logo”'
                                className='w-full resize-none rounded-lg border border-line bg-panel-2 p-2 text-sm text-fg outline-none focus:border-accent'
                                aria-label='What scenes should the AI make?'
                            />
                            <Button className='w-full' onClick={() => ask()} disabled={!prompt.trim()}>
                                <Wand2 className='h-4 w-4' /> Suggest scenes
                            </Button>
                            <div className='flex flex-wrap gap-1.5'>
                                {EXAMPLES.map((example) => (
                                    <button
                                        key={example}
                                        onClick={() => ask(example)}
                                        className='rounded-full bg-panel-2 px-2.5 py-1 text-xs text-muted hover:bg-line hover:text-fg'
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
