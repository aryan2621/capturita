// A whole launch video from a README or a product description: the model pulls out the facts,
// rules turn them into a storyboard (small local models plan poorly; the facts decide), then each
// scene is written and checked like any AI scene (fillStep).

import { beatsOnTimeline, fitScenesToBeats, withSceneBeats } from '../editor/beats';
import { canCrossfade, newId, totalDuration, type Edit, type MusicTrack, type SceneClip, type TimelineItem } from '../editor/model';
import { api } from '../lib/api';
import { callModel, fillStep, type PlanStep, type SceneAiContext, type SceneProposal } from './aiScenes';
import { SCENES } from './scenes';
import { applyStyle, STYLES, type VideoStyle } from './styles';

export interface DraftFacts {
    name: string;
    tagline: string;
    problem: string;
    features: { title: string; text: string }[];
    /** How it works, in order, when the text lists steps. */
    steps: { title: string; text: string }[];
    numbers: { value: number; label: string; prefix: string; suffix: string }[];
    pricing: { name: string; price: string; period: string }[];
    quote: { text: string; name: string; role: string };
    url: string;
    cta: string;
    code: string;
}

/** The source text the local model reads (16k-token context; leave room for the prompt and answer). */
const SOURCE_LIMIT = 6000;
/** Claude reads far more: a whole README and a page's text. */
const CLOUD_SOURCE_LIMIT = 60000;

// Caps are generous safety limits only: a cap the real text doesn't fit makes the model write junk to fit it.
const text = (maxLength: number) => ({ type: 'string', maxLength });
const FACTS_SCHEMA = {
    type: 'object',
    properties: {
        name: text(80),
        tagline: text(200),
        problem: text(240),
        features: { type: 'array', maxItems: 6, items: { type: 'object', properties: { title: text(60), text: text(160) }, required: ['title', 'text'] } },
        steps: { type: 'array', maxItems: 4, items: { type: 'object', properties: { title: text(40), text: text(100) }, required: ['title', 'text'] } },
        numbers: { type: 'array', maxItems: 3, items: { type: 'object', properties: { value: { type: 'number' }, label: text(80), prefix: text(8), suffix: text(8) }, required: ['value', 'label', 'prefix', 'suffix'] } },
        pricing: { type: 'array', maxItems: 3, items: { type: 'object', properties: { name: text(40), price: text(40), period: text(60) }, required: ['name', 'price', 'period'] } },
        quote: { type: 'object', properties: { text: text(400), name: text(80), role: text(120) }, required: ['text', 'name', 'role'] },
        url: text(200),
        cta: text(80),
        code: text(600),
    },
    required: ['name', 'tagline', 'problem', 'features', 'steps', 'numbers', 'pricing', 'quote', 'url', 'cta', 'code'],
};

const FACTS_SYSTEM = `You read a product's README or description and pull out facts for its launch video. Copy facts from the text; never invent any. Leave a field empty ("" or []) when the text doesn't give it.
- name: the product's name. tagline: one line on what it does for the user.
- problem: the pain it removes, as one short sentence, if the text says it.
- features: the main features, each a 1–3 word title and one line under 45 characters.
- steps: how to use it in order (2–4 steps, each a 1–3 word title and one line), only if the text describes a step-by-step flow; [] otherwise.
- numbers: only numbers the text states about the product's success or speed (users, ratings, savings). value is the plain number (30000, not "30k"). label says what is counted, in words ("teams use it", "say meetings got shorter"). prefix is only a currency sign or "". suffix is only "+", "%" or "x", or "".
- pricing: plans, only if the text lists them. price with its currency ("$8", "Free"); period like "/month" or "/user/month", or "".
- quote: a real customer quote with who said it, only if the text has one.
- url: the product's website or install address. cta: a short call to action ("Try it free", "Install now").
- code: only if the product is something developers call from code (a library, CLI or API): a short usage example of at most 4 lines. Never setup, build or install-from-source steps; "" otherwise.`;

/** Facts from the source text, with lists tidied. */
export async function readFacts(source: string, limit = SOURCE_LIMIT): Promise<DraftFacts> {
    const facts = await callModel<DraftFacts>(FACTS_SYSTEM, `Text:\n${source.trim().slice(0, limit)}`, FACTS_SCHEMA, 0.1, 1500);
    const filled = <T>(list: T[] | undefined, keep: (item: T) => boolean) => (Array.isArray(list) ? list.filter(keep) : []);
    return {
        ...facts,
        features: filled(facts.features, (f) => !!f.title?.trim()),
        // Only the units StatCounter shows well; anything else the model put there is noise.
        numbers: filled(facts.numbers, (n) => Number.isFinite(n.value) && /\p{L}/u.test(n.label ?? '')).map((n) => ({
            ...n,
            prefix: /^[$€£¥]$/.test(n.prefix?.trim()) ? n.prefix.trim() : '',
            suffix: /^[+%x]$/.test(n.suffix?.trim()) ? n.suffix.trim() : '',
        })),
        steps: filled(facts.steps, (step) => !!step.title?.trim()),
        pricing: filled(facts.pricing, (p) => !!p.name?.trim() && !!p.price?.trim()),
    };
}

/**
 * What would make the draft look like slides, in plain words, for the scenes about to be applied.
 * `pictures` is how many screenshots (or page captures) there are for the picture scenes.
 */
export interface DraftWarning {
    message: string;
    /** Positions (in the scenes given) that leaving out fixes the warning. */
    leaveOut?: number[];
}

export function reviewDraft(scenes: { scene: string; props: Record<string, unknown> }[], pictures: number): DraftWarning[] {
    const warnings: DraftWarning[] = [];
    const picture = scenes.flatMap((s, i) => (SHOT_SCENES.has(s.scene) ? [i] : []));
    if (picture.length > pictures) {
        const bare = picture.slice(pictures);
        warnings.push({ message: `${bare.length} picture scene${bare.length > 1 ? 's' : ''} will show a placeholder: add screenshots or capture the product page.`, leaveOut: bare });
    }
    const textOnly = scenes.map((s) => TEXT_ONLY.has(s.scene));
    // The end card closes the video, so it doesn't count as a stretch of slides.
    const inARow = textOnly.filter((on, i) => on && textOnly[i - 1] && scenes[i].scene !== 'EndCard').length;
    if (inARow) warnings.push({ message: `${inARow} text-only scene${inARow > 1 ? 's' : ''} follow another one: it will read like slides.` });
    // Title, logo and end card are text by nature: judge the scenes between them.
    const middle = scenes.filter((s) => !['TitleReveal', 'LogoSting', 'EndCard'].includes(s.scene));
    const texts = middle.filter((s) => TEXT_ONLY.has(s.scene)).length;
    if (middle.length >= 3 && texts / middle.length > 0.5) warnings.push({ message: `${texts} of the ${middle.length} scenes between the title and the end are text only. Capture the product page or add a recording to show it working.` });
    const seconds = scenes.reduce((sum, s) => sum + pacedDuration(s.scene, s.props), 0);
    if (scenes.length && seconds < 20) warnings.push({ message: `It runs about ${Math.round(seconds)} seconds: short for a launch video.` });
    if (seconds > 90) warnings.push({ message: `It runs about ${Math.round(seconds)} seconds: long for a launch video.` });
    return warnings;
}

/** What else the draft has to work with besides the facts. */
export interface DraftInputs {
    hasLogo: boolean;
    /** How many screenshots the user picked. */
    shots: number;
    /** Seconds of recording on the timeline (0 in a Studio video). */
    recording: number;
    /** The first screenshot goes on a 3D device. */
    cinematic: boolean;
}

const NETWORK_CUE = /\b(networks?|integrations?|integrates|connects?|ecosystem)\b/i;
const toneText = (facts: DraftFacts) => [facts.tagline, facts.problem, ...facts.features.map((f) => `${f.title} ${f.text}`)].join(' ');

/** The most scenes a draft can have: title, hook, logo, 6 spotlights, callout, recap, numbers, quote, pricing, code, end card. */
export const MAX_DRAFT_SCENES = 16;

/**
 * Up to `count` scenes the facts support, in launch-story order. Every scene the facts allow is
 * ranked (title and end card first, then the first spotlights and the hook, …); the best `count`
 * are kept. Each purpose names the facts to use. Fewer come back when the text supports fewer.
 */
export function storyboard(facts: DraftFacts, count: number, inputs: DraftInputs, menu = false): PlanStep[] {
    const step = (scene: string, purpose: string): PlanStep => ({ action: 'add', scene, target: '', placement: 'end', purpose });
    // A part of the recording `at` (0–1) of the way through: fillStep starts the scene's segment there.
    const shown = (scene: string, purpose: string, at: number): PlanStep => ({ ...step(scene, purpose), placement: 'playhead', at: at * inputs.recording });
    const list = (items: string[]) => items.map((item) => `"${item}"`).join(', ');
    // Candidates in story order; `rank` decides which survive when there are more than `count` (lower stays).
    type Candidate = { rank: number; spot?: { feature: DraftFacts['features'][number] | null }; make?: () => PlanStep };
    const all: Candidate[] = [];
    if (inputs.hasLogo) all.push({ rank: 3, make: () => step('LogoSting', `Open with the logo${facts.tagline ? `; tagline: ${facts.tagline}` : ''}.`) });
    all.push({ rank: 0, make: () => step('TitleReveal', `Introduce ${facts.name || 'the product'}${facts.tagline ? `: ${facts.tagline}` : ''}.`) });
    // The hook: the pain it removes, or else the promise, as a punchy line.
    if (facts.problem || facts.tagline)
        all.push({ rank: 2, make: () => step('KineticStatement', facts.problem ? `Say the problem it removes as a punchy line: ${facts.problem}` : `Turn this promise into a punchy two-line statement: ${facts.tagline}`) });
    // One spotlight per main feature (or per screenshot when the text lists none): the demo is the heart of a launch video.
    // With no screenshot and no recording a spotlight would show an empty picture slot: the illustrative scenes below stand in.
    const spots = !inputs.shots && !inputs.recording ? [] : facts.features.length ? facts.features.slice(0, 6) : Array.from({ length: Math.min(inputs.shots, 6) }, () => null);
    // With screenshots or a recording the demo is the video: spotlights outrank the recaps (numbers, quote, grid).
    const ranks = inputs.shots || inputs.recording ? [1, 2, 3, 3, 4, 5] : [1, 2, 4, 5];
    spots.forEach((feature, i) => all.push({ rank: ranks[i] ?? 6, spot: { feature } }));
    if (inputs.recording) all.push({ rank: 5, make: () => shown('FeatureCallout', 'Point at the one click in the recording that shows the product working; name what it does in a few words.', 0.5) });
    // A montage of the screens when there are enough of them: the product itself, in motion.
    if (inputs.shots >= 3) all.push({ rank: 3, make: () => step('UiCollage', `A short headline for screenshots of ${facts.name || 'the product'}${facts.tagline ? ` (${facts.tagline})` : ''}.`) });
    // The tagline as moving type, after the hook has said the problem.
    if (facts.problem && facts.tagline) all.push({ rank: 3, make: () => step('KineticType', `Say the promise in 1–2 short lines of big moving type: ${facts.tagline}`) });
    // With no screens to show, an illustrative app window stands in for the product (labelled as such by the scene).
    if (!inputs.shots && !inputs.recording && facts.features.length) all.push({ rank: 3, make: () => step('UiCard', `An illustrative app window for ${facts.name || 'the product'}: its title, then switches and rows named after these features, no numbers: ${list(facts.features.slice(0, 3).map((f) => f.title))}.`) });
    if (facts.steps.length >= 2) all.push({ rank: 4, make: () => step('HowItWorks', `Show these steps in order: ${list(facts.steps.map((st) => `${st.title}: ${st.text}`))}.`) });
    // With no screens, the feature recap is the 3D ring of chips; otherwise the card grid.
    if (facts.features.length >= 3 && !inputs.shots && !inputs.recording) all.push({ rank: 4, make: () => step('FeatureOrbit', `Chips for exactly these features, each at most 3 words: ${list(facts.features.slice(0, 8).map((f) => f.title))}.`) });
    else if (facts.features.length >= 3) all.push({ rank: 4, make: () => step('FeatureGrid', `Recap every feature: ${list(facts.features.map((f) => `${f.title}: ${f.text}`))}.`) });
    // One figure is a single big number; several are counters side by side.
    if (facts.numbers.length === 1) all.push({ rank: 3, make: () => step('BigNumber', `Show exactly this figure, as written: ${facts.numbers[0].prefix}${facts.numbers[0].value}${facts.numbers[0].suffix} ${facts.numbers[0].label}.`) });
    else if (facts.numbers.length) all.push({ rank: 3, make: () => step('StatCounter', `Show exactly these numbers: ${list(facts.numbers.map((n) => `${n.prefix}${n.value}${n.suffix} ${n.label}`))}.`) });
    if (facts.quote.text) all.push({ rank: 4, make: () => step('Testimonial', `Quote: "${facts.quote.text}" by ${facts.quote.name}${facts.quote.role ? `, ${facts.quote.role}` : ''}.`) });
    if (facts.pricing.length >= 2) all.push({ rank: 5, make: () => step('Pricing', `Show these plans: ${list(facts.pricing.map((p) => `${p.name} ${p.price} ${p.period}`))}. The text doesn't say what each plan includes, so leave every plan's features empty.`) });
    // Code with features to show becomes an app window; code alone just types. A CLI cue without code gives neither (no invented code).
    if (facts.code && facts.features.length) all.push({ rank: 6, make: () => step('CodeToUi', `Type this example, then turn it into an illustrative app window titled ${facts.name || 'the product'} whose switches and rows are named after these features, no numbers: ${list(facts.features.slice(0, 3).map((f) => f.title))}. Code: ${facts.code}`) });
    else if (facts.code) all.push({ rank: 6, make: () => step('CodeTyping', `Type this example: ${facts.code}`) });
    // Opt-in: particles only for a product about networks or connecting things, never by default.
    if (NETWORK_CUE.test(toneText(facts))) all.push({ rank: 6, make: () => step('NetworkField', `A heading and one-line subtitle about what it connects, from the text: ${facts.tagline || facts.name}.`) });
    // Only on the menu the planner picks from: an alternative to the KineticStatement hook, never planned beside it.
    if (menu && facts.tagline) all.push({ rank: 7, make: () => step('Text3D', `The product's name or promise as 1–2 short rows of 3D title: ${facts.name || facts.tagline}.`) });
    all.push({ rank: 0, make: () => step('EndCard', `Close with: ${facts.cta || 'Try it today'}${facts.url ? `, at ${facts.url}` : ''}.`) });

    const kept = new Set([...all].sort((a, b) => a.rank - b.rank).slice(0, Math.max(2, count)));
    const chosen = all.filter((c) => kept.has(c));
    const spotCount = chosen.filter((c) => c.spot).length;
    let n = 0;
    return chosen.map((c) => {
        if (c.make) return c.make();
        const i = n++;
        const { feature } = c.spot!;
        const purpose = feature ? `Spotlight one feature: ${feature.title}: ${feature.text}.` : `Spotlight ${facts.name || 'the product'} in use${facts.tagline ? ` (${facts.tagline})` : ''}; pick a different benefit than the other spotlights.`;
        const lines = ' Headline names the benefit in a few words; detail is one short line.';
        // With a recording, each spotlight shows an even share of it; otherwise a screenshot the user drops in.
        if (inputs.recording) return shown('DeviceShowcase', purpose + lines, (i + 0.5) / spotCount);
        if (i === 0 && inputs.cinematic && inputs.shots) return step('Showcase3D', `${purpose} Show it on a phone or laptop (subject "phone" or "laptop", not "logo").${lines}`);
        return step('ScreenshotShowcase', purpose + lines);
    });
}

/** Scenes that are only text and shapes: two in a row is what makes a video feel like slides. */
const TEXT_ONLY = new Set(['NetworkField', 'Text3D', 'TitleReveal', 'KineticStatement', 'KineticType', 'BigNumber', 'LogoSting', 'FeatureGrid', 'HowItWorks', 'StatCounter', 'Testimonial', 'Pricing', 'CodeTyping', 'EndCard']);

/**
 * Moves a picture scene (a spotlight or recording scene) between two text-only scenes in a row,
 * when there is one later on. The first scene and the end card stay where they are.
 */
export function spreadTextScenes(steps: PlanStep[]): PlanStep[] {
    const out = [...steps];
    for (let i = 1; i < out.length - 1; i++) {
        if (!TEXT_ONLY.has(out[i].scene) || !TEXT_ONLY.has(out[i - 1].scene)) continue;
        const later = out.findIndex((step, j) => j > i && j < out.length - 1 && !TEXT_ONLY.has(step.scene));
        if (later < 0) break;
        out.splice(i, 0, ...out.splice(later, 1));
    }
    return out;
}

const PLAN_ARC_SYSTEM = `You direct a product launch video made of scenes. From the numbered menu, choose scenes and put them in the story arc: a hook (the pain or the promise, in six words or fewer), the problem, the reveal (the logo or the product), up to three proofs (product shots, numbers, a quote), then the call to action (the end card). Rules:
- Pick at most the number of scenes you are told; drop the weakest ones.
- Never pick the same scene kind twice in a row, and never put two text-only scenes (title, statement, recap, numbers, quote, pricing, code) back to back when a product shot (spotlight or recording scene) can sit between them.
- Fewer kinds read as better editing: use at most four different scene kinds, and prefer coming back to a kind later (with new text, never twice in a row) over adding another kind.
- Never open on the logo alone: the first scene must say what is launching.
- Start with the product's title or its logo, and end with the end card.
- For each pick, "role" is a short phrase for what that scene does in the story ("hook", "first proof it works", "why it matters").
- "look" is the video's look, chosen from the tone of the text: developer tools suit neon-tech, consumer products apple-clean or vapor, a serious or editorial brand editorial.`;

/** Local guess at the tone when Claude doesn't plan: code and developer words mean a developer tool. */
export function lookFor(facts: DraftFacts): string {
    const words = [facts.tagline, facts.problem, ...facts.features.map((f) => `${f.title} ${f.text}`)].join(' ');
    return facts.code || /\b(api|cli|sdk|developers?|open[- ]source|terminal|git|deploy)\b/i.test(words) ? 'neon-tech' : 'apple-clean';
}

/** Moves a later scene up between two of the same kind (the model or the rules can repeat one); the end card stays last. */
export function separateRepeats(steps: PlanStep[]): PlanStep[] {
    const out = [...steps];
    for (let i = 1; i < out.length - 1; i++) {
        if (out[i].scene !== out[i - 1].scene) continue;
        const later = out.findIndex((step, j) => j > i && j < out.length - 1 && step.scene !== out[i - 1].scene);
        if (later >= 0) out.splice(i, 0, ...out.splice(later, 1));
    }
    // A repeat nothing can separate (more spotlights than other scenes) is dropped: the text supports fewer scenes.
    return out.filter((step, i) => i === 0 || step.scene !== out[i - 1].scene);
}

/** Scenes whose purpose copies exact facts, so the plan's wording must not change them. */
const EXACT_SCENES = new Set(['CodeToUi', 'StatCounter', 'BigNumber', 'FeatureOrbit', 'Testimonial', 'Pricing', 'CodeTyping', 'FeatureGrid', 'HowItWorks', 'EndCard']);

/**
 * Claude's version of the storyboard: it picks and orders scenes from what the facts allow (the
 * menu is the rule-based storyboard with every scene), so scene names and facts stay valid. The
 * caller falls back to `storyboard` when this throws.
 */
export async function planStoryboard(facts: DraftFacts, count: number, inputs: DraftInputs): Promise<{ steps: PlanStep[]; look: string }> {
    const menu = storyboard(facts, MAX_DRAFT_SCENES, inputs, true);
    const schema = {
        type: 'object',
        properties: {
            order: {
                type: 'array',
                maxItems: count,
                items: { type: 'object', properties: { pick: { type: 'integer', enum: menu.map((_, i) => i) }, role: { type: 'string', maxLength: 60 } }, required: ['pick', 'role'] },
            },
            look: { type: 'string', enum: STYLES.map((st) => st.id) },
        },
        required: ['order', 'look'],
    };
    const list = menu.map((step, i) => `${i}. ${step.scene}: ${step.purpose}`).join('\n');
    const reply = await callModel<{ order?: { pick: number; role: string }[]; look?: string }>(PLAN_ARC_SYSTEM, `Pick at most ${count} scenes.\n\nMenu:\n${list}`, schema, 0.3, 700);
    const order = reply?.order;
    const seen = new Set<number>();
    const picks = (Array.isArray(order) ? order : []).filter((o) => Number.isInteger(o.pick) && menu[o.pick] && !seen.has(o.pick) && seen.add(o.pick)).slice(0, count);
    // An empty or invalid answer is no plan: the caller falls back to the rules.
    if (picks.length < Math.min(2, menu.length - 1)) throw new Error('The plan was too short');
    const end = menu.findIndex((step) => step.scene === 'EndCard');
    const withEnd = [...picks.filter((o) => o.pick !== end), ...(end >= 0 ? [{ pick: end, role: '' }] : [])];
    // The title always opens unless the logo does.
    const title = menu.findIndex((step) => step.scene === 'TitleReveal');
    if (title >= 0 && !withEnd.some((o) => menu[o.pick].scene === 'TitleReveal' || menu[o.pick].scene === 'LogoSting')) withEnd.unshift({ pick: title, role: '' });
    // Text3D and the kinetic statement are two takes on the same hook.
    const hooks = withEnd.filter((o) => ['Text3D', 'KineticStatement'].includes(menu[o.pick].scene));
    if (hooks.length > 1) withEnd.splice(withEnd.indexOf(hooks.find((o) => menu[o.pick].scene === 'Text3D')!), 1);
    const steps = withEnd.map(({ pick, role }) => ({ ...menu[pick], purpose: role.trim() && !EXACT_SCENES.has(menu[pick].scene) ? `${menu[pick].purpose} Story role: ${role.trim()}.` : menu[pick].purpose }));
    return { steps: separateRepeats(spreadTextScenes(steps)), look: STYLES.some((st) => st.id === reply.look) ? reply.look! : lookFor(facts) };
}

/** A yes/no answer's probability: Clef returns `{ type: 'noul', noul: 0.85 }`. */
const yesProbability = (a: unknown): number => Number((a as { noul?: number })?.noul ?? NaN);

/**
 * Clef (Cloudflare's decision model) answers one yes/no per scene on the menu plus the look, so the
 * scenes are kept by how well they fit the text, not by fixed ranks. Story order stays the menu's.
 * The caller falls back to the other planners when this throws (no token, offline, odd answer).
 */
export async function clefStoryboard(source: string, facts: DraftFacts, count: number, inputs: DraftInputs): Promise<{ steps: PlanStep[]; look: string }> {
    const menu = storyboard(facts, MAX_DRAFT_SCENES, inputs, true);
    const questions: Record<string, unknown> = {
        look: { type: 'choice', instructions: 'Which visual look suits this product?', criteria: Object.fromEntries(STYLES.map((st) => [st.id, st.label])) },
    };
    menu.forEach((step, i) => (questions[`s${i}`] = { type: 'noul', instructions: `Would this scene make a strong part of a launch video for this product? ${step.scene}: ${step.purpose}` }));
    const answers = await api.aiDecide(`${facts.name}: ${facts.tagline}\n\n${source.trim().slice(0, SOURCE_LIMIT)}`, questions);
    const score = menu.map((_, i) => yesProbability(answers?.[`s${i}`]));
    if (score.some((p) => !Number.isFinite(p))) throw new Error('Unreadable answer from Clef');
    // Title (or logo) and the end card always stay; the strongest of the rest fill the count.
    const must = (i: number) => ['TitleReveal', 'EndCard'].includes(menu[i].scene);
    const best = menu.map((_, i) => i).filter((i) => !must(i)).sort((a, b) => score[b] - score[a]).slice(0, Math.max(0, count - menu.filter((_, i) => must(i)).length));
    const kept = new Set([...best, ...menu.map((_, i) => i).filter(must)]);
    // Text3D and the kinetic statement are two takes on the same hook: keep the likelier one.
    if (kept.has(menu.findIndex((m) => m.scene === 'Text3D')) && kept.has(menu.findIndex((m) => m.scene === 'KineticStatement'))) kept.delete(menu.findIndex((m) => m.scene === 'Text3D'));
    const steps = menu.filter((_, i) => kept.has(i));
    const look = answers?.look?.choice ?? answers?.look;
    return { steps: separateRepeats(spreadTextScenes(steps)), look: STYLES.some((st) => st.id === look) ? look : lookFor(facts) };
}

/** A line cut to at most `max` words: its first clause when that fits, else its first words. Never empty. */
export function trimLine(line: string, max: number): string {
    const count = (t: string) => t.split(/\s+/).filter(Boolean).length;
    if (count(line) <= max) return line;
    const clause = line.split(/[,;:.!?]\s|\s[–—-]\s/)[0].trim();
    const cut = count(clause) >= 2 && count(clause) <= max ? clause : line.split(/\s+/).filter(Boolean).slice(0, Math.max(1, max)).join(' ');
    return cut.replace(/[\s,;:–—-]+$/, '').replace(/\s+(and|or|the|a|an|of|to|with|for|in|on)$/i, '') || cut;
}

/** Trims every short text of a written scene (the hook to 6 words, the rest to 7); scenes that copy exact facts are left alone. */
export function limitLines(proposal: SceneProposal, hook: boolean): SceneProposal {
    if (EXACT_SCENES.has(proposal.scene)) return proposal;
    const max = hook ? 6 : 7;
    const props = { ...proposal.props };
    const changes = proposal.changes.map((c) => ({ ...c }));
    const trim = (value: unknown) => {
        if (typeof value !== 'string') return value;
        const cut = trimLine(value, max);
        if (cut !== value) for (const c of changes) c.after = c.after.replace(value, cut);
        return cut;
    };
    for (const field of SCENES[proposal.scene].fields) {
        if (field.type === 'text' && !['emphasis', 'swaps'].includes(field.name)) {
            const value = props[field.name];
            // Multiline text (one line per row) is limited row by row.
            props[field.name] = field.multiline && typeof value === 'string' ? value.split('\n').map(trim).join('\n') : trim(value);
        }
        if (field.type === 'list' && Array.isArray(props[field.name]))
            props[field.name] = (props[field.name] as Record<string, unknown>[]).map((row) => ({ ...row, ...Object.fromEntries(field.item.filter((f) => f.type === 'text').map((f) => [f.name, trim(row?.[f.name])])) }));
    }
    return { ...proposal, props, changes };
}

/** A scene's length kept in a launch video's rhythm: 1.5–3 s (CodeToUi 6–9 s), the reveal (first title or logo) 2–4 s, the end card at least 3 s. */
export function clampDuration(scene: string, seconds: number, reveal: boolean): number {
    // CodeToUi types, holds, then morphs: it needs most of its default 8.5 s.
    const [min, max] = scene === 'EndCard' ? [3, 5] : scene === 'CodeToUi' ? [6, 9] : reveal ? [2, 4] : [1.5, 3];
    return Math.min(max, Math.max(min, seconds));
}

/** Whether Claude is on, for planning with more of the source text. */
const cloudOn = () =>
    Promise.all([api.aiCloud(), api.aiOpenAi()])
        .then(([claude, other]) => (claude.enabled && claude.hasKey) || (other.enabled && other.hasKey))
        .catch(() => false);

/** Reads the source, plans the scenes and writes each one. Scenes that failed their checks keep their errors. */
export async function draftVideo(source: string, count: number, ctx: SceneAiContext, inputs: Pick<DraftInputs, 'shots' | 'cinematic'>): Promise<{ facts: DraftFacts; proposals: SceneProposal[]; look: string }> {
    ctx.onStep?.('Reading the text');
    const cloud = await cloudOn();
    const facts = await readFacts(source, cloud ? CLOUD_SOURCE_LIMIT : SOURCE_LIMIT);
    const draftInputs = { ...inputs, hasLogo: !!ctx.env.brand.logo, recording: ctx.project.kind === 'studio' ? 0 : totalDuration(ctx.edit.items) };
    if (cloud) ctx.onStep?.('Planning the story');
    // Clef decides first (a token in the keychain); Claude's plan, then the rules, stand behind it.
    const plan = (await clefStoryboard(source, facts, count, draftInputs).catch(() => null)) ?? (cloud ? await planStoryboard(facts, count, draftInputs).catch(() => null) : null);
    const steps = plan?.steps ?? separateRepeats(spreadTextScenes(storyboard(facts, count, draftInputs)));
    const look = plan?.look ?? lookFor(facts);
    const factsCtx: SceneAiContext = { ...ctx, productName: ctx.productName || facts.name, facts: JSON.stringify(facts) };
    const proposals: SceneProposal[] = [];
    for (const [i, step] of steps.entries()) {
        ctx.onStep?.(`Writing ${SCENES[step.scene].label.toLowerCase()} (${i + 1} of ${steps.length})`);
        const written = await fillStep(step, 'Write this scene of the product launch video. Every line at most 7 words; the hook at most 6.', factsCtx, []);
        proposals.push(limitLines(written, step.scene === 'KineticStatement' && !proposals.some((p) => p.scene === 'KineticStatement')));
    }
    return { facts, proposals, look };
}

/** Pictures and a song the user gives the draft. */
export interface DraftMedia {
    /** Project paths of screenshots, used in order by the spotlights and the 3D device. */
    screenshots: string[];
    /** One tall screenshot of a whole page: the first screenshot spotlight scrolls down it in a browser frame. */
    tall?: string | null;
    music: MusicTrack | null;
}

/**
 * The draft in the timeline, in the chosen style: in place of everything (Studio videos) or after
 * it. Screenshots fill the spotlights in order; a song becomes the music, and a replaced
 * timeline's scenes are cut on its beats.
 */
const SHOT_SCENES = new Set(['ScreenshotShowcase', 'Showcase3D']);

/** Scenes that are mostly the product on screen: they need time for it however few the words. */
const VISUAL_SCENES = new Set(['ScreenshotShowcase', 'Showcase3D', 'DeviceShowcase', 'FeatureCallout', 'UiCollage', 'UiCard']);
/** How many words a viewer reads in a second, comfortably. */
const WORDS_PER_SECOND = 2.5;

/** A scene's length from its words: time to read them plus a beat, within 0.6–1.4× its default. */
export function pacedDuration(scene: string, props: Record<string, unknown>): number {
    const { defaultDuration, fields } = SCENES[scene];
    const words = (value: unknown) => (typeof value === 'string' ? value.split(/\s+/).filter(Boolean).length : 0);
    let count = 0;
    for (const field of fields) {
        if (field.type === 'text') count += words(props[field.name]);
        if (field.type === 'list' && Array.isArray(props[field.name])) {
            for (const item of props[field.name] as Record<string, unknown>[]) for (const sub of field.item) if (sub.type === 'text') count += words(item?.[sub.name]);
        }
    }
    const reading = 1.5 + count / WORDS_PER_SECOND;
    const seconds = VISUAL_SCENES.has(scene) ? Math.max(defaultDuration * 0.8, reading) : Math.min(defaultDuration * 1.4, Math.max(defaultDuration * 0.6, reading));
    return Math.round(seconds * 10) / 10;
}

/**
 * Puts captured page pictures into the timeline's picture scenes that have none yet (the first
 * screenshot scene gets the tall page, the rest take the shots in order; the collage and before/after reuse them).
 * Scenes that already have a picture are left alone. Returns the same array when nothing needed filling.
 */
export function fillBarePictures(items: TimelineItem[], shots: string[], tall: string | null): TimelineItem[] {
    let rest = [...shots];
    let fullPage = tall;
    let changed = false;
    const out = items.map((item) => {
        if (item.kind !== 'scene') return item;
        const p = item.props;
        let props: Record<string, unknown> | null = null;
        if (item.scene === 'ScreenshotShowcase' && !p.image && fullPage) {
            props = { ...p, image: fullPage, device: 'browser', scroll: true };
            fullPage = null;
        } else if (SHOT_SCENES.has(item.scene) && !p.image && rest.length) {
            props = { ...p, image: rest.shift() };
        } else if (item.scene === 'UiCollage' && shots.length && !(p.images as { image?: string }[] | undefined)?.some((row) => row.image)) {
            props = { ...p, images: shots.slice(0, 5).map((image) => ({ image })) };
        } else if (item.scene === 'BeforeAfter' && shots.length >= 2 && !p.before && !p.after) {
            props = { ...p, before: shots[0], after: shots[1] };
        }
        if (!props) return item;
        changed = true;
        return { ...item, props };
    });
    return changed ? out : items;
}

export function applyDraft(edit: Edit, proposals: SceneProposal[], style: VideoStyle, replace: boolean, media: DraftMedia = { screenshots: [], music: null }): Edit {
    const shots = [...media.screenshots];
    let tall = media.tall ?? null;
    const made: SceneClip[] = proposals
        .filter((p) => p.errors.length === 0)
        .map((p) => {
            let props = p.props;
            if (p.scene === 'ScreenshotShowcase' && tall) {
                props = { ...p.props, image: tall, device: 'browser', scroll: true };
                tall = null;
            } else if (p.scene === 'UiCollage' && media.screenshots.length) {
                // The montage shows the screens again, up to five of them, without using them up.
                props = { ...p.props, images: media.screenshots.slice(0, 5).map((image) => ({ image })) };
            } else if (SHOT_SCENES.has(p.scene) && shots.length) {
                props = { ...p.props, image: shots.shift() };
            }
            return { kind: 'scene', id: newId(), scene: p.scene, props, duration: pacedDuration(p.scene, props), ai: p.props };
        });
    // The style sets the pace on top of each scene's own length (applyStyle alone would reset it to the default).
    const reveal = made.findIndex((m) => m.scene === 'TitleReveal' || m.scene === 'LogoSting');
    const styled = applyStyle(made, style).map((item, i) => (item.kind === 'scene' ? { ...item, duration: clampDuration(item.scene, Math.round(made[i].duration * style.pace * 10) / 10, i === reveal) } : item));
    const audio = media.music ? { ...edit.audio, music: media.music } : edit.audio;
    if (replace) return { ...edit, audio, items: fitScenesToBeats(styled, beatsOnTimeline(media.music, totalDuration(styled))) };
    // Appended scenes keep their lengths but still get the beats that fall inside them, so beat-snapping scenes work.
    const first = edit.items.length;
    const all: TimelineItem[] = [...edit.items, ...styled];
    const beats = beatsOnTimeline(audio.music ?? null, totalDuration(all));
    const items: TimelineItem[] = beats.length ? [...all.slice(0, first), ...withSceneBeats(all, beats).slice(first)] : all;
    // The first new scene joins the old timeline with the style's first transition.
    if (styled.length && canCrossfade(items, first)) items[first] = { ...items[first], transition: style.transitions[0] };
    return { ...edit, audio, items };
}
