import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Plus, Wand2, X } from 'lucide-react';
import { Button, Segmented, Slider, Switch } from '../components/ui';
import { canCrossfade, DEFAULT_CROSSFADE, DIRECTED_TRANSITIONS, MAX_CROSSFADE, moveItem, TRANSITION_KINDS, TRANSITION_LABELS, type OverlayClip, type SceneClip, type SoundCue, type TimelineItem, type Transition, type TransitionDirection, type TransitionKind } from '../editor/model';
import type { CursorData, Project } from '../lib/api';
import { SCENES, sceneLabel, type ListItemField, type SceneField } from './scenes';
import { SoundPicker } from '../editor/AudioClipsPanel';
import type { Segment, TargetRect } from './scenes/assets';
import { recordingRange, suggestTarget } from './sceneEnv';

/** A copy of `target` with `sound` set, or without one. */
function withSound<T extends { sound?: SoundCue }>(target: T, sound: SoundCue | undefined): T {
    const { sound: _, ...rest } = target;
    return (sound ? { ...rest, sound } : rest) as T;
}

const seconds = (value: number) => `${value.toFixed(1)} s`;
const clock = (value: number) => `${Math.floor(value / 60)}:${(value % 60).toFixed(1).padStart(4, '0')}`;
const inputClass = 'h-8 w-full rounded-lg border border-line bg-panel-2 px-2 text-sm text-fg outline-none focus:border-accent';

/**
 * Settings of a scene on the timeline: the fields its definition lists, how long it plays, how
 * it enters and leaves, and its place in the order. The brand comes from the Look tab.
 */
export function ScenePanel({
    items,
    scene,
    project,
    cursor,
    picking,
    onPick,
    onChange,
}: {
    items: TimelineItem[];
    scene: SceneClip;
    project: Project;
    cursor: CursorData | null;
    /** Whether the target is being drawn on the preview. */
    picking: boolean;
    onPick: (picking: boolean) => void;
    onChange: (items: TimelineItem[], key: string) => void;
}) {
    const index = items.findIndex((item) => item.id === scene.id);
    const definition = SCENES[scene.scene];
    const props: Record<string, unknown> = { ...definition?.defaultProps, ...scene.props };
    const update = (patch: Partial<SceneClip>, key: string) => onChange(items.map((item) => (item.id === scene.id ? { ...scene, ...patch } : item)), key);
    const setProp = (name: string, value: unknown) => update({ props: { ...scene.props, [name]: value } }, `scene-${scene.id}-${name}`);
    const setTransition = (at: number, transition: Transition, key: string) => onChange(items.map((item, i) => (i === at ? { ...item, transition } : item)), key);

    const transitionControl = (at: number, label: string) => {
        if (!canCrossfade(items, at)) return null;
        const transition = items[at].transition;
        const blended = transition && transition.type !== 'cut' ? transition : null;
        const key = `transition-${items[at].id}`;
        const sound = transition?.sound ? { sound: transition.sound } : {};
        const choose = (type: string) => {
            if (type === 'cut') return setTransition(at, { type: 'cut', ...sound }, key);
            const kind = type as TransitionKind;
            setTransition(at, { ...sound, type: kind, duration: blended?.duration ?? DEFAULT_CROSSFADE, ...(DIRECTED_TRANSITIONS.includes(kind) ? { direction: blended?.direction ?? 'left' } : {}), ...(kind === 'dip' ? { color: blended?.color ?? '#000000' } : {}) }, key);
        };
        return (
            <div className='space-y-2'>
                <label className='flex items-center justify-between gap-3 text-xs'>
                    <span>{label}</span>
                    <select value={blended?.type ?? 'cut'} onChange={(e) => choose(e.target.value)} className={`${inputClass} w-36`}>
                        {['cut', ...TRANSITION_KINDS].map((kind) => (
                            <option key={kind} value={kind}>
                                {TRANSITION_LABELS[kind]}
                            </option>
                        ))}
                    </select>
                </label>
                {blended && DIRECTED_TRANSITIONS.includes(blended.type) && (
                    <Segmented
                        size='sm'
                        value={blended.direction ?? 'left'}
                        onChange={(direction) => setTransition(at, { ...blended, direction: direction as TransitionDirection }, `${key}-direction`)}
                        options={[
                            { value: 'left', icon: <ArrowLeft className='h-3.5 w-3.5' />, hint: 'Moves to the left' },
                            { value: 'right', icon: <ArrowRight className='h-3.5 w-3.5' />, hint: 'Moves to the right' },
                            { value: 'up', icon: <ArrowUp className='h-3.5 w-3.5' />, hint: 'Moves up' },
                            { value: 'down', icon: <ArrowDown className='h-3.5 w-3.5' />, hint: 'Moves down' },
                        ]}
                    />
                )}
                {blended?.type === 'dip' && (
                    <label className='flex items-center justify-between gap-3 text-xs'>
                        <span>Colour</span>
                        <input type='color' value={blended.color ?? '#000000'} onChange={(e) => setTransition(at, { ...blended, color: e.target.value }, `${key}-color`)} className='h-7 w-9 cursor-pointer rounded border border-line bg-transparent' />
                    </label>
                )}
                {blended && (
                    <Slider
                        label='Length'
                        value={blended.duration}
                        min={0.1}
                        max={MAX_CROSSFADE}
                        step={0.1}
                        format={seconds}
                        onChange={(duration) => setTransition(at, { ...blended, duration }, `${key}-length`)}
                    />
                )}
                <SoundPicker
                    project={project}
                    label='Sound'
                    value={transition?.sound}
                    onChange={(cue, soundKey) => setTransition(at, withSound(transition ?? { type: 'cut' }, cue), `${key}-${soundKey}`)}
                />
            </div>
        );
    };

    return (
        <div className='space-y-5'>
            <p className='text-xs text-muted'>{definition ? `${sceneLabel(scene.scene)} — a generated motion scene.` : `Unknown scene “${scene.scene}”; it won’t show.`}</p>
            <SceneFields scene={scene.scene} props={props} setProp={setProp} project={project} cursor={cursor} picking={picking} onPick={onPick} />
            <Slider label='Length' value={scene.duration} min={1} max={30} step={0.1} format={seconds} onChange={(duration) => update({ duration }, `scene-length-${scene.id}`)} />
            {definition?.beat !== undefined && (
                <SoundPicker project={project} label={`Sound at ${definition.beatLabel?.toLowerCase() ?? 'beat'}`} value={scene.sound} onChange={(cue, key) => update(withSound(scene, cue), `scene-${scene.id}-${key}`)} />
            )}
            {transitionControl(index, 'Coming in')}
            {transitionControl(index + 1, 'Going out')}
            <div className='flex gap-2'>
                <Button size='sm' variant='ghost' disabled={index <= 0} onClick={() => onChange(moveItem(items, scene.id, -1), 'scene-move')} title='Swap with the item before it'>
                    <ArrowLeft className='h-3.5 w-3.5' /> Earlier
                </Button>
                <Button size='sm' variant='ghost' disabled={index >= items.length - 1} onClick={() => onChange(moveItem(items, scene.id, 1), 'scene-move')} title='Swap with the item after it'>
                    Later <ArrowRight className='h-3.5 w-3.5' />
                </Button>
            </div>
        </div>
    );
}

/** A scene's own settings (the fields its definition lists), for a timeline scene or an overlay. */
function SceneFields({
    scene,
    props,
    setProp,
    project,
    cursor,
    picking,
    onPick,
}: {
    scene: string;
    props: Record<string, unknown>;
    setProp: (name: string, value: unknown) => void;
    project: Project;
    cursor: CursorData | null;
    picking: boolean;
    onPick: (picking: boolean) => void;
}) {
    const range = recordingRange(project);
    const field = (f: SceneField) => {
        const value = props[f.name];
        switch (f.type) {
            case 'boolean':
                return (
                    <div key={f.name} className='flex items-center justify-between gap-3 text-xs'>
                        <span>{f.label}</span>
                        <Switch label={f.label} checked={!!value} onChange={(checked) => setProp(f.name, checked)} />
                    </div>
                );
            case 'color':
                return (
                    <label key={f.name} className='flex items-center justify-between gap-3 text-xs'>
                        <span>{f.label}</span>
                        <input type='color' value={String(value)} onChange={(e) => setProp(f.name, e.target.value)} className='h-7 w-9 cursor-pointer rounded border border-line bg-transparent' />
                    </label>
                );
            case 'number':
                return (
                    <label key={f.name} className='block space-y-1'>
                        <span className='text-xs'>{f.label}</span>
                        <NumberInput value={Number(value ?? 0)} step={f.step} onChange={(next) => setProp(f.name, next)} />
                    </label>
                );
            case 'list': {
                const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
                const setRow = (at: number, patch: Record<string, unknown>) => setProp(f.name, rows.map((row, i) => (i === at ? { ...row, ...patch } : row)));
                return (
                    <div key={f.name} className='space-y-2'>
                        <div className='text-xs'>{f.label}</div>
                        {rows.map((row, i) => (
                            <div key={i} className='flex items-start gap-1.5 rounded-lg border border-line p-1.5'>
                                <div className='grid min-w-0 flex-1 grid-cols-2 gap-1.5'>
                                    {f.item.map((itemField) => (
                                        <ListCell key={itemField.name} field={itemField} value={row[itemField.name]} wide={f.item.length === 1 || itemField.type === 'choice'} onChange={(next) => setRow(i, { [itemField.name]: next })} />
                                    ))}
                                </div>
                                <button
                                    className='mt-1 rounded p-0.5 text-muted hover:bg-panel-2 hover:text-fg disabled:opacity-30'
                                    disabled={rows.length <= (f.min ?? 0)}
                                    onClick={() => setProp(f.name, rows.filter((_, j) => j !== i))}
                                    title='Remove'
                                >
                                    <X className='h-3.5 w-3.5' />
                                </button>
                            </div>
                        ))}
                        {rows.length < f.max && (
                            <Button size='sm' variant='ghost' onClick={() => setProp(f.name, [...rows, { ...f.newItem }])}>
                                <Plus className='h-3.5 w-3.5' /> Add
                            </Button>
                        )}
                    </div>
                );
            }
            case 'choice':
                return (
                    <div key={f.name} className='space-y-2'>
                        <div className='text-xs'>{f.label}</div>
                        <Segmented size='sm' value={String(value)} onChange={(next) => setProp(f.name, next)} options={f.options} />
                    </div>
                );
            case 'segment': {
                const segment = value as Segment;
                const set = (next: Segment) => setProp(f.name, { start: Math.min(next.start, next.end - 0.1), end: Math.max(next.end, next.start + 0.1) });
                return (
                    <div key={f.name} className='space-y-2'>
                        <div className='flex justify-between text-xs'>
                            <span>{f.label}</span>
                            <span className='font-mono text-muted'>{seconds(segment.end - segment.start)}</span>
                        </div>
                        <Slider label='From' value={segment.start} min={range.start} max={range.end} step={0.1} format={clock} onChange={(start) => set({ start, end: Math.max(segment.end, start + 0.1) })} />
                        <Slider label='To' value={segment.end} min={range.start} max={range.end} step={0.1} format={clock} onChange={(end) => set({ start: Math.min(segment.start, end - 0.1), end })} />
                    </div>
                );
            }
            case 'rect': {
                const rect = value as TargetRect;
                const segment = props[f.segment] as Segment;
                const suggestion = () => suggestTarget(cursor, project, segment);
                return (
                    <div key={f.name} className='space-y-2'>
                        <div className='flex justify-between text-xs'>
                            <span>{f.label}</span>
                            <span className='font-mono text-muted'>
                                {Math.round(rect.x * 100)},{Math.round(rect.y * 100)} · {Math.round(rect.width * 100)}×{Math.round(rect.height * 100)}%
                            </span>
                        </div>
                        <div className='flex gap-2'>
                            <Button size='sm' variant={picking ? 'primary' : 'secondary'} className='flex-1' onClick={() => onPick(!picking)} title='Draw the target on the preview'>
                                <Crosshair className='h-3.5 w-3.5' /> {picking ? 'Drawing…' : 'Draw on preview'}
                            </Button>
                            <Button
                                size='sm'
                                className='flex-1'
                                disabled={!cursor?.clicks.length}
                                onClick={() => {
                                    const next = suggestion();
                                    if (next) setProp(f.name, next);
                                }}
                                title={cursor?.clicks.length ? 'Box the click nearest this part of the recording' : 'This recording has no clicks'}
                            >
                                <Wand2 className='h-3.5 w-3.5' /> Suggest
                            </Button>
                        </div>
                    </div>
                );
            }
            default:
                return (
                    <label key={f.name} className='block space-y-1'>
                        <span className='text-xs'>{f.label}</span>
                        <input value={String(value ?? '')} onChange={(e) => setProp(f.name, e.target.value)} className={inputClass} />
                    </label>
                );
        }
    };


    return <>{SCENES[scene]?.fields.map(field)}</>;
}

/** A number box that lets the text be mid-edit ("", "-", "1.") without snapping back. */
function NumberInput({ value, step, placeholder, onChange }: { value: number; step?: number; placeholder?: string; onChange: (value: number) => void }) {
    return (
        <input
            type='number'
            step={step ?? 'any'}
            defaultValue={value}
            key={value}
            placeholder={placeholder}
            title={placeholder}
            onBlur={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next) && next !== value) onChange(next);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className={inputClass}
        />
    );
}

/** One setting of a list row, labelled by its placeholder to keep rows compact. */
function ListCell({ field, value, wide, onChange }: { field: ListItemField; value: unknown; wide: boolean; onChange: (value: unknown) => void }) {
    const span = wide ? 'col-span-2' : '';
    if (field.type === 'number') {
        return (
            <div className={span}>
                <NumberInput value={Number(value ?? 0)} step={field.step} placeholder={field.label} onChange={onChange} />
            </div>
        );
    }
    if (field.type === 'choice') {
        return (
            <select value={String(value ?? field.options[0]?.value)} onChange={(e) => onChange(e.target.value)} className={`${inputClass} ${span}`} title={field.label}>
                {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    }
    return <input value={String(value ?? '')} placeholder={field.label} title={field.label} onChange={(e) => onChange(e.target.value)} className={`${inputClass} ${span}`} />;
}

/** Settings of an overlay: its scene's fields, and when it shows (output time). */
export function OverlayPanel({
    overlays,
    overlay,
    total,
    project,
    cursor,
    onChange,
}: {
    overlays: OverlayClip[];
    overlay: OverlayClip;
    /** Length of the timeline, in seconds. */
    total: number;
    project: Project;
    cursor: CursorData | null;
    onChange: (overlays: OverlayClip[], key: string) => void;
}) {
    const definition = SCENES[overlay.scene];
    const props: Record<string, unknown> = { ...definition?.defaultProps, ...overlay.props };
    const update = (patch: Partial<OverlayClip>, key: string) => onChange(overlays.map((o) => (o.id === overlay.id ? { ...overlay, ...patch } : o)), key);
    const setProp = (name: string, value: unknown) => update({ props: { ...overlay.props, [name]: value } }, `overlay-${overlay.id}-${name}`);
    return (
        <div className='space-y-5'>
            <p className='text-xs text-muted'>{definition ? `${sceneLabel(overlay.scene)} — drawn over the video.` : `Unknown scene “${overlay.scene}”; it won’t show.`}</p>
            <SceneFields scene={overlay.scene} props={props} setProp={setProp} project={project} cursor={cursor} picking={false} onPick={() => {}} />
            <Slider label='Starts at' value={overlay.start} min={0} max={Math.max(0, total - 0.5)} step={0.1} format={clock} onChange={(start) => update({ start }, `overlay-${overlay.id}-start`)} />
            <Slider label='Length' value={overlay.duration} min={1} max={30} step={0.1} format={seconds} onChange={(duration) => update({ duration }, `overlay-${overlay.id}-length`)} />
            {definition?.beat !== undefined && (
                <SoundPicker project={project} label={`Sound at ${definition.beatLabel?.toLowerCase() ?? 'beat'}`} value={overlay.sound} onChange={(cue, key) => onChange(overlays.map((o) => (o.id === overlay.id ? withSound(overlay, cue) : o)), `overlay-${overlay.id}-${key}`)} />
            )}
        </div>
    );
}
