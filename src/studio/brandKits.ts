import { useEffect, useState, useSyncExternalStore } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { api, type Project } from '../lib/api';
import { DEFAULT_BRAND, type Brand, type BrandBackground, type BrandColors } from './scenes/assets';
import { SCENE_FONTS, type SceneFont } from './scenes/fonts';

/** A reusable brand kit, saved app-wide (Capturita/Brand/kits.json). */
export interface BrandKit {
    id: string;
    name: string;
    colors: BrandColors;
    fonts: { display: SceneFont; body: SceneFont };
    background?: BrandBackground;
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

/** Copies a picture (or Lottie .json) into the project for a scene; returns its project path. */
export async function importSceneImage(projectId: string, file: File) {
    return invoke<string>('import_scene_image', new Uint8Array(await file.arrayBuffer()), { headers: { id: projectId, name: encodeURIComponent(file.name) } });
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
    await loadBrandKits();
    // The live list, not the load's result: kits made since the first load are only in `kits`.
    const kit = kitId ? kits.find((k) => k.id === kitId) : undefined;
    if (!kit) return DEFAULT_BRAND;
    const brand: Brand = { colors: { ...kit.colors }, fonts: { ...kit.fonts }, ...(kit.background && kit.background !== 'gradient' ? { background: kit.background } : {}) };
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

/**
 * Brand colours from a logo: its most common vivid colour becomes the accent, and the
 * background, surface and muted text take its hue. A logo with no vivid colour keeps the default
 * accent; a dark logo (a black wordmark) gets a light background so it stays visible.
 */
export async function paletteFromLogo(url: string): Promise<BrandColors> {
    const { vivid, dark } = await readLogo(url);
    return paletteFromColor(...(vivid ?? hexRgb(DEFAULT_BRAND.colors.accent)), dark);
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/** A logo's most common vivid colour, and whether it is mostly dark. */
async function readLogo(url: string): Promise<{ vivid: [number, number, number] | null; dark: boolean }> {
    // Through a blob URL, so the canvas isn't tainted by the asset protocol's origin (and SVGs load too).
    const blob = await (await fetch(url)).blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(image, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        // Buckets of similar colours (4 bits a channel), scored by how many pixels and how vivid.
        const buckets = new Map<number, { r: number; g: number; b: number; n: number; score: number }>();
        let lightness = 0;
        let opaque = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
            const [, s, l] = toHsl(r, g, b);
            lightness += l;
            opaque++;
            if (s < 0.25 || l < 0.15 || l > 0.92) continue;
            const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
            const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, score: 0 };
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
            bucket.n++;
            bucket.score += s;
            buckets.set(key, bucket);
        }
        const best = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
        return { vivid: best ? [best.r / best.n, best.g / best.n, best.b / best.n] : null, dark: opaque > 0 && lightness / opaque < 0.35 };
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

/** Brand colours around one colour: it becomes the accent, and the background (dark, or light for a dark logo), surface and muted text take its hue. */
function paletteFromColor(r: number, g: number, b: number, light = false): BrandColors {
    const [h, s, l] = toHsl(r, g, b);
    if (light) return { bg: hsl(h, 0.3, 0.97), surface: hsl(h, 0.25, 0.9), text: '#111111', muted: hsl(h, 0.15, 0.38), accent: hsl(h, Math.max(s, 0.55), Math.min(0.48, Math.max(l, 0.35))) };
    // Keep the accent readable on a dark background.
    const accent = hsl(h, Math.max(s, 0.55), Math.min(0.68, Math.max(l, 0.55)));
    return { bg: hsl(h, 0.35, 0.06), surface: hsl(h, 0.3, 0.17), text: '#ffffff', muted: hsl(h, 0.18, 0.72), accent };
}

/** The page's `theme-color` as RGB when it's vivid enough to brand with (any CSS colour, via a canvas). */
function vividColor(css: string): [number, number, number] | null {
    if (!css) return null;
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = '#000001';
    ctx.fillStyle = css;
    const hex = String(ctx.fillStyle);
    if (!/^#[0-9a-f]{6}$/i.test(hex) || hex === '#000001') return null;
    const rgb = hexRgb(hex);
    const [, s, l] = toHsl(...rgb);
    return s < 0.25 || l < 0.15 || l > 0.92 ? null : rgb;
}

/**
 * A brand kit read from a website's home page: its name, a logo (a header image named "logo",
 * else the largest icon), colours from its theme colour or else the logo (light when the logo is
 * dark), and the bundled font its HTML and stylesheets name most. Fetched by the app (no CORS); the HTML is parsed here.
 */
export async function kitFromSite(address: string): Promise<BrandKit> {
    const url = new URL(/^https?:\/\//i.test(address.trim()) ? address.trim() : `https://${address.trim()}`);
    const html = await invoke<string>('fetch_site', { url: url.href });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const meta = (key: string) => doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content')?.trim() ?? '';
    const name = meta('og:site_name') || meta('application-name') || doc.title.split(/\s[|–—·:-]\s/)[0].trim() || url.hostname.replace(/^www\./, '');
    const kit = newBrandKit(name);

    const resolve = (href: string | null | undefined) => {
        try {
            return href ? new URL(href, url).href : null;
        } catch {
            return null;
        }
    };
    const logoImg = doc.querySelector('header img[src*="logo" i], img[alt*="logo" i], img[class*="logo" i], img[src*="logo" i]');
    const icons = [...doc.querySelectorAll('link[rel~="icon"], link[rel^="apple-touch-icon"]')]
        .filter((link) => !/\.ico(\?|$)/i.test(link.getAttribute('href') ?? ''))
        .map((link) => {
            const svg = link.getAttribute('type') === 'image/svg+xml' || /\.svg(\?|$)/i.test(link.getAttribute('href') ?? '');
            const size = Math.max(link.getAttribute('rel')!.startsWith('apple') ? 180 : 0, ...(link.getAttribute('sizes') ?? '').split(/\s+/).map((s) => parseInt(s) || 0));
            return { href: link.getAttribute('href'), rank: svg ? 1000 : size };
        })
        .sort((a, b) => b.rank - a.rank)
        .map((icon) => icon.href);
    const candidates = [...new Set([logoImg?.getAttribute('src'), ...icons, '/apple-touch-icon.png'].map(resolve).filter((href): href is string => !!href && !href.startsWith('data:')))];
    for (const candidate of candidates.slice(0, 5)) {
        try {
            kit.logo = await invoke<string>('import_brand_logo_url', { url: candidate });
            break;
        } catch {
            // Try the next one.
        }
    }

    const logo = kit.logo ? await readLogo(await brandLogoUrl(kit.logo)).catch(() => null) : null;
    const colour = vividColor(meta('theme-color')) ?? logo?.vivid;
    if (colour || logo?.dark) kit.colors = paletteFromColor(...(colour ?? hexRgb(kit.colors.accent)), logo?.dark);

    // Fonts the page and up to 3 of its own stylesheets name (Google Fonts links, font-family, --font
    // variables) that we bundle; the most named wins.
    const sheets = [...doc.querySelectorAll('link[rel~="stylesheet"]')]
        .map((link) => resolve(link.getAttribute('href')))
        .filter((href): href is string => !!href && new URL(href).hostname.endsWith(url.hostname.replace(/^www\./, '')))
        .slice(0, 3);
    const css = await Promise.all(sheets.map((href) => invoke<string>('fetch_site', { url: href }).catch(() => '')));
    const named = [...[html, ...css].join('\n').matchAll(/family=([^&"':]+)|(?:font-family|--[\w-]*font[\w-]*)\s*:\s*([^;"}]+)/gi)]
        .flatMap((m) => (m[1] ?? m[2]).replace(/\+/g, ' ').split(/[,|]/))
        .map((f) => f.replace(/['"]/g, '').trim().toLowerCase());
    const count = (label: string) => named.filter((f) => f === label.toLowerCase()).length;
    const font = SCENE_FONTS.filter((f) => count(f.label)).sort((a, b) => count(b.label) - count(a.label))[0];
    if (font) kit.fonts = { display: font.value, body: font.value };
    return kit;
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
}

function hsl(h: number, s: number, l: number) {
    const a = s * Math.min(l, 1 - l);
    const channel = (n: number) => {
        const k = (n + h / 30) % 12;
        return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
            .toString(16)
            .padStart(2, '0');
    };
    return `#${channel(0)}${channel(8)}${channel(4)}`;
}
