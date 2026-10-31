import { Shuffle } from 'lucide-react';
import { Card } from '../components/ui';
import type { VideoStyle } from './styles';

// A still of each look (a title card with its camera, light, type and colours), made by render.mjs.
const STILLS = import.meta.glob<string>('./looks/*.jpg', { eager: true, query: '?url', import: 'default' });
const stillOf = (id: string) => STILLS[`./looks/${id}.jpg`];

/** Look cards with a picture each, and a Shuffle card that mixes the parts of random looks. */
export function LookGrid({ styles, onPick }: { styles: VideoStyle[]; onPick: (id: string) => void }) {
    return (
        <div className='grid grid-cols-2 gap-2'>
            <Card interactive padding='none' onClick={() => onPick('shuffle')} className='flex flex-col items-center justify-center gap-1 border-dashed text-xs text-muted' title='Mix the parts of random looks'>
                <Shuffle className='h-4 w-4' /> Shuffle
            </Card>
            {styles.map((style) => (
                <Card key={style.id} interactive padding='none' onClick={() => onPick(style.id)} className='overflow-hidden text-left' title={style.hint}>
                    {stillOf(style.id) && <img src={stillOf(style.id)} alt='' className='block aspect-video w-full object-cover' />}
                    <div className='px-2 py-1 text-xs font-medium'>{style.label}</div>
                </Card>
            ))}
        </div>
    );
}
