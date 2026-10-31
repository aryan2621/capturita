import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Check, Clapperboard, ImagePlus, Music, Pencil, Wand2, X } from 'lucide-react';
import { toast } from '../lib/toast';
import { api, errorMessage, type CursorData, type Project } from '../lib/api';
import { Button, cx, Segmented, Select, Slider, Spinner, TextArea, TextInput } from '../components/ui';
import type { Edit } from '../editor/model';
import { applyDraft, draftVideo, fillBarePictures, MAX_DRAFT_SCENES, reviewDraft } from './aiDraft';
import { applySceneProposals, askScenes, type Placement, type SceneProposal } from './aiScenes';
import { importSceneImage, kitFromSite, setBrandKits, useBrandKits } from './brandKits';
import { capturePage } from './capturePage';
import { polishDraft } from './polish';
import { importSfx, sfxNeeded, withTransitionSounds } from './sfx';
import { importMusicTrack } from '../editor/MusicPanel';
import { sceneLabel } from './scenes';
import type { SceneEnv } from './scenes/assets';
import { shuffleStyle, STYLES, type VideoStyle } from './styles';

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
    const [result, setResult] = useState<{ summary: string; proposals: SceneProposal[]; playhead: number; draft?: boolean; facts?: string } | null>(null);
    // Claude can look at the draft and rewrite its weakest scenes, when it is on.
    const [cloudOn, setCloudOn] = useState(false);
    useEffect(() => {
        api.aiCloud().then((c) => setCloudOn(c.enabled && c.hasKey)).catch(() => {});
    }, []);
    const [mode, setMode] = useState<'scenes' | 'video'>(project.kind === 'studio' ? 'video' : 'scenes');
    const [source, setSource] = useState('');
    const [sceneCount, setSceneCount] = useState(8);
    const [styleId, setStyleId] = useState('auto');
    // The look the draft chose from the text, used while Style is Match the text.
    const [autoLook, setAutoLook] = useState(STYLES[0].id);
    // Picking Shuffle makes one style that polish and apply both use.
    const [shuffled, setShuffled] = useState<VideoStyle | null>(null);
    const pickedStyle = styleId === 'shuffle' && shuffled ? shuffled : (STYLES.find((s) => s.id === (styleId === 'auto' ? autoLook : styleId)) ?? STYLES[0]);
    // The draft's screenshots (copied into the project when picked) and song (copied in on apply, as it replaces the music file).
    const [shots, setShots] = useState<{ path: string; name: string }[]>([]);
    const [song, setSong] = useState<File | null>(null);
    const [pageUrl, setPageUrl] = useState('');
    const [tall, setTall] = useState<string | null>(null);
    // A brand kit made from the captured page (its logo and colours), used by the draft if the video has none.
    const [pageKit, setPageKit] = useState<string | null>(null);
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
    // The product's own page: its screenshots become the shots, and its text the description (if none yet).
    const capture = async () => {
        const url = /^https?:\/\//i.test(pageUrl.trim()) ? pageUrl.trim() : `https://${pageUrl.trim()}`;
        setBusy('Capturing the page');
        try {
            const page = await capturePage(project.id, url);
            const found = [page.hero, ...page.sections];
            setShots((list) => [...list, ...found.map((path, i) => ({ path, name: i === 0 ? 'Page top' : `Page ${i}` }))]);
            setTall(page.full);
            // Picture scenes already on the timeline (added by hand) that still show a placeholder.
            const filled = fillBarePictures(edit.items, found, page.full);
            if (filled !== edit.items) onApply({ ...edit, items: filled }, `fill-pictures-${Date.now()}`);
            if (!source.trim()) setSource([page.title, page.description, page.text].filter(Boolean).join('\n\n'));
            let note = '';
            if (!edit.brandKit) {
                // The page's logo and colours are a bonus: without them the draft uses the default look.
                try {
                    const kit = await kitFromSite(url);
                    setBrandKits([...kits, kit]);
                    setPageKit(kit.id);
                    note = ` and a “${kit.name}” brand kit`;
                } catch (error) {
                    api.log(`[capture] no brand kit from the page: ${errorMessage(error)}`);
                }
            }
            toast.success(`Captured ${found.length} screenshots${note}`);
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(null);
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
            const { facts, proposals, look } = await draftVideo(
                source,
                sceneCount,
                { edit, project, cursor, env, size, productName, playhead: playhead(), onStep: setBusy },
                { shots: shots.length, cinematic: styleId === 'cinematic' }
            );
            setAutoLook(look);
            const fewer =
                proposals.length < sceneCount
                    ? ` The text supports ${proposals.length} of the ${sceneCount} asked for; add features, numbers, a quote or pricing for more.`
                    : '';
            const summary = `A ${proposals.length}-scene draft for ${facts.name || 'your product'}.${fewer} Untick any scene to leave it out.`;
            setResult({ summary, proposals, playhead: 0, draft: true, facts: JSON.stringify(facts) });
            setChosen(new Set(proposals.filter((p) => p.errors.length === 0).map((p) => p.id)));
        } catch (error) {
            if (errorMessage(error) !== 'Cancelled') toast.error(errorMessage(error));
        } finally {
            setBusy(null);
        }
    };

    // Claude looks at a picture of each scene and rewrites the weakest ones.
    const polish = async () => {
        if (!result?.draft || busy) return;
        const picked = result.proposals.filter((p) => chosen.has(p.id));
        const style = pickedStyle;
        setBusy('Polishing the draft');
        try {
            const productName = kits.find((kit) => kit.id === (edit.brandKit ?? pageKit))?.name ?? '';
            const media = { screenshots: shots.map((shot) => shot.path), tall, music: null };
            const polished = await polishDraft(picked, style, media, { edit, project, cursor, env, size, productName, playhead: playhead(), facts: result.facts, onStep: setBusy });
            const swapped = new Map(picked.flatMap((old, i) => (polished.proposals[i].id !== old.id ? [[old.id, polished.proposals[i]] as const] : [])));
            setResult({ ...result, proposals: result.proposals.map((p) => swapped.get(p.id) ?? p) });
            setChosen(new Set([...chosen].map((id) => swapped.get(id)?.id ?? id)));
            toast.success(swapped.size ? `Rewrote ${swapped.size} scene${swapped.size === 1 ? '' : 's'} that looked weak` : 'Nothing looked weak enough to change');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(null);
        }
    };

    const apply = async () => {
        if (!result) return;
        const picked = result.proposals.filter((p) => chosen.has(p.id));
        const style = pickedStyle;
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
        const media = { screenshots: shots.map((shot) => shot.path), tall, music };
        let next = result.draft ? applyDraft(edit, picked, style, replace, media) : applySceneProposals(edit, picked, result.playhead);
        if (result.draft) {
            // Movement sounds on the transitions the style added; if they can't be copied, the video just has none.
            try {
                const from = replace ? 0 : edit.items.length;
                next = withTransitionSounds(next, await importSfx(project.id, sfxNeeded(next.items.slice(from))), from);
            } catch (error) {
                toast.error(`Transition sounds skipped: ${errorMessage(error)}`);
            }
        }
        onApply(result.draft && !next.brandKit && pageKit ? { ...next, brandKit: pageKit } : next, `ai-scenes-${Date.now()}`);
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
                <div className='flex items-center gap-2 rounded-xl bg-fg/5 p-3 text-xs text-fg' role='status'>
                    <Spinner size={14} /> {busy}…
                </div>
            ) : result ? (
                <div className='space-y-3'>
                    <p className='text-sm text-fg'>{result.summary}</p>
                    {result.draft &&
                        (() => {
                            const picked = result.proposals.filter((p) => chosen.has(p.id));
                            return reviewDraft(picked, shots.length + (tall ? 1 : 0)).map((warning) => (
                                <p key={warning.message} className='flex items-start gap-1.5 text-xs text-warning-fg'>
                                    <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                                    <span className='flex-1'>{warning.message}</span>
                                    {warning.leaveOut && (
                                        <button
                                            className='shrink-0 cursor-default underline'
                                            onClick={() => setChosen((s) => new Set([...s].filter((id) => !warning.leaveOut!.some((i) => picked[i].id === id))))}
                                        >
                                            Leave out
                                        </button>
                                    )}
                                </p>
                            ));
                        })()}
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
                        {result.draft && cloudOn && chosen.size > 0 && (
                            <Button variant='ghost' onClick={polish} title='Claude looks at a picture of each scene and rewrites the weakest'>
                                <Wand2 className='h-4 w-4' /> Polish
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
                            <div className='flex gap-2'>
                                <TextInput
                                    size='sm'
                                    value={pageUrl}
                                    onChange={(e) => setPageUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && pageUrl.trim() && capture()}
                                    placeholder='Product website, e.g. acme.com'
                                    className='min-w-0 flex-1'
                                    aria-label='Product website'
                                />
                                <Button size='sm' variant='ghost' disabled={!pageUrl.trim()} onClick={capture} title='Takes screenshots of the page and reads its text'>
                                    <Camera className='h-3.5 w-3.5' /> Capture
                                </Button>
                            </div>
                            <TextArea
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                rows={7}
                                placeholder='Paste your README, landing page text or a description: what it is, who it’s for, features, numbers, pricing, a customer quote, the website.'
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
                            <Select value={styleId} onChange={(e) => { setStyleId(e.target.value); if (e.target.value === 'shuffle') setShuffled(shuffleStyle()); }} aria-label='Video style'>
                                <option value='auto'>Match the text</option>
                                <option value='shuffle'>Shuffle</option>
                                {STYLES.map((style) => (
                                    <option key={style.id} value={style.id}>
                                        {style.label}
                                    </option>
                                ))}
                            </Select>
                            <p className='text-xs text-muted'>{pickedStyle.hint}</p>
                            <Button className='w-full' onClick={draft} disabled={!source.trim()}>
                                <Wand2 className='h-4 w-4' /> Make a draft
                            </Button>
                            <p className='text-[11px] text-muted'>A minute or two with the AI on this Mac. Only facts from your text are used.</p>
                        </>
                    ) : (
                        <>
                            <TextArea
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
                                className='resize-none'
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
                                        className='rounded-full bg-fg/5 px-2.5 py-1 text-xs text-muted hover:bg-fg/10 hover:text-fg'
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
