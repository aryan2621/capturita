import { loadCountdown } from '../lib/countdown';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppWindow, Camera, CameraOff, Check, ChevronRight, Crop, Mic, MicOff, Monitor, RefreshCw, Volume2, VolumeX, X } from 'lucide-react';
import { toast } from '../lib/toast';
import {
    api,
    errorMessage,
    type Display,
    type Permissions,
    type RecordingOptions,
    type Rect,
    type SourceList,
    type Thumbnails,
    type WindowSource,
} from '../lib/api';
import { Button, IconButton, Popover, Segmented, Switch, cx } from './ui';

type Mode = 'display' | 'window' | 'area';

interface Settings {
    mode: Mode;
    displayId: number | null;
    windowId: number | null;
    area: { displayId: number; rect: Rect } | null;
    systemAudio: boolean;
    microphoneId: string;
    echoCancellation: boolean;
    cameraId: string;
}

const SETTINGS_KEY = 'capturita.recorder';
const defaults: Settings = {
    mode: 'display',
    displayId: null,
    windowId: null,
    area: null,
    systemAudio: true,
    microphoneId: '',
    echoCancellation: true,
    cameraId: '',
};
/** Thumbnails are only fetched for this many windows, to keep the picker quick. */
const MAX_WINDOW_THUMBNAILS = 40;

function loadSettings(): Settings {
    try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
    } catch {
        return defaults;
    }
}

/**
 * Everything about the next recording: source, audio, camera, and the record button. Stays
 * mounted (in a hidden dialog) so ⌘⇧R can start a recording with these settings at any time.
 */
export function RecorderPanel({
    permissions,
    onPermissionsChange,
    visible = true,
    onStarted,
    onNotReady,
    onClose,
}: {
    /** Whether the panel is on screen; sources are only refreshed on focus while it is. */
    visible?: boolean;
    permissions: Permissions | null;
    onPermissionsChange: (p: Permissions) => void;
    /** A recording is starting (the countdown began). */
    onStarted?: () => void;
    /** Recording was asked for (⌘⇧R) but something is missing, like a window to record. */
    onNotReady?: () => void;
    onClose?: () => void;
}) {
    const [settings, setSettings] = useState<Settings>(loadSettings);
    const [sources, setSources] = useState<SourceList | null>(null);
    const [thumbnails, setThumbnails] = useState<Thumbnails>({ displays: {}, windows: {} });
    const [loadingSources, setLoadingSources] = useState(false);
    const [cameraVisible, setCameraVisible] = useState(false);
    const [busy, setBusy] = useState(false);
    const screenGranted = permissions?.screen === 'granted';

    const update = (change: Partial<Settings>) =>
        setSettings((current) => {
            const next = { ...current, ...change };
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
            } catch {
                // Settings just won't be remembered.
            }
            return next;
        });

    const refreshSources = useCallback(async () => {
        if (!screenGranted) return;
        setLoadingSources(true);
        try {
            const list = await api.listSources();
            setSources(list);
            // Previews load after the list so the picker appears straight away.
            api.thumbnails(
                list.displays.map((d) => d.id),
                list.windows.slice(0, MAX_WINDOW_THUMBNAILS).map((w) => w.id)
            )
                .then(setThumbnails)
                .catch(() => {});
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setLoadingSources(false);
        }
    }, [screenGranted]);

    // Loaded once at start (⌘⇧R needs the displays), and again each time the panel is shown.
    useEffect(() => {
        if (visible) refreshSources();
    }, [visible, refreshSources]);
    const loadedOnce = useRef(false);
    useEffect(() => {
        if (!loadedOnce.current && screenGranted) {
            loadedOnce.current = true;
            refreshSources();
        }
    }, [screenGranted, refreshSources]);
    useEffect(() => {
        if (!visible) return;
        // Windows open and close while Capturita is in the background.
        const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => focused && refreshSources());
        return () => {
            unlisten.then((fn) => fn());
        };
    }, [visible, refreshSources]);

    const displays = sources?.displays ?? [];
    const mainDisplay = displays.find((d) => d.isMain) ?? displays[0];
    const displayId = displays.some((d) => d.id === settings.displayId) ? settings.displayId! : mainDisplay?.id;
    const selectedWindow = sources?.windows.find((w) => w.id === settings.windowId);
    const areaDisplay = displays.find((d) => d.id === (settings.area?.displayId ?? displayId));
    const windows = sources?.windows ?? [];
    const microphones = sources?.microphones ?? [];
    const cameras = sources?.cameras ?? [];
    const microphone = microphones.find((m) => m.id === settings.microphoneId);
    const camera = cameras.find((c) => c.id === settings.cameraId);

    const ensurePermission = async (kind: 'microphone' | 'camera') => {
        if (permissions?.[kind] === 'granted') return true;
        const next = await api.requestPermission(kind);
        onPermissionsChange(next);
        if (next[kind] !== 'granted') {
            toast.error(`Allow ${kind} access for Capturita in System Settings → Privacy & Security.`);
            return false;
        }
        return true;
    };

    const selectMicrophone = async (id: string) => {
        if (id && !(await ensurePermission('microphone'))) return;
        update({ microphoneId: id });
    };

    const selectCamera = async (id: string) => {
        try {
            if (!id) {
                await api.hideCamera();
                setCameraVisible(false);
            } else {
                if (!(await ensurePermission('camera'))) return;
                await api.showCamera(id);
                setCameraVisible(true);
            }
            update({ cameraId: id });
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const pickArea = async () => {
        const target = areaDisplay?.id ?? displayId;
        if (!target) return;
        try {
            const result = await api.pickArea(target);
            if (!result.cancelled && result.rect) {
                update({ mode: 'area', area: { displayId: target, rect: result.rect } });
            }
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const buildOptions = (): RecordingOptions | string => {
        const common = {
            systemAudio: settings.systemAudio,
            microphoneId: settings.microphoneId || null,
            echoCancellation: settings.echoCancellation,
            fps: 60,
            countdown: loadCountdown(),
        };
        if (settings.mode === 'window') {
            if (!selectedWindow) return 'Choose a window to record';
            return { ...common, source: { type: 'window', windowId: selectedWindow.id } };
        }
        if (settings.mode === 'area') {
            if (!settings.area) return 'Select an area to record';
            return { ...common, source: { type: 'display', displayId: settings.area.displayId, rect: settings.area.rect } };
        }
        if (!displayId) return 'No display found';
        return { ...common, source: { type: 'display', displayId } };
    };

    const startRecording = async () => {
        const options = buildOptions();
        if (typeof options === 'string') {
            toast.error(options);
            onNotReady?.();
            return;
        }
        setBusy(true);
        try {
            await api.prepare(options);
            onStarted?.();
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    // ⌘⇧R from anywhere: Rust forwards it here because this window owns the settings.
    const startRef = useRef(startRecording);
    startRef.current = startRecording;
    useEffect(() => {
        const unlisten = listen('shortcut-record', () => {
            // An export renders in this window; hiding it for a recording would stall the export.
            if (document.querySelector('[data-export-busy]')) {
                toast.error('Finish or cancel the export before starting a recording');
                return;
            }
            startRef.current();
        });
        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    const ready = typeof buildOptions() !== 'string';
    const recordDisplay = displays.find((d) => d.id === displayId);
    const sourceLabel =
        settings.mode === 'window'
            ? (selectedWindow?.app ?? 'a window')
            : settings.mode === 'area'
              ? `an area of ${areaDisplay?.name ?? 'the screen'}`
              : (recordDisplay?.name ?? 'the screen');
    const notReady = !screenGranted ? 'Allow screen recording first' : ready ? null : (buildOptions() as string);

    const MODES: { value: Mode; label: string; hint: string; icon: ReactNode }[] = [
        { value: 'display', label: 'Screen', hint: 'Record a whole display', icon: <Monitor className='h-4 w-4' /> },
        { value: 'window', label: 'Window', hint: 'Record one window', icon: <AppWindow className='h-4 w-4' /> },
        { value: 'area', label: 'Area', hint: 'Record part of the screen', icon: <Crop className='h-4 w-4' /> },
    ];
    const mode = MODES.find((m) => m.value === settings.mode) ?? MODES[0];

    const selectedImage =
        settings.mode === 'window'
            ? selectedWindow
                ? thumbnails.windows[selectedWindow.id]
                : undefined
            : recordDisplay
              ? thumbnails.displays[recordDisplay.id]
              : undefined;

    return (
        // No overflow-hidden here: the microphone and camera menus open past the panel's edge.
        <section className='flex h-full w-full rounded-2xl border border-line bg-panel shadow-[var(--shadow-lg)]'>
            {/* Stage: a big look at what will be recorded, then the choices for it. */}
            <div className='flex min-w-0 flex-1 flex-col'>
                <div className='flex items-center gap-3 px-6 pb-2 pt-5'>
                    <div className='min-w-0 flex-1'>
                        <h2 className='font-serif text-[22px] font-medium leading-tight tracking-tight'>New recording</h2>
                        <p className='mt-0.5 text-xs text-muted'>{mode.hint}</p>
                    </div>
                    <IconButton label='Refresh screens and windows' size='icon-sm' onClick={refreshSources} disabled={loadingSources || !screenGranted}>
                        <RefreshCw className={cx('h-3.5 w-3.5', loadingSources && 'animate-spin')} />
                    </IconButton>
                </div>

                <div className='min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2'>
                    {!screenGranted ? (
                        <div className='flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line p-8 text-center'>
                            <Monitor className='h-6 w-6 text-subtle' />
                            <p className='text-sm text-muted'>Allow screen recording to see your screens and windows here.</p>
                            <Button size='sm' variant='primary' onClick={() => api.requestPermission('screen').then(onPermissionsChange)}>
                                Allow screen recording
                            </Button>
                        </div>
                    ) : !sources ? (
                        <div className='grid gap-3'>
                            <Skeleton className='aspect-[16/10]' />
                            <Skeleton className='h-10' />
                        </div>
                    ) : settings.mode === 'display' ? (
                        <div className='space-y-4'>
                            {recordDisplay && (
                                <StagePreview
                                    image={selectedImage}
                                    aspect={`${recordDisplay.width} / ${recordDisplay.height}`}
                                    title={recordDisplay.name}
                                    detail={`${recordDisplay.width}×${recordDisplay.height}${recordDisplay.isMain ? ' · main' : ''}`}
                                    camera={cameraVisible && !!camera}
                                />
                            )}
                            {displays.length > 1 && (
                                <div className='grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3'>
                                    {displays.map((display) => (
                                        <DisplayCard
                                            key={display.id}
                                            display={display}
                                            image={thumbnails.displays[display.id]}
                                            selected={display.id === displayId}
                                            onSelect={() => update({ displayId: display.id })}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : settings.mode === 'window' ? (
                        windows.length === 0 ? (
                            <p className='p-6 text-center text-sm text-muted'>No windows found.</p>
                        ) : (
                            <div className='grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3'>
                                {windows.map((window) => (
                                    <WindowCard
                                        key={window.id}
                                        window={window}
                                        image={thumbnails.windows[window.id]}
                                        selected={window.id === settings.windowId}
                                        onSelect={() => update({ windowId: window.id })}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        <div className='space-y-3'>
                            {displays.length > 1 && (
                                <Segmented<number>
                                    size='sm'
                                    value={areaDisplay?.id ?? 0}
                                    onChange={(id) => update({ displayId: id, area: settings.area?.displayId === id ? settings.area : null })}
                                    options={displays.map((d) => ({ value: d.id, label: d.name, hint: `Pick an area on ${d.name}` }))}
                                />
                            )}
                            {areaDisplay && (
                                <button
                                    onClick={pickArea}
                                    className='group relative block w-full overflow-hidden rounded-xl border border-line bg-stage'
                                    style={{ aspectRatio: `${areaDisplay.width} / ${areaDisplay.height}` }}
                                    title='Drag out the area to record on this display'
                                >
                                    {thumbnails.displays[areaDisplay.id] && (
                                        <img
                                            src={thumbnails.displays[areaDisplay.id]}
                                            className='absolute inset-0 h-full w-full object-cover opacity-70'
                                            draggable={false}
                                        />
                                    )}
                                    {settings.area?.displayId === areaDisplay.id ? (
                                        <span
                                            className='absolute rounded-sm border-2 border-accent bg-accent/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]'
                                            style={{
                                                left: `${(settings.area.rect.x / areaDisplay.width) * 100}%`,
                                                top: `${(settings.area.rect.y / areaDisplay.height) * 100}%`,
                                                width: `${(settings.area.rect.width / areaDisplay.width) * 100}%`,
                                                height: `${(settings.area.rect.height / areaDisplay.height) * 100}%`,
                                            }}
                                        />
                                    ) : (
                                        <span className='absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-medium text-white'>
                                            <Crop className='mr-2 h-4 w-4' /> Select an area
                                        </span>
                                    )}
                                </button>
                            )}
                            {settings.area && (
                                <div className='flex items-center justify-between text-xs text-muted'>
                                    <span className='font-mono'>
                                        {settings.area.rect.width} × {settings.area.rect.height} pt
                                    </span>
                                    <Button size='sm' variant='subtle' onClick={pickArea} title='Choose a different area'>
                                        <Crop className='h-3.5 w-3.5' /> Change
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar: what to record, what to hear, and the button. */}
            <aside className='flex w-[284px] shrink-0 flex-col rounded-r-2xl border-l border-line bg-panel-2/50'>
                <div className='flex justify-end px-3 pt-3'>
                    {onClose && (
                        <IconButton label='Close (Esc)' size='icon-sm' onClick={onClose}>
                            <X className='h-4 w-4' />
                        </IconButton>
                    )}
                </div>
                {/* No overflow here: the microphone and camera menus open below their rows. */}
                <div className='min-h-0 flex-1 space-y-5 px-5 pb-4'>
                    <SidebarSection title='Capture'>
                        <Segmented<Mode>
                            size='sm'
                            value={settings.mode}
                            onChange={(value) => update({ mode: value })}
                            options={MODES.map((m) => ({ value: m.value, label: m.label, icon: m.icon, hint: m.hint }))}
                        />
                    </SidebarSection>

                    <SidebarSection title='Audio'>
                        <InputRow
                            active={settings.systemAudio}
                            icon={settings.systemAudio ? <Volume2 className='h-4 w-4' /> : <VolumeX className='h-4 w-4' />}
                            label='Mac audio'
                            status={settings.systemAudio ? 'Sound from apps' : 'Off'}
                            control={<Switch label='Mac audio' checked={settings.systemAudio} onChange={(systemAudio) => update({ systemAudio })} />}
                        />
                        <Popover
                            side='bottom'
                            align='start'
                            trigger={(open, toggle) => (
                                <InputRow
                                    active={!!microphone}
                                    pressed={open}
                                    onClick={toggle}
                                    icon={microphone ? <Mic className='h-4 w-4' /> : <MicOff className='h-4 w-4' />}
                                    label='Microphone'
                                    status={microphone ? microphone.name : 'Off'}
                                />
                            )}
                        >
                            {(close) => (
                                <div className='w-64 space-y-1'>
                                    <MenuHeading>Microphone</MenuHeading>
                                    <MenuItem selected={!settings.microphoneId} onClick={() => (selectMicrophone(''), close())}>
                                        No microphone
                                    </MenuItem>
                                    {microphones.map((mic) => (
                                        <MenuItem key={mic.id} selected={mic.id === settings.microphoneId} onClick={() => (selectMicrophone(mic.id), close())}>
                                            {mic.name}
                                        </MenuItem>
                                    ))}
                                </div>
                            )}
                        </Popover>
                        {settings.microphoneId && (
                            <div className='flex items-start gap-3 px-1 pt-1'>
                                <div className='min-w-0 flex-1'>
                                    <p className='text-xs font-medium'>Echo cancellation</p>
                                    <p className='text-[11px] leading-snug text-muted'>Keeps speaker sound out of your mic. Turn off with headphones.</p>
                                </div>
                                <Switch
                                    label='Echo cancellation'
                                    checked={settings.echoCancellation}
                                    onChange={(echoCancellation) => update({ echoCancellation })}
                                />
                            </div>
                        )}
                    </SidebarSection>

                    <SidebarSection title='Camera'>
                        <Popover
                            side='bottom'
                            align='start'
                            trigger={(open, toggle) => (
                                <InputRow
                                    active={cameraVisible && !!camera}
                                    pressed={open}
                                    onClick={toggle}
                                    icon={cameraVisible && camera ? <Camera className='h-4 w-4' /> : <CameraOff className='h-4 w-4' />}
                                    label='Camera'
                                    status={cameraVisible && camera ? camera.name : 'Off'}
                                />
                            )}
                        >
                            {(close) => (
                                <div className='w-64 space-y-1'>
                                    <MenuHeading>Camera</MenuHeading>
                                    <MenuItem selected={!cameraVisible} onClick={() => (selectCamera(''), close())}>
                                        No camera
                                    </MenuItem>
                                    {cameras.map((cam) => (
                                        <MenuItem
                                            key={cam.id}
                                            selected={cameraVisible && cam.id === settings.cameraId}
                                            onClick={() => (selectCamera(cam.id), close())}
                                        >
                                            {cam.name}
                                        </MenuItem>
                                    ))}
                                </div>
                            )}
                        </Popover>
                        {cameraVisible && (
                            <p className='px-1 text-[11px] leading-snug text-muted'>
                                Drag the bubble anywhere. It's recorded separately, so you can move or hide it later.
                            </p>
                        )}
                    </SidebarSection>
                </div>

                <div className='space-y-2 border-t border-line px-5 py-4'>
                    <p className={cx('text-xs leading-snug', notReady ? 'text-warning-fg' : 'text-muted')}>
                        {notReady ?? (
                            <>
                                Records <span className='font-medium text-fg'>{sourceLabel}</span>
                            </>
                        )}
                    </p>
                    <Button
                        variant='record'
                        className='h-11 w-full text-[15px]'
                        onClick={startRecording}
                        disabled={!screenGranted || busy || !ready}
                        title={notReady ?? `Record ${sourceLabel} (⌘⇧R from any app)`}
                    >
                        <span className='relative flex h-3 w-3'>
                            {!notReady && <span className='absolute inset-0 animate-ping rounded-full bg-white/60' />}
                            <span className='relative h-3 w-3 rounded-full bg-white' />
                        </span>
                        Start recording
                    </Button>
                    <p className='flex items-center justify-center gap-1.5 text-[11px] text-subtle'>
                        <kbd className='rounded border border-line bg-panel px-1 font-mono'>⌘⇧R</kbd> from any app ·{' '}
                        {loadCountdown() ? `${loadCountdown()}-second countdown` : 'no countdown'}
                    </p>
                </div>
            </aside>
        </section>
    );
}

/** The selected screen, large, with where the camera bubble will sit. */
function StagePreview({ image, aspect, title, detail, camera }: { image?: string; aspect: string; title: string; detail: string; camera: boolean }) {
    return (
        <figure className='overflow-hidden rounded-xl border border-line bg-stage shadow-sm'>
            <div className='relative' style={{ aspectRatio: aspect }}>
                {image ? (
                    <img src={image} className='absolute inset-0 h-full w-full object-cover' draggable={false} />
                ) : (
                    <div className='absolute inset-0 animate-pulse bg-panel-2' />
                )}
                <span className='absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur'>
                    <span className='h-1.5 w-1.5 rounded-full bg-record' /> Ready
                </span>
                {camera && (
                    <span className='absolute bottom-3 right-3 flex aspect-square w-[16%] items-center justify-center rounded-full border-2 border-white/80 bg-black/40 text-white/80 backdrop-blur'>
                        <Camera className='h-1/3 w-1/3' />
                    </span>
                )}
            </div>
            <figcaption className='flex items-center justify-between gap-2 border-t border-line bg-panel px-4 py-2.5'>
                <span className='truncate text-sm font-medium'>{title}</span>
                <span className='shrink-0 font-mono text-[11px] text-subtle'>{detail}</span>
            </figcaption>
        </figure>
    );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className='space-y-2'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-subtle'>{title}</p>
            {children}
        </div>
    );
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cx('animate-pulse rounded-xl bg-panel-2', className)} />;
}

function DisplayCard({ display, image, selected, onSelect }: { display: Display; image?: string; selected: boolean; onSelect: () => void }) {
    return (
        <button
            onClick={onSelect}
            className={cx(
                'group overflow-hidden rounded-xl border text-left transition-colors',
                selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'
            )}
            title={`Record ${display.name}`}
        >
            <div className='relative bg-stage' style={{ aspectRatio: `${display.width} / ${display.height}` }}>
                {image ? (
                    <img src={image} className='absolute inset-0 h-full w-full object-cover' draggable={false} />
                ) : (
                    <div className='absolute inset-0 animate-pulse bg-panel-2' />
                )}
                {selected && (
                    <span className='absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg shadow'>
                        <Check className='h-3.5 w-3.5' />
                    </span>
                )}
            </div>
            <div className='flex items-center justify-between gap-2 px-3 py-2'>
                <span className='truncate text-sm font-medium'>{display.name}</span>
                <span className='shrink-0 font-mono text-[11px] text-subtle'>
                    {display.width}×{display.height}
                    {display.isMain && ' · main'}
                </span>
            </div>
        </button>
    );
}

function WindowCard({ window, image, selected, onSelect }: { window: WindowSource; image?: string; selected: boolean; onSelect: () => void }) {
    return (
        <button
            onClick={onSelect}
            className={cx(
                'group flex flex-col overflow-hidden rounded-xl border text-left transition-colors',
                selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'
            )}
            title={`Record ${window.app}${window.title ? ` — ${window.title}` : ''}`}
        >
            <div className='relative aspect-[16/10] bg-stage'>
                {image ? (
                    <img src={image} className='absolute inset-0 h-full w-full object-contain' draggable={false} />
                ) : (
                    window.icon && (
                        <img src={window.icon} className='absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 opacity-80' draggable={false} />
                    )
                )}
                {!window.isOnScreen && <span className='absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white'>Other Space</span>}
                {selected && (
                    <span className='absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-fg shadow'>
                        <Check className='h-3 w-3' />
                    </span>
                )}
            </div>
            <div className='flex min-w-0 items-center gap-2 px-2.5 py-2'>
                {window.icon && <img src={window.icon} className='h-4 w-4 shrink-0' draggable={false} />}
                <div className='min-w-0'>
                    <p className='truncate text-xs font-medium'>{window.app}</p>
                    <p className='truncate text-[11px] text-subtle'>{window.title || 'Untitled window'}</p>
                </div>
            </div>
        </button>
    );
}

/** An input to record (system audio, mic, camera): what it is, what it's set to, and its control. */
function InputRow({
    active,
    pressed,
    onClick,
    icon,
    label,
    status,
    control,
}: {
    active: boolean;
    pressed?: boolean;
    onClick?: () => void;
    icon: ReactNode;
    label: string;
    status: string;
    control?: ReactNode;
}) {
    const body = (
        <>
            <span
                className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-accent/15 text-accent' : 'bg-panel-2 text-subtle')}
            >
                {icon}
            </span>
            <span className='min-w-0 flex-1 text-left'>
                <span className='block text-[13px] font-medium leading-tight'>{label}</span>
                <span className={cx('block truncate text-[11px] leading-tight', active ? 'text-muted' : 'text-subtle')}>{status}</span>
            </span>
            {control ?? <ChevronRight className='h-3.5 w-3.5 shrink-0 text-subtle' />}
        </>
    );
    const className = cx(
        'flex w-full min-w-0 items-center gap-3 rounded-xl border bg-panel px-2.5 py-2 transition-colors',
        pressed ? 'border-accent/50 ring-2 ring-accent/20' : 'border-line',
        onClick && 'hover:border-line-strong'
    );
    return onClick ? (
        <button onClick={onClick} title={`${label}: ${status}`} aria-label={`${label}: ${status}`} className={className}>
            {body}
        </button>
    ) : (
        <div className={className}>{body}</div>
    );
}

function MenuHeading({ children }: { children: ReactNode }) {
    return <p className='px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle'>{children}</p>;
}

function MenuItem({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cx(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                selected ? 'bg-accent/10 text-fg' : 'text-muted hover:bg-panel-2 hover:text-fg'
            )}
        >
            <Check className={cx('h-3.5 w-3.5 shrink-0', selected ? 'text-accent' : 'invisible')} />
            <span className='truncate'>{children}</span>
        </button>
    );
}
