import { convertFileSrc } from '@tauri-apps/api/core';
import { applyDraft, type DraftMedia } from './aiDraft';
import { callModel, fillStep, type SceneAiContext, type SceneProposal } from './aiScenes';
import { renderStills } from './renderScenes';
import { SCENES } from './scenes';
import type { VideoStyle } from './styles';
import type { SceneClip } from '../editor/model';

const CRITIQUE_SYSTEM = `You review frames from the scenes of a product launch video, one picture per scene, in order. Rate each scene's frame from 1 (poor) to 5 (excellent) for how good it looks on screen: text is readable and not cut off, there is a clear focus, it is not empty or cluttered, and it uses the brand's look.
For a frame scoring 3 or less, "problem" is one short sentence on what to change in its wording or content (shorter text, a clearer headline, fewer items). Leave "problem" empty for 4 or 5.`;

const CRITIQUE_SCHEMA = {
    type: 'object',
    properties: {
        scenes: {
            type: 'array',
            items: { type: 'object', properties: { index: { type: 'integer' }, score: { type: 'integer' }, problem: { type: 'string', maxLength: 200 } }, required: ['index', 'score', 'problem'] },
        },
    },
    required: ['scenes'],
};

/** Weakest scenes to write again: more would change the whole draft. */
const MAX_REDO = 2;

async function jpegBase64(file: string) {
    const blob = await (await fetch(convertFileSrc(file))).blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

/**
 * Looks at the draft the way a viewer would: a still of each scene, shown to Claude, which rates
 * them. The weakest (up to two) are written again with its note. Scenes that show the recording
 * are left alone (their place in it is not the model's to change). Returns the draft's proposals,
 * with a better one in place of any that were improved.
 */
export async function polishDraft(
    proposals: SceneProposal[],
    style: VideoStyle,
    media: DraftMedia,
    ctx: SceneAiContext,
): Promise<{ proposals: SceneProposal[]; redone: number }> {
    const usable = proposals.filter((p) => p.errors.length === 0);
    // The scenes as they will be on the timeline: pictures placed, the style's pace and look applied.
    const items = applyDraft({ ...ctx.edit, items: [] }, usable, style, true, media).items.filter((item): item is SceneClip => item.kind === 'scene');
    ctx.onStep?.('Rendering a picture of each scene');
    const files = await renderStills(ctx.project, items, ctx.env.brand, ctx.size.width, ctx.size.height, () => {}, new AbortController().signal);
    const images = await Promise.all(files.map(jpegBase64));
    ctx.onStep?.('Looking at the draft');
    const list = usable.map((p, i) => `Picture ${i}: ${SCENES[p.scene].label}. ${p.purpose}`).join('\n');
    const review = await callModel<{ scenes?: { index: number; score: number; problem: string }[] }>(CRITIQUE_SYSTEM, `${images.length} pictures, in order:\n${list}`, CRITIQUE_SCHEMA, 0.2, 1200, images);
    const weak = (review?.scenes ?? [])
        .filter((s) => Number.isInteger(s.index) && usable[s.index] && s.score <= 3 && s.problem?.trim() && !SCENES[usable[s.index].scene].fields.some((f) => f.type === 'segment'))
        .sort((a, b) => a.score - b.score)
        .slice(0, MAX_REDO);
    const better = new Map<string, SceneProposal>();
    for (const [n, w] of weak.entries()) {
        const old = usable[w.index];
        ctx.onStep?.(`Rewriting ${SCENES[old.scene].label.toLowerCase()} (${n + 1} of ${weak.length})`);
        const step = { action: 'add' as const, scene: old.scene, target: '', placement: old.placement, purpose: `${old.purpose} A first version had this problem: ${w.problem.trim()}` };
        const redo = await fillStep(step, 'Write this scene of the product launch video again, fixing the problem.', ctx, []);
        // Only a version that passes every check replaces the old one.
        if (redo.errors.length === 0) better.set(old.id, redo);
    }
    return { proposals: proposals.map((p) => better.get(p.id) ?? p), redone: better.size };
}
