// AI scene generation: turns a request ("make a launch intro", "make the title shorter") into
// scene proposals to review. Three steps, each small enough for a local 4B model:
//   1. plan: rules first, then a JSON-schema call whose scene ids and targets are closed enums
//   2. fill: one call per scene, its schema built from the scene's fields, with the rule sheet and
//      an example on every call
//   3. check: value rules, then a dry render of the middle frame (text off the frame or cut off,
//      empty frame); up to 3 silent retries that quote the exact problems, the last from scratch
// Recording segments and callout targets are never written by the model: they come from the
// playhead and the recorded clicks (initialSceneProps), like a scene added by hand.
import { invoke } from '@tauri-apps/api/core';
import { Thumbnail } from '@remotion/player';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { CursorData, Project } from '../lib/api';
import { DEFAULT_CROSSFADE, insertScene, newId, recordingCaptions, totalDuration, type Edit, type OverlayClip, type SceneClip, type TimelineItem, type Transition } from '../editor/model';
import { canBeOverlay, canBeScene, SCENE_FPS, SCENES, sceneLabel, type ListItemField, type SceneField } from './scenes';
import type { SceneEnv, Segment, TargetRect } from './scenes/assets';
import { initialSceneProps, recordingRange, sceneInputProps } from './sceneEnv';

export type Placement = 'start' | 'playhead' | 'end' | 'over';

export interface SceneChange {
    label: string;
    before?: string;
    after: string;
}

/** One proposed scene, added or changed, shown with a checkbox before it's applied. */
export interface SceneProposal {
    id: string;
    action: 'add' | 'edit';
    scene: string;
    /** The scene or overlay an edit changes. */
    targetId?: string;
    /** Whether the new or changed piece is a timeline scene or an overlay. */
    layer: 'scene' | 'overlay';
    placement: Placement;
    purpose: string;
    /** The complete props to store. */
    props: Record<string, unknown>;
    changes: SceneChange[];
    /** Labels of settings changed by hand that the edit kept. */
    kept: string[];
    /** Problems left after every retry; such a proposal can't be applied. */
    errors: string[];
}

export interface SceneAiContext {
    edit: Edit;
    project: Project;
    cursor: CursorData | null;
    env: SceneEnv;
    /** Export size, so the dry check lays scenes out like the video. */
    size: { width: number; height: number };
    productName: string;
    /** Output time new playhead scenes and overlays go at. */
    playhead: number;
    onStep?: (label: string) => void;
}

const MAX_STEPS = 6;
const RETRIES = 3;

// ---- Per-scene knowledge: text limits, required fields, a one-line guide and one example ----

/** Characters a text may have, by `Scene.field` or `Scene.list.field`. */
const TEXT_LIMITS: Record<string, number> = {
    'LogoSting.wordmark': 18,
    'LogoSting.tagline': 48,
    'TitleReveal.eyebrow': 24,
    'TitleReveal.title': 36,
    'TitleReveal.subtitle': 70,
    'KineticStatement.lines.text': 28,
    'KineticStatement.emphasis': 40,
    'DeviceShowcase.headline': 40,
    'DeviceShowcase.detail': 80,
    'DeviceShowcase.url': 32,
    'FeatureCallout.label': 32,
    'FeatureCallout.detail': 70,
    'StatCounter.heading': 40,
    'StatCounter.stats.label': 26,
    'StatCounter.stats.prefix': 3,
    'StatCounter.stats.suffix': 3,
    'StatCounter.chartData.label': 8,
    'LowerThird.name': 28,
    'LowerThird.title': 40,
    'EndCard.headline': 36,
    'EndCard.cta': 18,
    'EndCard.url': 32,
    'EndCard.socials.handle': 24,
};
const DEFAULT_LIMIT = 60;

/** Texts that can't be empty. */
const REQUIRED = new Set(['TitleReveal.title', 'KineticStatement.lines.text', 'FeatureCallout.label', 'StatCounter.stats.label', 'LowerThird.name', 'EndCard.headline', 'EndCard.cta']);

/** Default texts that mean "fill me in"; the model must not leave them. */
const PLACEHOLDERS = ['your product', 'yourproduct.com', '@yourproduct', 'your name', 'founder, your product', 'one line about what it does'];

const GUIDES: Record<string, string> = {
    LogoSting: 'The brand logo appears with a hit (2–3 s), for the very start. The wordmark is only for a logo without its name in it; usually "". Tagline optional.',
    TitleReveal: 'A full-screen title card: small eyebrow, big title, one-line subtitle. For the opening or a chapter.',
    KineticStatement: 'One bold statement, 1–4 short lines animated word by word. Accent words must appear in the lines.',
    DeviceShowcase: 'The recording plays inside a laptop, browser or window, with a headline beside or below it.',
    FeatureCallout: 'Zooms into the recording and points at one control with a label and a one-line detail.',
    StatCounter: '1–3 numbers counting up, each with a short label; optional chart. Only numbers the user gave.',
    LowerThird: 'Name and role of the person speaking, drawn over the video.',
    EndCard: 'The closing card: headline, call-to-action button, web address, optional QR code and social handles.',
};

const EXAMPLES: Record<string, Record<string, unknown>> = {
    LogoSting: { style: 'pop', wordmark: '', tagline: 'Notes that write themselves', burst: true },
    TitleReveal: { eyebrow: 'Introducing', title: 'Acme Notes 2.0', subtitle: 'Meeting notes that write themselves' },
    KineticStatement: { lines: [{ text: 'Meetings end.' }, { text: 'Notes are done.' }], emphasis: 'done', style: 'punch' },
    DeviceShowcase: { device: 'browser', placement: 'side', headline: 'Your whole team, one page', detail: 'Live notes everyone can edit', url: 'acmenotes.com' },
    FeatureCallout: { motion: 'still', label: 'One-click summary', detail: 'Turns an hour of talk into five bullet points.' },
    StatCounter: {
        heading: 'Teams love it',
        stats: [
            { value: 12000, label: 'Teams on board', prefix: '', suffix: '+', format: 'compact' },
            { value: 98, label: 'Would recommend', prefix: '', suffix: '', format: 'percent' },
        ],
        chart: 'none',
        chartData: [],
    },
    LowerThird: { name: 'Maya Chen', title: 'Founder, Acme Notes', side: 'left', logo: true },
    EndCard: { headline: 'Try Acme Notes free', cta: 'Get started', url: 'acmenotes.com', showQr: true, socials: [{ network: 'x', handle: '@acmenotes' }] },
};

const limitOf = (key: string) => TEXT_LIMITS[key] ?? DEFAULT_LIMIT;

/** Fields the model writes. Segments and targets come from the recording instead. */
const modelFields = (scene: string) => SCENES[scene].fields.filter((f) => f.type !== 'segment' && f.type !== 'rect');

// ---- Calling the model ----

async function callModel<T>(system: string, user: string, schema: object, temperature: number, maxTokens: number): Promise<T> {
    return invoke<T>('ai_edit', { request: { system, user, schema, temperature, max_tokens: maxTokens } });
}

const isUnreadable = (error: unknown) => String((error as { message?: string })?.message ?? error).includes("couldn't be read");

// ---- 1. Plan ----

interface PlanStep {
    action: 'add' | 'edit';
    scene: string;
    target: string;
    placement: Placement;
    purpose: string;
}

/** A scene or overlay already in the video, under a short id the model can name. */
interface Existing {
    ref: string;
    id: string;
    scene: string;
    layer: 'scene' | 'overlay';
    props: Record<string, unknown>;
    ai?: Record<string, unknown>;
    duration: number;
}

function existingPieces(edit: Edit): Existing[] {
    const scenes = edit.items.filter((i): i is SceneClip => i.kind === 'scene').map((s) => ({ id: s.id, scene: s.scene, layer: 'scene' as const, props: s.props, ai: s.ai, duration: s.duration }));
    const overlays = edit.overlays.map((o) => ({ id: o.id, scene: o.scene, layer: 'overlay' as const, props: o.props, ai: o.ai, duration: o.duration }));
    return [...scenes, ...overlays].filter((p) => SCENES[p.scene]).map((p, i) => ({ ...p, ref: `s${i + 1}` }));
}

/** The texts of a scene's props, short, for prompts and the review list. */
function textsOf(scene: string, props: Record<string, unknown>) {
    const all = { ...SCENES[scene]?.defaultProps, ...props };
    const out: string[] = [];
    for (const field of SCENES[scene]?.fields ?? []) {
        const value = all[field.name];
        if (field.type === 'text' && typeof value === 'string' && value.trim()) out.push(`${field.name}="${value.trim()}"`);
        if (field.type === 'list' && Array.isArray(value)) {
            const texts = value.flatMap((row) => field.item.filter((f) => f.type === 'text').map((f) => (row as Record<string, unknown>)[f.name])).filter((v) => typeof v === 'string' && v.trim());
            if (texts.length) out.push(`${field.name}=[${texts.map((t) => `"${t}"`).join(', ')}]`);
        }
    }
    return out.join(' ');
}

/** Words that point at a scene kind; hints for the plan, and enough on their own for simple requests. */
const KEYWORDS: [RegExp, string][] = [
    [/\blogo\b|\bsting\b|brand reveal/i, 'LogoSting'],
    [/\btitle\b|title card|\bintro\b|opening/i, 'TitleReveal'],
    [/kinetic|statement|tagline|slogan|big text|bold text/i, 'KineticStatement'],
    [/device|laptop|macbook|browser|mock-?up|showcase/i, 'DeviceShowcase'],
    [/call-?out|highlight|point (at|to)|spotlight|this button|the button/i, 'FeatureCallout'],
    [/\bstats?\b|numbers?|metric|percent|%|counter|chart|growth/i, 'StatCounter'],
    [/lower third|name tag|name and (title|role)|speaker|presenter/i, 'LowerThird'],
    [/end card|endcard|outro|call to action|\bcta\b|closing|sign ?up|\bqr\b/i, 'EndCard'],
];
const ADD_WORDS = /\b(add|insert|create|make an?|put|new|generate|build)\b/i;
const EDIT_WORDS = /\b(change|shorten|shorter|longer|rename|replace|update|fix|swap|reword|rewrite|use|set|turn)\b|\bmake (the|it)\b/i;

const defaultPlacement = (scene: string): Placement => (SCENES[scene].use === 'overlay' ? 'over' : scene === 'LogoSting' || scene === 'TitleReveal' ? 'start' : scene === 'EndCard' ? 'end' : 'playhead');

/** Plans a simple request without the model: one named kind and an obvious verb. */
function rulePlan(request: string, existing: Existing[]): PlanStep[] | null {
    const kinds = [...new Set(KEYWORDS.filter(([re]) => re.test(request)).map(([, scene]) => scene))];
    if (kinds.length !== 1) return null;
    const scene = kinds[0];
    const matches = existing.filter((p) => p.scene === scene);
    const adding = ADD_WORDS.test(request);
    const editing = EDIT_WORDS.test(request);
    if (editing && !adding && matches.length === 1) return [{ action: 'edit', scene, target: matches[0].ref, placement: 'playhead', purpose: request }];
    if (adding && !editing) return [{ action: 'add', scene, target: 'new', placement: defaultPlacement(scene), purpose: request }];
    return null;
}

const PLAN_SYSTEM = `You plan motion-graphics scenes for a product launch video made from a screen recording. You get the scene kinds, the scenes already in the video (with ids), and a request.
List the steps that fulfil the request:
- action "add": a new scene of kind "scene"; "target" is "new". "placement": start (before the recording: logos, titles), end (after it: end cards), playhead (inside the video where the user is: callouts, stats, statements, device showcases), over (drawn over the video; only kinds marked overlay).
- action "edit": change an existing scene; "target" is its id from the list and "scene" its kind.
"purpose" is one sentence saying what this scene should say or show, using the request's own words and facts.
Rules: do only what the request asks. At most ${MAX_STEPS} steps. Only use ids from the list. A request about "the title", "the end card" and so on, with one such scene in the video, is an edit of it. A whole launch video is usually LogoSting (start), TitleReveal (start), FeatureCallout (playhead), StatCounter (playhead, only if the request gives numbers), EndCard (end). If nothing fits, give no steps and say why in "summary". The summary is one short sentence.`;

async function planSteps(request: string, ctx: SceneAiContext, existing: Existing[]): Promise<{ steps: PlanStep[]; summary: string }> {
    const ruled = rulePlan(request, existing);
    if (ruled) return { steps: ruled, summary: '' };
    const kinds = Object.keys(SCENES);
    const kindList = kinds.map((id) => `- ${id}${canBeOverlay(id) ? (canBeScene(id) ? ' (scene or overlay)' : ' (overlay only)') : ''}: ${GUIDES[id] ?? SCENES[id].label}`).join('\n');
    const inVideo = existing.length ? existing.map((p) => `- ${p.ref}: ${p.scene} (${p.layer}) ${textsOf(p.scene, p.props)}`).join('\n') : '(none)';
    const hints = [...new Set(KEYWORDS.filter(([re]) => re.test(request)).map(([, scene]) => scene))];
    const user = `Scene kinds:\n${kindList}\n\nScenes in the video:\n${inVideo}\n\nProduct: ${ctx.productName || 'unknown'}${hints.length ? `\nThe request mentions: ${hints.join(', ')}` : ''}\n\nRequest: ${request}`;
    const schema = {
        type: 'object',
        properties: {
            steps: {
                type: 'array',
                maxItems: MAX_STEPS,
                items: {
                    type: 'object',
                    properties: {
                        action: { type: 'string', enum: ['add', 'edit'] },
                        scene: { type: 'string', enum: kinds },
                        target: { type: 'string', enum: ['new', ...existing.map((p) => p.ref)] },
                        placement: { type: 'string', enum: ['start', 'playhead', 'end', 'over'] },
                        purpose: { type: 'string', maxLength: 200 },
                    },
                    required: ['action', 'scene', 'target', 'placement', 'purpose'],
                },
            },
            summary: { type: 'string', maxLength: 200 },
        },
        required: ['steps', 'summary'],
    };
    let answer: { steps: PlanStep[]; summary: string } | null = null;
    for (let attempt = 0; attempt < 2 && !answer; attempt++) {
        try {
            answer = await callModel(PLAN_SYSTEM, user, schema, 0.2, 700);
        } catch (error) {
            if (!isUnreadable(error) || attempt === 1) throw error;
        }
    }
    return { steps: tidyPlan(answer?.steps ?? [], existing), summary: answer?.summary ?? '' };
}

/** Makes a plan consistent: edits name a real piece (and take its kind), overlays only where allowed. */
function tidyPlan(steps: PlanStep[], existing: Existing[]): PlanStep[] {
    const out: PlanStep[] = [];
    const edited = new Set<string>();
    for (const step of steps.slice(0, MAX_STEPS)) {
        const target = existing.find((p) => p.ref === step.target);
        if (step.action === 'edit' || target) {
            if (!target || edited.has(target.ref)) continue;
            edited.add(target.ref);
            out.push({ ...step, action: 'edit', scene: target.scene, target: target.ref });
            continue;
        }
        if (!SCENES[step.scene]) continue;
        let placement = step.placement;
        if (!canBeScene(step.scene)) placement = 'over';
        else if (placement === 'over' && !canBeOverlay(step.scene)) placement = 'playhead';
        out.push({ ...step, action: 'add', target: 'new', placement });
    }
    return out;
}

// ---- 2. Fill ----

function itemSchema(scene: string, list: string, fields: ListItemField[]) {
    const properties: Record<string, object> = {};
    for (const f of fields) properties[f.name] = valueSchema(`${scene}.${list}.${f.name}`, f);
    return { type: 'object', properties, required: fields.map((f) => f.name) };
}

function valueSchema(key: string, field: SceneField | ListItemField): object {
    switch (field.type) {
        case 'text':
            // A hard cap only well above the limit: cutting the model off mid-word reads worse than a retry.
            return { type: 'string', ...(REQUIRED.has(key) ? { minLength: 1 } : {}), maxLength: Math.ceil(limitOf(key) * 1.6) };
        case 'color':
            return { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
        case 'boolean':
            return { type: 'boolean' };
        case 'number':
            return { type: 'number' };
        case 'choice':
            return { type: 'string', enum: field.options.map((o) => o.value) };
        case 'list': {
            const [scene, name] = key.split('.');
            return { type: 'array', items: itemSchema(scene, name, field.item), ...(field.min ? { minItems: field.min } : {}), maxItems: field.max };
        }
        default:
            return { type: 'string' };
    }
}

function propsSchema(scene: string) {
    const fields = modelFields(scene);
    const properties: Record<string, object> = {};
    for (const f of fields) properties[f.name] = valueSchema(`${scene}.${f.name}`, f);
    return { type: 'object', properties, required: fields.map((f) => f.name) };
}

function describeField(scene: string, field: SceneField): string {
    const key = `${scene}.${field.name}`;
    const text = (k: string) => `text, at most ${limitOf(k)} characters${REQUIRED.has(k) ? '' : ', may be ""'}`;
    switch (field.type) {
        case 'text':
            return `- ${field.name} (${field.label}): ${text(key)}`;
        case 'choice':
            return `- ${field.name} (${field.label}): one of ${field.options.map((o) => `"${o.value}" (${o.label})`).join(', ')}`;
        case 'list': {
            const cells = field.item.map((f) =>
                f.type === 'text' ? `${f.name}: ${text(`${key}.${f.name}`)}` : f.type === 'choice' ? `${f.name}: one of ${f.options.map((o) => `"${o.value}"`).join('/')}` : `${f.name}: number`
            );
            return `- ${field.name} (${field.label}): ${field.min ?? 0}–${field.max} entries of { ${cells.join('; ')} }`;
        }
        default:
            return `- ${field.name} (${field.label}): ${field.type}`;
    }
}

const FILL_SYSTEM = `You write the settings of one motion-graphics scene in a product launch video. Answer with the scene's settings as JSON.
Rules:
- Short, concrete, confident launch copy. No emoji, hashtags or surrounding quotes.
- Every text fits its character limit; shorter is better. Never cut a word to fit: rephrase.
- Use facts from the request, the purpose and the transcript only. Never invent numbers, names, prices, web addresses or handles; leave such a text "" when it may be empty, and never write placeholders like "Your product" or "yourproduct.com".
- Choices use only the listed values. Lists stay within their entry counts.
- When editing, change only what the request is about and copy every other setting unchanged.`;

function fillPrompt(step: PlanStep, request: string, ctx: SceneAiContext, current: Record<string, unknown> | null, userOwned: string[]) {
    const { scene } = step;
    const transcript = recordingCaptions(ctx.edit.captions.items)
        .map((c) => c.text)
        .join(' ')
        .slice(0, 1200);
    const shape = ctx.size.width / ctx.size.height;
    const aspect = shape < 0.95 ? 'portrait (phone): keep texts especially short' : shape < 1.3 ? 'square-ish: keep texts short' : 'landscape';
    const visible = (props: Record<string, unknown>) => Object.fromEntries(modelFields(scene).map((f) => [f.name, props[f.name]]));
    return [
        `Scene kind: ${scene} (${sceneLabel(scene)}). ${GUIDES[scene] ?? ''}`,
        `Settings:\n${modelFields(scene)
            .map((f) => describeField(scene, f))
            .join('\n')}`,
        `Example of good settings for this kind (a made-up product):\n${JSON.stringify(EXAMPLES[scene] ?? visible(SCENES[scene].defaultProps))}`,
        `Product: ${ctx.productName || 'unknown'}. Video: ${aspect}.`,
        transcript ? `What the presenter says in the recording (start):\n${transcript}` : '',
        current ? `Current settings:\n${JSON.stringify(visible(current))}` : '',
        current && userOwned.length ? `The user set these by hand; keep them unless the request is about them: ${userOwned.join(', ')}` : '',
        `Request: ${request}`,
        `This scene's purpose: ${step.purpose}`,
    ]
        .filter(Boolean)
        .join('\n\n');
}

// ---- 3. Check ----

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Trims texts and drops quotes the model wrapped them in; fills missing settings from `base`. */
function clean(scene: string, raw: Record<string, unknown>, base: Record<string, unknown>) {
    const tidy = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/^["“'](.*)["”']$/s, '$1').trim() : v);
    const out: Record<string, unknown> = {};
    for (const field of modelFields(scene)) {
        const value = raw?.[field.name];
        if (value === undefined) out[field.name] = base[field.name];
        else if (field.type === 'list' && Array.isArray(value)) out[field.name] = value.map((row) => Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([k, v]) => [k, tidy(v)])));
        else out[field.name] = tidy(value);
    }
    // An end card without an address has nothing to put in a QR code.
    if (scene === 'EndCard' && !str(out.url)) out.showQr = false;
    return out;
}

function checkText(key: string, name: string, value: unknown, errors: string[]) {
    if (typeof value !== 'string') return errors.push(`${name} must be text.`);
    if (REQUIRED.has(key) && !value.trim()) return errors.push(`${name} can't be empty.`);
    if (value.length > limitOf(key)) errors.push(`${name} is ${value.length} characters; the limit is ${limitOf(key)}. Rephrase it shorter.`);
    if (PLACEHOLDERS.includes(value.trim().toLowerCase())) errors.push(`${name} is the placeholder "${value}"; write a real one or leave it "".`);
}

/** Value rules on the settings the model wrote (`only`), plus the recording parts of `props`. */
export function validateProps(scene: string, props: Record<string, unknown>, project: Project, only?: Set<string>): string[] {
    const errors: string[] = [];
    const range = recordingRange(project);
    for (const field of SCENES[scene].fields) {
        if (only && !only.has(field.name) && field.type !== 'segment' && field.type !== 'rect') continue;
        const key = `${scene}.${field.name}`;
        const value = props[field.name];
        switch (field.type) {
            case 'text':
                checkText(key, `"${field.name}"`, value, errors);
                break;
            case 'color':
                if (!/^#[0-9a-f]{6}$/i.test(str(value))) errors.push(`"${field.name}" must be a colour like #1a2b3c.`);
                break;
            case 'boolean':
                if (typeof value !== 'boolean') errors.push(`"${field.name}" must be true or false.`);
                break;
            case 'number':
                if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`"${field.name}" must be a number.`);
                break;
            case 'choice':
                if (!field.options.some((o) => o.value === value)) errors.push(`"${field.name}" must be one of ${field.options.map((o) => `"${o.value}"`).join(', ')}.`);
                break;
            case 'list': {
                if (!Array.isArray(value)) {
                    errors.push(`"${field.name}" must be a list.`);
                    break;
                }
                if (value.length < (field.min ?? 0) || value.length > field.max) errors.push(`"${field.name}" has ${value.length} entries; it needs ${field.min ?? 0}–${field.max}.`);
                value.forEach((row, i) => {
                    const entry = (row ?? {}) as Record<string, unknown>;
                    for (const cell of field.item) {
                        const name = `"${field.name}"[${i + 1}].${cell.name}`;
                        const v = entry[cell.name];
                        if (cell.type === 'text') checkText(`${key}.${cell.name}`, name, v, errors);
                        else if (cell.type === 'number' && (typeof v !== 'number' || !Number.isFinite(v))) errors.push(`${name} must be a number.`);
                        else if (cell.type === 'choice' && !cell.options.some((o) => o.value === v)) errors.push(`${name} must be one of ${cell.options.map((o) => `"${o.value}"`).join(', ')}.`);
                    }
                });
                break;
            }
            case 'segment': {
                const s = value as Segment | undefined;
                if (!s || !(s.start >= range.start - 0.01) || !(s.end <= range.end + 0.01) || !(s.end - s.start >= 0.5)) errors.push(`"${field.name}" must be a part of the recording at least 0.5 s long.`);
                break;
            }
            case 'rect': {
                const r = value as TargetRect | undefined;
                const inside = r && r.x >= 0 && r.y >= 0 && r.width >= 0.01 && r.height >= 0.01 && r.x + r.width <= 1.001 && r.y + r.height <= 1.001;
                if (!inside) errors.push(`"${field.name}" must lie inside the recording.`);
                break;
            }
        }
    }
    // Scene rules the field types can't express.
    if (scene === 'KineticStatement' && (!only || only.has('emphasis'))) {
        const lines = (Array.isArray(props.lines) ? props.lines : []).map((l) => str((l as Record<string, unknown>).text).toLowerCase()).join(' ');
        const missing = str(props.emphasis)
            .split(',')
            .map((w) => w.trim())
            .filter((w) => w && !lines.includes(w.toLowerCase()));
        if (missing.length) errors.push(`Accent words not in the lines: ${missing.map((w) => `"${w}"`).join(', ')}. Use words from the lines.`);
    }
    if (scene === 'StatCounter' && (!only || only.has('stats'))) {
        for (const [i, stat] of (Array.isArray(props.stats) ? props.stats : []).entries()) {
            const s = stat as Record<string, unknown>;
            if (s.format === 'percent' && (Number(s.value) < 0 || Number(s.value) > 100)) errors.push(`"stats"[${i + 1}] is a percent, so its value must be 0–100.`);
        }
    }
    if (scene === 'StatCounter' && props.chart !== 'none' && (!Array.isArray(props.chartData) || props.chartData.length < 2)) errors.push('A chart needs at least 2 "chartData" points, or set "chart" to "none".');
    return errors;
}

const shortText = (text: string) => (text.length > 40 ? `${text.slice(0, 38)}…` : text);

/** Text of an element itself, not of its children. */
const ownText = (el: Element) =>
    [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim();

/**
 * Draws the scene's middle frame offscreen at a small size and looks for text that runs off the
 * frame or is cut off, and for an empty frame. Returns the problems, worded for the model.
 */
export async function dryCheck(scene: string, props: Record<string, unknown>, duration: number, ctx: SceneAiContext, overlay: boolean): Promise<string[]> {
    const definition = SCENES[scene];
    const width = 480;
    const height = Math.round((width * ctx.size.height) / ctx.size.width);
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:${height}px;overflow:hidden;pointer-events:none;`;
    document.body.appendChild(host);
    const root = createRoot(host);
    const problems: string[] = [];
    const frames = Math.max(2, Math.round(duration * SCENE_FPS));
    try {
        root.render(
            createElement(Thumbnail, {
                component: definition.component,
                inputProps: sceneInputProps({ scene, props }, ctx.env, overlay),
                compositionWidth: ctx.size.width,
                compositionHeight: ctx.size.height,
                durationInFrames: frames,
                fps: SCENE_FPS,
                frameToDisplay: Math.floor(frames / 2),
                style: { width, height },
                errorFallback: ({ error }: { error: Error }) => {
                    problems.push(`The scene failed to draw: ${error.message}`);
                    return null;
                },
            })
        );
        // Let React commit, fonts load and layout settle; never wait long.
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 150));
        if (problems.length) return problems;

        const frame = host.getBoundingClientRect();
        const slack = 2;
        let visible = 0;
        for (const el of host.querySelectorAll('*')) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) continue;
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
            const text = ownText(el);
            if (!text) {
                if (['IMG', 'VIDEO', 'CANVAS', 'svg'].includes(el.tagName)) visible++;
                continue;
            }
            visible++;
            if (rect.left < frame.left - slack || rect.right > frame.right + slack || rect.top < frame.top - slack || rect.bottom > frame.bottom + slack) {
                problems.push(`The text "${shortText(text)}" runs off the frame. Make it shorter.`);
            } else if (el instanceof HTMLElement && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && style.overflowX !== 'visible') {
                problems.push(`The text "${shortText(text)}" is cut off. Make it shorter.`);
            }
        }
        if (visible === 0) problems.push('The frame is empty in the middle of the scene.');
    } finally {
        root.unmount();
        host.remove();
    }
    return [...new Set(problems)];
}

// ---- Putting it together ----

const deepEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Words in a request that name a setting (its name or label), so a hand edit there can be overwritten. */
function mentions(request: string, field: SceneField) {
    const text = request.toLowerCase();
    const words = [field.name, ...field.label.toLowerCase().split(/[^a-z]+/)].filter((w) => w.length > 2);
    return words.some((w) => text.includes(w.toLowerCase()));
}

function formatValue(field: SceneField, value: unknown): string {
    if (field.type === 'list' && Array.isArray(value)) {
        const texts = value.map((row) =>
            field.item
                .map((f) => (row as Record<string, unknown>)[f.name])
                .filter((v) => v !== '' && v !== undefined)
                .join(' ')
        );
        return texts.join(' · ');
    }
    if (field.type === 'choice') return field.options.find((o) => o.value === value)?.label ?? String(value);
    if (field.type === 'boolean') return value ? 'On' : 'Off';
    return String(value ?? '');
}

/** One scene of the plan: fill, check, retry. */
async function fillStep(step: PlanStep, request: string, ctx: SceneAiContext, existing: Existing[]): Promise<SceneProposal> {
    const { scene } = step;
    const definition = SCENES[scene];
    const target = step.action === 'edit' ? existing.find((p) => p.ref === step.target) : undefined;
    const layer = target?.layer ?? (step.placement === 'over' ? 'overlay' : 'scene');
    const current = target ? { ...definition.defaultProps, ...target.props } : null;
    // Where a new scene goes decides which part of the recording it shows.
    const total = totalDuration(ctx.edit.items);
    const at = step.placement === 'start' ? 0 : step.placement === 'end' ? Math.max(0, total - 0.01) : Math.min(ctx.playhead, Math.max(0, total - 0.01));
    const base = current ?? initialSceneProps(scene, ctx.edit.items, at, ctx.project, ctx.cursor);
    const duration = target?.duration ?? definition.defaultDuration;

    // Settings that differ from what the AI last wrote (or from the defaults) were changed by hand.
    const aiBaseline = target?.ai ?? definition.defaultProps;
    const fields = modelFields(scene);
    const userOwned = current ? fields.filter((f) => !deepEqual(current[f.name], aiBaseline[f.name])) : [];
    const keep = userOwned.filter((f) => !mentions(request, f));

    const schema = propsSchema(scene);
    const prompt = fillPrompt(step, request, ctx, current, userOwned.map((f) => f.name));
    const written = new Set(fields.filter((f) => !keep.includes(f)).map((f) => f.name));
    type Attempt = { props: Record<string, unknown>; errors: string[] };
    let last = null as Attempt | null;

    for (let attempt = 0; attempt <= RETRIES; attempt++) {
        const fresh = attempt === RETRIES;
        const previous = last;
        const feedback = !previous
            ? ''
            : fresh
            ? `\n\nEarlier answers had these problems:\n${previous.errors.map((e) => `- ${e}`).join('\n')}\nWrite the whole settings object again from scratch, avoiding them.`
            : `\n\nYour last answer:\n${JSON.stringify(Object.fromEntries(fields.map((f) => [f.name, previous.props[f.name]])))}\nProblems:\n${previous.errors.map((e) => `- ${e}`).join('\n')}\nFix exactly these problems and answer again.`;
        let raw: Record<string, unknown>;
        try {
            raw = await callModel(FILL_SYSTEM, prompt + feedback, schema, fresh ? 0.6 : attempt === 0 ? 0.5 : 0.3, 900);
        } catch (error) {
            if (!isUnreadable(error)) throw error;
            last = { props: previous?.props ?? base, errors: ['The answer was cut off before it ended. Keep every text short.'] };
            continue;
        }
        const answer = clean(scene, raw, base);
        for (const f of keep) answer[f.name] = current![f.name];
        const props = { ...base, ...answer };
        let errors = validateProps(scene, props, ctx.project, written);
        if (!errors.length) errors = await dryCheck(scene, props, duration, ctx, layer === 'overlay');
        last = { props, errors };
        if (!errors.length) break;
    }

    const props = last!.props;
    const changes: SceneChange[] = [];
    for (const field of fields) {
        if (current && deepEqual(current[field.name], props[field.name])) continue;
        const after = formatValue(field, props[field.name]);
        if (!current && !after) continue;
        changes.push({ label: field.label, ...(current ? { before: formatValue(field, current[field.name]) } : {}), after });
    }
    return {
        id: newId(),
        action: step.action,
        scene,
        targetId: target?.id,
        layer,
        placement: step.placement,
        purpose: step.purpose,
        props,
        changes,
        kept: keep.map((f) => f.label),
        errors: last!.errors,
    };
}

/** Plans and fills scenes for a request. Edits that change nothing are left out. */
export async function askScenes(request: string, ctx: SceneAiContext): Promise<{ summary: string; proposals: SceneProposal[] }> {
    const existing = existingPieces(ctx.edit);
    ctx.onStep?.('Planning the scenes');
    const plan = await planSteps(request, ctx, existing);
    const proposals: SceneProposal[] = [];
    for (const [i, step] of plan.steps.entries()) {
        ctx.onStep?.(`${step.action === 'edit' ? 'Changing' : 'Writing'} ${sceneLabel(step.scene).toLowerCase()} (${i + 1} of ${plan.steps.length})`);
        const proposal = await fillStep(step, request, ctx, existing);
        if (proposal.action === 'edit' && proposal.changes.length === 0 && proposal.errors.length === 0) continue;
        proposals.push(proposal);
    }
    const summary = plan.summary || (proposals.length ? 'Here’s what I’d make.' : 'Nothing to make for that request.');
    return { summary, proposals };
}

// ---- Applying ----

/** Puts a scene at an item index; it and the item after it crossfade, as insertScene does. */
function insertAtIndex(items: TimelineItem[], at: number, scene: SceneClip): TimelineItem[] {
    const crossfade: Transition = { type: 'crossfade', duration: DEFAULT_CROSSFADE };
    const next = items[at];
    return [...items.slice(0, at), { ...scene, transition: at > 0 ? crossfade : undefined }, ...(next ? [{ ...next, transition: crossfade }] : []), ...items.slice(at + 1)];
}

/**
 * Applies the chosen proposals. Edits replace a piece's props; new scenes go at the playhead
 * (in plan order), before the first item, or after the last; overlays go at the playhead. Each
 * piece remembers the props the AI wrote, so later AI edits keep hand changes.
 */
export function applySceneProposals(edit: Edit, proposals: SceneProposal[], playhead: number): Edit {
    let items = edit.items;
    let overlays: OverlayClip[] = [...edit.overlays];
    const usable = proposals.filter((p) => p.errors.length === 0);
    const made = (p: SceneProposal): SceneClip => ({ kind: 'scene', id: newId(), scene: p.scene, props: p.props, duration: SCENES[p.scene].defaultDuration, ai: p.props });

    for (const p of usable.filter((p) => p.action === 'edit')) {
        items = items.map((item) => (item.id === p.targetId && item.kind === 'scene' ? { ...item, props: p.props, ai: p.props } : item));
        overlays = overlays.map((o) => (o.id === p.targetId ? { ...o, props: p.props, ai: p.props } : o));
    }
    // Playhead scenes first, while output times still match what the user saw.
    let lastAt = -1;
    for (const p of usable.filter((p) => p.action === 'add' && p.placement === 'playhead')) {
        const scene = made(p);
        items = lastAt < 0 ? insertScene(items, playhead, scene) : insertAtIndex(items, lastAt + 1, scene);
        lastAt = items.findIndex((i) => i.id === scene.id);
    }
    usable
        .filter((p) => p.action === 'add' && p.placement === 'start')
        .forEach((p, i) => (items = insertAtIndex(items, i, made(p))));
    for (const p of usable.filter((p) => p.action === 'add' && p.placement === 'end')) items = insertAtIndex(items, items.length, made(p));

    const total = totalDuration(items);
    for (const p of usable.filter((p) => p.action === 'add' && p.placement === 'over')) {
        const duration = Math.min(SCENES[p.scene].defaultDuration, total);
        const start = Math.max(0, Math.min(playhead, total - duration));
        overlays.push({ id: newId(), scene: p.scene, props: p.props, start, duration, ai: p.props });
    }
    return { ...edit, items, overlays };
}
