import { useEffect, useRef, useState } from 'react';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { Film, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, ProgressBar } from '../components/ui';
import { errorMessage, type Project } from '../lib/api';
import { ExportCancelled, exportTransparent } from '../editor/export';
import type { Edit } from '../editor/model';
import { canBeOverlay, sceneLabel } from './scenes';

/**
 * "Export as transparent video" for the selected scene or overlay: a ProRes 4444 `.mov` with
 * alpha at 1080p, saved to Exports, for Final Cut or Premiere. Scenes that can't drop their
 * background (no overlay form) don't offer it.
 */
export function TransparentExport({ project, edit, kind, id, scene }: { project: Project; edit: Edit; kind: 'scene' | 'overlay'; id: string; scene: string }) {
    const [progress, setProgress] = useState<{ label: string; value: number } | null>(null);
    const abort = useRef<AbortController | null>(null);
    useEffect(() => () => abort.current?.abort(), []);
    if (!canBeOverlay(scene)) return null;

    const start = async () => {
        const controller = new AbortController();
        abort.current = controller;
        setProgress({ label: 'Rendering…', value: 0 });
        try {
            const path = await exportTransparent({
                project,
                edit,
                source: { kind, id },
                resolution: 1080,
                fileName: `${project.source.name} ${sceneLabel(scene)}`,
                signal: controller.signal,
                onProgress: ({ phase, progress }) => setProgress({ label: phase === 'browser' ? 'Downloading the scene renderer (once)…' : 'Rendering…', value: progress }),
            });
            toast.success('Transparent video saved to Exports', { action: { label: 'Show', onClick: () => revealItemInDir(path).catch(() => {}) } });
        } catch (error) {
            if (!(error instanceof ExportCancelled)) toast.error(errorMessage(error));
        } finally {
            abort.current = null;
            setProgress(null);
        }
    };

    return progress ? (
        <div className='space-y-2'>
            <div className='flex items-center justify-between text-xs text-muted'>
                <span>{progress.label}</span>
                <Button size='icon-sm' variant='ghost' onClick={() => abort.current?.abort()} title='Cancel' aria-label='Cancel'>
                    <X className='h-3.5 w-3.5' />
                </Button>
            </div>
            <ProgressBar value={progress.value} />
        </div>
    ) : (
        <Button size='sm' variant='secondary' className='w-full' onClick={start} title='Save this scene alone as a ProRes 4444 .mov with a transparent background (1080p), for Final Cut or Premiere'>
            <Film className='h-3.5 w-3.5' /> Export as transparent video
        </Button>
    );
}
