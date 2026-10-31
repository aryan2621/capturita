import { useCallback, useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { AudioLines, FolderPlus, Mic, Play, Plus, Square, Type, Waves } from 'lucide-react';
import { toast } from '../lib/toast';
import { api, errorMessage, fileUrl, type Project } from '../lib/api';
import { Button, Select, Slider, Switch, TimeField } from '../components/ui';
import { newId, type AudioClip, type AudioMix, type Ducking, type SoundCue } from './model';

const percent = (v: number) => `${Math.round(v * 100)}%`;
const seconds = (v: number) => `${v.toFixed(1)} s`;
const clock = (value: number) => `${Math.floor(value / 60)}:${(value % 60).toFixed(1).padStart(4, '0')}`;
const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.aac,.wav,.aif,.aiff,.caf,.flac,.ogg';

/** Length in seconds of an audio file inside the project. */
export async function projectFileLength(project: Project, file: string) {
    const response = await fetch(fileUrl(project, file));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await new OfflineAudioContext(1, 1, 48_000).decodeAudioData(await response.arrayBuffer());
    return buffer.duration;
}

/** A display name for a project or pack file: no folder, no extension. */
export const soundName = (file: string) =>
    file
        .split('/')
        .pop()!
        .replace(/\.[^.]+$/, '');

/** The licensed sound pack in Capturita/Sounds: its files, adding to it, and auditioning a sound. */
export function useSoundPack() {
    const [pack, setPack] = useState<{ dir: string; files: string[] } | null>(null);
    const refresh = useCallback(() => {
        api.listSounds()
            .then(setPack)
            .catch((error) => toast.error(errorMessage(error)));
    }, []);
    useEffect(refresh, [refresh]);
    const add = async (files: FileList | null) => {
        if (!files?.length) return;
        try {
            for (const file of Array.from(files)) await api.importSound(file);
        } catch (error) {
            toast.error(errorMessage(error));
        }
        refresh();
    };
    const audition = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState<string | null>(null);
    const preview = (file: string | null) => {
        audition.current?.pause();
        audition.current = null;
        setPlaying(null);
        if (!file || !pack) return;
        const element = new Audio(convertFileSrc(`${pack.dir}/${file}`));
        element.onended = () => setPlaying(null);
        element.play().catch(() => setPlaying(null));
        audition.current = element;
        setPlaying(file);
    };
    useEffect(() => () => audition.current?.pause(), []);
    return {
        files: pack?.files ?? [],
        loaded: !!pack,
        refresh,
        add,
        preview,
        playing,
    };
}

/** Pick a sound from the pack (with a way to add more), play it, and set its volume. */
export function SoundPicker({
    project,
    label,
    value,
    onChange,
}: {
    project: Project;
    label: string;
    value: SoundCue | undefined;
    onChange: (sound: SoundCue | undefined, key: string) => void;
}) {
    const pack = useSoundPack();
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const current = value ? pack.files.find((f) => soundName(f) === value.name) : undefined;
    const choose = async (file: string) => {
        if (!file) return onChange(undefined, 'sound-remove');
        setBusy(true);
        try {
            const stored = await api.useSound(project.id, file);
            onChange({ file: stored, name: soundName(file), volume: value?.volume ?? 1 }, 'sound-file');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className='space-y-2'>
            <input
                ref={input}
                type='file'
                multiple
                accept={AUDIO_ACCEPT}
                className='hidden'
                onChange={(e) => pack.add(e.target.files).then(() => (e.target.value = ''))}
            />
            <label className='flex items-center justify-between gap-2 text-xs'>
                <span>{label}</span>
                <span className='flex items-center gap-1'>
                    <Select value={current ?? (value ? '__current' : '')} onChange={(e) => choose(e.target.value)} disabled={busy} className='h-8 w-36 px-2'>
                        <option value=''>None</option>
                        {value && !current && <option value='__current'>{value.name}</option>}
                        {pack.files.map((file) => (
                            <option key={file} value={file}>
                                {soundName(file)}
                            </option>
                        ))}
                    </Select>
                    {current && (
                        <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7'
                            onClick={() => pack.preview(pack.playing === current ? null : current)}
                            title='Listen'
                            aria-label='Listen'
                        >
                            {pack.playing === current ? <Square className='h-3 w-3' /> : <Play className='h-3 w-3' />}
                        </Button>
                    )}
                    <Button
                        size='icon'
                        variant='ghost'
                        className='h-7 w-7'
                        onClick={() => input.current?.click()}
                        title='Add sounds to your sound pack'
                        aria-label='Add sounds to your sound pack'
                    >
                        <FolderPlus className='h-3.5 w-3.5' />
                    </Button>
                </span>
            </label>
            {pack.loaded && pack.files.length === 0 && (
                <p className='text-[11px] text-muted'>
                    Your sound pack is empty. Add licensed sounds with the folder button; they’re kept in Movies/Capturita/Sounds.
                </p>
            )}
            {value && (
                <Slider
                    label='Sound volume'
                    value={value.volume}
                    min={0}
                    max={2}
                    step={0.05}
                    format={percent}
                    onChange={(volume) => onChange({ ...value, volume }, 'sound-volume')}
                />
            )}
        </div>
    );
}

/** Voiceovers and sound effects in the Audio tab: add them at the playhead, and ducking. */
export function AudioClipsSection({
    project,
    audio,
    playhead,
    total,
    onChange,
    onSelect,
}: {
    project: Project;
    audio: AudioMix;
    playhead: () => number;
    total: number;
    onChange: (audio: AudioMix, key: string) => void;
    onSelect: (id: string) => void;
}) {
    const voiceInput = useRef<HTMLInputElement>(null);
    const pack = useSoundPack();
    const packInput = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [sound, setSound] = useState('');
    const [script, setScript] = useState<string | null>(null);
    const [voices, setVoices] = useState<{ name: string; language: string }[]>([]);
    const [voice, setVoice] = useState('');
    useEffect(() => {
        if (script === null || voices.length) return;
        api.speechVoices()
            .then((list) => {
                // The user's own language first, then English, then the rest.
                const lang = navigator.language.replace('-', '_');
                const rank = (v: { language: string }) => (v.language === lang ? 0 : v.language.startsWith('en_') ? 1 : 2);
                const sorted = [...list].sort((a, b) => rank(a) - rank(b));
                setVoices(sorted);
                setVoice((current) => current || (sorted.find((v) => v.name === 'Samantha') ?? sorted[0])?.name || '');
            })
            .catch((error) => toast.error(errorMessage(error)));
    }, [script, voices.length]);

    const place = async (kind: 'voice' | 'sfx', file: string, name: string) => {
        const length = await projectFileLength(project, file);
        const start = Math.max(0, Math.min(playhead(), Math.max(0, total - 0.1)));
        const clip: AudioClip = {
            id: newId(),
            file,
            name,
            start,
            offset: 0,
            duration: kind === 'voice' ? Math.min(length, Math.max(0.1, total - start)) : length,
            length,
            volume: 1,
            fadeIn: 0,
            fadeOut: 0,
        };
        if (kind === 'voice') onChange({ ...audio, voiceovers: [...audio.voiceovers, clip] }, 'voice-add');
        else onChange({ ...audio, effects: [...audio.effects, clip] }, 'sfx-add');
        onSelect(clip.id);
    };
    const run = async (task: () => Promise<void>) => {
        setBusy(true);
        try {
            await task();
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    const addVoice = async (file: File | undefined) =>
        file && run(async () => place('voice', await api.importAudio(project.id, 'voice', file), soundName(file.name)));
    const speak = () =>
        script?.trim() &&
        run(async () => {
            await place('voice', await api.speak(project.id, script, voice), `${voice || 'Voice'}: ${script.trim().slice(0, 24)}`);
            setScript(null);
        });
    const addSound = async (file: string) => file && run(async () => place('sfx', await api.useSound(project.id, file), soundName(file)));

    return (
        <div className='space-y-3 rounded-lg border border-line bg-panel-2 p-3'>
            <input
                ref={voiceInput}
                type='file'
                accept={AUDIO_ACCEPT}
                className='hidden'
                onChange={(e) => addVoice(e.target.files?.[0]).then(() => (e.target.value = ''))}
            />
            <input
                ref={packInput}
                type='file'
                multiple
                accept={AUDIO_ACCEPT}
                className='hidden'
                onChange={(e) => pack.add(e.target.files).then(() => (e.target.value = ''))}
            />
            <div className='flex items-center justify-between gap-2 text-xs'>
                <span className='flex items-center gap-2'>
                    <Mic className='h-3.5 w-3.5' /> Voiceover
                    {audio.voiceovers.length > 0 && <span className='text-muted'>({audio.voiceovers.length})</span>}
                </span>
                <span className='flex items-center gap-1'>
                    <Button
                        size='sm'
                        variant={script === null ? 'ghost' : 'subtle'}
                        onClick={() => setScript(script === null ? '' : null)}
                        disabled={busy}
                        title='Type a script for a Mac voice to read'
                    >
                        <Type className='h-3.5 w-3.5' /> Text to speech
                    </Button>
                    <Button
                        size='sm'
                        variant='subtle'
                        onClick={() => voiceInput.current?.click()}
                        disabled={busy}
                        title='Import a narration file and place it at the playhead'
                    >
                        <Plus className='h-3.5 w-3.5' /> Import file
                    </Button>
                </span>
            </div>
            {script !== null && (
                <div className='space-y-2'>
                    <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        rows={3}
                        placeholder='What should the voice say?'
                        className='w-full resize-none rounded-lg border border-line bg-panel p-2 text-sm text-fg outline-none focus:border-accent'
                        aria-label='Voiceover script'
                    />
                    <div className='flex items-center gap-2'>
                        <Select value={voice} onChange={(e) => setVoice(e.target.value)} className='h-8 min-w-0 flex-1 px-2' aria-label='Voice'>
                            {voices.map((v) => (
                                <option key={v.name} value={v.name}>
                                    {v.name} ({v.language.replace('_', '-')})
                                </option>
                            ))}
                        </Select>
                        <Button size='sm' onClick={speak} disabled={busy || !script.trim()} title='Read the script aloud and place it at the playhead'>
                            {busy ? 'Reading…' : 'Add voice'}
                        </Button>
                    </div>
                    <p className='text-[11px] text-muted'>Read by your Mac, offline. Caption it in the Captions tab.</p>
                </div>
            )}
            <div className='space-y-2'>
                <div className='flex items-center justify-between gap-2 text-xs'>
                    <span className='flex items-center gap-2'>
                        <AudioLines className='h-3.5 w-3.5' /> Sound effect
                        {audio.effects.length > 0 && <span className='text-muted'>({audio.effects.length})</span>}
                    </span>
                    <Button
                        size='icon'
                        variant='ghost'
                        className='h-7 w-7'
                        onClick={() => packInput.current?.click()}
                        title='Add sounds to your sound pack'
                        aria-label='Add sounds to your sound pack'
                    >
                        <FolderPlus className='h-3.5 w-3.5' />
                    </Button>
                </div>
                <div className='flex items-center gap-1'>
                    <Select value={sound} onChange={(e) => setSound(e.target.value)} className='h-8 px-2' aria-label='Sound effect'>
                        <option value=''>{pack.files.length ? 'Choose a sound…' : 'Sound pack is empty'}</option>
                        {pack.files.map((file) => (
                            <option key={file} value={file}>
                                {soundName(file)}
                            </option>
                        ))}
                    </Select>
                    <Button
                        size='icon'
                        variant='ghost'
                        className='h-8 w-8 shrink-0'
                        disabled={!sound}
                        onClick={() => pack.preview(pack.playing === sound ? null : sound)}
                        title='Listen'
                        aria-label='Listen'
                    >
                        {pack.playing === sound && sound ? <Square className='h-3 w-3' /> : <Play className='h-3 w-3' />}
                    </Button>
                    <Button
                        size='sm'
                        variant='subtle'
                        className='shrink-0'
                        disabled={!sound || busy}
                        onClick={() => addSound(sound)}
                        title='Place this sound at the playhead'
                    >
                        <Plus className='h-3.5 w-3.5' /> Add
                    </Button>
                </div>
                <p className='text-[11px] text-muted'>
                    Sounds come from your licensed pack in Movies/Capturita/Sounds. Transitions and scenes can also play one automatically.
                </p>
            </div>
        </div>
    );
}

/** Lowering the music while someone speaks. */
export function DuckingSection({
    ducking,
    hasMusic,
    hasMicrophone,
    onChange,
}: {
    ducking: Ducking;
    hasMusic: boolean;
    hasMicrophone: boolean;
    onChange: (ducking: Ducking, key: string) => void;
}) {
    const set = (patch: Partial<Ducking>, key: string) => onChange({ ...ducking, ...patch }, key);
    return (
        <div className='space-y-3 rounded-lg border border-line bg-panel-2 p-3'>
            <div className='flex items-center justify-between text-xs'>
                <span className='flex items-center gap-2'>
                    <Waves className='h-3.5 w-3.5' /> Lower music under speech
                </span>
                <Switch label='Lower music under speech' checked={ducking.enabled} onChange={(enabled) => set({ enabled }, 'duck-enabled')} />
            </div>
            {ducking.enabled && (
                <>
                    {!hasMusic && <p className='text-[11px] text-muted'>Add music to hear this.</p>}
                    <Slider
                        label='Lower by'
                        value={-ducking.amount}
                        min={3}
                        max={30}
                        step={1}
                        format={(v) => `${v.toFixed(0)} dB`}
                        onChange={(v) => set({ amount: -v }, 'duck-amount')}
                    />
                    <details className='text-xs'>
                        <summary className='cursor-default text-muted hover:text-fg'>Fine tune</summary>
                        <div className='mt-2 space-y-3'>
                            <Slider
                                label='Goes down in'
                                value={ducking.attack}
                                min={0.02}
                                max={0.5}
                                step={0.01}
                                format={(v) => `${Math.round(v * 1000)} ms`}
                                onChange={(attack) => set({ attack }, 'duck-attack')}
                            />
                            <Slider
                                label='Comes back in'
                                value={ducking.release}
                                min={0.1}
                                max={2}
                                step={0.05}
                                format={seconds}
                                onChange={(release) => set({ release }, 'duck-release')}
                            />
                        </div>
                    </details>
                    {hasMicrophone && (
                        <div
                            className='flex items-center justify-between gap-3 text-xs'
                            title='Also lower the music while you talk in the recording, not only under voiceovers'
                        >
                            <span>Also under the recording’s microphone</span>
                            <Switch
                                label='Also under the microphone'
                                checked={ducking.underRecording}
                                onChange={(underRecording) => set({ underRecording }, 'duck-mic')}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/** Settings of one voiceover or sound effect on the timeline. */
export function AudioClipPanel({
    clip,
    kind,
    total,
    onChange,
}: {
    clip: AudioClip;
    kind: 'voice' | 'sfx';
    total: number;
    onChange: (clip: AudioClip, key: string) => void;
}) {
    const set = (patch: Partial<AudioClip>, key: string) => onChange({ ...clip, ...patch }, `${kind}-${clip.id}-${key}`);
    const maxFade = Math.max(0.1, clip.duration / 2);
    return (
        <div className='space-y-5'>
            <p className='truncate text-xs text-muted' title={clip.name}>
                {kind === 'voice' ? 'Voiceover' : 'Sound effect'}: {clip.name}
            </p>
            <Slider label='Volume' value={clip.volume} min={0} max={2} step={0.05} format={percent} onChange={(volume) => set({ volume }, 'volume')} />
            <Slider
                label='Starts at'
                value={clip.start}
                min={0}
                max={Math.max(0, total - 0.1)}
                step={0.05}
                format={clock}
                onChange={(start) => set({ start }, 'start')}
                field={<TimeField label='Starts at' value={clip.start} max={Math.max(0, total - 0.1)} onChange={(start) => set({ start }, 'start')} />}
            />
            <Slider
                label='Fade in'
                value={Math.min(clip.fadeIn, maxFade)}
                min={0}
                max={maxFade}
                step={0.05}
                format={seconds}
                onChange={(fadeIn) => set({ fadeIn }, 'fade-in')}
            />
            <Slider
                label='Fade out'
                value={Math.min(clip.fadeOut, maxFade)}
                min={0}
                max={maxFade}
                step={0.05}
                format={seconds}
                onChange={(fadeOut) => set({ fadeOut }, 'fade-out')}
            />
            <p className='text-[11px] text-muted'>
                Plays {seconds(clip.duration)} from {seconds(clip.offset)} into the file. Drag its edges on the timeline to trim it.
            </p>
        </div>
    );
}
