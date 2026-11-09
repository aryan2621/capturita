import { useCallback, useEffect, useRef, useState } from 'react';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Clapperboard, Clipboard, Download, TextSelect } from 'lucide-react';
import { api, errorMessage, fileUrl, projectTitle, type Project } from '../lib/api';
import { toast } from '../lib/toast';
import { Button, IconButton, Select } from '../components/ui';
import { LookPanel } from './Inspector';
import { aspectRatio, defaultEdit, normalizeEdit, type Edit } from './model';
import { drawFrame, screenView, type FrameSource } from './render';
import { AnnotationLayer, AnnotationToolbar, useAnnotationTools } from './AnnotationLayer';
import { STILL_MOTIONS, exportStillAnimation, type StillMotion } from './stillAnimation';
import type { Aspect } from './model';
import { useHistory } from './useHistory';

const PREVIEW_WIDTH = 1280;
const EXPORT_LONG_SIDE = 2400;

const SIZES: { value: Aspect; label: string }[] = [
    { value: 'auto', label: 'Original shape' },
    { value: '16:9', label: 'Wide 16:9 (X, YouTube, LinkedIn)' },
    { value: '1:1', label: 'Square 1:1 (Instagram)' },
    { value: '4:5', label: 'Portrait 4:5 (Instagram, LinkedIn)' },
    { value: '9:16', label: 'Story 9:16' },
];

const ANIMATION_LONG_SIDE = 1920;

const outputSize = (edit: Edit, project: Project, longSide: number) => {
    const aspect = aspectRatio(edit, project);
    return aspect >= 1 ? { width: longSide, height: Math.round(longSide / aspect) } : { width: Math.round(longSide * aspect), height: longSide };
};

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
    new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))), type, quality));

export function ScreenshotEditor({ project, onClose }: { project: Project; onClose: () => void }) {
    const history = useHistory<Edit>(defaultEdit(project));
    const edit = history.value;
    const [image, setImage] = useState<FrameSource | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [shown, setShown] = useState({ width: 0, height: 0 });
    const tools = useAnnotationTools();
    const { tool, setTool, selectedId, setSelectedId, color } = tools;
    const editRef = useRef(edit);
    editRef.current = edit;

    useEffect(() => {
        let cancelled = false;
        api.loadEdit(project.id)
            .then((saved) => {
                if (cancelled) return;
                history.reset(normalizeEdit(project, saved));
                setLoaded(true);
            })
            .catch((error) => toast.error(`Could not load your edits: ${errorMessage(error)}`));
        const element = new Image();
        element.crossOrigin = 'anonymous';
        element.onload = () => !cancelled && setImage({ image: element, width: element.naturalWidth, height: element.naturalHeight });
        element.onerror = () => !cancelled && toast.error('Could not open the screenshot');
        element.src = fileUrl(project, project.tracks.screen.file);
        return () => {
            cancelled = true;
        };
    }, [project.id]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(() => setShown({ width: canvas.clientWidth, height: canvas.clientHeight }));
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    const setAnnotations = (annotations: Edit['annotations'], key: string) => history.set({ ...editRef.current, annotations }, key);

    const removeSelected = useCallback(() => {
        if (!selectedId) return;
        history.set({ ...editRef.current, annotations: editRef.current.annotations.filter((a) => a.id !== selectedId) });
        setSelectedId(null);
    }, [history, selectedId]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const typing = event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
            if (typing) return;
            if (event.key === 'Escape') setTool(null);
            else if (event.key === 'Backspace' || event.key === 'Delete') removeSelected();
            else if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
                event.preventDefault();
                if (event.shiftKey) history.redo();
                else history.undo();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [history, removeSelected]);

    const render = useCallback(
        (canvas: HTMLCanvasElement, width: number, height: number) => {
            const ctx = canvas.getContext('2d');
            if (!ctx || !image) return;
            canvas.width = width;
            canvas.height = height;
            drawFrame(ctx, width, height, { edit: editRef.current, project, screen: image, camera: null, cameraActive: false, cursor: null, time: 0, preview: true });
        },
        [image, project],
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !image) return;
        const { width, height } = outputSize(edit, project, PREVIEW_WIDTH);
        render(canvas, width, height);
    }, [edit, image, project, render]);

    useEffect(() => {
        if (!loaded) return;
        const timer = setTimeout(() => api.saveEdit(project.id, edit).catch((error) => toast.error(errorMessage(error))), 400);
        return () => clearTimeout(timer);
    }, [edit, loaded, project.id]);

    useEffect(() => {
        if (!image || !loaded) return;
        const canvas = document.createElement('canvas');
        const { width, height } = outputSize(edit, project, 480);
        render(canvas, width, height);
        const timer = setTimeout(() => toBlob(canvas, 'image/jpeg', 0.8).then((blob) => api.saveThumbnail(project.id, blob)).catch(() => {}), 800);
        return () => clearTimeout(timer);
    }, [edit, image, loaded, project, render]);

    const [motion, setMotion] = useState<StillMotion>('sway');
    const [animating, setAnimating] = useState<number | null>(null);

    const exportAnimation = async () => {
        if (!image) return;
        setAnimating(0);
        try {
            const { width, height } = outputSize(editRef.current, project, ANIMATION_LONG_SIDE);
            const path = await exportStillAnimation({ project, edit: editRef.current, image, motion, width, height, name: project.id, onProgress: setAnimating });
            toast.success('Animation exported');
            revealItemInDir(path).catch(() => {});
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setAnimating(null);
        }
    };

    const copyText = async () => {
        setBusy(true);
        try {
            const text = project.text ?? (await api.analyzeScreenshot(project.id)).text ?? '';
            if (!text.trim()) {
                toast.error('No text found in this screenshot');
                return;
            }
            await navigator.clipboard.writeText(text);
            toast.success('Text copied');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const exportPng = async (copy: boolean) => {
        setBusy(true);
        try {
            const canvas = document.createElement('canvas');
            const { width, height } = outputSize(editRef.current, project, EXPORT_LONG_SIDE);
            render(canvas, width, height);
            const blob = await toBlob(canvas, 'image/png');
            const path = await invoke<string>('export_open', { name: project.id, ext: 'png' });
            try {
                await invoke('export_write', new Uint8Array(await blob.arrayBuffer()), { headers: { position: '0' } });
                await invoke('export_close', { keep: true });
            } catch (error) {
                await invoke('export_close', { keep: false }).catch(() => {});
                throw error;
            }
            if (copy) {
                await api.copyFileToClipboard(path);
                toast.success('Screenshot copied');
            } else {
                toast.success('Screenshot exported');
                revealItemInDir(path).catch(() => {});
            }
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className='flex h-screen flex-col bg-bg text-fg'>
            <header className='flex h-12 shrink-0 items-center gap-2 border-b border-line px-3'>
                <IconButton label='Back to library' onClick={onClose}>
                    <ArrowLeft className='h-4 w-4' />
                </IconButton>
                <h1 className='min-w-0 flex-1 truncate text-sm font-medium'>{projectTitle(project)}</h1>
                <Button variant='secondary' onClick={copyText} disabled={busy || !image} title='Copy the text found in the image'>
                    <TextSelect className='h-4 w-4' />
                    Copy text
                </Button>
                <Button variant='secondary' onClick={() => exportPng(true)} disabled={busy || !image}>
                    <Clipboard className='h-4 w-4' />
                    Copy image
                </Button>
                <Button variant='primary' onClick={() => exportPng(false)} disabled={busy || !image}>
                    <Download className='h-4 w-4' />
                    Export PNG
                </Button>
            </header>
            <div className='flex min-h-0 flex-1'>
                <main className='flex min-w-0 flex-1 items-center justify-center bg-stage p-6'>
                    <div className='relative'>
                        <canvas ref={canvasRef} className='block max-h-[calc(100vh-6rem)] max-w-full rounded-md border border-line' />
                        {shown.width > 0 && (
                            <AnnotationLayer
                                annotations={edit.annotations}
                                selectedId={selectedId}
                                tool={tool}
                                color={color}
                                view={screenView(edit, project, null, 0, shown.width, shown.height)}
                                onChange={setAnnotations}
                                onSelect={setSelectedId}
                                onToolUsed={() => setTool(null)}
                            />
                        )}
                    </div>
                </main>
                <aside className='w-80 shrink-0 space-y-8 overflow-y-auto border-l border-line p-5'>
                    <section className='space-y-3'>
                        <h2 className='text-xs font-medium uppercase tracking-wide text-muted'>Size</h2>
                        <Select aria-label='Size' value={edit.aspect} onChange={(event) => history.set({ ...edit, aspect: event.target.value as Aspect }, 'aspect')}>
                            {SIZES.map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </section>
                    <section className='space-y-3'>
                        <h2 className='text-xs font-medium uppercase tracking-wide text-muted'>Animate</h2>
                        <p className='text-xs text-muted'>A 4-second looping video of this screenshot turning in 3D, for posts and launch pages.</p>
                        <Select aria-label='Motion' value={motion} onChange={(event) => setMotion(event.target.value as StillMotion)} disabled={animating !== null}>
                            {STILL_MOTIONS.map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                        <Button className='w-full' onClick={exportAnimation} disabled={animating !== null || !image || busy}>
                            <Clapperboard className='h-4 w-4' />
                            {animating === null ? 'Export MP4' : `Rendering ${Math.round(animating * 100)}%`}
                        </Button>
                    </section>
                    <section className='space-y-3'>
                        <h2 className='text-xs font-medium uppercase tracking-wide text-muted'>Annotate</h2>
                        <AnnotationToolbar tools={tools} annotations={edit.annotations} onChange={setAnnotations} />
                    </section>
                    <LookPanel edit={edit} onChange={(change, key) => history.set({ ...edit, ...change }, key)} projectId={project.id} project={project} />
                </aside>
            </div>
        </div>
    );
}
