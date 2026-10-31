// Animations and music that ship with the app (studio-assets/, licences in its LICENSES.md).
// Vite emits each file as an asset; picking one copies it into the project like a file the user chose.

import { toast } from '../lib/toast';
import { MenuButton } from '../components/ui';
import { errorMessage } from '../lib/api';

const FILES = import.meta.glob('../../studio-assets/{lottie,music}/*', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>;

export type LibraryKind = 'lottie' | 'music';

const entries = (kind: LibraryKind) =>
    Object.entries(FILES)
        .filter(([path]) => path.includes(`/${kind}/`))
        .map(([path, url]) => {
            const file = path.split('/').pop()!;
            // "trendingUp.json" → "Trending up", "upbeat-drive_120.mp3" → "Upbeat drive 120"
            const label = file
                .replace(/\.[^.]+$/, '')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/[-_]+/g, ' ')
                .toLowerCase();
            return { file, url, label: label[0].toUpperCase() + label.slice(1) };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

/** A "From the library" menu; the chosen file arrives as a File. Hidden when the library has none of this kind. */
export function LibraryPicker({ kind, disabled, onPick }: { kind: LibraryKind; disabled?: boolean; onPick: (file: File) => void }) {
    const items = entries(kind);
    if (!items.length) return null;
    return (
        <div className={disabled ? 'pointer-events-none w-32 opacity-40' : 'w-32'}>
            <MenuButton
                label='Library…'
                items={items.map((item, i) => ({ key: String(i), label: item.label }))}
                onPick={async (key) => {
                    const item = items[Number(key)];
                    try {
                        const blob = await (await fetch(item.url)).blob();
                        onPick(new File([blob], item.file, { type: blob.type }));
                    } catch (error) {
                        toast.error(`Could not load ${item.file}: ${errorMessage(error)}`);
                    }
                }}
            />
        </div>
    );
}
