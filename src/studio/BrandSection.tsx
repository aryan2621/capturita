import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe, ImagePlus, LayoutGrid, Loader2, Palette, Plus, Stamp, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, ColorField, FontPicker, IconButton, Segmented, Select } from '../components/ui';
import { errorMessage } from '../lib/api';
import type { Edit } from '../editor/model';
import { fitToMusic } from '../editor/beats';
import { brandLogoUrl, importBrandLogo, kitFromSite, newBrandKit, paletteFromLogo, setBrandKits, useBrandKits, type BrandKit } from './brandKits';
import type { BrandColors } from './scenes/assets';
import { fontStack, SCENE_FONTS } from './scenes/fonts';
import { KIT_PRESETS, type KitPreset } from './presets';
import { LookGrid } from './LookGrid';
import { applyStyle, shuffleStyle, STYLES } from './styles';

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
    const [browsing, setBrowsing] = useState(false);
    // A preset becomes the user's own kit, and its style is applied when there are scenes to style.
    const usePreset = (preset: KitPreset) => {
        const next: BrandKit = {
            ...newBrandKit(preset.name),
            colors: { ...preset.colors },
            fonts: { ...preset.fonts },
            background: preset.background,
        };
        setBrandKits([...kits, next]);
        const style = STYLES.find((s) => s.id === preset.style);
        const styled = style && edit.items.some((item) => item.kind === 'scene');
        onChange(
            {
                brandKit: next.id,
                ...(styled ? { items: fitToMusic(applyStyle(edit.items, style), edit.audio.music) } : {}),
            },
            `preset-${Date.now()}`
        );
        setBrowsing(false);
        toast.success(`${preset.name}: ${styled ? `colours, fonts and ${style.label.toLowerCase()} motion applied` : 'colours and fonts applied'}`);
    };
    // "From a website": null when closed, else the address being typed.
    const [site, setSite] = useState<string | null>(null);
    const [reading, setReading] = useState(false);
    const createFromSite = async () => {
        if (!site?.trim() || reading) return;
        setReading(true);
        try {
            const next = await kitFromSite(site);
            setBrandKits([...kits, next]);
            onChange({ brandKit: next.id }, 'brand-kit');
            setSite(null);
            toast.success(`Made “${next.name}” from the site${next.logo ? '' : ' (no logo found; add one below)'}`);
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setReading(false);
        }
    };
    const remove = () => {
        if (!kit) return;
        const before = kits;
        setBrandKits(kits.filter((k) => k.id !== kit.id));
        onChange({ brandKit: undefined }, 'brand-kit');
        // Kits are shared by every recording and editor undo doesn't bring one back.
        toast(`Deleted “${kit.name}”`, {
            action: {
                label: 'Undo',
                onClick: () => (setBrandKits(before), onChange({ brandKit: kit.id }, 'brand-kit')),
            },
        });
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
                <div className='flex'>
                    <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => setSite(site === null ? '' : null)}
                        title='Make a kit from a website: its name, logo, colours and fonts'
                    >
                        <Globe className='h-3.5 w-3.5' /> From a website
                    </Button>
                    <Button size='sm' variant='ghost' onClick={create} title='Make a new brand kit for motion scenes'>
                        <Plus className='h-3.5 w-3.5' /> New kit
                    </Button>
                </div>
            </div>
            {site !== null && (
                <form
                    className='flex gap-2'
                    onSubmit={(e) => {
                        e.preventDefault();
                        createFromSite();
                    }}
                >
                    <input
                        autoFocus
                        value={site}
                        onChange={(e) => setSite(e.target.value)}
                        placeholder='example.com'
                        aria-label='Website address'
                        className='h-8 min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-2 text-sm text-fg outline-none focus:border-accent'
                    />
                    <Button size='sm' type='submit' disabled={!site.trim() || reading}>
                        {reading ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : 'Make kit'}
                    </Button>
                </form>
            )}
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
            <Button size='sm' variant='ghost' className='w-full justify-between' onClick={() => setBrowsing(!browsing)} aria-expanded={browsing}>
                <span className='flex items-center gap-1.5'>
                    <LayoutGrid className='h-3.5 w-3.5' /> Start from a look ({KIT_PRESETS.length})
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${browsing ? 'rotate-180' : ''}`} />
            </Button>
            {browsing && (
                <div className='grid grid-cols-2 gap-2'>
                    {KIT_PRESETS.map((preset) => {
                        const style = STYLES.find((s) => s.id === preset.style);
                        return (
                            <button
                                key={preset.name}
                                onClick={() => usePreset(preset)}
                                className='overflow-hidden rounded-lg border border-line text-left transition-transform hover:-translate-y-0.5 hover:border-line-strong'
                                style={{ background: preset.colors.bg }}
                                title={`Make a kit from ${preset.name}${style ? ` with ${style.label} motion: ${style.hint.toLowerCase()}` : ''}`}
                            >
                                <div className='space-y-1 p-2.5'>
                                    <div
                                        className='truncate text-sm font-semibold'
                                        style={{
                                            color: preset.colors.text,
                                            fontFamily: fontStack(preset.fonts.display),
                                        }}
                                    >
                                        {preset.name}
                                    </div>
                                    <div
                                        className='flex items-center gap-1.5 text-[11px]'
                                        style={{
                                            color: preset.colors.muted,
                                            fontFamily: fontStack(preset.fonts.body),
                                        }}
                                    >
                                        <span className='h-2 w-5 rounded-full' style={{ background: preset.colors.accent }} />
                                        {style?.label}
                                    </div>
                                </div>
                                <div className='h-1' style={{ background: preset.colors.surface }} />
                            </button>
                        );
                    })}
                </div>
            )}
            {edit.items.some((item) => item.kind === 'scene') && (
                <div className='space-y-2'>
                    <span className='block text-xs'>Apply a look to the scenes</span>
                    <LookGrid
                        styles={STYLES}
                        onPick={(id) => {
                            const style = id === 'shuffle' ? shuffleStyle() : STYLES.find((s) => s.id === id);
                            if (!style) return;
                            onChange({ items: fitToMusic(applyStyle(edit.items, style), edit.audio.music) }, `style-${Date.now()}`);
                            toast.success(`${style.label} look: ${style.hint}`);
                        }}
                    />
                </div>
            )}
            {!kit && <p className='text-xs text-muted'>Motion scenes use the default colours. Pick or make a kit to use your own colours, fonts and logo.</p>}
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
                    <div className='space-y-1.5'>
                        {COLOR_FIELDS.map(({ key, label }) => (
                            <div key={key} className='flex items-center justify-between gap-2 text-xs'>
                                <span className='text-muted'>{label}</span>
                                <ColorField
                                    label={label}
                                    value={kit.colors[key]}
                                    onChange={(color) => updateKit({ colors: { ...kit.colors, [key]: color } })}
                                />
                            </div>
                        ))}
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                        {(['display', 'body'] as const).map((role) => (
                            <label key={role} className='block space-y-1'>
                                <span className='text-xs'>{role === 'display' ? 'Headings' : 'Body'}</span>
                                <FontPicker
                                    label={role === 'display' ? 'Headings font' : 'Body font'}
                                    value={kit.fonts[role]}
                                    fonts={SCENE_FONTS}
                                    onChange={(font) => updateKit({ fonts: { ...kit.fonts, [role]: font } })}
                                />
                            </label>
                        ))}
                    </div>
                    <div className='space-y-1'>
                        <span className='text-xs'>Background</span>
                        <Segmented
                            size='sm'
                            label='Background'
                            value={kit.background ?? 'gradient'}
                            onChange={(background) => updateKit({ background })}
                            options={[
                                { value: 'gradient', label: 'Gradient' },
                                {
                                    value: 'grain',
                                    label: 'Grain',
                                    hint: 'Gradient with film grain',
                                },
                                { value: 'flow', label: 'Drift', hint: 'Drifting colour' },
                            ]}
                        />
                    </div>
                    <div className='space-y-1'>
                        <span className='text-xs'>Logo</span>
                        <input
                            ref={input}
                            type='file'
                            accept='image/png,image/jpeg,image/webp,image/svg+xml,.svg'
                            className='hidden'
                            onChange={(e) => chooseLogo(e.target.files?.[0])}
                        />
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
                        ) : null}
                        {kit.logo && logoUrl ? (
                            <Button
                                size='sm'
                                variant='ghost'
                                className='w-full'
                                onClick={() =>
                                    paletteFromLogo(logoUrl)
                                        .then((colors) => updateKit({ colors }))
                                        .catch((error) => toast.error(errorMessage(error)))
                                }
                                title='Set the five colours from the logo’s main colour'
                            >
                                <Palette className='h-3.5 w-3.5' /> Colours from the logo
                            </Button>
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
