// The transition sounds that ship with the app (studio-assets/sfx, made by scripts/make-sfx.sh).
// A draft puts one on each transition: the file is copied into the project like any sound effect.

import { api } from '../lib/api';
import type { Edit, SoundCue, TimelineItem, Transition } from '../editor/model';

const FILES = import.meta.glob('../../studio-assets/sfx/*.wav', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

/** Which sound a transition gets: movement sounds like movement; soft fades stay silent. */
export const TRANSITION_SFX: Partial<Record<Transition['type'], string>> = { push: 'whoosh', slide: 'whoosh', wipe: 'swoosh', zoom: 'pop', whip: 'whoosh', circle: 'pop', diagonal: 'swoosh', flash: 'impact', flood: 'swoosh' };

/** Sound names (`whoosh`) that the transitions of these items would use. */
export const sfxNeeded = (items: TimelineItem[]) => [...new Set(items.flatMap((item) => (item.transition ? [TRANSITION_SFX[item.transition.type]] : [])).filter((n): n is string => !!n))];

/** Copies the named sounds into the project; returns a cue for each one that could be loaded. */
export async function importSfx(projectId: string, names: string[], volume = 0.6): Promise<Record<string, SoundCue>> {
    const cues: Record<string, SoundCue> = {};
    for (const name of names) {
        const url = Object.entries(FILES).find(([path]) => path.endsWith(`/${name}.wav`))?.[1];
        if (!url) continue;
        const blob = await (await fetch(url)).blob();
        const file = await api.importAudio(projectId, 'sfx', new File([blob], `${name}.wav`, { type: 'audio/wav' }));
        cues[name] = { file, name: name[0].toUpperCase() + name.slice(1), volume };
    }
    return cues;
}

/** The edit with the sound set on each transition from item `from` on, leaving a sound already there alone (earlier items are the user's). */
export function withTransitionSounds(edit: Edit, cues: Record<string, SoundCue>, from = 0): Edit {
    return {
        ...edit,
        items: edit.items.map((item, i) => {
            const cue = i >= from && item.transition && !item.transition.sound ? cues[TRANSITION_SFX[item.transition.type] ?? ''] : undefined;
            return cue ? { ...item, transition: { ...item.transition, sound: cue } as Transition } : item;
        }),
    };
}
