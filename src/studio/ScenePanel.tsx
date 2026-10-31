import { useRef, useState, type ReactNode } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { toast } from '../lib/toast';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronUp, Copy, Crosshair, Diamond, ImagePlus, Link, Plus, Wand2, X } from 'lucide-react';
import { Button, ColorField, MenuButton, Segmented, Select, Slider, Switch, TimeField } from '../components/ui';
import {
    canCrossfade,
    DEFAULT_CROSSFADE,
    DIRECTED_TRANSITIONS,
    itemStarts,
    MAX_CROSSFADE,
    moveItem,
    newId,
    TRANSITION_KINDS,
    TRANSITION_LABELS,
    type AudioClip,
    type OverlayClip,
    type SceneClip,
    type SoundCue,
    type TimelineItem,
    type Transition,
    type TransitionDirection,
    type TransitionKind,
} from '../editor/model';
import { errorMessage, type CursorData, type Project } from '../lib/api';
import { importSceneImage } from './brandKits';
import { SCENES, sceneLabel, type ListItemField, type SceneField } from './scenes';
import { projectFileLength, SoundPicker } from '../editor/AudioClipsPanel';
import type { Segment, TargetRect } from './scenes/assets';
import { recordingRange, suggestTarget } from './sceneEnv';
import {
    LAYER_BASE,
    LAYER_EASES,
    LAYER_PRESETS,
    LAYOUT_PRESETS,
    layerFor,
    layerFrom,
    layerPose,
    nudge,
    withKey,
    type Layer,
    type LayerAspect,
    type LayerEase,
} from './scenes/layers';
import { LibraryPicker } from './library';

/** A copy of `target` with `sound` set, or without one. */
function withSound<T extends { sound?: SoundCue }>(target: T, sound: SoundCue | undefined): T {
    const { sound: _, ...rest } = target;
    return (sound ? { ...rest, sound } : rest) as T;
}

/** The layer selected in a Custom scene (shared with the preview handles) and the playhead, in seconds into the scene. */
export interface LayerEdit {
    selected: number | null;
    onSelect: (index: number | null) => void;
    time: number;
    /** The preview's frame shape, for layers with their own layout per shape. */
    aspect: LayerAspect;
}

const seconds = (value: number) => `${value.toFixed(1)} s`;
const clock = (value: number) => `${Math.floor(value / 60)}:${(value % 60).toFixed(1).padStart(4, '0')}`;
const inputClass = 'h-8 w-full rounded-lg border border-line bg-panel-2 px-2 text-sm text-fg outline-none focus:border-accent';

/** Adds a clip to the voiceover or sound-effect lane. */
export type AddSound = (lane: 'voiceovers' | 'effects', clip: AudioClip) => void;

/**
 * Puts the sound of a scene's new video or audio file on an audio lane, lined up with the scene
 * (scenes play files silently). Audio goes on the voiceover lane so music ducks under it.
 */
async function addFileSound(
    project: Project,
    file: string,
    kind: 'video' | 'audio',
    scene: string,
    from: number,
    start: number,
    length: number,
    onAddSound: AddSound
) {
    try {
        const fileLength = await projectFileLength(project, file);
        const offset = Math.min(Math.max(0, from), Math.max(0, fileLength - 0.1));
        const duration = Math.max(0.1, Math.min(fileLength - offset, length));
        onAddSound(kind === 'audio' ? 'voiceovers' : 'effects', {
            id: newId(),
            file,
            name: `${sceneLabel(scene)} sound`,
            start,
            offset,
            duration,
            length: fileLength,
            volume: 1,
            fadeIn: 0,
            fadeOut: 0,
        });
        toast.success(`Its sound is on the ${kind === 'audio' ? 'Voice' : 'Sounds'} lane`);
    } catch {
        // A video without a sound track (or one the web view can't decode): nothing to add.
        if (kind === 'audio') toast.error('Couldn’t read that audio file’s sound');
    }
}

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
    layerEdit,
    onAddSound,
    onChange,
}: {
    items: TimelineItem[];
    scene: SceneClip;
    project: Project;
    cursor: CursorData | null;
    /** Whether the target is being drawn on the preview. */
    picking: boolean;
    onPick: (picking: boolean) => void;
    layerEdit: LayerEdit;
    onAddSound: AddSound;
    onChange: (items: TimelineItem[], key: string) => void;
}) {
    const index = items.findIndex((item) => item.id === scene.id);
    const definition = SCENES[scene.scene];
    const props: Record<string, unknown> = {
        ...definition?.defaultProps,
        ...scene.props,
    };
    const update = (patch: Partial<SceneClip>, key: string) =>
        onChange(
            items.map((item) => (item.id === scene.id ? { ...scene, ...patch } : item)),
            key
        );
    const setProp = (name: string, value: unknown) => update({ props: { ...scene.props, [name]: value } }, `scene-${scene.id}-${name}`);
    const setTransition = (at: number, transition: Transition, key: string) =>
        onChange(
            items.map((item, i) => (i === at ? { ...item, transition } : item)),
            key
        );

    const transitionControl = (at: number, label: string) => {
        if (!canCrossfade(items, at)) return null;
        const transition = items[at].transition;
        const blended = transition && transition.type !== 'cut' ? transition : null;
        const key = `transition-${items[at].id}`;
        const sound = transition?.sound ? { sound: transition.sound } : {};
        const choose = (type: string) => {
            if (type === 'cut') return setTransition(at, { type: 'cut', ...sound }, key);
            const kind = type as TransitionKind;
            setTransition(
                at,
                {
                    ...sound,
                    type: kind,
                    duration: blended?.duration ?? DEFAULT_CROSSFADE,
                    ...(DIRECTED_TRANSITIONS.includes(kind) ? { direction: blended?.direction ?? 'left' } : {}),
                    ...(kind === 'dip' || kind === 'flood' ? { color: blended?.color ?? '#000000' } : {}),
                },
                key
            );
        };
        return (
            <div className='space-y-2'>
                <label className='flex items-center justify-between gap-3 text-xs'>
                    <span>{label}</span>
                    <Select value={blended?.type ?? 'cut'} onChange={(e) => choose(e.target.value)} className='h-8 w-36 text-xs'>
                        {['cut', ...TRANSITION_KINDS].map((kind) => (
                            <option key={kind} value={kind}>
                                {TRANSITION_LABELS[kind]}
                            </option>
                        ))}
                    </Select>
                </label>
                {blended && DIRECTED_TRANSITIONS.includes(blended.type) && (
                    <Segmented
                        size='sm'
                        value={blended.direction ?? 'left'}
                        onChange={(direction) => setTransition(at, { ...blended, direction: direction as TransitionDirection }, `${key}-direction`)}
                        options={[
                            {
                                value: 'left',
                                icon: <ArrowLeft className='h-3.5 w-3.5' />,
                                hint: 'Moves to the left',
                            },
                            {
                                value: 'right',
                                icon: <ArrowRight className='h-3.5 w-3.5' />,
                                hint: 'Moves to the right',
                            },
                            {
                                value: 'up',
                                icon: <ArrowUp className='h-3.5 w-3.5' />,
                                hint: 'Moves up',
                            },
                            {
                                value: 'down',
                                icon: <ArrowDown className='h-3.5 w-3.5' />,
                                hint: 'Moves down',
                            },
                        ]}
                    />
                )}
                {(blended?.type === 'dip' || blended?.type === 'flood') && (
                    <label className='flex items-center justify-between gap-3 text-xs'>
                        <span>Colour</span>
                        <ColorField
                            label='Transition'
                            value={blended.color ?? '#000000'}
                            onChange={(color) => setTransition(at, { ...blended, color }, `${key}-color`)}
                        />
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
            <p className='text-xs text-muted'>
                {definition ? `${sceneLabel(scene.scene)} — a generated motion scene.` : `Unknown scene “${scene.scene}”; it won’t show.`}
            </p>
            <SceneFields
                scene={scene.scene}
                props={props}
                setProp={setProp}
                project={project}
                cursor={cursor}
                picking={picking}
                onPick={onPick}
                layerEdit={layerEdit}
                onFile={(file, kind) =>
                    addFileSound(project, file, kind, scene.scene, Number(props.from ?? 0), itemStarts(items)[index], scene.duration, onAddSound)
                }
            />
            <Group title='Timing'>
                <Slider
                    label='Length'
                    value={scene.duration}
                    min={1}
                    max={30}
                    step={0.1}
                    format={seconds}
                    onChange={(duration) => update({ duration }, `scene-length-${scene.id}`)}
                    field={
                        <TimeField
                            label='Length'
                            value={scene.duration}
                            min={1}
                            max={30}
                            onChange={(duration) => update({ duration }, `scene-length-${scene.id}`)}
                        />
                    }
                />
                {definition?.beat !== undefined && (
                    <SoundPicker
                        project={project}
                        label={`Sound at ${definition.beatLabel?.toLowerCase() ?? 'beat'}`}
                        value={scene.sound}
                        onChange={(cue, key) => update(withSound(scene, cue), `scene-${scene.id}-${key}`)}
                    />
                )}
            </Group>
            <Group title='Transitions'>
                {transitionControl(index, 'Coming in')}
                {transitionControl(index + 1, 'Going out')}
            </Group>
            <Group title='Position' open={false}>
                <div className='flex gap-2'>
                    <Button
                        size='sm'
                        variant='ghost'
                        disabled={index <= 0}
                        onClick={() => onChange(moveItem(items, scene.id, -1), 'scene-move')}
                        title='Swap with the item before it'
                    >
                        <ArrowLeft className='h-3.5 w-3.5' /> Earlier
                    </Button>
                    <Button
                        size='sm'
                        variant='ghost'
                        disabled={index >= items.length - 1}
                        onClick={() => onChange(moveItem(items, scene.id, 1), 'scene-move')}
                        title='Swap with the item after it'
                    >
                        Later <ArrowRight className='h-3.5 w-3.5' />
                    </Button>
                </div>
            </Group>
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
    layerEdit,
    onFile,
}: {
    scene: string;
    props: Record<string, unknown>;
    setProp: (name: string, value: unknown) => void;
    project: Project;
    cursor: CursorData | null;
    picking: boolean;
    onPick: (picking: boolean) => void;
    layerEdit: LayerEdit;
    /** A video or audio file was just chosen. */
    onFile: (file: string, kind: 'video' | 'audio') => void;
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
                        <ColorField label={f.label} value={String(value)} onChange={(color) => setProp(f.name, color)} />
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
                if (f.editor === 'layers')
                    return (
                        <LayersEditor
                            key={f.name}
                            field={f}
                            layers={Array.isArray(value) ? (value as Layer[]) : []}
                            project={project}
                            edit={layerEdit}
                            onChange={(layers) => setProp(f.name, layers)}
                        />
                    );
                const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
                const setRow = (at: number, patch: Record<string, unknown>) =>
                    setProp(
                        f.name,
                        rows.map((row, i) => (i === at ? { ...row, ...patch } : row))
                    );
                return (
                    <div key={f.name} className='space-y-2'>
                        <div className='text-xs'>{f.label}</div>
                        {rows.map((row, i) => (
                            <div key={i} className='flex items-start gap-1.5 rounded-lg border border-line p-1.5'>
                                <div className='grid min-w-0 flex-1 grid-cols-2 gap-1.5'>
                                    {f.item.map((itemField) => (
                                        <ListCell
                                            key={itemField.name}
                                            project={project}
                                            field={itemField}
                                            value={row[itemField.name]}
                                            wide={f.item.length === 1 || itemField.type === 'choice'}
                                            onChange={(next) => setRow(i, { [itemField.name]: next })}
                                        />
                                    ))}
                                </div>
                                <button
                                    className='mt-1 rounded p-0.5 text-muted hover:bg-panel-2 hover:text-fg disabled:opacity-30'
                                    disabled={rows.length <= (f.min ?? 0)}
                                    onClick={() =>
                                        setProp(
                                            f.name,
                                            rows.filter((_, j) => j !== i)
                                        )
                                    }
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
            case 'choice': {
                // Older videos saved 'none' for the camera, which now means locked.
                const shown = f.name === 'camera' && value === 'none' ? 'still' : String(value);
                return (
                    <div key={f.name} className='space-y-2'>
                        <div className='text-xs'>{f.label}</div>
                        {/* A row of buttons only fits a few short labels; anything longer is a dropdown. */}
                        {f.options.length <= 3 && f.options.every((o) => (o.label ?? '').length <= 14) ? (
                            <Segmented size='sm' value={shown} onChange={(next) => setProp(f.name, next)} options={f.options} />
                        ) : (
                            <Select value={shown} onChange={(e) => setProp(f.name, e.target.value)}>
                                {f.options.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </div>
                );
            }
            case 'segment': {
                const segment = value as Segment;
                const set = (next: Segment) =>
                    setProp(f.name, {
                        start: Math.min(next.start, next.end - 0.1),
                        end: Math.max(next.end, next.start + 0.1),
                    });
                return (
                    <div key={f.name} className='space-y-2'>
                        <div className='flex justify-between text-xs'>
                            <span>{f.label}</span>
                            <span className='font-mono text-muted'>{seconds(segment.end - segment.start)}</span>
                        </div>
                        <Slider
                            label='From'
                            value={segment.start}
                            min={range.start}
                            max={range.end}
                            step={0.1}
                            format={clock}
                            onChange={(start) => set({ start, end: Math.max(segment.end, start + 0.1) })}
                            field={
                                <TimeField
                                    label='From'
                                    value={segment.start}
                                    min={range.start}
                                    max={range.end}
                                    onChange={(start) => set({ start, end: Math.max(segment.end, start + 0.1) })}
                                />
                            }
                        />
                        <Slider
                            label='To'
                            value={segment.end}
                            min={range.start}
                            max={range.end}
                            step={0.1}
                            format={clock}
                            onChange={(end) => set({ start: Math.min(segment.start, end - 0.1), end })}
                            field={
                                <TimeField
                                    label='To'
                                    value={segment.end}
                                    min={range.start}
                                    max={range.end}
                                    onChange={(end) => set({ start: Math.min(segment.start, end - 0.1), end })}
                                />
                            }
                        />
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
                            <Button
                                size='sm'
                                variant={picking ? 'primary' : 'secondary'}
                                className='flex-1'
                                onClick={() => onPick(!picking)}
                                title='Draw the target on the preview'
                            >
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
            case 'image':
                return (
                    <div key={f.name} className='space-y-1'>
                        <span className='text-xs'>{f.label}</span>
                        <ImageInput
                            project={project}
                            value={typeof value === 'string' ? value : ''}
                            kind={f.accept}
                            onChange={(path) => {
                                setProp(f.name, path);
                                if (f.accept === 'video' || f.accept === 'audio') onFile(path, f.accept);
                            }}
                        />
                    </div>
                );
            default:
                return (
                    <label key={f.name} className='block space-y-1'>
                        <span className='text-xs'>{f.label}</span>
                        {f.type === 'text' && f.multiline ? (
                            <textarea
                                value={String(value ?? '')}
                                onChange={(e) => setProp(f.name, e.target.value)}
                                rows={5}
                                spellCheck={false}
                                className={`${inputClass} h-auto py-1.5 font-mono text-[11px] leading-snug`}
                            />
                        ) : (
                            <input value={String(value ?? '')} onChange={(e) => setProp(f.name, e.target.value)} className={inputClass} />
                        )}
                    </label>
                );
        }
    };

    // Rive settings mean nothing for a Lottie file, so they show only once a .riv is chosen.
    const rive = String(props.animation ?? '')
        .toLowerCase()
        .endsWith('.riv');
    return <>{SCENES[scene]?.fields.filter((f) => rive || !f.label.startsWith('Rive ')).map(field)}</>;
}

const ACCEPT = {
    image: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg',
    lottie: '.json,application/json,.riv',
    video: 'video/mp4,video/quicktime,video/webm,.mov',
    audio: 'audio/mp4,audio/mpeg,audio/wav,.m4a,.mp3,.wav',
};
const ADD_LABEL = {
    image: 'Add an image',
    lottie: 'Add a Lottie or Rive file',
    video: 'Add a video',
    audio: 'Add audio',
};

/** Picks a picture (or a Lottie .json, video or audio file) for a scene: copied into the project, pictures shown as a thumbnail. */
function ImageInput({
    project,
    value,
    kind = 'image',
    compact,
    onChange,
}: {
    project: Project;
    value: string;
    kind?: keyof typeof ACCEPT;
    compact?: boolean;
    onChange: (path: string) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const choose = async (file?: File) => {
        if (!file) return;
        setBusy(true);
        try {
            onChange(await importSceneImage(project.id, file));
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
            if (input.current) input.current.value = '';
        }
    };
    const accept = ACCEPT[kind];
    return (
        <div className='flex items-center gap-2'>
            <input ref={input} type='file' accept={accept} className='hidden' onChange={(e) => choose(e.target.files?.[0])} />
            <button
                onClick={() => input.current?.click()}
                disabled={busy}
                className={`flex ${compact ? 'h-9' : 'h-14'} min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-line bg-panel-2 text-xs text-muted hover:border-line-strong hover:text-fg`}
                title={value ? 'Choose another file' : ADD_LABEL[kind]}
            >
                {value && kind === 'image' ? (
                    <img src={convertFileSrc(`${project.path}/${value}`)} alt='' className='h-full w-full object-contain' />
                ) : value ? (
                    <span className='truncate px-2 font-mono'>{value.split('/').pop()}</span>
                ) : (
                    <>
                        <ImagePlus className='h-3.5 w-3.5' /> {busy ? 'Adding…' : ADD_LABEL[kind]}
                    </>
                )}
            </button>
            {kind === 'lottie' && <LibraryPicker kind='lottie' disabled={busy} onPick={choose} />}
            {value && (
                <button onClick={() => onChange('')} className='rounded-md p-1 text-muted hover:bg-panel-2 hover:text-fg' title='Remove'>
                    <X className='h-3.5 w-3.5' />
                </button>
            )}
        </div>
    );
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

/** A divider heading between groups of scene settings. */
/** A titled group that can be folded away; remembered open/closed only for as long as the panel shows. */
function Group({ title, open = true, children }: { title: string; open?: boolean; children: ReactNode }) {
    return (
        <details open={open} className='group border-t border-line pt-4'>
            <summary className='flex cursor-default list-none items-center justify-between text-xs font-medium uppercase tracking-wide text-muted hover:text-fg [&::-webkit-details-marker]:hidden'>
                {title}
                <ChevronDown className='h-3.5 w-3.5 transition-transform group-open:rotate-180' aria-hidden />
            </summary>
            <div className='mt-4 space-y-5'>{children}</div>
        </details>
    );
}

/** One setting of a list row, with its name above it. */
function ListCell({
    project,
    field,
    value,
    wide,
    onChange,
}: {
    project: Project;
    field: ListItemField;
    value: unknown;
    wide: boolean;
    onChange: (value: unknown) => void;
}) {
    const span = wide ? 'col-span-2' : '';
    if (field.type !== 'image')
        return (
            <label className={`block space-y-0.5 ${span}`}>
                <span className='text-[11px] text-muted'>{field.label}</span>
                <ListControl field={field} value={value} onChange={onChange} />
            </label>
        );
    return (
        <div className='col-span-2'>
            <ImageInput project={project} value={typeof value === 'string' ? value : ''} compact onChange={onChange} />
        </div>
    );
}

function ListControl({ field, value, onChange }: { field: ListItemField; value: unknown; onChange: (value: unknown) => void }) {
    if (field.type === 'number') return <NumberInput value={Number(value ?? 0)} step={field.step} placeholder={field.label} onChange={onChange} />;
    if (field.type === 'choice') {
        return (
            <Select value={String(value ?? field.options[0]?.value)} onChange={(e) => onChange(e.target.value)}>
                {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
        );
    }
    return <input value={String(value ?? '')} placeholder={field.label} onChange={(e) => onChange(e.target.value)} className={`${inputClass} w-full`} />;
}

/** Settings of an overlay: its scene's fields, and when it shows (output time). */
export function OverlayPanel({
    overlays,
    overlay,
    total,
    project,
    cursor,
    layerEdit,
    onAddSound,
    onChange,
}: {
    overlays: OverlayClip[];
    overlay: OverlayClip;
    /** Length of the timeline, in seconds. */
    total: number;
    project: Project;
    cursor: CursorData | null;
    layerEdit: LayerEdit;
    onAddSound: AddSound;
    onChange: (overlays: OverlayClip[], key: string) => void;
}) {
    const definition = SCENES[overlay.scene];
    const props: Record<string, unknown> = {
        ...definition?.defaultProps,
        ...overlay.props,
    };
    const update = (patch: Partial<OverlayClip>, key: string) =>
        onChange(
            overlays.map((o) => (o.id === overlay.id ? { ...overlay, ...patch } : o)),
            key
        );
    const setProp = (name: string, value: unknown) => update({ props: { ...overlay.props, [name]: value } }, `overlay-${overlay.id}-${name}`);
    return (
        <div className='space-y-5'>
            <p className='text-xs text-muted'>
                {definition ? `${sceneLabel(overlay.scene)} — drawn over the video.` : `Unknown scene “${overlay.scene}”; it won’t show.`}
            </p>
            <SceneFields
                scene={overlay.scene}
                props={props}
                setProp={setProp}
                project={project}
                cursor={cursor}
                picking={false}
                onPick={() => {}}
                layerEdit={layerEdit}
                onFile={(file, kind) => addFileSound(project, file, kind, overlay.scene, Number(props.from ?? 0), overlay.start, overlay.duration, onAddSound)}
            />
            <Slider
                label='Starts at'
                value={overlay.start}
                min={0}
                max={Math.max(0, total - 0.5)}
                step={0.1}
                format={clock}
                onChange={(start) => update({ start }, `overlay-${overlay.id}-start`)}
                field={
                    <TimeField
                        label='Starts at'
                        value={overlay.start}
                        max={Math.max(0, total - 0.5)}
                        onChange={(start) => update({ start }, `overlay-${overlay.id}-start`)}
                    />
                }
            />
            <Slider
                label='Length'
                value={overlay.duration}
                min={1}
                max={30}
                step={0.1}
                format={seconds}
                onChange={(duration) => update({ duration }, `overlay-${overlay.id}-length`)}
            />
            {definition?.beat !== undefined && (
                <SoundPicker
                    project={project}
                    label={`Sound at ${definition.beatLabel?.toLowerCase() ?? 'beat'}`}
                    value={overlay.sound}
                    onChange={(cue, key) =>
                        onChange(
                            overlays.map((o) => (o.id === overlay.id ? withSound(overlay, cue) : o)),
                            `overlay-${overlay.id}-${key}`
                        )
                    }
                />
            )}
        </div>
    );
}

/** The Custom scene's layers: add from presets, pick one (here or on the preview), set it up, and keyframe it. */
function LayersEditor({
    field,
    layers,
    project,
    edit,
    onChange,
}: {
    field: Extract<SceneField, { type: 'list' }>;
    layers: Layer[];
    project: Project;
    edit: LayerEdit;
    onChange: (layers: Layer[]) => void;
}) {
    const index = edit.selected !== null && edit.selected < layers.length ? edit.selected : null;
    const stored = index === null ? null : { ...LAYER_BASE, ...layers[index] };
    const layer = stored && layerFor(stored, edit.aspect);
    const set = (next: Layer) => onChange(layers.map((l, i) => (i === index ? layerFrom(stored!, edit.aspect, next) : l)));
    const ownLayout = !!stored?.boxes?.[edit.aspect];
    const setOwnLayout = (on: boolean) => {
        const { [edit.aspect]: _, ...rest } = stored!.boxes ?? {};
        const boxes = on
            ? {
                  ...rest,
                  [edit.aspect]: {
                      x: stored!.x,
                      y: stored!.y,
                      w: stored!.w,
                      h: stored!.h,
                  },
              }
            : rest;
        onChange(layers.map((l, i) => (i === index ? { ...stored!, boxes } : l)));
    };
    const linked = (i: number) => i > 0 && layers[i].group !== undefined && layers[i].group === layers[i - 1].group;
    const toggleGroup = (i: number) => {
        if (linked(i)) return onChange(layers.map((l, j) => (j === i ? { ...l, group: undefined } : l)));
        const group = layers[i - 1].group ?? Math.max(0, ...layers.map((l) => (l.group ?? 0) + 1));
        onChange(layers.map((l, j) => (j === i || j === i - 1 ? { ...l, group } : l)));
    };
    const swap = (at: number, by: number) => {
        const next = [...layers];
        [next[at], next[at + by]] = [next[at + by], next[at]];
        onChange(next);
        edit.onSelect(at + by);
    };
    const cell = (name: string) => field.item.find((c) => c.name === name)!;
    const kindCells: Record<string, string[]> = {
        text: ['style', 'color', 'align'],
        shape: ['shape', 'color'],
        icon: ['icon', 'color'],
        element: ['element', 'color'],
        logo: [],
        image: [],
    };
    const labelled = (name: string) => (
        <label key={name} className='block space-y-1'>
            <span className='text-[11px] text-muted'>{cell(name).label}</span>
            <ListCell project={project} field={cell(name)} value={layer![name as keyof Layer]} wide={false} onChange={(v) => set({ ...layer!, [name]: v })} />
        </label>
    );
    const time = Math.round(edit.time * 10) / 10;
    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between gap-2 text-xs'>
                <span>{field.label}</span>
                <div className='w-32'>
                    <MenuButton
                        label='Add layer…'
                        items={LAYER_PRESETS.map((preset, i) => ({
                            key: String(i),
                            label: preset.label,
                        }))}
                        onPick={(key) => {
                            if (layers.length >= field.max) return toast.error(`Up to ${field.max} layers`);
                            const preset = LAYER_PRESETS[Number(key)];
                            if (!preset) return;
                            onChange([...layers, { ...LAYER_BASE, ...preset.layer, at: Math.max(0, time) }]);
                            edit.onSelect(layers.length);
                        }}
                    />
                </div>
                <div className='w-32'>
                    <MenuButton
                        label='Layout…'
                        items={LAYOUT_PRESETS.map((preset, i) => ({ key: String(i), label: preset.label }))}
                        onPick={(key) => {
                            const preset = LAYOUT_PRESETS[Number(key)];
                            if (!preset) return;
                            onChange(preset.layers.map((layer) => ({ ...LAYER_BASE, ...layer })));
                            edit.onSelect(null);
                            toast.success(`${preset.label} layout applied: ⌘Z to undo`);
                        }}
                    />
                </div>
            </div>
            <div className='space-y-1'>
                {layers.map((raw, i) => {
                    const l = { ...LAYER_BASE, ...raw };
                    return (
                        <div
                            key={i}
                            role='button'
                            tabIndex={0}
                            aria-pressed={i === index}
                            onClick={() => edit.onSelect(i === index ? null : i)}
                            onKeyDown={(e) =>
                                (e.key === 'Enter' || e.key === ' ') &&
                                e.target === e.currentTarget &&
                                (e.preventDefault(), edit.onSelect(i === index ? null : i))
                            }
                            className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-xs ${i === index ? 'border-accent bg-accent/10' : 'border-line hover:bg-panel-2'}`}
                        >
                            <span className='w-14 shrink-0 truncate capitalize text-muted'>{l.kind}</span>
                            <span className='min-w-0 flex-1 truncate'>
                                {l.kind === 'text' ? l.text : l.kind === 'shape' ? l.shape : l.kind === 'icon' ? l.icon : l.kind === 'element' ? l.element : ''}
                            </span>
                            {!!l.keys?.length && <Diamond className='h-3 w-3 text-accent' />}
                            <button
                                className={`rounded p-0.5 hover:text-fg disabled:opacity-30 ${linked(i) ? 'text-accent' : 'text-muted'}`}
                                disabled={i === 0}
                                onClick={(e) => (e.stopPropagation(), toggleGroup(i))}
                                title={linked(i) ? 'Ungroup from the layer above' : 'Group with the layer above (they move together)'}
                            >
                                <Link className='h-3.5 w-3.5' />
                            </button>
                            <button
                                className='rounded p-0.5 text-muted hover:text-fg disabled:opacity-30'
                                disabled={layers.length >= field.max}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange([...layers.slice(0, i + 1), { ...nudge(l, 3, 3), id: undefined }, ...layers.slice(i + 1)]);
                                    edit.onSelect(i + 1);
                                }}
                                title='Duplicate'
                            >
                                <Copy className='h-3.5 w-3.5' />
                            </button>
                            <button
                                className='rounded p-0.5 text-muted hover:text-fg disabled:opacity-30'
                                disabled={i === 0}
                                onClick={(e) => (e.stopPropagation(), swap(i, -1))}
                                title='Further back'
                            >
                                <ChevronUp className='h-3.5 w-3.5' />
                            </button>
                            <button
                                className='rounded p-0.5 text-muted hover:text-fg disabled:opacity-30'
                                disabled={i === layers.length - 1}
                                onClick={(e) => (e.stopPropagation(), swap(i, 1))}
                                title='Further forward'
                            >
                                <ChevronDown className='h-3.5 w-3.5' />
                            </button>
                            <button
                                className='rounded p-0.5 text-muted hover:text-fg'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(layers.filter((_, j) => j !== i));
                                    edit.onSelect(null);
                                }}
                                title='Remove'
                            >
                                <X className='h-3.5 w-3.5' />
                            </button>
                        </div>
                    );
                })}
                {!layers.length && <p className='text-xs text-muted'>No layers yet. Add one above.</p>}
            </div>
            {layer && (
                <div className='space-y-2 rounded-lg border border-line p-2'>
                    {labelled('kind')}
                    {layer.kind === 'text' && (
                        <textarea
                            value={layer.text}
                            onChange={(e) => set({ ...layer, text: e.target.value })}
                            rows={2}
                            className={`${inputClass} h-auto py-1.5`}
                            placeholder='Text (Enter for a new line)'
                        />
                    )}
                    {layer.kind === 'image' && <ImageInput project={project} value={layer.image} compact onChange={(image) => set({ ...layer, image })} />}
                    <div className='grid grid-cols-2 gap-1.5'>{kindCells[layer.kind]?.map(labelled)}</div>
                    <div className='grid grid-cols-3 gap-1.5'>{['x', 'y', 'rotate', 'w', 'h'].map(labelled)}</div>
                    <p className='text-[11px] text-muted'>Drag it on the preview to move or resize; hold ⌥ to skip snapping.</p>
                    <Switch label={`Own layout in ${edit.aspect} frames`} checked={ownLayout} onChange={setOwnLayout} />
                    <div className='grid grid-cols-2 gap-1.5'>{['enter', 'at'].map(labelled)}</div>
                    <div className='space-y-1.5'>
                        <div className='flex items-center justify-between text-xs'>
                            <span>Keyframes</span>
                            <Button
                                size='sm'
                                variant='ghost'
                                onClick={() => set(withKey(layer, time, layerPose(layer, time)))}
                                title='Hold where the layer is now; drag it on the preview at another time to animate'
                            >
                                <Diamond className='h-3.5 w-3.5' /> Add at {time.toFixed(1)} s
                            </Button>
                        </div>
                        {!!layer.keys?.length && (
                            <div className='grid grid-cols-[3rem_1fr_1fr_5rem_1.25rem] gap-1.5 text-[10px] text-muted'>
                                <span>Time</span>
                                <span>Size</span>
                                <span>Opacity %</span>
                                <span>Easing</span>
                            </div>
                        )}
                        {layer.keys?.map((key, k) => {
                            const setKey = (patch: Partial<typeof key>) =>
                                set({
                                    ...layer,
                                    keys: layer.keys!.map((x, j) => (j === k ? { ...x, ...patch } : x)),
                                });
                            return (
                                <div key={`${k}-${key.t}`} className='grid grid-cols-[3rem_1fr_1fr_5rem_1.25rem] items-center gap-1.5 text-[11px]'>
                                    <span className='font-mono text-muted'>{key.t.toFixed(1)} s</span>
                                    <NumberInput value={key.scale} step={0.05} placeholder='Scale' onChange={(scale) => setKey({ scale })} />
                                    <NumberInput
                                        value={Math.round(key.opacity * 100)}
                                        step={5}
                                        placeholder='Opacity %'
                                        onChange={(opacity) =>
                                            setKey({
                                                opacity: Math.min(1, Math.max(0, opacity / 100)),
                                            })
                                        }
                                    />
                                    <Select
                                        value={key.ease ?? 'smooth'}
                                        disabled={k === 0}
                                        onChange={(e) => setKey({ ease: e.target.value as LayerEase })}
                                        className='h-7 px-1 text-[11px] disabled:opacity-30'
                                        title='How it moves into this keyframe'
                                    >
                                        {Object.keys(LAYER_EASES).map((ease) => (
                                            <option key={ease} value={ease}>
                                                {ease[0].toUpperCase() + ease.slice(1)}
                                            </option>
                                        ))}
                                    </Select>
                                    <button
                                        className='rounded p-0.5 text-muted hover:text-fg'
                                        onClick={() =>
                                            set({
                                                ...layer,
                                                keys: layer.keys!.filter((_, j) => j !== k),
                                            })
                                        }
                                        title='Remove keyframe'
                                    >
                                        <X className='h-3.5 w-3.5' />
                                    </button>
                                </div>
                            );
                        })}
                        {!!layer.keys?.length && (
                            <p className='text-[11px] text-muted'>
                                Scale, opacity and easing per keyframe. Dragging the layer on the preview sets its keyframe at the playhead.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
