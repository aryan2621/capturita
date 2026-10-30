import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, cx, Modal } from '../components/ui';
import { SCENES } from './scenes';
import { TEMPLATES, templateItems, type StudioTemplate, type TemplateScene } from './templates';
import { totalDuration } from '../editor/model';
import { formatDuration } from '../lib/api';

/** One line of what a scene says, for the script list. */
function gist({ scene, props }: TemplateScene): string {
    const p = props as { title?: string; lines?: { text: string }[]; messages?: { text: string }[]; heading?: string; headline?: string; text?: string; wordmark?: string; value?: string; label?: string; quote?: string; center?: string };
    if (p.lines?.length) return p.lines.map((l) => l.text).join(' ');
    if (p.messages?.length) return p.messages[0].text;
    return p.title ?? p.headline ?? p.heading ?? p.text?.replace(/\n/g, ' ') ?? p.wordmark ?? p.quote ?? p.value ?? p.center ?? p.label ?? SCENES[scene].label;
}

/** The look of a template as a small card: its own background, accent and text colours. */
function Swatch({ template, big }: { template: StudioTemplate; big?: boolean }) {
    const { bg, surface, text, accent, muted } = template.colors;
    return (
        <div
            className={cx('flex shrink-0 flex-col justify-end overflow-hidden rounded-lg border border-line p-3', big ? 'aspect-video w-full' : 'aspect-video w-32')}
            style={{ background: `radial-gradient(120% 110% at 50% 0%, ${surface} 0%, ${bg} 62%)`, color: text }}
        >
            <span className='h-1.5 w-1.5 rounded-full' style={{ background: accent }} />
            <span className={cx('font-semibold leading-tight', big ? 'text-3xl' : 'text-sm')}>{template.name}</span>
            {big && <span className='text-sm' style={{ color: muted }}>{template.scenes[0].props.subtitle as string}</span>}
        </div>
    );
}

/**
 * New Studio video: a scrollable list of templates (or a blank video) with a preview of the chosen
 * one and its script. Continue opens it in the editor.
 */
export function NewStudioDialog({ onClose, onContinue }: { onClose: () => void; onContinue: (template: StudioTemplate | null) => void }) {
    const [id, setId] = useState(TEMPLATES[0].id);
    const chosen = TEMPLATES.find((t) => t.id === id) ?? null;
    // Each template's real length, with its style's pace and joins applied.
    const lengths = useMemo(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, totalDuration(templateItems(t))])), []);
    return (
        <Modal onClose={onClose} className='max-w-4xl'>
            <div className='flex h-[80vh] max-h-[640px] flex-col'>
                <div className='border-b border-line px-5 py-4'>
                    <h2 className='font-serif text-lg font-medium'>New Studio video</h2>
                    <p className='text-sm text-muted'>Pick a starting point. Every scene and line stays editable.</p>
                </div>
                <div className='flex min-h-0 flex-1'>
                    <ul className='w-72 shrink-0 space-y-1 overflow-y-auto border-r border-line p-3' role='listbox' aria-label='Templates'>
                        {TEMPLATES.map((t) => (
                            <li key={t.id}>
                                <button type='button' role='option' aria-selected={t.id === id} onClick={() => setId(t.id)} className={cx('flex w-full flex-col gap-2 rounded-xl p-2 text-left transition-colors', t.id === id ? 'bg-accent/10 ring-1 ring-accent' : 'hover:bg-line/40')}>
                                    <Swatch template={t} />
                                    <span className='px-1 text-xs text-muted'>{t.blurb}</span>
                                    <span className='px-1 font-mono text-[11px] text-muted'>
                                        {t.scenes.length} scenes · {formatDuration(lengths[t.id])}
                                    </span>
                                </button>
                            </li>
                        ))}
                        <li>
                            <button type='button' role='option' aria-selected={id === ''} onClick={() => setId('')} className={cx('flex w-full items-center gap-2 rounded-xl p-3 text-left text-sm', id === '' ? 'bg-accent/10 ring-1 ring-accent' : 'hover:bg-line/40')}>
                                <Sparkles className='h-4 w-4 text-muted' /> Blank video
                            </button>
                        </li>
                    </ul>
                    <div className='flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5'>
                        {chosen ? (
                            <>
                                <Swatch template={chosen} big />
                                <ol className='space-y-2'>
                                    {chosen.scenes.map((s, i) => (
                                        <li key={i} className='flex gap-3 text-sm'>
                                            <span className='w-5 shrink-0 text-right font-mono text-xs text-muted'>{i + 1}</span>
                                            <span className='min-w-0'>
                                                <span className='font-medium'>{SCENES[s.scene].label}</span>
                                                <span className='block truncate text-muted'>{gist(s)}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </>
                        ) : (
                            <p className='text-sm text-muted'>An empty timeline with a starter scene. Add scenes yourself or let the AI draft them.</p>
                        )}
                    </div>
                </div>
                <div className='flex justify-end gap-2 border-t border-line px-5 py-3'>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant='primary' onClick={() => onContinue(chosen)}>
                        Continue
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
