// Ready-made Studio videos for AI chat products: a look (brand colours, fonts, video style) and a
// seven-scene launch story (hook, title, feature words, product reveal, features, promise, call to action).
// Picking one creates the project with these scenes already on the timeline. Every line is placeholder
// copy meant to be edited: none of it is a claim about the product.
import type { TimelineItem } from '../editor/model';
import { newId } from '../editor/model';
import type { BrandKit } from './brandKits';
import { SCENES } from './scenes';
import type { BrandColors } from './scenes/assets';
import type { SceneFont } from './scenes/fonts';
import { applyStyle, STYLES } from './styles';
import { launchStory, STORIES } from './templateStories';

export interface TemplateScene {
    scene: string;
    /** Only what differs from the scene's own defaults. */
    props: Record<string, unknown>;
    /** Seconds; the scene's own length when unset. */
    duration?: number;
}

export interface StudioTemplate {
    id: string;
    name: string;
    blurb: string;
    colors: BrandColors;
    fonts: { display: SceneFont; body: SceneFont };
    background: 'gradient' | 'grain' | 'flow';
    /** A VideoStyle id from styles.ts. */
    style: string;
    scenes: TemplateScene[];
}

const c = (bg: string, surface: string, text: string, muted: string, accent: string): BrandColors => ({ bg, surface, text, muted, accent });

export const TEMPLATES: StudioTemplate[] = [
    {
        id: 'chatgpt', name: 'ChatGPT', blurb: 'Clean and calm: a helpful assistant for everyday questions.',
        colors: c('#0b0f0e', '#16201d', '#f2fbf8', '#8fb1a6', '#10a37f'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'minimal',
        scenes: launchStory(STORIES['chatgpt']),
    },
    {
        id: 'claude', name: 'Claude', blurb: 'Warm and thoughtful: careful reasoning and long documents.',
        colors: c('#faf6f0', '#ffffff', '#2a1f18', '#7a6a5e', '#d97757'), fonts: { display: 'fraunces', body: 'inter' }, background: 'grain', style: 'apple-clean',
        scenes: launchStory(STORIES['claude']),
    },
    {
        id: 'gemini', name: 'Gemini', blurb: 'Bright and expansive: text, images and your Google apps.',
        colors: c('#0b1020', '#1a2140', '#f3f6ff', '#9aa8d6', '#8ab4ff'), fonts: { display: 'plus-jakarta', body: 'plus-jakarta' }, background: 'flow', style: 'smooth',
        scenes: launchStory(STORIES['gemini']),
    },
    {
        id: 'deepseek', name: 'DeepSeek', blurb: 'Sharp and technical: reasoning and code, shown step by step.',
        colors: c('#060b1a', '#0f1c3d', '#eef2ff', '#8d9bc7', '#4d6bfe'), fonts: { display: 'space-grotesk', body: 'inter' }, background: 'flow', style: 'neon-tech',
        scenes: launchStory(STORIES['deepseek']),
    },
    {
        id: 'grok', name: 'Grok', blurb: 'Bold and direct: quick, witty answers on what is happening now.',
        colors: c('#000000', '#141414', '#ffffff', '#9a9a9a', '#e6e6e6'), fonts: { display: 'geist-mono', body: 'inter' }, background: 'grain', style: 'brutalist',
        scenes: launchStory(STORIES['grok']),
    },
    {
        id: 'google', name: 'Google', blurb: 'Open and bright: search, maps and tools that work together.',
        colors: c('#ffffff', '#f1f3f4', '#202124', '#5f6368', '#1a73e8'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'minimal',
        scenes: launchStory(STORIES['google']),
    },
    {
        id: 'microsoft', name: 'Microsoft', blurb: 'Professional and dependable: tools for every team.',
        colors: c('#f3f3f3', '#ffffff', '#1b1b1b', '#616161', '#0078d4'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'editorial',
        scenes: launchStory(STORIES['microsoft']),
    },
    {
        id: 'github', name: 'GitHub', blurb: 'Developer-first: code, collaboration and shipping together.',
        colors: c('#0d1117', '#161b22', '#f0f6fc', '#8b949e', '#2ea043'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'snappy',
        scenes: launchStory(STORIES['github']),
    },
    {
        id: 'notion', name: 'Notion', blurb: 'Quiet and flexible: notes, docs and projects in one workspace.',
        colors: c('#ffffff', '#f7f6f3', '#37352f', '#787774', '#2383e2'), fonts: { display: 'fraunces', body: 'inter' }, background: 'gradient', style: 'apple-clean',
        scenes: launchStory(STORIES['notion']),
    },
    {
        id: 'slack', name: 'Slack', blurb: 'Lively and friendly: conversations that move work forward.',
        colors: c('#3f0e40', '#611f69', '#ffffff', '#d1b4d4', '#ecb22e'), fonts: { display: 'dm-sans', body: 'dm-sans' }, background: 'flow', style: 'energetic',
        scenes: launchStory(STORIES['slack']),
    },
    {
        id: 'figma', name: 'Figma', blurb: 'Creative and collaborative: design together on one canvas.',
        colors: c('#1e1e1e', '#2c2c2c', '#ffffff', '#a3a3a3', '#a259ff'), fonts: { display: 'outfit', body: 'outfit' }, background: 'flow', style: 'bold',
        scenes: launchStory(STORIES['figma']),
    },
    {
        id: 'stripe', name: 'Stripe', blurb: 'Precise and trustworthy: payments that scale with you.',
        colors: c('#0a2540', '#13375c', '#ffffff', '#9fb3c8', '#635bff'), fonts: { display: 'sora', body: 'sora' }, background: 'flow', style: 'cinematic',
        scenes: launchStory(STORIES['stripe']),
    },
    {
        id: 'spotify', name: 'Spotify', blurb: 'Playful and energetic: music for every moment.',
        colors: c('#121212', '#1f1f1f', '#ffffff', '#b3b3b3', '#1db954'), fonts: { display: 'outfit', body: 'outfit' }, background: 'gradient', style: 'vapor',
        scenes: launchStory(STORIES['spotify']),
    },
];

/** A template's brand kit: it becomes the user's own, so it can be edited like any other. */
/** The kit's background colour as the video's backdrop, so nothing of the default pink wallpaper can show behind a scene. */
export const templateBackground = (template: StudioTemplate) => ({ type: 'color' as const, color: template.colors.bg });

export function templateKit(template: StudioTemplate): BrandKit {
    return { id: crypto.randomUUID().slice(0, 8), name: template.name, colors: { ...template.colors }, fonts: { ...template.fonts }, background: template.background };
}

/** The template's scenes as timeline items, in its video style (pace, and soft joins at the ends only). */
export function templateItems(template: StudioTemplate): TimelineItem[] {
    const style = STYLES.find((s) => s.id === template.style) ?? STYLES[0];
    const items: TimelineItem[] = template.scenes.map(({ scene, props, duration }) => ({
        kind: 'scene',
        id: newId(),
        scene,
        props: { ...SCENES[scene].defaultProps, ...props },
        duration: duration ?? SCENES[scene].defaultDuration,
    }));
    return applyStyle(items, style);
}
