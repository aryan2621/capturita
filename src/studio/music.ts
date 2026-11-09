const FILES = import.meta.glob('../../studio-assets/music/*.mp3', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

/** The song that ships with the app, as a file to import like one the user picked; null if it can't be loaded. */
export async function defaultSong(): Promise<File | null> {
    const [path, url] = Object.entries(FILES)[0] ?? [];
    if (!url) return null;
    try {
        return new File([await (await fetch(url)).blob()], path.split('/').pop() ?? 'music.mp3', { type: 'audio/mpeg' });
    } catch {
        return null;
    }
}
