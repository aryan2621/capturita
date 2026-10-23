// Built-in looks to start from: a brand kit (colours, fonts, background) paired with a video style.
// Picking one copies it into the user's kits, so it can be edited like any other.
import type { BrandBackground, BrandColors } from './scenes/assets';
import type { SceneFont } from './scenes/fonts';

export interface KitPreset {
    name: string;
    colors: BrandColors;
    fonts: { display: SceneFont; body: SceneFont };
    background: BrandBackground;
    /** A VideoStyle id from styles.ts. */
    style: string;
}

const c = (bg: string, surface: string, text: string, muted: string, accent: string): BrandColors => ({ bg, surface, text, muted, accent });

export const KIT_PRESETS: KitPreset[] = [
    { name: 'Midnight Launch', colors: c('#0b0d17', '#1d2440', '#ffffff', '#9aa3c7', '#6c8cff'), fonts: { display: 'inter', body: 'inter' }, background: 'flow', style: 'cinematic' },
    { name: 'Paper & Ink', colors: c('#f5f1e8', '#ffffff', '#1c1a17', '#6b6459', '#c2410c'), fonts: { display: 'fraunces', body: 'inter' }, background: 'grain', style: 'minimal' },
    { name: 'Neon Arcade', colors: c('#0a0014', '#24103a', '#ffffff', '#b9a6d9', '#ff2bd6'), fonts: { display: 'space-grotesk', body: 'space-grotesk' }, background: 'flow', style: 'energetic' },
    { name: 'Terminal', colors: c('#0b0f0c', '#16201a', '#e6ffe9', '#7fa88a', '#39ff88'), fonts: { display: 'geist-mono', body: 'mono' }, background: 'grain', style: 'snappy' },
    { name: 'Sunset', colors: c('#1a0b1f', '#3a1640', '#fff4ee', '#d2a9c4', '#ff7a45'), fonts: { display: 'outfit', body: 'outfit' }, background: 'flow', style: 'smooth' },
    { name: 'Nordic Frost', colors: c('#eef3f7', '#ffffff', '#132033', '#5b6b80', '#2f6fde'), fonts: { display: 'manrope', body: 'manrope' }, background: 'gradient', style: 'minimal' },
    { name: 'Forest', colors: c('#0f1a14', '#1d2e24', '#effaf2', '#9cb8a6', '#7bd389'), fonts: { display: 'dm-sans', body: 'dm-sans' }, background: 'grain', style: 'dreamy' },
    { name: 'Luxe Gold', colors: c('#0d0b08', '#1f1a12', '#f5efe0', '#b5a98e', '#d4af37'), fonts: { display: 'playfair', body: 'inter' }, background: 'grain', style: 'cinematic' },
    { name: 'Citrus Pop', colors: c('#fff8e6', '#ffffff', '#1f1300', '#7a6440', '#ff5a1f'), fonts: { display: 'bricolage', body: 'dm-sans' }, background: 'gradient', style: 'energetic' },
    { name: 'Deep Ocean', colors: c('#04172b', '#0b2c4a', '#eafaff', '#8fb3cc', '#22d3ee'), fonts: { display: 'sora', body: 'sora' }, background: 'flow', style: 'smooth' },
    { name: 'Editorial', colors: c('#ffffff', '#f2f2f2', '#111111', '#666666', '#e11d48'), fonts: { display: 'fraunces', body: 'inter' }, background: 'gradient', style: 'editorial' },
    { name: 'Lavender', colors: c('#f4f0ff', '#ffffff', '#241b3a', '#6d6285', '#7c3aed'), fonts: { display: 'plus-jakarta', body: 'plus-jakarta' }, background: 'gradient', style: 'dreamy' },
    { name: 'Crimson', colors: c('#12070a', '#2a0f15', '#fff0f2', '#c79aa3', '#ff3b5c'), fonts: { display: 'space-grotesk', body: 'inter' }, background: 'grain', style: 'bold' },
    { name: 'Fintech Trust', colors: c('#f7f9fc', '#ffffff', '#0f172a', '#64748b', '#0f9d75'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'minimal' },
    { name: 'Retro Film', colors: c('#1b1712', '#2c251c', '#f3e9d2', '#b3a68a', '#e8a33d'), fonts: { display: 'fraunces', body: 'dm-sans' }, background: 'grain', style: 'cinematic' },
    { name: 'Electric Lime', colors: c('#101010', '#1c1c1c', '#f5f5f5', '#a3a3a3', '#c6ff00'), fonts: { display: 'outfit', body: 'outfit' }, background: 'gradient', style: 'snappy' },
    { name: 'Coral Reef', colors: c('#fff4f1', '#ffffff', '#2b1612', '#80625b', '#ff5f57'), fonts: { display: 'manrope', body: 'manrope' }, background: 'flow', style: 'smooth' },
    { name: 'Slate Pro', colors: c('#111418', '#1b2027', '#eef2f7', '#94a0b0', '#8ab4ff'), fonts: { display: 'manrope', body: 'geist-mono' }, background: 'gradient', style: 'editorial' },
];
