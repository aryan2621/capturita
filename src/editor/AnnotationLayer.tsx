import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowUpRight, Highlighter, MousePointer2, Square, Trash2, Type } from 'lucide-react';
import { IconButton, Segmented, TextInput, cx } from '../components/ui';
import { ANNOTATION_COLORS, DEFAULT_ANNOTATION_TEXT, hitAnnotation, toFramePoint, toScreenPoint, type Annotation, type AnnotationKind, type ScreenView } from './annotations';
import { newId } from './model';
import { clamp01 } from '../lib/math';

const HANDLE_RADIUS = 7;
const MIN_LENGTH = 0.01;


export function AnnotationLayer({
    annotations,
    selectedId,
    tool,
    color,
    view,
    onChange,
    onSelect,
    onToolUsed,
}: {
    annotations: Annotation[];
    selectedId: string | null;
    tool: AnnotationKind | null;
    color: string;
    view: ScreenView;
    onChange: (next: Annotation[], key: string) => void;
    onSelect: (id: string | null) => void;
    onToolUsed: () => void;
}) {
    const selected = annotations.find((a) => a.id === selectedId) ?? null;
    const replace = (next: Annotation, key: string) => onChange(annotations.map((a) => (a.id === next.id ? next : a)), key);

    const pointerOf = (event: ReactPointerEvent) => {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    const track = (event: ReactPointerEvent, update: (screen: { x: number; y: number }, start: { x: number; y: number }) => void) => {
        const element = event.currentTarget as HTMLElement;
        const bounds = element.getBoundingClientRect();
        const start = toScreenPoint(event.clientX - bounds.left, event.clientY - bounds.top, view);
        const move = (e: PointerEvent) => update(toScreenPoint(e.clientX - bounds.left, e.clientY - bounds.top, view), start);
        const up = () => {
            element.removeEventListener('pointermove', move);
            element.removeEventListener('pointerup', up);
        };
        element.setPointerCapture(event.pointerId);
        element.addEventListener('pointermove', move);
        element.addEventListener('pointerup', up);
    };

    const onPointerDown = (event: ReactPointerEvent) => {
        if (event.button !== 0) return;
        const point = pointerOf(event);
        const nearHandle = (x: number, y: number) => Math.hypot(point.x - toFramePoint(x, y, view).x, point.y - toFramePoint(x, y, view).y) <= HANDLE_RADIUS * 1.5;

        if (selected && nearHandle(selected.x1, selected.y1)) {
            track(event, (p) => replace({ ...selected, x1: clamp01(p.x), y1: clamp01(p.y) }, `annotation-${selected.id}`));
            return;
        }
        if (selected && nearHandle(selected.x2, selected.y2)) {
            track(event, (p) => replace({ ...selected, x2: clamp01(p.x), y2: clamp01(p.y) }, `annotation-${selected.id}`));
            return;
        }

        if (tool) {
            const id = newId();
            const created: Annotation = { id, kind: tool, x1: 0, y1: 0, x2: 0, y2: 0, color, ...(tool === 'text' ? { text: DEFAULT_ANNOTATION_TEXT } : {}) };
            let added = false;
            track(event, (p, start) => {
                const next = { ...created, x1: clamp01(start.x), y1: clamp01(start.y), x2: clamp01(p.x), y2: clamp01(p.y) };
                if (Math.hypot(next.x2 - next.x1, next.y2 - next.y1) < MIN_LENGTH) return;
                onChange([...annotations, next], `annotation-${id}`);
                if (!added) {
                    added = true;
                    onSelect(id);
                    onToolUsed();
                }
            });
            return;
        }

        const hit = [...annotations].reverse().find((a) => hitAnnotation(a, point, view, HANDLE_RADIUS));
        onSelect(hit?.id ?? null);
        if (!hit) return;
        track(event, (p, start) => {
            const limitX = Math.min(Math.max(p.x - start.x, -Math.min(hit.x1, hit.x2)), 1 - Math.max(hit.x1, hit.x2));
            const limitY = Math.min(Math.max(p.y - start.y, -Math.min(hit.y1, hit.y2)), 1 - Math.max(hit.y1, hit.y2));
            replace({ ...hit, x1: hit.x1 + limitX, x2: hit.x2 + limitX, y1: hit.y1 + limitY, y2: hit.y2 + limitY }, `annotation-${hit.id}`);
        });
    };

    const ends = selected
        ? [toFramePoint(selected.x1, selected.y1, view), toFramePoint(selected.x2, selected.y2, view)]
        : [];

    return (
        <div className={`absolute inset-0 ${tool ? 'cursor-crosshair' : 'cursor-default'}`} onPointerDown={onPointerDown}>
            {ends.map((end, index) => (
                <div
                    key={index}
                    className='pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-accent shadow-sm'
                    style={{ left: end.x - HANDLE_RADIUS, top: end.y - HANDLE_RADIUS }}
                />
            ))}
        </div>
    );
}

export function useAnnotationTools() {
    const [tool, setTool] = useState<AnnotationKind | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [color, setColor] = useState(ANNOTATION_COLORS[0]);
    return { tool, setTool, selectedId, setSelectedId, color, setColor };
}

export type AnnotationTools = ReturnType<typeof useAnnotationTools>;

export function AnnotationToolbar({ tools, annotations, onChange }: { tools: AnnotationTools; annotations: Annotation[]; onChange: (next: Annotation[], key: string) => void }) {
    const { tool, setTool, selectedId, setSelectedId, color, setColor } = tools;
    const selected = annotations.find((a) => a.id === selectedId) ?? null;
    return (
        <div className='space-y-3'>
            <Segmented
                value={tool ?? 'select'}
                onChange={(value) => setTool(value === 'select' ? null : (value as AnnotationKind))}
                options={[
                    { value: 'select', label: 'Select', icon: <MousePointer2 className='h-4 w-4' /> },
                    { value: 'arrow', label: 'Arrow', icon: <ArrowUpRight className='h-4 w-4' /> },
                    { value: 'box', label: 'Box', icon: <Square className='h-4 w-4' /> },
                    { value: 'highlight', label: 'Highlight', icon: <Highlighter className='h-4 w-4' /> },
                    { value: 'text', label: 'Text', icon: <Type className='h-4 w-4' /> },
                ]}
            />
            <div className='flex items-center gap-2'>
                {ANNOTATION_COLORS.map((swatch) => (
                    <button
                        key={swatch}
                        type='button'
                        aria-label={`Colour ${swatch}`}
                        aria-pressed={swatch === color}
                        onClick={() => {
                            setColor(swatch);
                            if (selected) onChange(annotations.map((a) => (a.id === selected.id ? { ...a, color: swatch } : a)), `annotation-color-${selected.id}`);
                        }}
                        className={cx('h-6 w-6 rounded-full border border-line-strong', swatch === color && 'ring-2 ring-accent ring-offset-2 ring-offset-bg')}
                        style={{ background: swatch }}
                    />
                ))}
                <IconButton
                    label='Delete selected'
                    disabled={!selected}
                    className='ml-auto'
                    onClick={() => {
                        onChange(annotations.filter((a) => a.id !== selectedId), `annotation-delete-${selectedId}`);
                        setSelectedId(null);
                    }}
                >
                    <Trash2 className='h-4 w-4' />
                </IconButton>
            </div>
            {selected?.kind === 'text' && (
                <TextInput
                    aria-label='Label text'
                    value={selected.text ?? ''}
                    onChange={(event) => onChange(annotations.map((a) => (a.id === selected.id ? { ...a, text: event.target.value } : a)), `annotation-text-${selected.id}`)}
                />
            )}
            {annotations.length > 0 && (
                <ul className='space-y-1'>
                    {annotations.map((a, index) => (
                        <li key={a.id}>
                            <button
                                type='button'
                                onClick={() => {
                                    setTool(null);
                                    setSelectedId(a.id);
                                }}
                                className={cx('flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-fg/5', a.id === selectedId && 'bg-fg/10')}
                            >
                                <span className='h-2.5 w-2.5 rounded-full' style={{ background: a.color }} />
                                <span className='capitalize'>{a.kind}</span>
                                <span className='text-muted'>{index + 1}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
