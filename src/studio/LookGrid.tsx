import { Shuffle } from 'lucide-react';
import type { VideoStyle } from './styles';

// A still of each look (a title card with its camera, light, type and colours), made by render.mjs.
const STILLS = import.meta.glob<string>('./looks/*.jpg', { eager: true, query: '?url', import: 'default' });
const stillOf = (id: string) => STILLS[`./looks/${id}.jpg`];

/** Look cards with a picture each, and a Shuffle card that mixes the parts of random looks. */
export function LookGrid({ styles, onPick }: { styles: VideoStyle[]; onPick: (id: string) => void }) {
    return (
        <div className='grid grid-cols-2 gap-2'>
            <button onClick={() => onPick('shuffle')} className='flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-muted transition-transform hover:-translate-y-0.5 hover:border-line-strong' title='Mix the parts of random looks'>
                <Shuffle className='h-4 w-4' /> Shuffle
            </button>
            {styles.map((style) => (
                <button key={style.id} onClick={() => onPick(style.id)} className='overflow-hidden rounded-lg border border-line text-left transition-transform hover:-translate-y-0.5 hover:border-line-strong' title={style.hint}>
                    {stillOf(style.id) && <img src={stillOf(style.id)} alt='' className='block aspect-video w-full object-cover' />}
                    <div className='px-2 py-1 text-xs font-medium'>{style.label}</div>
                </button>
            ))}
        </div>
    );
}
