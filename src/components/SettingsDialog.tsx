import { loadCountdown, saveCountdown, type Countdown } from '../lib/countdown';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { listen } from '@tauri-apps/api/event';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import {
    Captions,
    Check,
    Cpu,
    Download,
    ExternalLink,
    FolderOpen,
    KeyRound,
    ListChecks,
    Loader2,
    LogOut,
    Monitor,
    Moon,
    Palette,
    Search,
    Sun,
    Trash2,
    X,
} from 'lucide-react';
import { toast } from '../lib/toast';
import { api, errorMessage, type AiCloud, type AiModels, type AiOpenAi, type CaptionModel, type CaptionProgress, type GoogleStatus } from '../lib/api';
import { useLicense } from '../lib/license';
import { useTheme, type ThemeChoice } from '../lib/theme';
import { ProFeatureGate } from './ProFeatureGate';
import { Badge, Button, Card, Field, IconButton, Modal, ProgressBar, SectionHeader, Segmented, SettingRow, TextArea, TextInput, cx } from './ui';

export type SettingsSection = 'general' | 'ai' | 'captions' | 'google' | 'license';

const SECTIONS: {
    id: SettingsSection;
    label: string;
    group: string;
    blurb: string;
    keywords: string;
    icon: ReactNode;
}[] = [
    {
        id: 'general',
        label: 'General',
        group: 'App',
        blurb: 'Look, recording behaviour and where files go.',
        keywords: 'theme dark light countdown folder setup permissions',
        icon: <Palette className='h-4 w-4' />,
    },
    {
        id: 'captions',
        label: 'Captions',
        group: 'App',
        blurb: 'The speech model that writes captions on this Mac.',
        keywords: 'whisper transcribe subtitles speech model',
        icon: <Captions className='h-4 w-4' />,
    },
    {
        id: 'ai',
        label: 'AI editing',
        group: 'Intelligence',
        blurb: 'Choose who plans your edits: a model on this Mac, or a cloud model.',
        keywords: 'claude openai gemini gpt llm api key model local cloud',
        icon: <Cpu className='h-4 w-4' />,
    },
    {
        id: 'google',
        label: 'Google',
        group: 'Accounts',
        blurb: 'Your own Google client, used to upload to YouTube and Drive.',
        keywords: 'youtube drive upload oauth client account',
        icon: <KeyRound className='h-4 w-4' />,
    },
    {
        id: 'license',
        label: 'License',
        group: 'Product',
        blurb: 'Manage your Capturita Pro license.',
        keywords: 'pro paid license key activate status updates',
        icon: <KeyRound className='h-4 w-4' />,
    },
];

const gb = (mb: number) => `${(mb / 1000).toFixed(1)} GB`;

/** Settings, shown over the window: theme, AI and caption models, and the Google client for uploads. */
export function SettingsDialog({
    initialSection = 'general',
    onClose,
    onRunSetup,
}: {
    initialSection?: SettingsSection;
    onClose: () => void;
    onRunSetup?: () => void;
}) {
    const [section, setSection] = useState<SettingsSection>(initialSection);
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const matches = SECTIONS.filter((x) => `${x.label} ${x.keywords}`.toLowerCase().includes(q));
    const groups = [...new Set(matches.map((x) => x.group))];
    const current = SECTIONS.find((x) => x.id === section);

    return (
        <Modal onClose={onClose} className='flex h-[640px] max-w-[760px]'>
            <nav aria-label='Settings sections' className='flex w-44 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-panel-2 p-3'>
                <span className='px-2 pt-1 text-[17px] font-medium tracking-tight'>Settings</span>
                <TextInput
                    size='sm'
                    leading={<Search aria-hidden className='h-3.5 w-3.5' />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='Search settings'
                    aria-label='Search settings'
                />
                {groups.map((g) => (
                    <div key={g} className='flex flex-col gap-0.5'>
                        <span className='px-2.5 pb-1 text-xs font-medium text-muted'>{g}</span>
                        {matches
                            .filter((x) => x.group === g)
                            .map((x) => (
                                <button
                                    key={x.id}
                                    onClick={() => setSection(x.id)}
                                    aria-current={section === x.id ? 'page' : undefined}
                                    className={cx(
                                        'flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                                        section === x.id ? 'bg-raised font-medium text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
                                    )}
                                >
                                    {x.icon}
                                    {x.label}
                                </button>
                            ))}
                    </div>
                ))}
                {matches.length === 0 && <p className='px-2.5 text-xs text-muted'>Nothing matches “{query}”.</p>}
            </nav>
            <div className='flex min-w-0 flex-1 flex-col'>
                <div className='flex items-start justify-between gap-4 border-b border-line px-8 py-5'>
                    <div className='min-w-0'>
                        <h2 className='text-base font-semibold'>{current?.label}</h2>
                        <p className='mt-0.5 text-[13px] text-muted'>{current?.blurb}</p>
                    </div>
                    <IconButton label='Close settings' size='icon-sm' onClick={onClose}>
                        <X className='h-4 w-4' />
                    </IconButton>
                </div>
                <div className='min-h-0 flex-1 overflow-y-auto px-8 py-6'>
                    {section === 'general' && <General onRunSetup={onRunSetup} />}
                    {section === 'ai' && (
                        <ProFeatureGate feature='AI editing'>
                            <AiModelsSection />
                        </ProFeatureGate>
                    )}
                    {section === 'captions' && (
                        <ProFeatureGate feature='Captions'>
                            <CaptionsSection />
                        </ProFeatureGate>
                    )}
                    {section === 'google' && <GoogleSection />}
                    {section === 'license' && <LicenseSection />}
                </div>
            </div>
        </Modal>
    );
}

function LicenseSection() {
    const { license, refresh } = useLicense();
    const [key, setKey] = useState('');
    const [busy, setBusy] = useState(false);

    const activate = async () => {
        setBusy(true);
        try {
            const result = await api.activateLicense(key.trim());
            setKey('');
            await refresh();
            toast.success(result.notice || 'Capturita Pro is active.');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await api.removeLicense();
            await refresh();
            toast.success('License removed from this Mac.');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    if (!license.supported) {
        return (
            <Card>
                <p className='text-sm font-medium'>Source build — Pro features unlocked</p>
                <p className='mt-1 text-xs text-muted'>License activation is only used by official Capturita builds. The source remains MIT-licensed.</p>
            </Card>
        );
    }

    return (
        <div className='space-y-5'>
            <Card>
                <div className='flex items-start gap-3'>
                    <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', license.pro ? 'bg-success-soft text-success-fg' : 'bg-raised text-muted')}>
                        {license.pro ? <Check className='h-4 w-4' /> : <KeyRound className='h-4 w-4' />}
                    </span>
                    <div className='min-w-0 flex-1'>
                        <p className='flex items-center gap-2 text-sm font-semibold'>
                            {license.pro ? 'Capturita Pro is active' : 'Capturita Free'}
                            <Badge tone={license.pro ? 'success' : 'neutral'}>{license.pro ? 'Pro' : 'Not activated'}</Badge>
                        </p>
                        {license.email && <p className='mt-0.5 truncate text-xs text-muted'>{license.email}</p>}
                        {license.updatesUntil && <p className='mt-1 text-xs text-muted'>Updates through {new Date(license.updatesUntil * 1000).toLocaleDateString()}.</p>}
                    </div>
                    {license.pro && (
                        <Button size='sm' variant='secondary' disabled={busy} onClick={remove}>
                            <LogOut className='h-3.5 w-3.5' /> Remove
                        </Button>
                    )}
                </div>
                {license.error && (
                    <p role='alert' className='mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger-fg'>
                        {license.error}
                    </p>
                )}
                {license.notice && <p className='mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-fg'>{license.notice}</p>}
            </Card>

            {!license.pro && (
                <div className='space-y-3'>
                    <Field label='License key' htmlFor='license-key' hint='Paste the key from your Capturita Pro purchase email. The key is stored in this Mac’s Keychain.'>
                        <TextArea
                            id='license-key'
                            value={key}
                            onChange={(event) => setKey(event.target.value)}
                            aria-label='Capturita Pro license key'
                            placeholder='Paste your license key'
                            rows={3}
                            spellCheck={false}
                            className='font-mono text-xs'
                        />
                    </Field>
                    <div className='flex justify-end'>
                        <Button variant='primary' size='sm' disabled={busy || !key.trim()} onClick={activate}>
                            {busy && <Loader2 className='h-3.5 w-3.5 animate-spin' />} Activate license
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** A titled group inside a page, with an optional one-line explanation. */
function Group({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
    return (
        <section className='mt-8 space-y-3 first:mt-0'>
            <SectionHeader title={title} description={description} />
            {children}
        </section>
    );
}

function Row({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
    return <SettingRow title={title} description={description} control={children} className='border-b border-line py-4 first:pt-0 last:border-0' />;
}

const Progress = ProgressBar;

function General({ onRunSetup }: { onRunSetup?: () => void }) {
    const { choice, setChoice } = useTheme();
    const [countdown, setCountdown] = useState<Countdown>(loadCountdown);
    return (
        <div>
            <Group title='Appearance'>
                <Row title='Theme' description='Light, dark, or follow macOS.'>
                    <div className='w-[260px]'>
                        <Segmented<ThemeChoice>
                            size='sm'
                            value={choice}
                            onChange={setChoice}
                            options={[
                                {
                                    value: 'system',
                                    label: 'System',
                                    icon: <Monitor className='h-3.5 w-3.5' />,
                                },
                                {
                                    value: 'light',
                                    label: 'Light',
                                    icon: <Sun className='h-3.5 w-3.5' />,
                                },
                                {
                                    value: 'dark',
                                    label: 'Dark',
                                    icon: <Moon className='h-3.5 w-3.5' />,
                                },
                            ]}
                        />
                    </div>
                </Row>
            </Group>
            <Group title='Recording'>
                <Row title='Countdown' description='How long to wait after you press record (⌘⇧R from any app).'>
                    <div className='w-[200px]'>
                        <Segmented<Countdown>
                            size='sm'
                            label='Countdown'
                            value={countdown}
                            onChange={(value) => (setCountdown(value), saveCountdown(value))}
                            options={[
                                { value: 0, label: 'Off' },
                                { value: 3, label: '3 s' },
                                { value: 5, label: '5 s' },
                            ]}
                        />
                    </div>
                </Row>
                <Row title='Library' description='Recordings and exports are saved in ~/Movies/Capturita.'>
                    <Button size='sm' onClick={async () => openPath(await api.recordingsDir())}>
                        <FolderOpen className='h-3.5 w-3.5' /> Open folder
                    </Button>
                </Row>
            </Group>
            {onRunSetup && (
                <Group title='Setup'>
                    <Row title='Permissions and models' description='Permissions (screen, microphone, camera) and the captions model.'>
                        <Button size='sm' onClick={onRunSetup}>
                            <ListChecks className='h-3.5 w-3.5' /> Run setup again
                        </Button>
                    </Row>
                </Group>
            )}
        </div>
    );
}

/** Claude as the planner: opt-in, because the text it works on is sent to Anthropic. */
function AiCloudCard() {
    const [cloud, setCloud] = useState<AiCloud | null>(null);
    const [key, setKey] = useState('');
    const [busy, setBusy] = useState(false);
    const refresh = useCallback(() => {
        api.aiCloud()
            .then(setCloud)
            .catch((error) => toast.error(errorMessage(error)));
    }, []);
    useEffect(refresh, [refresh]);

    const act = async (action: () => Promise<void>, done?: string) => {
        setBusy(true);
        try {
            await action();
            if (done) toast.success(done);
            setKey('');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
            refresh();
        }
    };

    if (!cloud) return null;
    return (
        <div className={cx('space-y-3 rounded-xl border p-4', cloud.enabled ? 'border-accent/60 bg-panel-2' : 'border-line')}>
            <div className='flex items-start gap-3'>
                <div className='min-w-0 flex-1 space-y-1'>
                    <p className='flex items-center gap-2 text-sm font-medium'>
                        Claude (cloud)
                        {cloud.enabled && <span className='rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-fg'>In use</span>}
                    </p>
                    <p className='text-xs text-muted'>
                        Plans and writes launch videos much better than a model on this Mac. Needs your own Claude API key (kept in the Keychain). Your README
                        and page text are sent to Anthropic. If Claude can’t be reached, the local model below is used.
                    </p>
                </div>
                {cloud.hasKey && (
                    <Button
                        size='sm'
                        variant={cloud.enabled ? 'secondary' : 'primary'}
                        disabled={busy}
                        onClick={() => act(() => api.saveAiCloud(!cloud.enabled))}
                    >
                        {cloud.enabled ? 'Turn off' : 'Turn on'}
                    </Button>
                )}
            </div>
            <div className='flex gap-2'>
                <TextInput
                    type='password'
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={cloud.hasKey ? 'Replace the saved key' : 'sk-ant-…'}
                    className='flex-1'
                    aria-label='Claude API key'
                />
                <Button size='sm' variant='primary' disabled={busy || !key.trim()} onClick={() => act(() => api.saveAiCloud(true, key), 'Claude is on')}>
                    Save and turn on
                </Button>
                {cloud.hasKey && (
                    <IconButton label='Remove the saved key' size='icon-sm' onClick={() => act(() => api.removeAiCloudKey())}>
                        <Trash2 className='h-3.5 w-3.5' />
                    </IconButton>
                )}
            </div>
        </div>
    );
}

const OPENAI_PRESETS = [
    { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-5' },
    {
        name: 'Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: 'gemini-2.5-pro',
    },
    {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'anthropic/claude-sonnet-4.5',
    },
    {
        name: 'Ollama (local)',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.1',
    },
];

/** Any OpenAI-compatible cloud as the planner: OpenAI, Gemini, OpenRouter, Ollama. */
function AiOpenAiCard() {
    const [cloud, setCloud] = useState<AiOpenAi | null>(null);
    const [baseUrl, setBaseUrl] = useState('');
    const [model, setModel] = useState('');
    const [key, setKey] = useState('');
    const [busy, setBusy] = useState(false);
    const refresh = useCallback(() => {
        api.aiOpenAi()
            .then((c) => {
                setCloud(c);
                setBaseUrl(c.baseUrl);
                setModel(c.model);
            })
            .catch((error) => toast.error(errorMessage(error)));
    }, []);
    useEffect(refresh, [refresh]);

    const act = async (action: () => Promise<void>, done?: string) => {
        setBusy(true);
        try {
            await action();
            if (done) toast.success(done);
            setKey('');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
            refresh();
        }
    };

    if (!cloud) return null;
    return (
        <div className={cx('space-y-3 rounded-xl border p-4', cloud.enabled ? 'border-accent/60 bg-panel-2' : 'border-line')}>
            <div className='flex items-start gap-3'>
                <div className='min-w-0 flex-1 space-y-1'>
                    <p className='flex items-center gap-2 text-sm font-medium'>
                        OpenAI, Gemini and others (cloud)
                        {cloud.enabled && <span className='rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-fg'>In use</span>}
                    </p>
                    <p className='text-xs text-muted'>
                        Any OpenAI-compatible endpoint. Your key is kept in the Keychain. Your README and page text are sent to that provider. If it can’t be
                        reached, the local model below is used. Turning this on turns Claude off.
                    </p>
                </div>
                {cloud.hasKey && (
                    <Button
                        size='sm'
                        variant={cloud.enabled ? 'secondary' : 'primary'}
                        disabled={busy}
                        onClick={() => act(() => api.saveAiOpenAi(!cloud.enabled, baseUrl, model))}
                    >
                        {cloud.enabled ? 'Turn off' : 'Turn on'}
                    </Button>
                )}
            </div>
            <div className='flex flex-wrap gap-1.5'>
                {OPENAI_PRESETS.map((preset) => (
                    <Button
                        key={preset.name}
                        size='sm'
                        variant='secondary'
                        onClick={() => {
                            setBaseUrl(preset.baseUrl);
                            setModel(preset.model);
                        }}
                    >
                        {preset.name}
                    </Button>
                ))}
            </div>
            <div className='flex gap-2'>
                <TextInput
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder='Base URL'
                    className='flex-[2]'
                    aria-label='Base URL'
                />
                <TextInput value={model} onChange={(e) => setModel(e.target.value)} placeholder='Model' className='flex-1' aria-label='Model name' />
            </div>
            <div className='flex gap-2'>
                <TextInput
                    type='password'
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={cloud.hasKey ? 'Replace the saved key' : 'API key'}
                    className='flex-1'
                    aria-label='API key'
                />
                <Button
                    size='sm'
                    variant='primary'
                    disabled={busy || (!key.trim() && !cloud.hasKey)}
                    onClick={() => act(() => api.saveAiOpenAi(true, baseUrl, model, key), 'Cloud model is on')}
                >
                    Save and turn on
                </Button>
                {cloud.hasKey && (
                    <IconButton label='Remove the saved key' size='icon-sm' onClick={() => act(() => api.removeAiOpenAiKey())}>
                        <Trash2 className='h-3.5 w-3.5' />
                    </IconButton>
                )}
            </div>
        </div>
    );
}

function AiModelsSection() {
    const [state, setState] = useState<AiModels | null>(null);
    const [progress, setProgress] = useState<number | null>(null);

    const refresh = useCallback(() => {
        api.aiModels()
            .then(setState)
            .catch((error) => toast.error(errorMessage(error)));
    }, []);

    useEffect(() => {
        refresh();
        const unlisten = listen<number>('ai-progress', ({ payload }) => setProgress(payload));
        return () => {
            unlisten.then((u) => u());
        };
    }, [refresh]);

    const run = async (action: () => Promise<void>) => {
        try {
            await action();
        } catch (error) {
            const message = errorMessage(error);
            if (message !== 'Cancelled') toast.error(message);
        }
        refresh();
    };

    const download = async (id: string) => {
        setProgress(0);
        setState((s) => (s ? { ...s, downloading: id } : s));
        await run(() => api.downloadAiModel(id));
        setProgress(null);
    };

    if (!state) return null;
    return (
        <div>
            <Group title='Cloud models' description='Better plans, but your README and page text are sent to the provider. Only one planner is used at a time.'>
                <AiCloudCard />
                <AiOpenAiCard />
            </Group>
            <Group title='On this Mac' description={`Private and offline. Pick one and download it once. This Mac has ${state.ramGb} GB of memory.`}>
                {state.models.map((m) => {
                    const active = state.active === m.id;
                    const downloading = state.downloading === m.id;
                    const tooBig = m.minRamGb > state.ramGb;
                    return (
                        <div key={m.id} className={cx('space-y-3 rounded-xl border p-4', active ? 'border-accent/60 bg-panel-2' : 'border-line')}>
                            <div className='flex items-start gap-3'>
                                <div className='min-w-0 flex-1 space-y-1'>
                                    <p className='flex items-center gap-2 text-sm font-medium'>
                                        {m.name}
                                        {active && <span className='rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-fg'>In use</span>}
                                    </p>
                                    <p className='text-xs text-muted'>{m.note}</p>
                                    <p className={cx('text-xs', tooBig ? 'text-warning-fg' : 'text-subtle')}>
                                        {gb(m.sizeMb)} download · needs {m.minRamGb} GB of memory
                                        {tooBig ? ', more than this Mac has' : ''}
                                    </p>
                                </div>
                                <div className='flex shrink-0 items-center gap-1.5'>
                                    {m.downloaded ? (
                                        <>
                                            {!active && (
                                                <Button size='sm' variant='primary' onClick={() => run(() => api.setAiModel(m.id))}>
                                                    Use
                                                </Button>
                                            )}
                                            <IconButton
                                                label={`Delete ${m.name} (frees ${gb(m.sizeMb)})`}
                                                size='icon-sm'
                                                onClick={() =>
                                                    toast(`Delete ${m.name}? Using it again means downloading ${gb(m.sizeMb)}.`, {
                                                        action: {
                                                            label: 'Delete',
                                                            onClick: () => run(() => api.deleteAiModel(m.id)),
                                                        },
                                                    })
                                                }
                                            >
                                                <Trash2 className='h-3.5 w-3.5' />
                                            </IconButton>
                                        </>
                                    ) : downloading ? (
                                        <Button size='sm' variant='ghost' onClick={() => api.cancelAiDownload()}>
                                            <X className='h-3.5 w-3.5' /> Cancel
                                        </Button>
                                    ) : (
                                        <Button
                                            size='sm'
                                            variant={active ? 'primary' : 'secondary'}
                                            disabled={state.downloading !== null}
                                            onClick={() => download(m.id)}
                                        >
                                            <Download className='h-3.5 w-3.5' /> Download
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {downloading && <Progress value={progress ?? 0} />}
                            {!m.downloaded && !downloading && !active && <p className='text-xs text-subtle'>Download it, then choose Use.</p>}
                        </div>
                    );
                })}
            </Group>
        </div>
    );
}

function CaptionsSection() {
    const [models, setModels] = useState<CaptionModel[] | null>(null);
    /** The model being downloaded, and how far along it is. */
    const [downloading, setDownloading] = useState<{
        id: string;
        progress: number;
    } | null>(null);

    const refresh = useCallback(() => {
        api.captionModels()
            .then(setModels)
            .catch((error) => toast.error(errorMessage(error)));
    }, []);

    useEffect(() => {
        refresh();
        const unlisten = listen<CaptionProgress>('captions-progress', ({ payload }) => {
            if (payload.phase === 'download') setDownloading((d) => (d ? { ...d, progress: payload.progress } : d));
        });
        return () => {
            unlisten.then((u) => u());
        };
    }, [refresh]);

    const run = async (action: () => Promise<void>) => {
        try {
            await action();
        } catch (error) {
            const message = errorMessage(error);
            if (message !== 'Cancelled') toast.error(message);
        }
        refresh();
    };
    /** Use a model; download it first if it isn't here yet. */
    const use = (model: CaptionModel) =>
        run(async () => {
            if (!model.downloaded) {
                setDownloading({ id: model.id, progress: 0 });
                try {
                    await api.downloadCaptionModel(model.id);
                } finally {
                    setDownloading(null);
                }
            }
            await api.selectCaptionModel(model.id);
            toast.success(`Captions now use ${model.label}`);
        });

    if (!models) return null;
    return (
        <div className='space-y-4'>
            <p className='text-sm text-muted'>
                Captions are made on this Mac with Whisper; nothing is uploaded. Bigger models are more accurate (especially for Hindi, accents and mixed
                languages) but slower and larger. English-only models only caption English. AI editing uses the same model.
            </p>
            <div className='divide-y divide-line rounded-xl border border-line'>
                {models.map((model) => {
                    const busy = downloading?.id === model.id;
                    return (
                        <div key={model.id} className='space-y-2 p-3'>
                            <div className='flex items-center gap-3'>
                                <span
                                    className={cx(
                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                        model.selected
                                            ? 'bg-accent/15 text-accent'
                                            : model.downloaded
                                              ? 'bg-success-soft text-success-fg'
                                              : 'bg-raised text-muted',
                                    )}
                                >
                                    {model.selected || model.downloaded ? <Check className='h-4 w-4' /> : <Captions className='h-4 w-4' />}
                                </span>
                                <div className='min-w-0 flex-1'>
                                    <p className='flex items-center gap-2 text-sm font-medium'>
                                        {model.label}
                                        {model.selected && (
                                            <span className='rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-fg'>In use</span>
                                        )}
                                    </p>
                                    <p className='text-xs text-muted'>
                                        {model.sizeMb >= 1000 ? `${(model.sizeMb / 1000).toFixed(1)} GB` : `${model.sizeMb} MB`} · {model.note}
                                    </p>
                                </div>
                                {busy ? (
                                    <Button size='sm' variant='ghost' onClick={() => api.cancelTranscription()}>
                                        <X className='h-3.5 w-3.5' /> Cancel
                                    </Button>
                                ) : (
                                    <div className='flex shrink-0 items-center gap-1'>
                                        {!model.selected && (
                                            <Button
                                                size='sm'
                                                variant={model.downloaded ? 'secondary' : 'primary'}
                                                disabled={!!downloading}
                                                onClick={() => use(model)}
                                            >
                                                {model.downloaded ? (
                                                    'Use'
                                                ) : (
                                                    <>
                                                        <Download className='h-3.5 w-3.5' /> Download
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        {model.downloaded && (
                                            <IconButton
                                                label={`Delete ${model.label} (frees ${model.sizeMb} MB)`}
                                                size='icon-sm'
                                                disabled={!!downloading}
                                                onClick={() =>
                                                    toast(`Delete ${model.label}? Using it again means downloading ${model.sizeMb} MB.`, {
                                                        action: {
                                                            label: 'Delete',
                                                            onClick: () => run(() => api.deleteCaptionModel(model.id)),
                                                        },
                                                    })
                                                }
                                            >
                                                <Trash2 className='h-3.5 w-3.5' />
                                            </IconButton>
                                        )}
                                    </div>
                                )}
                            </div>
                            {busy && <Progress value={downloading.progress} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const GUIDE_URL = 'https://github.com/aryan2621/capturita/blob/main/docs/google-setup.md';

/** Uploads use the user's own Google Cloud client; the steps to make one live in the guide. */
export function GoogleSection() {
    const [status, setStatus] = useState<GoogleStatus | null>(null);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [saving, setSaving] = useState(false);
    const [changing, setChanging] = useState(false);

    const refresh = useCallback(() => {
        api.googleStatus()
            .then(setStatus)
            .catch((error) => toast.error(errorMessage(error)));
    }, []);
    useEffect(refresh, [refresh]);

    const save = async () => {
        setSaving(true);
        try {
            await api.googleSaveClient(clientId, clientSecret);
            toast.success('Saved. You’ll sign in with Google on your first upload.');
            setClientId('');
            setClientSecret('');
            setChanging(false);
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setSaving(false);
            refresh();
        }
    };

    const act = async (action: () => Promise<void>) => {
        try {
            await action();
        } catch (error) {
            toast.error(errorMessage(error));
        }
        refresh();
    };

    if (!status) return null;
    return (
        <div className='space-y-5'>
            <p className='text-sm text-muted'>
                Uploads to YouTube and Drive use your own free Google Cloud project, so only your account and keys are used. Keys stay in this Mac's Keychain.{' '}
                <button className='inline-flex cursor-default items-center gap-0.5 text-fg underline' onClick={() => openUrl(GUIDE_URL)}>
                    Setup guide <ExternalLink className='h-3 w-3' />
                </button>
            </p>

            {status.configured && (
                <div className='flex items-center gap-3 rounded-xl border border-line p-4'>
                    <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success-fg'>
                        <Check className='h-4 w-4' />
                    </span>
                    <div className='min-w-0 flex-1'>
                        <p className='text-sm font-medium'>{status.account ? `Signed in as ${status.account.email}` : 'Ready to upload'}</p>
                        <p className='truncate text-xs text-muted'>
                            Client ID {status.clientIdPreview}
                            {status.account ? '' : ' · you sign in on your first upload'}
                        </p>
                    </div>
                    {status.account && (
                        <IconButton label='Sign out of Google' size='icon-sm' onClick={() => act(() => api.googleSignOut())}>
                            <LogOut className='h-3.5 w-3.5' />
                        </IconButton>
                    )}
                    <IconButton
                        label='Remove the Client ID and Secret (also signs out)'
                        size='icon-sm'
                        onClick={() =>
                            toast('Remove your Google Client ID and Secret? You’ll need to paste them again to upload.', {
                                action: {
                                    label: 'Remove',
                                    onClick: () => act(() => api.googleRemoveClient()),
                                },
                            })
                        }
                    >
                        <Trash2 className='h-3.5 w-3.5' />
                    </IconButton>
                </div>
            )}

            {status.configured && !changing ? (
                <button className='cursor-default text-xs text-muted underline hover:text-fg' onClick={() => setChanging(true)}>
                    Use a different Google project
                </button>
            ) : (
                <div className='space-y-3'>
                    <TextInput
                        className='w-full'
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder='Client ID (ends in .apps.googleusercontent.com)'
                        aria-label='Client ID'
                        spellCheck={false}
                    />
                    <TextInput
                        className='w-full'
                        type='password'
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder='Client Secret (starts with GOCSPX-)'
                        aria-label='Client Secret'
                    />
                    <div className='flex justify-end gap-2'>
                        {changing && (
                            <Button size='sm' variant='ghost' onClick={() => setChanging(false)}>
                                Cancel
                            </Button>
                        )}
                        <Button variant='primary' size='sm' disabled={saving || !clientId.trim() || !clientSecret.trim()} onClick={save}>
                            {saving && <Loader2 className='h-3.5 w-3.5 animate-spin' />} Save
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
