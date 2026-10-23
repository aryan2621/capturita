// A whole launch video from a README or a product description: the model pulls out the facts,
// rules turn them into a storyboard (small local models plan poorly; the facts decide), then each
// scene is written and checked like any AI scene (fillStep).

import { beatsOnTimeline, fitScenesToBeats } from '../editor/beats';
import { canCrossfade, newId, totalDuration, type Edit, type MusicTrack, type SceneClip, type TimelineItem } from '../editor/model';
import { callModel, fillStep, type PlanStep, type SceneAiContext, type SceneProposal } from './aiScenes';
import { SCENES } from './scenes';
import { applyStyle, type VideoStyle } from './styles';

export interface DraftFacts {
    name: string;
    tagline: string;
    problem: string;
    features: { title: string; text: string }[];
    numbers: { value: number; label: string; prefix: string; suffix: string }[];
    pricing: { name: string; price: string; period: string }[];
    quote: { text: string; name: string; role: string };
    url: string;
    cta: string;
    code: string;
}

/** The source text the model reads (16k-token context; leave room for the prompt and answer). */
const SOURCE_LIMIT = 6000;

// Caps are generous safety limits only: a cap the real text doesn't fit makes the model write junk to fit it.
const text = (maxLength: number) => ({ type: 'string', maxLength });
const FACTS_SCHEMA = {
    type: 'object',
    properties: {
        name: text(80),
        tagline: text(200),
        problem: text(240),
        features: { type: 'array', maxItems: 6, items: { type: 'object', properties: { title: text(60), text: text(160) }, required: ['title', 'text'] } },
        numbers: { type: 'array', maxItems: 3, items: { type: 'object', properties: { value: { type: 'number' }, label: text(80), prefix: text(8), suffix: text(8) }, required: ['value', 'label', 'prefix', 'suffix'] } },
        pricing: { type: 'array', maxItems: 3, items: { type: 'object', properties: { name: text(40), price: text(40), period: text(60) }, required: ['name', 'price', 'period'] } },
        quote: { type: 'object', properties: { text: text(400), name: text(80), role: text(120) }, required: ['text', 'name', 'role'] },
        url: text(200),
        cta: text(80),
        code: text(600),
    },
    required: ['name', 'tagline', 'problem', 'features', 'numbers', 'pricing', 'quote', 'url', 'cta', 'code'],
};

const FACTS_SYSTEM = `You read a product's README or description and pull out facts for its launch video. Copy facts from the text; never invent any. Leave a field empty ("" or []) when the text doesn't give it.
- name: the product's name. tagline: one line on what it does for the user.
- problem: the pain it removes, as one short sentence, if the text says it.
- features: the main features, each a 1–3 word title and one line under 45 characters.
- numbers: only numbers the text states about the product's success or speed (users, ratings, savings). value is the plain number (30000, not "30k"). label says what is counted, in words ("teams use it", "say meetings got shorter"). prefix is only a currency sign or "". suffix is only "+", "%" or "x", or "".
- pricing: plans, only if the text lists them. price with its currency ("$8", "Free"); period like "/month" or "/user/month", or "".
- quote: a real customer quote with who said it, only if the text has one.
- url: the product's website or install address. cta: a short call to action ("Try it free", "Install now").
- code: only if the product is something developers call from code (a library, CLI or API): a short usage example of at most 4 lines. Never setup, build or install-from-source steps; "" otherwise.`;

/** Facts from the source text, with lists tidied. */
export async function readFacts(source: string): Promise<DraftFacts> {
    const facts = await callModel<DraftFacts>(FACTS_SYSTEM, `Text:\n${source.trim().slice(0, SOURCE_LIMIT)}`, FACTS_SCHEMA, 0.1, 1500);
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
        pricing: filled(facts.pricing, (p) => !!p.name?.trim() && !!p.price?.trim()),
    };
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

/** The most scenes a draft can have: title, hook, logo, 6 spotlights, callout, recap, numbers, quote, pricing, code, end card. */
export const MAX_DRAFT_SCENES = 16;

/**
 * Up to `count` scenes the facts support, in launch-story order. Every scene the facts allow is
 * ranked (title and end card first, then the first spotlights and the hook, …); the best `count`
 * are kept. Each purpose names the facts to use. Fewer come back when the text supports fewer.
 */
export function storyboard(facts: DraftFacts, count: number, inputs: DraftInputs): PlanStep[] {
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
    const spots = facts.features.length ? facts.features.slice(0, 6) : Array.from({ length: Math.min(inputs.shots, 6) }, () => null);
    spots.forEach((feature, i) => all.push({ rank: [1, 2, 4, 5][i] ?? 6, spot: { feature } }));
    if (inputs.recording) all.push({ rank: 5, make: () => shown('FeatureCallout', 'Point at the one click in the recording that shows the product working; name what it does in a few words.', 0.5) });
    if (facts.features.length >= 3) all.push({ rank: 4, make: () => step('FeatureGrid', `Recap every feature: ${list(facts.features.map((f) => `${f.title}: ${f.text}`))}.`) });
    if (facts.numbers.length) all.push({ rank: 3, make: () => step('StatCounter', `Show exactly these numbers: ${list(facts.numbers.map((n) => `${n.prefix}${n.value}${n.suffix} ${n.label}`))}.`) });
    if (facts.quote.text) all.push({ rank: 4, make: () => step('Testimonial', `Quote: "${facts.quote.text}" by ${facts.quote.name}${facts.quote.role ? `, ${facts.quote.role}` : ''}.`) });
    if (facts.pricing.length >= 2) all.push({ rank: 5, make: () => step('Pricing', `Show these plans: ${list(facts.pricing.map((p) => `${p.name} ${p.price} ${p.period}`))}. The text doesn't say what each plan includes, so leave every plan's features empty.`) });
    if (facts.code) all.push({ rank: 6, make: () => step('CodeTyping', `Type this example: ${facts.code}`) });
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

/** Reads the source, plans the scenes and writes each one. Scenes that failed their checks keep their errors. */
export async function draftVideo(source: string, count: number, ctx: SceneAiContext, inputs: Pick<DraftInputs, 'shots' | 'cinematic'>): Promise<{ facts: DraftFacts; proposals: SceneProposal[] }> {
    ctx.onStep?.('Reading the text');
    const facts = await readFacts(source);
    const steps = storyboard(facts, count, { ...inputs, hasLogo: !!ctx.env.brand.logo, recording: ctx.project.kind === 'studio' ? 0 : totalDuration(ctx.edit.items) });
    const factsCtx: SceneAiContext = { ...ctx, productName: ctx.productName || facts.name, facts: JSON.stringify(facts) };
    const proposals: SceneProposal[] = [];
    for (const [i, step] of steps.entries()) {
        ctx.onStep?.(`Writing ${SCENES[step.scene].label.toLowerCase()} (${i + 1} of ${steps.length})`);
        proposals.push(await fillStep(step, 'Write this scene of the product launch video.', factsCtx, []));
    }
    return { facts, proposals };
}

/** Pictures and a song the user gives the draft. */
export interface DraftMedia {
    /** Project paths of screenshots, used in order by the spotlights and the 3D device. */
    screenshots: string[];
    music: MusicTrack | null;
}

/**
 * The draft in the timeline, in the chosen style: in place of everything (Studio videos) or after
 * it. Screenshots fill the spotlights in order; a song becomes the music, and a replaced
 * timeline's scenes are cut on its beats.
 */
const SHOT_SCENES = new Set(['ScreenshotShowcase', 'Showcase3D']);

export function applyDraft(edit: Edit, proposals: SceneProposal[], style: VideoStyle, replace: boolean, media: DraftMedia = { screenshots: [], music: null }): Edit {
    const shots = [...media.screenshots];
    const made: SceneClip[] = proposals
        .filter((p) => p.errors.length === 0)
        .map((p) => {
            const props = SHOT_SCENES.has(p.scene) && shots.length ? { ...p.props, image: shots.shift() } : p.props;
            return { kind: 'scene', id: newId(), scene: p.scene, props, duration: SCENES[p.scene].defaultDuration, ai: p.props };
        });
    const styled = applyStyle(made, style);
    const audio = media.music ? { ...edit.audio, music: media.music } : edit.audio;
    if (replace) return { ...edit, audio, items: fitScenesToBeats(styled, beatsOnTimeline(media.music, totalDuration(styled))) };
    const items: TimelineItem[] = [...edit.items, ...styled];
    // The first new scene joins the old timeline with the style's first transition.
    const first = edit.items.length;
    if (styled.length && canCrossfade(items, first)) items[first] = { ...items[first], transition: style.transitions[0] };
    return { ...edit, audio, items };
}
