import { useEffect, useState, useSyncExternalStore } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { api, type Project } from '../lib/api';
import { DEFAULT_BRAND, type Brand, type BrandColors } from './scenes/assets';
import type { SceneFont } from './scenes/fonts';

/** A reusable brand kit, saved app-wide (Capturita/Brand/kits.json). */
export interface BrandKit {
    id: string;
    name: string;
    colors: BrandColors;
    fonts: { display: SceneFont; body: SceneFont };
    /** File name in the Brand folder, as import_brand_logo made it. */
    logo?: string;
}

let kits: BrandKit[] = [];
let loading: Promise<BrandKit[]> | null = null;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** The saved kits, loaded once per window. */
export function loadBrandKits() {
    loading ??= invoke<BrandKit[]>('brand_kits')
        .then((list) => {
            kits = list.filter((kit) => kit && typeof kit.id === 'string');
            listeners.forEach((listener) => listener());
            return kits;
        })
        .catch((error) => {
            api.log(`[brand] couldn't load kits: ${error}`);
            return kits;
        });
    return loading;
}

/** Replaces the kits and saves them shortly after (typing in a field saves once). */
export function setBrandKits(next: BrandKit[]) {
    kits = next;
    listeners.forEach((listener) => listener());
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => invoke('save_brand_kits', { kits }).catch((error) => api.log(`[brand] couldn't save kits: ${error}`)), 400);
}

export function useBrandKits() {
    useEffect(() => void loadBrandKits(), []);
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => kits
    );
}

export const newBrandKit = (name: string): BrandKit => ({ id: crypto.randomUUID().slice(0, 8), name, colors: { ...DEFAULT_BRAND.colors }, fonts: { ...DEFAULT_BRAND.fonts } });

export async function importBrandLogo(file: File) {
    return invoke<string>('import_brand_logo', new Uint8Array(await file.arrayBuffer()), { headers: { name: encodeURIComponent(file.name) } });
}

/** URL of a kit's logo in the Brand folder, for showing it in the editor. */
export async function brandLogoUrl(logo: string) {
    return convertFileSrc(`${await api.recordingsDir()}/Brand/${logo}`);
}

/**
 * The brand scenes in a project get: its chosen kit (copying the kit's logo into the project
 * if needed), or the default look when it has none or the kit was deleted.
 */
export async function projectBrand(project: Project, kitId: string | undefined): Promise<Brand> {
    const kit = kitId ? (await loadBrandKits()).find((k) => k.id === kitId) : undefined;
    if (!kit) return DEFAULT_BRAND;
    const brand: Brand = { colors: { ...kit.colors }, fonts: { ...kit.fonts } };
    if (kit.logo) {
        try {
            brand.logo = await invoke<string>('use_brand_logo', { id: project.id, logo: kit.logo });
        } catch (error) {
            api.log(`[brand] logo unavailable for ${project.id}: ${error}`);
        }
    }
    return brand;
}

/** projectBrand as React state, following kit edits. */
export function useProjectBrand(project: Project, kitId: string | undefined) {
    const list = useBrandKits();
    const kit = list.find((k) => k.id === kitId);
    const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
    const key = JSON.stringify(kit ?? null);
    useEffect(() => {
        let cancelled = false;
        projectBrand(project, kit?.id).then((next) => !cancelled && setBrand(next));
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project, key]);
    return brand;
}
