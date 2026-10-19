// What every scene receives besides its own props, injected by the preview (SceneLayer) and the
// export (renderScenes) alike. Kept free of app code: the studio renderer bundles this file too.
import { fontStack, type SceneFont } from './fonts';

export interface BrandColors {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
}

/** A brand kit as scenes see it. */
export interface Brand {
    colors: BrandColors;
    fonts: { display: SceneFont; body: SceneFont };
    /** Project-relative path of the logo, if the kit has one. */
    logo?: string;
}

export const DEFAULT_BRAND: Brand = {
    colors: { bg: '#0b0d17', surface: '#1d2440', text: '#ffffff', muted: '#9aa3c7', accent: '#6c8cff' },
    fonts: { display: 'inter', body: 'inter' },
};

/** The project's screen recording, for scenes that show it. */
export interface RecordingInfo {
    /** Project-relative path of the screen video. */
    file: string;
    /** Seconds from the start of the recording to the file's first frame (Track.offset). */
    offset: number;
    width: number;
    height: number;
}

/**
 * Where project files are served from: `asset://…` in the preview, the renderer's local http
 * server in exports. Not part of a scene's look, so it's left out of the render cache hash.
 */
export interface SceneAssets {
    base: string;
    /** Files to load in place of others in the preview only (the smooth 1080p screen copy). */
    alias?: Record<string, string>;
}

export interface SceneEnv {
    brand: Brand;
    recording: RecordingInfo;
    assets: SceneAssets;
}

/** URL of a project file. Both bases expect the whole path encoded, `/` included. */
export const assetUrl = (assets: SceneAssets, file: string) => `${assets.base}${encodeURIComponent(`/${assets.alias?.[file] ?? file}`)}`;

export const displayFont = (brand: Brand) => fontStack(brand.fonts.display);
export const bodyFont = (brand: Brand) => fontStack(brand.fonts.body);

/** A part of the recording, in source seconds (the timeline's clip times). */
export interface Segment {
    start: number;
    end: number;
}

/** A rectangle normalized 0–1 to the recorded area (the same space as cursor positions). */
export interface TargetRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
