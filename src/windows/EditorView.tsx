import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import {
    ArrowLeft,
    Check,
    CircleAlert,
    Crop,
    Download,
    FastForward,
    FolderOpen,
    Gauge,
    Keyboard,
    Loader2,
    Minus,
    Pause,
    Play,
    Plus,
    Redo2,
    Rewind,
    RotateCcw,
    Scissors,
    Sparkles,
    SquareSplitHorizontal,
    Trash2,
    Undo2,
    X,
} from 'lucide-react';
import { toast } from '../lib/toast';
import { api, errorMessage, fileUrl, formatDuration, isStudio, type CursorData, type Project } from '../lib/api';
import { Button, IconButton, Popover, RangeInput, Segmented, Spinner, TextInput, cx } from '../components/ui';
import { CropOverlay } from '../editor/CropOverlay';
import { ExportDialog } from '../editor/ExportDialog';
import { useLicense } from '../lib/license';
import { ShortcutsSheet } from '../editor/ShortcutsSheet';
import { Inspector } from '../editor/Inspector';
import { TextHandle } from '../editor/TextHandle';
import { HideHandle } from '../editor/HideHandle';
import { ZoomFocusHandle } from '../editor/ZoomFocusHandle';
import { MAX_TIMELINE_ZOOM, MIN_TIMELINE_ZOOM, Timeline, type TimelineHandle } from '../editor/Timeline';
import { combinePeaks, computePeaks } from '../editor/waveform';
import { gainOf } from '../editor/audioSchedule';
import {
    ASPECTS,
    aspectRatio,
    autoZooms,
    defaultEdit,
    hideActive,
    insertScene,
    isRecording,
    itemStarts,
    MIN_ZOOM,
    outputTimeOf,
    newId,
    DEFAULT_CROSSFADE,
    type OverlayClip,
    normalizeEdit,
    overlaysAt,
    audioFiles,
    recordingCaptions,
    captionSpans,
    dropOrphanVoiceCaptions,
    isIdentityFx,
    positionAt,
    removeItem,
    removeRange,
    splitAt,
    TEXT_FADE,
    textAmount,
    timedSegments,
    totalDuration,
    type Caption,
    type Captions,
    type Edit,
    type HideRegion,
    type SceneClip,
    type TextOverlay,
    type TimelineItem,
    type Zoom,
    withHeldEnds,
} from '../editor/model';
import { drawCaptions, drawDip, drawFrame, drawLayer, fillBackground, layoutFrame, screenView, videoFrame } from '../editor/render';
import { exportSize } from '../editor/export';
import { SceneLayer, type SceneLayerHandle } from '../studio/SceneLayer';
import { canBeOverlay, canBeScene, needsRecording, SCENES } from '../studio/scenes';
import type { Segment, TargetRect } from '../studio/scenes/assets';
import { useProjectBrand } from '../studio/brandKits';
import { initialSceneProps, previewAssets, recordingInfo } from '../studio/sceneEnv';
import { TargetPicker } from '../studio/TargetPicker';
import { LayerHandles } from '../studio/LayerHandles';
import { beatsOnTimeline } from '../editor/beats';
import { layerAspect, type Layer } from '../studio/scenes/layers';

/** A new Studio video starts as a short teaser to edit: logo, a statement, an end card. */
function studioStarter(): SceneClip[] {
    return ['LogoSting', 'KineticStatement', 'EndCard'].map((id, index) => ({
        kind: 'scene',
        id: newId(),
        scene: id,
        props: { ...SCENES[id].defaultProps },
        duration: SCENES[id].defaultDuration,
        ...(index > 0 ? { transition: { type: 'crossfade', duration: DEFAULT_CROSSFADE } } : {}),
    }));
}

/** The ✨ menu: scenes to add at the playhead. */
const SCENE_CHOICES = [
    { id: 'LogoSting', hint: 'Your logo, revealed' },
    {
        id: 'TitleReveal',
        hint: 'A title card',
        overlayHint: 'A title over the video',
    },
    {
        id: 'KineticStatement',
        hint: 'A bold line, word by word',
        overlayHint: 'Big words over the video',
    },
    { id: 'DeviceShowcase', hint: 'The recording in a laptop or window' },
    { id: 'FeatureCallout', hint: 'Zoom in and point at one thing' },
    { id: 'StatCounter', hint: 'Numbers that count up' },
    { id: 'LowerThird', hint: '', overlayHint: 'A name and title bar' },
    { id: 'EndCard', hint: 'Call to action, link and QR code' },
    {
        id: 'ScreenshotShowcase',
        hint: 'A screenshot in a phone, laptop or browser',
    },
    { id: 'FeatureGrid', hint: 'Features as cards with icons' },
    { id: 'Testimonial', hint: 'A customer quote with stars' },
    { id: 'Pricing', hint: 'Plans and prices' },
    { id: 'BeforeAfter', hint: 'Two pictures with a sweeping divider' },
    {
        id: 'LogoWall',
        hint: 'Customer or partner logos',
        overlayHint: 'Logos over the video',
    },
    { id: 'CodeTyping', hint: 'Code typing itself in an editor' },
    { id: 'Comparison', hint: 'Us vs them, ticks and crosses' },
    {
        id: 'Lottie',
        hint: 'A Lottie or Rive animation you add',
        overlayHint: 'A Lottie or Rive animation over the video',
    },
    { id: 'Roadmap', hint: 'Milestones on a line' },
    { id: 'Team', hint: 'The people behind it' },
    { id: 'VideoClip', hint: 'A video clip you add (b-roll)' },
    { id: 'Waveform', hint: 'Bars moving with an audio file' },
    { id: 'Showcase3D', hint: 'A phone, laptop or your logo in 3D' },
    { id: 'TextAnimation', hint: '', overlayHint: 'Text that types, rises, blurs or sweeps in' },
    { id: 'ImageAnimation', hint: '', overlayHint: 'A picture that rises, fades, wipes or slides in' },
    { id: 'ElementAnimation', hint: '', overlayHint: 'A drawn check, arrow, underline, ring, sparkles or confetti' },
    { id: 'ProgressAnimation', hint: '', overlayHint: 'A ring or bar filling to a number' },
    {
        id: 'Custom',
        hint: 'Your own layers: text, shapes, icons, animated elements',
        overlayHint: 'Your own layers over the video',
    },
];
import { useHistory } from '../editor/useHistory';
import { usePlayback } from '../editor/usePlayback';
import { useThumbnails } from '../editor/useThumbnails';

const SAVE_DELAY_MS = 400;
const SPEED_PRESETS = [0.5, 1, 1.5, 2, 3, 4];
const ASPECT_HINTS: Record<string, string> = {
    '16:9': '· Wide',
    '9:16': '· Vertical',
    '1:1': '· Square',
    '4:5': '· Portrait',
};
/** Canvas resolution is capped so drawing stays fast on big screens. */
const MAX_PIXEL_RATIO = 2;

export function EditorView({ project, onClose }: { project: Project; onClose: () => void }) {
    const studio = isStudio(project);
    const { license } = useLicense();
    // The timeline is never empty (positionAt needs an item), even before edit.json loads.
    const history = useHistory<Edit>(studio ? { ...defaultEdit(project), items: studioStarter() } : defaultEdit(project));
    const edit = history.value;
    const [loaded, setLoaded] = useState(false);
    const [cursor, setCursor] = useState<CursorData | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const [selectedHideId, setSelectedHideId] = useState<string | null>(null);
    const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
    /** A selected voiceover or sound effect. */
    const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
    /** What the ✨ menu adds: a scene in the timeline, or an overlay drawn over it. */
    const [addAs, setAddAs] = useState<'scene' | 'overlay' | 'animation'>('scene');
    const [sceneQuery, setSceneQuery] = useState('');
    /** True when the recording had no edit.json yet, so auto-zoom runs once the cursor loads. */
    const freshRef = useRef(false);
    const [cropping, setCropping] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved');
    const exportingRef = useRef(exporting);
    exportingRef.current = exporting;
    /** Output-time range marked for cutting (the two red markers), or null. */
    const [cutRange, setCutRange] = useState<[number, number] | null>(null);
    const [time, setTime] = useState(0);
    /**
     * The editor plays a 1080p copy of the screen video once it's made: full-size Retina
     * recordings of busy content can be too heavy to decode in real time here, which freezes the
     * preview. Exports always use the original.
     */
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [makingPreview, setMakingPreview] = useState(false);
    /** The screen video has decoded its first frame (always true for Studio, which has no recording). */
    const [videoReady, setVideoReady] = useState(studio);
    const [loaderSkipped, setLoaderSkipped] = useState(false);
    const [loaderSlow, setLoaderSlow] = useState(false);
    const [stage, setStage] = useState({ width: 0, height: 0 });

    const clickTimes = useMemo(() => cursor?.clicks.map(([t]) => t) ?? [], [cursor]);
    const playback = usePlayback(
        project,
        edit.items,
        {
            enabled: edit.cursor.clickSound,
            type: edit.cursor.clickSoundType,
            volume: edit.cursor.clickVolume,
            times: clickTimes,
        },
        edit.audio,
        edit.overlays,
        useMemo(() => audioFiles(edit), [edit.items, edit.overlays, edit.audio])
    );
    const playbackRef = useRef(playback);
    playbackRef.current = playback;

    // Waveform: each track's peaks are computed once, then combined with the current volumes.
    const trackPeaks = useMemo(
        () =>
            (playback.audio ?? []).map(({ kind, track, buffer }) => ({
                kind,
                peaks: computePeaks(
                    [
                        {
                            channels: Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c)),
                            sampleRate: buffer.sampleRate,
                            offset: track.offset,
                            gain: 1,
                        },
                    ],
                    project.duration
                ),
            })),
        [playback.audio, project.duration]
    );
    const waveform = useMemo(
        () =>
            combinePeaks(
                trackPeaks.map(({ kind, peaks }) => ({
                    peaks,
                    gain: gainOf(edit.audio[kind]),
                }))
            ),
        [trackPeaks, edit.audio]
    );
    const [timelineZoom, setTimelineZoom] = useState(1);
    const clampZoom = (value: number) => Math.min(MAX_TIMELINE_ZOOM, Math.max(MIN_TIMELINE_ZOOM, value));
    const thumbnails = useThumbnails(project);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneLayerRef = useRef<SceneLayerHandle>(null);
    /** Off-screen canvas the recording is drawn on during a transition, before it is moved or faded. */
    const layerCanvasRef = useRef<HTMLCanvasElement | null>(null);
    /** Captions, drawn over the scene and overlay players. */
    const captionCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayLayerRef = useRef<SceneLayerHandle>(null);
    const voiceCaptionSpans = useMemo(() => captionSpans(edit).filter((span) => span.item.voice), [edit.items, edit.captions.items, edit.audio.voiceovers]);
    const scenePieces = useMemo(() => withHeldEnds(edit.items).filter((item) => item.kind === 'scene'), [edit.items]);
    const stageRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<TimelineHandle>(null);
    const editRef = useRef(edit);
    editRef.current = edit;
    const croppingRef = useRef(cropping);
    croppingRef.current = cropping;
    /** While a fixed-point zoom is selected and paused, the preview shows the whole screen so its focus can be placed. */
    const placingFocusRef = useRef(false);

    // Load edit.json and the cursor track.
    useEffect(() => {
        let cancelled = false;
        api.loadEdit(project.id)
            .then((saved) => {
                if (cancelled) return;
                freshRef.current = saved == null;
                const loadedEdit = normalizeEdit(project, saved);
                if (studio && loadedEdit.items.length === 0) loadedEdit.items = studioStarter();
                history.reset(loadedEdit);
            })
            .catch((error) => toast.error(`Could not load your edits: ${errorMessage(error)}`))
            .finally(() => !cancelled && setLoaded(true));
        if (project.tracks.cursor.file)
            fetch(fileUrl(project, project.tracks.cursor.file))
                .then((response) => (response.ok ? response.json() : null))
                .then((data) => !cancelled && setCursor(data))
                .catch(() => {});
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project]);

    useEffect(() => {
        if (studio) return;
        let cancelled = false;
        const slow = setTimeout(() => !cancelled && setMakingPreview(true), 400);
        api.makePreview(project.id)
            .then((file) => !cancelled && setPreviewFile(file))
            .catch((error) => api.log(`[editor ${project.id}] preview copy failed, playing the original: ${error}`))
            .finally(() => {
                clearTimeout(slow);
                if (!cancelled) setMakingPreview(false);
            });
        return () => {
            cancelled = true;
            clearTimeout(slow);
        };
    }, [project.id]);
    // When the video switches to the preview copy, put it back where playback is.
    const onScreenLoaded = () => {
        setVideoReady(true);
        if (previewFile) playbackRef.current.seek(playbackRef.current.now());
    };
    // The video element reloads when it switches to the smooth preview copy.
    useEffect(() => {
        if (!studio) setVideoReady(false);
    }, [studio, previewFile]);

    // Once: the editing keys changed (S used to mark a cut).
    useEffect(() => {
        try {
            if (localStorage.getItem('capturita.tip.keys')) return;
            localStorage.setItem('capturita.tip.keys', '1');
        } catch {
            return;
        }
        toast.info('New editing keys', {
            description: 'S splits a clip, C marks a part to cut, Z adds a zoom. Press ? for all shortcuts.',
            duration: 8000,
        });
    }, []);

    // A new recording starts with zooms around its clicks, like Screen Studio.
    useEffect(() => {
        if (!loaded || !cursor || !freshRef.current) return;
        freshRef.current = false;
        if (cursor.clicks.length === 0 || editRef.current.zooms.length > 0) return;
        history.reset({
            ...editRef.current,
            zooms: autoZooms(cursor, project.duration, editRef.current.zoomScale),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, cursor]);

    // Auto-save shortly after each change, and once more when leaving the editor.
    const pendingSave = useRef<Edit | null>(null);
    const flushSave = useCallback(() => {
        const value = pendingSave.current;
        if (!value) return Promise.resolve();
        pendingSave.current = null;
        setSaveState('saving');
        return api
            .saveEdit(project.id, value, studio ? totalDuration(value.items) : undefined)
            .then(() => setSaveState(pendingSave.current ? 'pending' : 'saved'))
            .catch((error) => {
                setSaveState('error');
                toast.error(`Could not save your edits: ${errorMessage(error)}`);
            });
    }, [project.id]);
    const skipSave = useRef(true);
    useEffect(() => {
        if (!loaded) return;
        if (skipSave.current) {
            skipSave.current = false;
            return;
        }
        pendingSave.current = edit;
        setSaveState('pending');
        const timeout = setTimeout(flushSave, SAVE_DELAY_MS);
        return () => clearTimeout(timeout);
    }, [edit, loaded, flushSave]);
    useEffect(() => () => void flushSave(), [flushSave]);

    // Fit the output frame into the available stage.
    useEffect(() => {
        const element = stageRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) =>
            setStage({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            })
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const aspect = aspectRatio(edit, project);
    const frameWidth = Math.max(1, Math.min(stage.width, stage.height * aspect));
    const frameHeight = frameWidth / aspect;
    /** Scenes are laid out at the size of a 1080p export, and scaled to the preview. */
    const sceneSize = exportSize(edit, project, 1080);
    const brand = useProjectBrand(project, edit.brandKit);
    const sceneEnv = useMemo(
        () => ({
            brand,
            recording: recordingInfo(project),
            assets: previewAssets(project, previewFile),
        }),
        [brand, project, previewFile]
    );

    // One loop draws every frame and moves the playhead; React state updates are throttled.
    const lastTimeUpdate = useRef(0);
    useEffect(() => {
        let frame = 0;
        let previous = performance.now();
        let lastSlowLog = 0;
        // Diagnostics: when the screen video stops advancing while playing.
        let lastVideoTime = -1;
        let videoStuckSince = 0;
        let stuckLogged = false;
        const loop = () => {
            const playback = playbackRef.current;
            // Development builds note stutters while playing, so a slow preview can be diagnosed from the app's log.
            const started = performance.now();
            const gap = started - previous;
            previous = started;
            if (import.meta.env.DEV && playback.playing && gap > 80 && started - lastSlowLog > 1000) {
                lastSlowLog = started;
                const video = playback.screenRef.current;
                api.log(
                    `[preview] slow frame ${Math.round(gap)} ms at ${playback.now().toFixed(2)} s (video ${video?.currentTime.toFixed(2)}, seeking ${video?.seeking}, ready ${video?.readyState})`
                );
            }
            const screenVideo = playback.screenRef.current;
            if (import.meta.env.DEV && playback.playing && screenVideo) {
                if (screenVideo.currentTime !== lastVideoTime) {
                    if (stuckLogged)
                        api.log(`[preview] video moving again at ${screenVideo.currentTime.toFixed(2)} after ${Math.round(started - videoStuckSince)} ms`);
                    lastVideoTime = screenVideo.currentTime;
                    videoStuckSince = started;
                    stuckLogged = false;
                } else if (!stuckLogged && started - videoStuckSince > 150) {
                    stuckLogged = true;
                    const buffered = Array.from(
                        { length: screenVideo.buffered.length },
                        (_, i) => `${screenVideo.buffered.start(i).toFixed(1)}-${screenVideo.buffered.end(i).toFixed(1)}`
                    ).join(',');
                    api.log(
                        `[preview] video stuck at ${screenVideo.currentTime.toFixed(2)} (clock ${playback.now().toFixed(2)}, paused ${screenVideo.paused}, seeking ${screenVideo.seeking}, ready ${screenVideo.readyState}, network ${screenVideo.networkState}, buffered ${buffered}, rate ${screenVideo.playbackRate})`
                    );
                }
            }
            const t = playback.tick();
            timelineRef.current?.setPlayhead(t);
            const now = performance.now();
            if (now - lastTimeUpdate.current > 100) {
                lastTimeUpdate.current = now;
                setTime(t);
            }
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                const current = editRef.current;
                const position = positionAt(current.items, t);
                // While playing, draw the zoom and cursor for the frame the video is actually
                // showing (it can trail the audio clock slightly), so they never drift apart.
                const video = playback.screenRef.current;
                if (playback.playing && video && !video.seeking && video.readyState >= 2) {
                    const shown = video.currentTime + project.tracks.screen.offset;
                    if (shown >= position.clip.start && shown <= position.clip.end && Math.abs(shown - position.source) < 0.25) position.source = shown;
                }
                const camera = project.tracks.camera;
                const cameraLocal = camera ? position.source - camera.offset : -1;
                // Scenes are drawn by their Players over the canvas; with no recording under them,
                // the canvas shows only the background (seen through transparent scenes).
                // During a transition the recording is drawn on its own canvas, then moved, clipped
                // or faded over the background, as the export does.
                const transitioning = position.recording && !isIdentityFx(position.recordingFx);
                const target = transitioning ? (layerCanvasRef.current ??= document.createElement('canvas')) : canvas;
                if (target !== canvas && (target.width !== canvas.width || target.height !== canvas.height)) {
                    target.width = canvas.width;
                    target.height = canvas.height;
                }
                const targetCtx = target === canvas ? ctx : target.getContext('2d')!;
                if (!position.recording || transitioning) fillBackground(ctx, current.background, canvas.width, canvas.height, project);
                if (position.recording)
                    drawFrame(targetCtx, canvas.width, canvas.height, {
                        edit: current,
                        project,
                        screen: videoFrame(playback.screenRef.current),
                        camera: videoFrame(playback.cameraRef.current),
                        cameraActive: !!camera && cameraLocal >= 0 && cameraLocal < camera.duration,
                        cursor,
                        time: position.source,
                        ignoreCrop: croppingRef.current,
                        noZoom: placingFocusRef.current && !playback.playing,
                        preview: true,
                    });
                if (transitioning) drawLayer(ctx, target, position.recordingFx, canvas.width, canvas.height);
                // With no scene on screen the wash goes on the canvas; otherwise over the scene players.
                if (position.scenes.length === 0) drawDip(ctx, position.dip, canvas.width, canvas.height);
                sceneLayerRef.current?.update(
                    position.scenes.map((s) => ({
                        id: s.item.id,
                        time: s.time,
                        opacity: s.opacity,
                        fx: s.fx,
                    })),
                    position.scenes.length > 0 ? position.dip : null
                );
                overlayLayerRef.current?.update(
                    overlaysAt(current.overlays, t).map((o) => ({
                        id: o.item.id,
                        time: o.time,
                        opacity: 1,
                    }))
                );
                const captionCanvas = captionCanvasRef.current;
                const captionCtx = captionCanvas?.getContext('2d');
                if (captionCanvas && captionCtx) {
                    captionCtx.clearRect(0, 0, captionCanvas.width, captionCanvas.height);
                    drawCaptions(captionCtx, current, t, captionCanvas.width, captionCanvas.height);
                }
            }
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [project, cursor]);

    const setItems = useCallback((items: TimelineItem[], key?: string) => history.set((e) => ({ ...e, items }), key), [history]);
    // A deleted voiceover takes its captions with it.
    const change = useCallback(
        (partial: Partial<Edit>, key: string) =>
            history.set((e) => (partial.audio ? dropOrphanVoiceCaptions({ ...e, ...partial }) : { ...e, ...partial }), key),
        [history]
    );

    /** Saves a picture as the recording's thumbnail (thumb.jpg), as a JPEG at most 1280 px wide. */
    const saveThumbnail = async (source: CanvasImageSource, width: number, height: number) => {
        const scale = Math.min(1, 1280 / width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
        if (!blob) return;
        try {
            await api.saveThumbnail(project.id, blob);
            change({ thumbnail: Date.now() }, 'thumbnail');
            toast.success('Thumbnail set');
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };
    /** The frame on the preview, as it looks in the video (background, zoom and all). */
    const thumbnailFromFrame = () => {
        const canvas = canvasRef.current;
        if (canvas) saveThumbnail(canvas, canvas.width, canvas.height);
    };
    const thumbnailFromFile = async (file: File) => {
        try {
            const image = await createImageBitmap(file);
            await saveThumbnail(image, image.width, image.height);
            image.close();
        } catch {
            toast.error('Choose an image (PNG, JPEG, WebP or HEIC)');
        }
    };

    const togglePlay = () => (playback.playing ? playback.pause() : playback.play(playback.now()));

    /** First press shows two markers around the playhead; the second cuts out what's between them. */
    const cut = () => {
        const total = totalDuration(edit.items);
        if (!cutRange) {
            const width = Math.min(5, total * 0.2);
            const center = Math.min(Math.max(playback.now(), width / 2), total - width / 2);
            setCutRange([Math.max(0, center - width / 2), Math.min(total, center + width / 2)]);
            return;
        }
        if (Math.abs(cutRange[1] - cutRange[0]) < 0.1) {
            toast.info('Drag the red markers apart to choose what to cut.');
            return;
        }
        const items = removeRange(edit.items, cutRange[0], cutRange[1]);
        if (!items) {
            toast.info('That would cut the whole video. Move a marker to keep some of it.');
            return;
        }
        setItems(items);
        setCutRange(null);
        setSelectedId(null);
        playback.seek(Math.min(...cutRange));
    };
    const cancelCut = () => setCutRange(null);
    /** Splits the clip under the playhead in two, so each part can get its own speed or be removed. */
    const split = () => {
        const result = splitAt(edit.items, playback.now());
        if (!result) {
            toast.info(
                positionAt(edit.items, playback.now()).item.kind === 'scene'
                    ? 'Scenes can’t be split.'
                    : 'Move the playhead away from the clip edges to split it.'
            );
            return;
        }
        setItems(result.items);
        select('clip', result.selected);
    };
    /** Puts a motion scene at the playhead (splitting the clip there) and shows it. */
    const addScene = (id = 'TitleReveal') => {
        const definition = SCENES[id];
        const props = initialSceneProps(id, edit.items, playback.now(), project, cursor);
        const scene: SceneClip = {
            kind: 'scene',
            id: newId(),
            scene: id,
            props,
            duration: definition.defaultDuration,
        };
        const items = insertScene(edit.items, playback.now(), scene);
        setItems(items);
        select('clip', scene.id);
        // Seek once the longer timeline has reached the player.
        const index = items.findIndex((item) => item.id === scene.id);
        requestAnimationFrame(() => playback.seek(itemStarts(items)[index] + Math.min(1.5, scene.duration / 2)));
    };

    /** Puts an overlay at the playhead (it stays inside the timeline) and shows it. */
    const addOverlay = (id: string) => {
        const total = totalDuration(edit.items);
        const duration = Math.min(SCENES[id].defaultDuration, total);
        const start = Math.max(0, Math.min(playback.now(), total - duration));
        const overlay: OverlayClip = {
            id: newId(),
            scene: id,
            props: initialSceneProps(id, edit.items, start, project, cursor),
            start,
            duration,
        };
        setOverlays([...edit.overlays, overlay]);
        select('overlay', overlay.id);
        playback.seek(start + Math.min(1.5, duration / 2));
    };

    const selectedItem = edit.items.find((item) => item.id === selectedId) ?? null;
    const selected = selectedItem && isRecording(selectedItem) ? selectedItem : null;
    const selectedScene = selectedItem?.kind === 'scene' ? selectedItem : null;
    // The selected scene's target, while it's being drawn on the preview.
    const [pickingTarget, setPickingTarget] = useState(false);
    useEffect(() => setPickingTarget(false), [selectedId]);
    const targetField = selectedScene ? SCENES[selectedScene.scene]?.fields.find((f) => f.type === 'rect') : undefined;
    const picker =
        pickingTarget && selectedScene && targetField?.type === 'rect'
            ? {
                  scene: selectedScene,
                  name: targetField.name,
                  rect: {
                      ...(SCENES[selectedScene.scene].defaultProps[targetField.name] as TargetRect),
                      ...(selectedScene.props[targetField.name] as TargetRect),
                  },
                  segment: (selectedScene.props[targetField.segment] ?? SCENES[selectedScene.scene].defaultProps[targetField.segment]) as Segment,
              }
            : null;
    const recordingCount = edit.items.filter(isRecording).length;
    const selectedZoom = edit.zooms.find((zoom) => zoom.id === selectedZoomId) ?? null;
    const setZooms = useCallback((zooms: Zoom[], key?: string) => history.set((e) => ({ ...e, zooms }), key), [history]);
    const selectedText = edit.texts.find((text) => text.id === selectedTextId) ?? null;
    const setTexts = useCallback((texts: TextOverlay[], key?: string) => history.set((e) => ({ ...e, texts }), key), [history]);
    const selectedHide = edit.hides.find((hide) => hide.id === selectedHideId) ?? null;
    const setHides = useCallback((hides: HideRegion[], key?: string) => history.set((e) => ({ ...e, hides }), key), [history]);
    const setCaptions = useCallback((captions: Captions, key?: string) => history.set((e) => ({ ...e, captions }), key), [history]);
    const setCaptionItems = useCallback((items: Caption[], key?: string) => history.set((e) => ({ ...e, captions: { ...e.captions, items } }), key), [history]);
    const selectedOverlay = edit.overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null;
    const selectedAudio = useMemo(() => {
        const voice = edit.audio.voiceovers.find((c) => c.id === selectedAudioId);
        if (voice) return { clip: voice, kind: 'voice' as const };
        const effect = edit.audio.effects.find((c) => c.id === selectedAudioId);
        return effect ? { clip: effect, kind: 'sfx' as const } : null;
    }, [edit.audio, selectedAudioId]);
    const setOverlays = useCallback((overlays: OverlayClip[], key?: string) => history.set((e) => ({ ...e, overlays }), key), [history]);
    const musicBeats = useMemo(() => beatsOnTimeline(edit.audio.music, totalDuration(edit.items)), [edit.audio.music, edit.items]);
    // The selected Custom scene or overlay: its layer picked in the panel or on the preview, where the playhead is in it.
    const [sceneLayer, setSceneLayer] = useState<number | null>(null);
    useEffect(() => setSceneLayer(null), [selectedId, selectedOverlayId]);
    const layered = selectedScene?.scene === 'Custom' ? selectedScene : selectedOverlay?.scene === 'Custom' ? selectedOverlay : null;
    const layeredStart = !layered ? 0 : 'start' in layered ? layered.start : itemStarts(edit.items)[edit.items.indexOf(layered as TimelineItem)];
    const layerTime = time - layeredStart;
    const sceneLayerEdit = {
        selected: sceneLayer,
        onSelect: setSceneLayer,
        time: Math.max(0, layerTime),
        aspect: layerAspect(frameWidth, frameHeight),
    };
    const setLayers = (layers: Layer[]) => {
        if (!layered) return;
        const props = { ...layered.props, layers };
        if ('start' in layered)
            setOverlays(
                edit.overlays.map((o) => (o.id === layered.id ? { ...o, props } : o)),
                `overlay-${layered.id}-layers`
            );
        else
            setItems(
                edit.items.map((item) => (item.id === layered.id ? { ...layered, props } : item)),
                `scene-${layered.id}-layers`
            );
    };
    /** Only one thing (clip, zoom, text, hidden area, caption or overlay) is selected at a time. */
    const select = (kind: 'clip' | 'zoom' | 'text' | 'hide' | 'caption' | 'overlay' | 'audio', id: string | null) => {
        setSelectedOverlayId(kind === 'overlay' ? id : null);
        setSelectedAudioId(kind === 'audio' ? id : null);
        setSelectedId(kind === 'clip' ? id : null);
        setSelectedZoomId(kind === 'zoom' ? id : null);
        setSelectedTextId(kind === 'text' ? id : null);
        setSelectedHideId(kind === 'hide' ? id : null);
        setSelectedCaptionId(kind === 'caption' ? id : null);
    };
    /** Output time of a source time; inside a cut, the start of the next kept clip. */
    const outputTimeAt = (source: number) => {
        const index = edit.items.findIndex((item) => isRecording(item) && source < item.end);
        const clip = edit.items[index];
        if (!clip || !isRecording(clip)) return playback.total;
        return outputTimeOf(edit.items, index, Math.max(source, clip.start));
    };
    /** Selecting a hidden area moves the playhead into it, so its box shows on the preview. */
    const selectHide = (id: string | null) => {
        select('hide', id);
        const hide = edit.hides.find((h) => h.id === id);
        if (!hide || hideActive(hide, positionAt(edit.items, playback.now()).source)) return;
        const segment = timedSegments(edit.items, [hide])[0];
        if (segment) playback.seek(Math.min(segment.to, segment.from + 0.05));
    };
    const selectCaption = (id: string | null) => select('caption', id);
    /** Adds a 5-second hidden area at the playhead, in the middle of what's on screen. */
    const addHide = () => {
        const { clip, source, recording } = positionAt(edit.items, playback.now());
        if (!recording) {
            toast.info('Move the playhead onto the recording to hide part of it.');
            return;
        }
        let start = source;
        let end = Math.min(clip.end, start + 5);
        if (end - start < MIN_ZOOM) start = Math.max(clip.start, end - 5);
        if (end - start < MIN_ZOOM) {
            toast.info('This clip is too short to hide part of it.');
            return;
        }
        const { crop } = screenView(edit, project, cursor, source, 1, 1);
        const width = crop.width * 0.4;
        const height = crop.height * 0.12;
        const hide: HideRegion = {
            id: newId(),
            start,
            end,
            style: 'pixelate',
            x: crop.x + (crop.width - width) / 2,
            y: crop.y + (crop.height - height) / 2,
            width,
            height,
        };
        setHides([...edit.hides, hide].sort((a, b) => a.start - b.start));
        select('hide', hide.id);
    };
    const deleteHide = (id: string) => {
        setHides(edit.hides.filter((hide) => hide.id !== id));
        setSelectedHideId(null);
    };
    const selectClip = (id: string | null) => select('clip', id);
    const selectZoom = (id: string | null) => select('zoom', id);
    /** Selecting a text also moves the playhead into it, so it's visible and can be dragged. */
    const selectText = (id: string | null) => {
        select('text', id);
        const text = edit.texts.find((t) => t.id === id);
        if (!text) return;
        const current = positionAt(edit.items, playback.now()).source;
        if (textAmount(text, current) > 0) return;
        const segment = timedSegments(edit.items, [text])[0];
        if (segment) playback.seek(Math.min(segment.to, segment.from + TEXT_FADE));
    };
    /** Adds a 3-second text starting at the playhead (inside the current clip). */
    const addText = () => {
        if (license.supported && !license.pro) {
            toast.info('Animated titles are part of Capturita Pro. Activate a license in Settings.');
            window.dispatchEvent(new CustomEvent('capturita-open-license'));
            return;
        }
        const { clip, source, recording } = positionAt(edit.items, playback.now());
        if (!recording) {
            toast.info('Move the playhead onto the recording to add text.');
            return;
        }
        let start = source;
        let end = Math.min(clip.end, start + 3);
        if (end - start < MIN_ZOOM) start = Math.max(clip.start, end - 3);
        if (end - start < MIN_ZOOM) {
            toast.info('This clip is too short for text.');
            return;
        }
        const text: TextOverlay = {
            id: newId(),
            start,
            end,
            text: 'Your text',
            x: 0.5,
            y: 0.18,
            size: 0.07,
            color: '#ffffff',
            bold: true,
            background: 'none',
            font: 'system',
            animation: 'rise',
        };
        setTexts([...edit.texts, text].sort((a, b) => a.start - b.start));
        select('text', text.id);
        playback.seek(Math.min(playback.total, playback.now() + TEXT_FADE));
    };
    const deleteText = (id: string) => {
        setTexts(edit.texts.filter((text) => text.id !== id));
        setSelectedTextId(null);
    };
    const deleteZoom = (id: string) => {
        setZooms(edit.zooms.filter((zoom) => zoom.id !== id));
        setSelectedZoomId(null);
    };
    /** Adds a 3-second zoom at the playhead, or at an output time (inside that clip). */
    const addZoom = (at?: number) => {
        const { clip, source, recording } = positionAt(edit.items, at ?? playback.now());
        if (!recording) {
            toast.info('Move the playhead onto the recording to zoom.');
            return;
        }
        let start = source;
        let end = Math.min(clip.end, start + 3);
        if (end - start < MIN_ZOOM) start = Math.max(clip.start, end - 3);
        if (end - start < MIN_ZOOM) {
            toast.info('This clip is too short to zoom.');
            return;
        }
        // Don't run into the next zoom.
        const next = edit.zooms.filter((z) => z.start >= start).reduce((min, z) => Math.min(min, z.start), Infinity);
        end = Math.min(end, next);
        if (end - start < MIN_ZOOM || edit.zooms.some((z) => start >= z.start && start < z.end)) {
            toast.info('There is already a zoom here.');
            return;
        }
        const zoom: Zoom = {
            id: newId(),
            start,
            end,
            scale: edit.zoomScale,
            mode: 'follow',
            x: 0.5,
            y: 0.5,
            auto: false,
        };
        setZooms([...edit.zooms, zoom].sort((a, b) => a.start - b.start));
        selectZoom(zoom.id);
    };
    const runAutoZoom = () => {
        if (!cursor) return;
        // Keep zooms the user made or changed; replace the automatic ones.
        const manual = edit.zooms.filter((zoom) => !zoom.auto);
        setZooms([...manual, ...autoZooms(cursor, project.duration, edit.zoomScale)].sort((a, b) => a.start - b.start));
        setSelectedZoomId(null);
        toast.success('Zooms re-created from your clicks');
    };
    const deleteSelected = () => {
        if (selectedHide) {
            deleteHide(selectedHide.id);
            return;
        }
        if (selectedCaptionId) {
            setCaptionItems(edit.captions.items.filter((c) => c.id !== selectedCaptionId));
            setSelectedCaptionId(null);
            return;
        }
        if (selectedText) {
            deleteText(selectedText.id);
            return;
        }
        if (selectedZoom) {
            deleteZoom(selectedZoom.id);
            return;
        }
        if (selectedOverlay) {
            setOverlays(edit.overlays.filter((o) => o.id !== selectedOverlay.id));
            setSelectedOverlayId(null);
            return;
        }
        if (selectedAudio) {
            const lane = selectedAudio.kind === 'voice' ? 'voiceovers' : 'effects';
            change(
                {
                    audio: {
                        ...edit.audio,
                        [lane]: edit.audio[lane].filter((c) => c.id !== selectedAudio.clip.id),
                    },
                },
                `${lane}-delete`
            );
            setSelectedAudioId(null);
            return;
        }
        if (!selectedItem || (selected && recordingCount <= 1)) return;
        setItems(removeItem(edit.items, selectedItem.id));
        setSelectedId(null);
    };
    /** Speed applies to the selected clip, or to the clip under the playhead when none is selected. */
    const speedTarget = selected ?? positionAt(edit.items, time).clip;
    const setSpeed = (speed: number) => {
        setItems(
            edit.items.map((item) => (item.id === speedTarget.id ? { ...speedTarget, speed } : item)),
            `speed-${speedTarget.id}`
        );
    };
    const applyZoomScaleToAll = () =>
        setZooms(
            edit.zooms.map((zoom) => ({
                ...zoom,
                scale: edit.zoomScale,
                auto: false,
            }))
        );

    // Keyboard shortcuts (ignored while typing in a field).
    const openExport = () => {
        if (studio && license.supported && !license.pro) {
            window.dispatchEvent(new CustomEvent('capturita-open-license'));
            return;
        }
        playback.pause();
        setExporting(true);
    };

    const skip = (seconds: number) => playback.seek(Math.min(playback.total, Math.max(0, playback.now() + seconds)));

    const actions = {
        togglePlay,
        cut,
        split,
        addZoom,
        cancelCut,
        deselect: () => select('clip', null),
        deleteSelected,
        addText,
        addHide,
        openExport,
        skip,
        shortcuts: () => setShowShortcuts(true),
        zoomTimeline: (factor: number | null) => setTimelineZoom((z) => (factor === null ? 1 : clampZoom(z * factor))),
        undo: history.undo,
        redo: history.redo,
    };
    // Editing waits until the preview can show a frame, so a half-loaded video never receives changes.
    const loading = !studio && !loaderSkipped && (!loaded || !videoReady || !playback.ready || makingPreview);
    const loadingRef = useRef(loading);
    loadingRef.current = loading;
    useEffect(() => {
        setLoaderSlow(false);
        if (!loading) return;
        const timer = setTimeout(() => setLoaderSlow(true), 12000);
        return () => clearTimeout(timer);
    }, [loading]);
    const keyActions = useRef(actions);
    keyActions.current = actions;
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const inField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
            if (inField && (target as HTMLInputElement).type !== 'range') return;
            // The export dialog, and the recorder (opened over the editor by ⌘⇧R), own the keyboard while open.
            if (exportingRef.current || loadingRef.current || document.querySelector('[data-recorder-open]')) return;
            const actions = keyActions.current;
            if (event.metaKey && (event.key === '=' || event.key === '+' || event.key === '-' || event.key === '0')) {
                event.preventDefault();
                actions.zoomTimeline(event.key === '0' ? null : event.key === '-' ? 1 / 1.5 : 1.5);
            } else if (event.metaKey && event.key.toLowerCase() === 'e') {
                event.preventDefault();
                actions.openExport();
            } else if (event.metaKey && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) actions.redo();
                else actions.undo();
            } else if (event.code === 'Space') {
                event.preventDefault();
                actions.togglePlay();
            } else if (!event.metaKey && event.key.toLowerCase() === 's') {
                actions.split();
            } else if (!event.metaKey && event.key.toLowerCase() === 'c') {
                actions.cut();
            } else if (!event.metaKey && event.key.toLowerCase() === 'z') {
                actions.addZoom();
            } else if (!event.metaKey && event.key.toLowerCase() === 't') {
                actions.addText();
            } else if (!event.metaKey && event.key.toLowerCase() === 'h') {
                actions.addHide();
            } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !inField && !event.metaKey) {
                // Sliders keep their own arrow keys.
                event.preventDefault();
                actions.skip(event.key === 'ArrowLeft' ? -5 : 5);
            } else if (event.key === '?') {
                actions.shortcuts();
            } else if (event.key === 'Escape') {
                actions.cancelCut();
                actions.deselect();
            } else if (event.key === 'Backspace' || event.key === 'Delete') {
                actions.deleteSelected();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const close = async () => {
        playback.pause();
        await flushSave();
        onClose();
    };

    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const cropFrame = cropping ? layoutFrame(edit, project, frameWidth, frameHeight, true) : null;
    const sourceTime = positionAt(edit.items, time).source;
    const cropped = edit.crop.x > 0 || edit.crop.y > 0 || edit.crop.width < 1 || edit.crop.height < 1;
    const placingFocus = !cropping && !playback.playing && selectedZoom?.mode === 'fixed';
    placingFocusRef.current = placingFocus;
    const exportName = `${project.source.name} ${new Date(project.createdAt).toISOString().slice(0, 16).replace('T', ' ').replace(':', '.')}`;

    return (
        <div className='relative flex h-full flex-col'>
            <header className='flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-3'>
                <IconButton label='Back to recordings' onClick={close}>
                    <ArrowLeft className='h-4 w-4' />
                </IconButton>
                <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold' title={project.source.name}>
                        {project.source.name}
                    </p>
                    <p className='text-xs text-muted'>{new Date(project.createdAt).toLocaleString()}</p>
                </div>
                <SaveStatus state={saveState} />
                <div className='ml-auto flex items-center gap-1'>
                    <IconButton label='Undo (⌘Z)' onClick={history.undo} disabled={!history.canUndo}>
                        <Undo2 className='h-4 w-4' />
                    </IconButton>
                    <IconButton label='Redo (⌘⇧Z)' onClick={history.redo} disabled={!history.canRedo}>
                        <Redo2 className='h-4 w-4' />
                    </IconButton>
                    <span className='mx-1 h-5 w-px bg-line' aria-hidden />
                    <IconButton label='Show in Finder' onClick={() => revealItemInDir(project.path)}>
                        <FolderOpen className='h-4 w-4' />
                    </IconButton>
                    <IconButton label='Keyboard shortcuts (?)' onClick={() => setShowShortcuts(true)}>
                        <Keyboard className='h-4 w-4' />
                    </IconButton>
                    <Button
                        variant='primary'
                        className='ml-2'
                        onClick={openExport}
                        disabled={!loaded}
                        title={studio && license.supported && !license.pro ? 'Studio exports are part of Capturita Pro. Activate a license in Settings.' : 'Export or upload (⌘E)'}
                    >
                        <Download className='h-4 w-4' /> Export
                    </Button>
                </div>
            </header>

            <div className='flex min-h-0 flex-1'>
                <div className='flex min-w-0 flex-1 flex-col'>
                    <div className='flex h-11 shrink-0 items-center justify-center gap-1.5 border-b border-line bg-panel'>
                        <Segmented
                            size='sm'
                            label='Aspect ratio'
                            value={edit.aspect}
                            onChange={(aspect) => change({ aspect }, 'aspect')}
                            options={ASPECTS.map((a) => ({
                                value: a.value,
                                label: a.value === 'auto' ? 'Original' : a.label,
                                hint: a.value === 'auto' ? 'Keep the recording’s own shape' : `${a.label} ${ASPECT_HINTS[a.value] ?? ''}`.trim(),
                            }))}
                        />
                        <Button
                            size='sm'
                            variant={cropping ? 'primary' : 'ghost'}
                            onClick={() => setCropping((c) => !c)}
                            title={cropping ? 'Finish cropping' : 'Crop the screen'}
                        >
                            {cropping ? <Check className='h-4 w-4' /> : <Crop className='h-4 w-4' />} {cropping ? 'Done' : 'Crop'}
                        </Button>
                        {cropped && !cropping && (
                            <IconButton label='Reset crop' size='icon-sm' onClick={() => change({ crop: { x: 0, y: 0, width: 1, height: 1 } }, 'crop-reset')}>
                                <RotateCcw className='h-3.5 w-3.5' />
                            </IconButton>
                        )}
                    </div>
                    <div ref={stageRef} className='relative flex min-h-0 flex-1 items-center justify-center bg-stage p-6'>
                        <div className='relative' style={{ width: frameWidth, height: frameHeight }}>
                            <canvas
                                ref={canvasRef}
                                width={Math.round(frameWidth * pixelRatio)}
                                height={Math.round(frameHeight * pixelRatio)}
                                className='h-full w-full rounded-lg shadow-2xl'
                                onClick={() => !cropping && playback.ready && togglePlay()}
                            />
                            <SceneLayer ref={sceneLayerRef} pieces={scenePieces} env={sceneEnv} width={sceneSize.width} height={sceneSize.height} />
                            <SceneLayer ref={overlayLayerRef} pieces={edit.overlays} overlay env={sceneEnv} width={sceneSize.width} height={sceneSize.height} />
                            <canvas
                                ref={captionCanvasRef}
                                width={Math.round(frameWidth * pixelRatio)}
                                height={Math.round(frameHeight * pixelRatio)}
                                className='pointer-events-none absolute inset-0 h-full w-full rounded-lg'
                                aria-hidden
                            />
                            {picker && (
                                <TargetPicker
                                    project={project}
                                    previewFile={previewFile}
                                    segment={picker.segment}
                                    rect={picker.rect}
                                    width={frameWidth}
                                    height={frameHeight}
                                    onChange={(rect) =>
                                        setItems(
                                            edit.items.map((item) =>
                                                item.id === picker.scene.id
                                                    ? {
                                                          ...picker.scene,
                                                          props: {
                                                              ...picker.scene.props,
                                                              [picker.name]: rect,
                                                          },
                                                      }
                                                    : item
                                            ),
                                            `scene-${picker.scene.id}-${picker.name}`
                                        )
                                    }
                                    onDone={() => setPickingTarget(false)}
                                />
                            )}
                            {layered && !playback.playing && layerTime >= 0 && layerTime < layered.duration && (
                                <LayerHandles
                                    layers={(layered.props.layers ?? SCENES.Custom.defaultProps.layers) as Layer[]}
                                    selected={sceneLayer}
                                    time={layerTime}
                                    width={frameWidth}
                                    height={frameHeight}
                                    onSelect={setSceneLayer}
                                    onChange={setLayers}
                                />
                            )}
                            {cropFrame && <CropOverlay frame={cropFrame} crop={edit.crop} onChange={(crop) => change({ crop }, 'crop')} />}
                            {!cropping && selectedHide && hideActive(selectedHide, sourceTime) && (
                                <HideHandle
                                    hide={selectedHide}
                                    view={screenView(edit, project, cursor, sourceTime, frameWidth, frameHeight)}
                                    onChange={(rect) =>
                                        setHides(
                                            edit.hides.map((h) => (h.id === selectedHide.id ? { ...h, ...rect } : h)),
                                            `hide-move-${selectedHide.id}`
                                        )
                                    }
                                />
                            )}
                            {placingFocus && selectedZoom && (
                                <ZoomFocusHandle
                                    zoom={selectedZoom}
                                    frame={layoutFrame(edit, project, frameWidth, frameHeight)}
                                    onMove={(x, y) =>
                                        setZooms(
                                            edit.zooms.map((z) => (z.id === selectedZoom.id ? { ...z, x, y, auto: false } : z)),
                                            `zoom-focus-${selectedZoom.id}`
                                        )
                                    }
                                />
                            )}
                            {!cropping && selectedText && textAmount(selectedText, sourceTime) > 0 && (
                                <TextHandle
                                    text={selectedText}
                                    width={frameWidth}
                                    height={frameHeight}
                                    onMove={(x, y) =>
                                        setTexts(
                                            edit.texts.map((t) => (t.id === selectedText.id ? { ...t, x, y } : t)),
                                            `text-move-${selectedText.id}`
                                        )
                                    }
                                />
                            )}
                        </div>
                        {placingFocus && (
                            <div className='absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-panel/90 px-3 py-1.5 text-xs text-muted shadow'>
                                Placing the zoom — drag the box, press Play to see it zoomed
                            </div>
                        )}
                    </div>

                    <div className='shrink-0 space-y-2 border-t border-line bg-panel px-4 pb-4 pt-2'>
                        <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
                            <div className='flex items-center gap-1'>
                                {!studio && (
                                    <IconButton label='Split the clip at the playhead (S)' onClick={split}>
                                        <SquareSplitHorizontal className='h-4 w-4' />
                                    </IconButton>
                                )}
                                <Popover
                                    side='top'
                                    trigger={(open, toggle) => (
                                        <Button
                                            size='sm'
                                            variant={open ? 'subtle' : 'ghost'}
                                            onClick={toggle}
                                            title='Add a motion scene or overlay at the playhead'
                                        >
                                            <Sparkles className='h-4 w-4' /> Add scene
                                        </Button>
                                    )}
                                >
                                    {(close) => {
                                        const sceneChoices = SCENE_CHOICES.filter(
                                            ({ id, hint, overlayHint }) =>
                                                (addAs === 'animation'
                                                    ? SCENES[id].group === 'animation'
                                                    : SCENES[id].group !== 'animation' && (addAs === 'scene' ? canBeScene(id) : canBeOverlay(id))) &&
                                                !(studio && needsRecording(id)) &&
                                                `${SCENES[id].label} ${addAs === 'scene' ? hint : overlayHint || hint}`
                                                    .toLowerCase()
                                                    .includes(sceneQuery.trim().toLowerCase())
                                        );
                                        return (
                                            <div className='w-64'>
                                                <div className='space-y-1.5 px-1 pb-1.5 pt-0.5'>
                                                    <Segmented
                                                        size='sm'
                                                        value={addAs}
                                                        onChange={setAddAs}
                                                        options={[
                                                            {
                                                                value: 'scene',
                                                                label: 'Scene',
                                                                hint: 'Full screen, in the timeline',
                                                            },
                                                            {
                                                                value: 'overlay',
                                                                label: 'Overlay',
                                                                hint: 'Drawn over the video',
                                                            },
                                                            {
                                                                value: 'animation',
                                                                label: 'Animation',
                                                                hint: 'Text, image and element animations',
                                                            },
                                                        ]}
                                                    />
                                                    <TextInput
                                                        size='sm'
                                                        autoFocus
                                                        value={sceneQuery}
                                                        onChange={(e) => setSceneQuery(e.target.value)}
                                                        placeholder={addAs === 'animation' ? 'Search animations' : 'Search scenes'}
                                                        aria-label='Search scenes'
                                                    />
                                                </div>
                                                {/* Scrolls once the list outgrows the window, so no scene is cut off. */}
                                                <div className='max-h-[min(60vh,28rem)] space-y-0.5 overflow-y-auto overscroll-contain'>
                                                    {sceneChoices.length === 0 && (
                                                        <p className='px-2 py-3 text-xs text-muted'>
                                                            No {addAs === 'scene' ? 'scenes' : addAs === 'overlay' ? 'overlays' : 'animations'} match “{sceneQuery.trim()}”. Try another word.
                                                        </p>
                                                    )}
                                                    {sceneChoices.map(({ id, hint, overlayHint }) => (
                                                        <button
                                                            key={id}
                                                            onClick={() => {
                                                                close();
                                                                if (addAs === 'scene' || (addAs === 'animation' && !canBeOverlay(id))) addScene(id);
                                                                else addOverlay(id);
                                                            }}
                                                            className='block w-full rounded-lg px-2 py-1.5 text-left hover:bg-panel-2'
                                                        >
                                                            <div className='text-sm text-fg'>{SCENES[id].label}</div>
                                                            <div className='text-xs text-muted'>{addAs === 'scene' ? hint : overlayHint || hint}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }}
                                </Popover>
                                <IconButton
                                    label={cutRange ? 'Cut out the marked part (C)' : 'Mark a part to cut (C)'}
                                    variant={cutRange ? 'danger' : 'ghost'}
                                    onClick={cut}
                                >
                                    <Scissors className='h-4 w-4' />
                                </IconButton>
                                {cutRange && (
                                    <IconButton label='Cancel cutting (Esc)' onClick={cancelCut}>
                                        <X className='h-4 w-4' />
                                    </IconButton>
                                )}
                                <span className='mx-1 h-5 w-px bg-line' aria-hidden />
                                <IconButton
                                    label={
                                        selectedHide
                                            ? 'Delete selected hidden area (⌫)'
                                            : selectedCaptionId
                                              ? 'Delete selected caption (⌫)'
                                              : selectedText
                                                ? 'Delete selected text (⌫)'
                                                : selectedZoom
                                                  ? 'Delete selected zoom (⌫)'
                                                  : selectedOverlay
                                                    ? 'Delete selected overlay (⌫)'
                                                    : selectedAudio
                                                      ? `Delete selected ${selectedAudio.kind === 'voice' ? 'voiceover' : 'sound effect'} (⌫)`
                                                      : selectedScene
                                                        ? 'Delete selected scene (⌫)'
                                                        : !selectedItem
                                                          ? 'Select something on the timeline to delete it'
                                                          : selected && recordingCount <= 1
                                                            ? 'The only recording clip can’t be deleted'
                                                            : 'Delete selected clip (⌫)'
                                    }
                                    onClick={deleteSelected}
                                    disabled={
                                        !selectedHide &&
                                        !selectedCaptionId &&
                                        !selectedText &&
                                        !selectedZoom &&
                                        !selectedOverlay &&
                                        !selectedAudio &&
                                        (!selectedItem || (!!selected && recordingCount <= 1))
                                    }
                                >
                                    <Trash2 className='h-4 w-4' />
                                </IconButton>
                            </div>

                            <div className='flex items-center gap-2'>
                                <IconButton label='Back 5 seconds (←)' onClick={() => skip(-5)} disabled={!playback.ready}>
                                    <Rewind className='h-4 w-4' />
                                </IconButton>
                                <Button
                                    variant='primary'
                                    className='h-10 w-10 rounded-full p-0'
                                    onClick={togglePlay}
                                    disabled={!playback.ready}
                                    title={playback.playing ? 'Pause (Space)' : 'Play (Space)'}
                                    aria-label={playback.playing ? 'Pause' : 'Play'}
                                >
                                    {playback.playing ? <Pause className='h-4 w-4 fill-current' /> : <Play className='ml-0.5 h-4 w-4 fill-current' />}
                                </Button>
                                <IconButton label='Forward 5 seconds (→)' onClick={() => skip(5)} disabled={!playback.ready}>
                                    <FastForward className='h-4 w-4' />
                                </IconButton>
                                <span className='ml-1 font-mono text-xs tabular-nums'>
                                    <span className='text-fg'>{formatDuration(time)}</span>
                                    <span className='text-subtle'> / {formatDuration(playback.total)}</span>
                                </span>
                            </div>

                            <div className='flex items-center justify-end gap-1'>
                                <div className='mr-2 flex items-center gap-1' title={`Timeline zoom ${timelineZoom.toFixed(1)}× (⌘− / ⌘+ / ⌘0, or pinch)`}>
                                    <IconButton
                                        label='Zoom the timeline out (⌘−)'
                                        size='icon-sm'
                                        onClick={() => setTimelineZoom((z) => clampZoom(z / 1.5))}
                                        disabled={timelineZoom <= MIN_TIMELINE_ZOOM}
                                    >
                                        <Minus className='h-3.5 w-3.5' />
                                    </IconButton>
                                    <RangeInput
                                        className='w-20'
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={(Math.log(timelineZoom) / Math.log(MAX_TIMELINE_ZOOM)) * 100}
                                        onChange={(e) => setTimelineZoom(clampZoom(Math.exp((Number(e.target.value) / 100) * Math.log(MAX_TIMELINE_ZOOM))))}
                                        aria-label='Timeline zoom'
                                    />
                                    <IconButton
                                        label='Zoom the timeline in (⌘+)'
                                        size='icon-sm'
                                        onClick={() => setTimelineZoom((z) => clampZoom(z * 1.5))}
                                        disabled={timelineZoom >= MAX_TIMELINE_ZOOM}
                                    >
                                        <Plus className='h-3.5 w-3.5' />
                                    </IconButton>
                                </div>
                                <Popover
                                    align='end'
                                    side='top'
                                    trigger={(open, toggle) => (
                                        <Button
                                            variant={open ? 'subtle' : 'ghost'}
                                            size='sm'
                                            onClick={toggle}
                                            title={
                                                recordingCount === 1
                                                    ? 'Speed of the whole video'
                                                    : selected
                                                      ? 'Speed of the selected clip'
                                                      : 'Speed of the clip under the playhead (select a clip to pick another)'
                                            }
                                            aria-label='Clip speed'
                                        >
                                            <Gauge className='h-4 w-4' />
                                            <span className='font-mono'>{speedTarget.speed}×</span>
                                        </Button>
                                    )}
                                >
                                    <div className='w-60 space-y-3 p-1'>
                                        <div className='flex justify-between text-xs'>
                                            <span>
                                                {recordingCount === 1 ? 'Video speed' : selected ? 'Selected clip speed' : 'Speed of the clip at the playhead'}
                                            </span>
                                            <span className='font-mono text-muted'>{speedTarget.speed}×</span>
                                        </div>
                                        <RangeInput
                                            min={0.5}
                                            max={4}
                                            step={0.25}
                                            value={speedTarget.speed}
                                            onChange={(e) => setSpeed(Number(e.target.value))}
                                            aria-label='Clip speed'
                                        />
                                        <div className='grid grid-cols-6 gap-1'>
                                            {SPEED_PRESETS.map((speed) => (
                                                <button
                                                    key={speed}
                                                    onClick={() => setSpeed(speed)}
                                                    className={cx(
                                                        'h-7 rounded-md font-mono text-xs',
                                                        speedTarget.speed === speed ? 'bg-accent text-accent-fg' : 'bg-panel-2 text-muted hover:text-fg'
                                                    )}
                                                    title={`${speed}× speed`}
                                                >
                                                    {speed}×
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </Popover>
                            </div>
                        </div>
                        <Timeline
                            ref={timelineRef}
                            items={edit.items}
                            sourceDuration={project.duration}
                            thumbnails={thumbnails}
                            waveform={waveform}
                            zoom={timelineZoom}
                            onZoomChange={setTimelineZoom}
                            selectedId={selectedId}
                            onSelect={selectClip}
                            onSeek={playback.seek}
                            onTimelineChange={setItems}
                            range={cutRange}
                            onRangeChange={setCutRange}
                            zooms={edit.zooms}
                            selectedZoomId={selectedZoomId}
                            onSelectZoom={selectZoom}
                            onZoomsChange={setZooms}
                            texts={edit.texts}
                            selectedTextId={selectedTextId}
                            onSelectText={selectText}
                            onTextsChange={setTexts}
                            hides={edit.hides}
                            selectedHideId={selectedHideId}
                            onSelectHide={selectHide}
                            onHidesChange={setHides}
                            captions={recordingCaptions(edit.captions.items)}
                            voiceCaptions={voiceCaptionSpans}
                            selectedCaptionId={selectedCaptionId}
                            onSelectCaption={selectCaption}
                            onCaptionsChange={(items, key) => setCaptionItems([...items, ...edit.captions.items.filter((c) => c.voice)], key)}
                            onAddZoomAt={(t) => {
                                addZoom(t);
                                playback.seek(t);
                            }}
                            overlays={edit.overlays}
                            selectedOverlayId={selectedOverlayId}
                            onSelectOverlay={(id) => select('overlay', id)}
                            onOverlaysChange={setOverlays}
                            voiceovers={edit.audio.voiceovers}
                            effects={edit.audio.effects}
                            clipPeaks={playback.clipPeaks}
                            selectedAudioId={selectedAudioId}
                            onSelectAudio={(id) => select('audio', id)}
                            onAudioClipsChange={(lane, clips, key) =>
                                change(
                                    {
                                        audio: {
                                            ...edit.audio,
                                            [lane === 'voice' ? 'voiceovers' : 'effects']: clips,
                                        },
                                    },
                                    key
                                )
                            }
                            mutedLanes={{
                                voice: !!edit.audio.voiceMuted,
                                sfx: !!edit.audio.effectsMuted,
                                music: !!edit.audio.music?.muted,
                            }}
                            beats={musicBeats}
                            music={edit.audio.music}
                            onLaneMute={(lane, muted) =>
                                change(
                                    {
                                        audio:
                                            lane === 'music'
                                                ? {
                                                      ...edit.audio,
                                                      music: edit.audio.music && {
                                                          ...edit.audio.music,
                                                          muted,
                                                      },
                                                  }
                                                : {
                                                      ...edit.audio,
                                                      [lane === 'voice' ? 'voiceMuted' : 'effectsMuted']: muted,
                                                  },
                                    },
                                    `${lane}-mute`
                                )
                            }
                        />
                    </div>
                </div>

                <aside className='w-[400px] shrink-0 border-l border-line bg-panel'>
                    <Inspector
                        edit={edit}
                        hasCamera={!!project.tracks.camera}
                        onChange={change}
                        selectedZoom={selectedZoom}
                        hasClicks={(cursor?.clicks.length ?? 0) > 0}
                        onZoomChange={(zoom, key) =>
                            setZooms(
                                edit.zooms.map((z) => (z.id === zoom.id ? zoom : z)),
                                key
                            )
                        }
                        onZoomDelete={deleteZoom}
                        onAutoZoom={runAutoZoom}
                        onAddZoom={() => addZoom()}
                        onThumbnailFromFrame={thumbnailFromFrame}
                        onThumbnailFromFile={thumbnailFromFile}
                        onDeselect={() => select('clip', null)}
                        onApplyZoomScaleToAll={applyZoomScaleToAll}
                        selectedText={selectedText}
                        onAddText={addText}
                        onTextChange={(text, key) =>
                            setTexts(
                                edit.texts.map((t) => (t.id === text.id ? text : t)),
                                key
                            )
                        }
                        onTextDelete={deleteText}
                        hasSystemAudio={!!project.tracks.systemAudio}
                        hasMicrophone={!!project.tracks.microphone}
                        projectId={project.id}
                        project={project}
                        projectName={exportName}
                        selectedHide={selectedHide}
                        onAddHide={addHide}
                        onHideChange={(hide, key) =>
                            setHides(
                                edit.hides.map((h) => (h.id === hide.id ? hide : h)),
                                key
                            )
                        }
                        onHideDelete={deleteHide}
                        selectedCaptionId={selectedCaptionId}
                        onSelectCaption={selectCaption}
                        onCaptionsChange={setCaptions}
                        onSeekSource={(source) => playback.seek(outputTimeAt(source))}
                        onSeekOutput={playback.seek}
                        cursor={cursor}
                        onReplaceEdit={(next, key) => history.set(() => next, key)}
                        selectedScene={selectedScene}
                        sceneTargetPicking={pickingTarget}
                        onSceneTargetPicking={setPickingTarget}
                        sceneLayerEdit={sceneLayerEdit}
                        onTimelineChange={setItems}
                        onSceneDelete={(id) => {
                            setItems(removeItem(edit.items, id));
                            setSelectedId(null);
                        }}
                        selectedOverlay={selectedOverlay}
                        onOverlaysChange={setOverlays}
                        selectedAudio={selectedAudio}
                        onSelectAudio={(id) => select('audio', id)}
                        playhead={playback.now}
                        sceneEnv={sceneEnv}
                        sceneSize={sceneSize}
                    />
                </aside>
            </div>

            {showShortcuts && <ShortcutsSheet onClose={() => setShowShortcuts(false)} />}
            {exporting && <ExportDialog
                    project={project}
                    edit={edit}
                    cursor={cursor}
                    onClose={() => setExporting(false)}
                />}

            {loading && (
                <div
                    role='status'
                    aria-label='Loading preview'
                    className='absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-bg/70 backdrop-blur-sm'
                >
                    <Spinner size={32} className='text-fg' />
                    {loaderSlow && (
                        <Button size='sm' onClick={() => setLoaderSkipped(true)}>
                            Continue anyway
                        </Button>
                    )}
                </div>
            )}

            {/* Frame sources for the canvas. Kept in the page (not display:none) so WebKit keeps decoding them. */}
            <div className='pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0' aria-hidden>
                {!studio && (
                    <video
                        ref={playback.screenRef}
                        src={fileUrl(project, previewFile ?? project.tracks.screen.file)}
                        onLoadedData={onScreenLoaded}
                        onError={() => setVideoReady(true)}
                        muted
                        playsInline
                        preload='auto'
                    />
                )}
                {project.tracks.camera && (
                    <video ref={playback.cameraRef} src={fileUrl(project, project.tracks.camera.file)} muted playsInline preload='auto' />
                )}
            </div>
        </div>
    );
}

/** Auto-save state next to the project name. */
function SaveStatus({ state }: { state: 'saved' | 'pending' | 'saving' | 'error' }) {
    if (state === 'error') {
        return (
            <span
                className='flex items-center gap-1 text-xs text-danger-fg'
                title='Your last change could not be saved; it will be retried with the next change'
            >
                <CircleAlert className='h-3.5 w-3.5' /> Not saved
            </span>
        );
    }
    const saving = state === 'saving' || state === 'pending';
    return (
        <span className='flex items-center gap-1 text-xs text-subtle' title={saving ? 'Saving your changes' : 'All changes are saved'}>
            {saving ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Check className='h-3.5 w-3.5' />}
            {saving ? 'Saving…' : 'Saved'}
        </span>
    );
}
