import { invoke } from '@tauri-apps/api/core';

/** What looking at a product's web page found; files are project paths (`images/…`). */
export interface PageCapture {
    title: string;
    description: string;
    themeColor: string;
    text: string;
    hero: string;
    sections: string[];
    /** One tall screenshot of the whole page. */
    full: string | null;
    logo: string | null;
    share: string | null;
}

/** Screenshots, logo, colour and text of a web page, saved in the project's images folder. */
export async function capturePage(projectId: string, url: string): Promise<PageCapture> {
    const report = await invoke<Record<string, unknown>>('studio_capture_url', { url, project: projectId });
    const path = (name: unknown) => (typeof name === 'string' && name ? `images/${name}` : null);
    return {
        title: String(report.title ?? ''),
        description: String(report.description ?? ''),
        themeColor: String(report.themeColor ?? ''),
        text: String(report.text ?? ''),
        hero: path(report.hero) ?? '',
        sections: ((report.sections as unknown[]) ?? []).map(path).filter((p): p is string => !!p),
        full: path(report.full),
        logo: path(report.logo),
        share: path(report.share),
    };
}
