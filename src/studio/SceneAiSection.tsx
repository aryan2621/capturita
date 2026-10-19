import { useState } from 'react';
import { AlertTriangle, Check, Clapperboard, Loader2, Pencil, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage, type CursorData, type Project } from '../lib/api';
import { Button, cx } from '../components/ui';
import type { Edit } from '../editor/model';
import { applySceneProposals, askScenes, type Placement, type SceneProposal } from './aiScenes';
import { useBrandKits } from './brandKits';
import { sceneLabel } from './scenes';
import type { SceneEnv } from './scenes/assets';

const EXAMPLES = ['Make a launch intro with our logo and a title', 'Add an end card that says try it free', 'Point out the button I click', 'Make the title shorter'];

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
    const [result, setResult] = useState<{ summary: string; proposals: SceneProposal[]; playhead: number } | null>(null);
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

    const apply = () => {
        if (!result) return;
        const picked = result.proposals.filter((p) => chosen.has(p.id));
        onApply(applySceneProposals(edit, picked, result.playhead), `ai-scenes-${Date.now()}`);
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
                                    <div key={p.id} className={cx('flex items-start gap-2 rounded-lg border p-2', on ? 'border-accent/50 bg-accent/10' : 'border-line opacity-70')}>
                                        <button
                                            role='checkbox'
                                            aria-checked={on}
                                            disabled={broken}
                                            onClick={() => toggle(p.id)}
                                            className={cx('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border', on ? 'border-accent bg-accent text-white' : 'border-line-strong', broken && 'cursor-not-allowed')}
                                            aria-label={on ? 'Leave this scene out' : 'Include this scene'}
                                        >
                                            {on && <Check className='h-3 w-3' />}
                                        </button>
                                        <div className='min-w-0 flex-1 space-y-0.5 text-xs'>
                                            <div className='flex items-center gap-1.5 font-medium text-fg'>
                                                {p.action === 'edit' ? <Pencil className='h-3.5 w-3.5 text-muted' /> : <Wand2 className='h-3.5 w-3.5 text-muted' />}
                                                {p.action === 'edit' ? `Change the ${sceneLabel(p.scene).toLowerCase()}` : `${sceneLabel(p.scene)} ${WHERE[p.placement]}`}
                                            </div>
                                            {p.changes.map((c) => (
                                                <p key={c.label} className='text-muted'>
                                                    <span className='text-fg'>{c.label}:</span> {c.before !== undefined && <span className='line-through'>{c.before || '—'}</span>} {c.after || '—'}
                                                </p>
                                            ))}
                                            {p.kept.length > 0 && <p className='text-muted'>Kept your changes to {p.kept.join(', ').toLowerCase()}.</p>}
                                            {broken && (
                                                <div className='flex gap-1.5 text-amber-400'>
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
                                <Check className='h-4 w-4' /> Apply {chosen.size}
                            </Button>
                        )}
                        <Button variant='ghost' className={result.proposals.length ? '' : 'flex-1'} onClick={() => setResult(null)}>
                            <X className='h-4 w-4' /> {result.proposals.length ? 'Discard' : 'Back'}
                        </Button>
                    </div>
                </div>
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
                            <button key={example} onClick={() => ask(example)} className='rounded-full bg-panel-2 px-2.5 py-1 text-xs text-muted hover:bg-line hover:text-fg'>
                                {example}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
