import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Plus, Stamp, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, IconButton, Select } from '../components/ui';
import { errorMessage } from '../lib/api';
import type { Edit } from '../editor/model';
import { brandLogoUrl, importBrandLogo, newBrandKit, setBrandKits, useBrandKits, type BrandKit } from './brandKits';
import type { BrandColors } from './scenes/assets';
import { SCENE_FONTS, type SceneFont } from './scenes/fonts';

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
    { key: 'bg', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text' },
    { key: 'muted', label: 'Muted' },
    { key: 'accent', label: 'Accent' },
];

/**
 * Which brand kit the project's motion scenes use, and the kit itself. Kits are shared by every
 * recording; editing one here changes it everywhere it's used.
 */
export function BrandSection({ edit, onChange }: { edit: Edit; onChange: (patch: Partial<Edit>, key: string) => void }) {
    const kits = useBrandKits();
    const kit = kits.find((k) => k.id === edit.brandKit) ?? null;
    const input = useRef<HTMLInputElement>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (kit?.logo) brandLogoUrl(kit.logo).then((url) => !cancelled && setLogoUrl(url));
        else setLogoUrl(null);
        return () => {
            cancelled = true;
        };
    }, [kit?.logo]);

    const updateKit = (patch: Partial<BrandKit>) => kit && setBrandKits(kits.map((k) => (k.id === kit.id ? { ...k, ...patch } : k)));
    const create = () => {
        const next = newBrandKit(`Brand ${kits.length + 1}`);
        setBrandKits([...kits, next]);
        onChange({ brandKit: next.id }, 'brand-kit');
    };
    const remove = () => {
        if (!kit) return;
        setBrandKits(kits.filter((k) => k.id !== kit.id));
        onChange({ brandKit: undefined }, 'brand-kit');
    };
    const chooseLogo = async (file: File | undefined) => {
        if (!file) return;
        try {
            updateKit({ logo: await importBrandLogo(file) });
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            if (input.current) input.current.value = '';
        }
    };

    return (
        <section className='space-y-3'>
            <div className='flex min-h-8 items-center justify-between'>
                <h3 className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted'>
                    <Stamp className='h-3.5 w-3.5' />
                    Brand
                </h3>
                <Button size='sm' variant='ghost' onClick={create} title='Make a new brand kit for motion scenes'>
                    <Plus className='h-3.5 w-3.5' /> New kit
                </Button>
            </div>
            <div className='flex items-center gap-2'>
                <Select value={kit?.id ?? ''} onChange={(e) => onChange({ brandKit: e.target.value || undefined }, 'brand-kit')} aria-label='Brand kit'>
                    <option value=''>Default look</option>
                    {kits.map((k) => (
                        <option key={k.id} value={k.id}>
                            {k.name || 'Untitled kit'}
                        </option>
                    ))}
                </Select>
                {kit && (
                    <IconButton label='Delete this brand kit (from every recording)' onClick={remove}>
                        <Trash2 className='h-4 w-4' />
                    </IconButton>
                )}
            </div>
            {!kit && <p className='text-xs text-muted'>Motion scenes use the default colors. Pick or make a kit to use your own colors, fonts and logo.</p>}
            {kit && (
                <div className='space-y-4'>
                    <label className='block space-y-1'>
                        <span className='text-xs'>Name</span>
                        <input
                            value={kit.name}
                            onChange={(e) => updateKit({ name: e.target.value })}
                            className='h-8 w-full rounded-lg border border-line bg-panel-2 px-2 text-sm text-fg outline-none focus:border-accent'
                        />
                    </label>
                    <div className='grid grid-cols-5 gap-2'>
                        {COLOR_FIELDS.map(({ key, label }) => (
                            <label key={key} className='flex flex-col items-center gap-1 text-[11px] text-muted' title={`${label} color`}>
                                <input
                                    type='color'
                                    value={kit.colors[key]}
                                    onChange={(e) => updateKit({ colors: { ...kit.colors, [key]: e.target.value } })}
                                    className='h-8 w-full cursor-pointer rounded border border-line bg-transparent'
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                        {(['display', 'body'] as const).map((role) => (
                            <label key={role} className='block space-y-1'>
                                <span className='text-xs'>{role === 'display' ? 'Headings' : 'Body'}</span>
                                <Select value={kit.fonts[role]} onChange={(e) => updateKit({ fonts: { ...kit.fonts, [role]: e.target.value as SceneFont } })}>
                                    {SCENE_FONTS.map((font) => (
                                        <option key={font.value} value={font.value}>
                                            {font.label}
                                        </option>
                                    ))}
                                </Select>
                            </label>
                        ))}
                    </div>
                    <div className='space-y-1'>
                        <span className='text-xs'>Logo</span>
                        <input ref={input} type='file' accept='image/png,image/jpeg,image/webp,image/svg+xml,.svg' className='hidden' onChange={(e) => chooseLogo(e.target.files?.[0])} />
                        {kit.logo && logoUrl ? (
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={() => input.current?.click()}
                                    className='flex h-12 flex-1 items-center justify-center rounded-lg border border-line p-2'
                                    style={{ background: kit.colors.bg }}
                                    title='Choose another logo'
                                >
                                    <img src={logoUrl} alt='Brand logo' className='max-h-full max-w-full object-contain' />
                                </button>
                                <IconButton label='Remove the logo' onClick={() => updateKit({ logo: undefined })}>
                                    <X className='h-4 w-4' />
                                </IconButton>
                            </div>
                        ) : (
                            <Button size='sm' className='w-full' onClick={() => input.current?.click()}>
                                <ImagePlus className='h-3.5 w-3.5' /> Add a logo
                            </Button>
                        )}
                    </div>
                    <p className='text-xs text-muted'>Kits are shared by all your recordings.</p>
                </div>
            )}
        </section>
    );
}
