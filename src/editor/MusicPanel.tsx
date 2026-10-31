import { useRef, useState } from 'react';
import { AudioWaveform, Music, Repeat, Trash2, Upload, Volume2, VolumeX } from 'lucide-react';
import { toast } from '../lib/toast';
import { api, errorMessage, fileUrl, type Project } from '../lib/api';
import { loadMusic } from './audioSchedule';
import { beatsOnTimeline, detectBeats, fitScenesToBeats } from './beats';
import { Button, MenuButton, Slider, Switch, TimeField } from '../components/ui';
import { SUGGESTED_MUSIC, songCredit } from './suggestedMusic';
import { LibraryPicker } from '../studio/library';
import { DEFAULT_MUSIC_VOLUME, totalDuration, type AudioMix, type MusicTrack, type TimelineItem } from './model';

const percent = (v: number) => `${Math.round(v * 100)}%`;
const seconds = (v: number) => `${v.toFixed(0)} s`;

/** The song's beats and length, decoded from the project file. */
async function analyse(project: Project, file: string) {
    const context = new OfflineAudioContext(1, 1, 44100);
    const buffer = await loadMusic(context, `${fileUrl(project, file)}?v=${Date.now()}`);
    return {
        beats: detectBeats(buffer).map((b) => Math.round(b * 1000) / 1000),
        length: buffer.duration,
    };
}

/** Copies a song into the project (replacing its music file) as a track, beats found when possible. */
export async function importMusicTrack(project: Project, file: File, previous: MusicTrack | null): Promise<MusicTrack> {
    const stored = await api.importMusic(project.id, file);
    // Beats are a bonus: a song that can't be analysed still plays.
    const found = await analyse(project, stored).catch(() => ({}));
    return {
        file: stored,
        name: file.name,
        volume: previous?.volume ?? DEFAULT_MUSIC_VOLUME,
        muted: false,
        offset: 0,
        loop: previous?.loop ?? true,
        ...found,
    };
}

/** A "Suggested…" menu: songs that are only links until one is picked, then it is downloaded. */
function SuggestedPicker({ disabled, onPick }: { disabled?: boolean; onPick: (index: number) => void }) {
    return (
        <div className={disabled ? 'pointer-events-none w-32 opacity-40' : 'w-32'}>
            <MenuButton
                label='Suggested…'
                items={SUGGESTED_MUSIC.map((song, i) => ({ key: String(i), label: song.title, hint: song.mood }))}
                onPick={(key) => onPick(Number(key))}
            />
        </div>
    );
}

/** Background music: pick a song, set its volume, where it starts, and whether it loops; find its beats and cut scenes on them. */
export function MusicPanel({
    project,
    audio,
    items,
    onChange,
    onItemsChange,
}: {
    project: Project;
    audio: AudioMix;
    items: TimelineItem[];
    onChange: (audio: AudioMix, key: string) => void;
    onItemsChange: (items: TimelineItem[]) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const music = audio.music;
    const set = (next: MusicTrack | null, key: string) => onChange({ ...audio, music: next }, key);

    const choose = async (file: File | undefined) => {
        if (!file) return;
        setBusy(true);
        try {
            set(await importMusicTrack(project, file, music), 'music-file');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
            if (input.current) input.current.value = '';
        }
    };

    const chooseSuggested = async (index: number) => {
        const song = SUGGESTED_MUSIC[index];
        setBusy(true);
        try {
            const bytes = await api.fetchMusic(song.url);
            const extension = song.url.split('.').pop()?.toLowerCase() ?? 'mp3';
            const track = await importMusicTrack(project, new File([bytes], `${song.title}.${extension}`), music);
            set({ ...track, name: song.title, suggested: { credit: songCredit(song) } }, 'music-file');
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className='space-y-3 rounded-lg border border-line bg-panel-2 p-3'>
            <input
                ref={input}
                type='file'
                accept='audio/*,.mp3,.m4a,.aac,.wav,.aif,.aiff,.flac'
                className='hidden'
                onChange={(e) => choose(e.target.files?.[0])}
            />
            <div className='flex items-center justify-between gap-2 text-xs'>
                <span className='flex min-w-0 items-center gap-2'>
                    <Music className='h-3.5 w-3.5 shrink-0' />
                    <span className='truncate'>{music ? music.name : 'Music'}</span>
                </span>
                {music ? (
                    <span className='flex shrink-0 items-center gap-0.5'>
                        <Button
                            size='icon'
                            variant={music.muted ? 'danger' : 'ghost'}
                            className='h-7 w-7'
                            onClick={() => set({ ...music, muted: !music.muted }, 'music-mute')}
                            title={music.muted ? 'Unmute music' : 'Mute music'}
                            aria-label={music.muted ? 'Unmute music' : 'Mute music'}
                        >
                            {music.muted ? <VolumeX className='h-3.5 w-3.5' /> : <Volume2 className='h-3.5 w-3.5' />}
                        </Button>
                        <SuggestedPicker disabled={busy} onPick={chooseSuggested} />
                        <LibraryPicker kind='music' disabled={busy} onPick={choose} />
                        <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7'
                            onClick={() => input.current?.click()}
                            disabled={busy}
                            title='Replace the song'
                            aria-label='Replace the song'
                        >
                            <Upload className='h-3.5 w-3.5' />
                        </Button>
                        <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7'
                            onClick={() => set(null, 'music-remove')}
                            title='Remove music'
                            aria-label='Remove music'
                        >
                            <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                    </span>
                ) : (
                    <span className='flex items-center gap-1.5'>
                        <SuggestedPicker disabled={busy} onPick={chooseSuggested} />
                        <LibraryPicker kind='music' disabled={busy} onPick={choose} />
                        <Button size='sm' variant='subtle' onClick={() => input.current?.click()} disabled={busy}>
                            <Upload className='h-3.5 w-3.5' /> {busy ? 'Adding…' : 'Add music'}
                        </Button>
                    </span>
                )}
            </div>
            {music ? (
                <>
                    {music.suggested && (
                        <p className='text-[11px] text-subtle'>
                            {music.suggested.credit}. It is deleted from this project once you export a video.
                        </p>
                    )}
                    <Slider
                        label='Volume'
                        value={music.volume}
                        min={0}
                        max={1}
                        step={0.05}
                        format={percent}
                        onChange={(volume) => set({ ...music, volume }, 'music-volume')}
                    />
                    <Slider
                        label='Start the song at'
                        value={music.offset}
                        min={0}
                        max={120}
                        step={1}
                        format={seconds}
                        onChange={(offset) => set({ ...music, offset }, 'music-offset')}
                        field={
                            <TimeField
                                label='Start the song at'
                                value={music.offset}
                                max={120}
                                onChange={(offset) => set({ ...music, offset }, 'music-offset')}
                            />
                        }
                    />
                    <div className='flex items-center justify-between text-xs'>
                        <span className='flex items-center gap-2 text-muted'>
                            <Repeat className='h-3.5 w-3.5' /> Loop if the video is longer
                        </span>
                        <Switch label='Loop music' checked={music.loop} onChange={(loop) => set({ ...music, loop }, 'music-loop')} />
                    </div>
                    {music.beats?.length ? (
                        <div className='space-y-1.5'>
                            <Button
                                size='sm'
                                className='w-full'
                                disabled={!items.some((item) => item.kind === 'scene')}
                                onClick={() => onItemsChange(fitScenesToBeats(items, beatsOnTimeline(music, totalDuration(items) + 5)))}
                                title={
                                    items.some((item) => item.kind === 'scene')
                                        ? 'Lengthen or shorten each scene a little so the cut to the next one lands on a beat'
                                        : 'Add a scene first (Add scene, below the preview)'
                                }
                            >
                                <AudioWaveform className='h-3.5 w-3.5' /> Cut scenes on the beat
                            </Button>
                            <p className='text-[11px] text-muted'>
                                {Math.round((60 * (music.beats.length - 1)) / Math.max(0.1, music.beats[music.beats.length - 1] - music.beats[0]))} BPM · edges
                                snap to beats on the timeline.
                            </p>
                        </div>
                    ) : (
                        <Button
                            size='sm'
                            variant='ghost'
                            className='w-full'
                            disabled={busy}
                            onClick={async () => {
                                setBusy(true);
                                try {
                                    set({ ...music, ...(await analyse(project, music.file)) }, 'music-beats');
                                } catch (error) {
                                    toast.error(errorMessage(error));
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            <AudioWaveform className='h-3.5 w-3.5' /> {busy ? 'Listening…' : 'Find the beats'}
                        </Button>
                    )}
                </>
            ) : (
                <p className='text-xs text-muted'>Plays under your recording and is included in the export. Fade in/out below applies to it too.</p>
            )}
        </div>
    );
}
