// Ready-made Studio videos for AI chat products: a look (brand colours, fonts, video style) and a
// short script of scenes. Picking one creates the project with these scenes already on the timeline.
// Every line, number, name and quote is placeholder copy meant to be edited: none of it is a claim
// about the product. Together the templates use every scene that needs no media of the user's own.
import type { TimelineItem } from '../editor/model';
import { newId } from '../editor/model';
import type { BrandKit } from './brandKits';
import { SCENES } from './scenes';
import type { BrandColors } from './scenes/assets';
import type { SceneFont } from './scenes/fonts';
import { applyStyle, STYLES } from './styles';

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

type Props = Record<string, unknown>;
const scene = (name: string, props: Props, duration?: number): TemplateScene => ({ scene: name, props, duration });
const lines = (...text: string[]) => text.map((t) => ({ text: t }));

// One short builder per scene, so a template reads as its script.
const title = (eyebrow: string, t: string, subtitle: string) => scene('TitleReveal', { eyebrow, title: t, subtitle });
const logo = (wordmark: string, tagline: string) => scene('LogoSting', { style: 'pop', wordmark, tagline, burst: true });
const statement = (emphasis: string, ...text: string[]) => scene('KineticStatement', { lines: lines(...text), emphasis, style: 'punch' });
const kinetic = (text: string, emphasis: string, swaps: string) => scene('KineticType', { text, emphasis, mode: 'mask-slide', swaps });
const text3d = (t: string, subtitle: string) => scene('Text3D', { text: t, subtitle });
const words = (t: string, style: string) => scene('TextAnimation', { text: t, style, size: 'l', position: 'center', color: '' });
const chat = (heading: string, ...m: ['user' | 'bot', string][]) => scene('Chat', { heading, messages: m.map(([from, t]) => ({ from, text: t })) });
const grid = (heading: string, ...items: [string, string, string][]) => scene('FeatureGrid', { heading, items: items.map(([icon, t, text]) => ({ icon, title: t, text })) });
const orbit = (heading: string, ...features: string[]) => scene('FeatureOrbit', { heading, features: lines(...features) });
const steps = (heading: string, ...s: [string, string][]) => scene('HowItWorks', { heading, steps: s.map(([t, text]) => ({ title: t, text })) });
const integrations = (center: string, ...items: string[]) => scene('Integrations', { center, items: lines(...items) });
const notifications = (heading: string, ...items: [string, string][]) => scene('Notifications', { heading, items: items.map(([t, text]) => ({ title: t, text })) });
const card = (t: string, toggles: string[], rows: string[], toast: string) => scene('UiCard', { title: t, toggles: lines(...toggles), rows: lines(...rows), toast });
const cursor = (t: string, typed: string, button: string, result: string) => scene('CursorDemo', { title: t, typed, button, result });
const code = (heading: string, fileName: string, source: string) => scene('CodeTyping', { heading, fileName, code: source, speed: 40 });
const codeToUi = (heading: string, source: string, t: string) => scene('CodeToUi', { heading, fileName: 'app.ts', code: source, title: t });
const compare = (heading: string, us: string, them: string, ...rows: [string, string, string][]) => scene('Comparison', { heading, us, them, rows: rows.map(([feature, a, b]) => ({ feature, us: a, them: b })) });
const big = (value: string, label: string) => scene('BigNumber', { value, label, glow: true });
const chart = (heading: string, unit: string, ...points: [string, number][]) => scene('Chart', { heading, kind: 'bars', unit, points: points.map(([label, value]) => ({ label, value })) });
const stats = (heading: string, ...s: [number, string, string, string, string][]) => scene('StatCounter', { heading, stats: s.map(([value, label, prefix, suffix, format]) => ({ value, label, prefix, suffix, format })) });
const proof = (rating: number, reviews: string, badge: string) => scene('SocialProof', { rating, reviews, badge });
const quote = (q: string, name: string, role: string) => scene('Testimonial', { quote: q, name, role, avatar: '', rating: 5 });
const places = (heading: string, ...p: [string, number, number][]) => scene('Locations', { heading, places: p.map(([name, x, y]) => ({ name, x, y })) });
const changelog = (heading: string, ...e: [string, string][]) => scene('Changelog', { heading, entries: e.map(([version, t]) => ({ version, text: t })) });
const roadmap = (heading: string, ...m: [string, string, 'done' | 'now' | 'next'][]) => scene('Roadmap', { heading, milestones: m.map(([when, t, status]) => ({ when, title: t, status })) });
const faq = (heading: string, ...q: [string, string][]) => scene('Faq', { heading, items: q.map(([a, b]) => ({ q: a, a: b })) });
const pricing = (heading: string, ...t: [string, string, string, string, 'yes' | 'no'][]) => scene('Pricing', { heading, tiers: t.map(([name, price, period, features, highlight]) => ({ name, price, period, features, highlight })) });
const countdown = (label: string, days: number, hours: number, minutes: number, note: string) => scene('Countdown', { label, days, hours, minutes, seconds: 30, note });
const progress = (style: 'ring' | 'bar', value: number, label: string) => scene('ProgressAnimation', { style, value, label });
const element = (name: string, position = 'center') => scene('ElementAnimation', { element: name, color: '', size: 'l', position }, 3);
const network = (heading: string, subtitle: string) => scene('NetworkField', { heading, subtitle, density: 36 });
const end = (headline: string, cta: string, url: string) => scene('EndCard', { headline, cta, url, showQr: false, socials: [] });

export const TEMPLATES: StudioTemplate[] = [
    {
        id: 'chatgpt', name: 'ChatGPT', blurb: 'Clean and calm: a helpful assistant for everyday questions.',
        colors: c('#0b0f0e', '#16201d', '#f2fbf8', '#8fb1a6', '#10a37f'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'minimal',
        scenes: [
            logo('ChatGPT', 'An assistant for whatever you are working on'),
            statement('real', 'Ask anything.', 'Get a real answer.'),
            chat('Just ask', ['user', 'Plan a three-day trip to Lisbon'], ['bot', 'Day 1: Alfama and the old trams. Day 2: Belém and the river. Day 3: Sintra.'], ['user', 'Make it kid-friendly'], ['bot', 'Swapped in the Oceanarium and a castle with a playground.']),
            grid('Why people reach for it', ['zap', 'Fast answers', 'From a quick fact to a full draft.'], ['sparkles', 'Writes and codes', 'Drafts, edits and debugs with you.'], ['users', 'For everyone', 'Students, teams and solo builders.']),
            proof(4.8, 'from example reviews', 'Loved by everyday users'),
            pricing('Pick a plan', ['Free', '$0', '/month', 'Everyday questions; Basic tools', 'no'], ['Plus', '$20', '/month', 'Everything in Free; Faster replies; Priority access', 'yes']),
            end('Start a conversation', 'Try ChatGPT', 'chatgpt.com'),
        ],
    },
    {
        id: 'claude', name: 'Claude', blurb: 'Warm and thoughtful: careful reasoning and long documents.',
        colors: c('#faf6f0', '#ffffff', '#2a1f18', '#7a6a5e', '#d97757'), fonts: { display: 'fraunces', body: 'inter' }, background: 'grain', style: 'apple-clean',
        scenes: [
            title('Meet', 'Claude', 'An AI that thinks things through with you'),
            kinetic('Think it through.\nThen get it done.', 'done', 'writing, analysis, code'),
            chat('Work it out together', ['user', 'Summarise this 40-page contract'], ['bot', 'Five key terms, two risks, and one clause worth negotiating.'], ['user', 'What is the risk in clause 9?'], ['bot', 'It lets either side end early without notice. Here is a safer wording.']),
            compare('Why people switch', 'Claude', 'Others', ['Reads whole documents', 'yes', 'partial'], ['Shows its reasoning', 'yes', 'no'], ['Careful with details', 'yes', 'partial']),
            faq('Good to know', ['Can it read long files?', 'Yes. Paste or upload a whole document.'], ['Can it write code?', 'Yes, and explain every change.'], ['Is it private?', 'Your conversations stay yours.']),
            quote('It reads what I send it carefully, and the answers actually help.', 'Customer name', 'Role, Company'),
            end('Think it through', 'Try Claude', 'claude.ai'),
        ],
    },
    {
        id: 'gemini', name: 'Gemini', blurb: 'Bright and expansive: text, images and your Google apps.',
        colors: c('#0b1020', '#1a2140', '#f3f6ff', '#9aa8d6', '#8ab4ff'), fonts: { display: 'plus-jakarta', body: 'plus-jakarta' }, background: 'flow', style: 'smooth',
        scenes: [
            title('Meet', 'Gemini', 'Help across text, images and the apps you use'),
            words('One assistant. Every kind of input.', 'blur'),
            orbit('Ask it about anything', 'Text', 'Images', 'Documents', 'Plans', 'Code', 'Ideas'),
            integrations('Gemini', 'Gmail', 'Docs', 'Maps', 'Calendar', 'Drive'),
            notifications('Help while you work', ['Trip planned', 'Three days, flights and a hotel'], ['Email drafted', 'A reply is ready to review'], ['Meeting added', 'Dinner is on your calendar at 7pm']),
            places('Used around the world', ['New York', 25, 38], ['London', 47, 28], ['Mumbai', 68, 52], ['Tokyo', 86, 40]),
            end('See what it can do', 'Try Gemini', 'gemini.google.com'),
        ],
    },
    {
        id: 'deepseek', name: 'DeepSeek', blurb: 'Sharp and technical: reasoning and code, shown step by step.',
        colors: c('#060b1a', '#0f1c3d', '#eef2ff', '#8d9bc7', '#4d6bfe'), fonts: { display: 'space-grotesk', body: 'inter' }, background: 'flow', style: 'neon-tech',
        scenes: [
            text3d('DeepSeek', 'Open reasoning for hard problems'),
            statement('reason', 'Hard problem?', 'Watch it reason.'),
            code('Ask it from code', 'ask.py', "from deepseek import chat\n\nanswer = chat('Why is my query slow?')\nprint(answer.reasoning)"),
            chart('Accuracy on your own benchmark', '%', ['Run 1', 62], ['Run 2', 71], ['Run 3', 78], ['Run 4', 86]),
            big('10x', 'less time spent debugging'),
            progress('ring', 92, 'Problems solved'),
            end('Put it to work', 'Try DeepSeek', 'deepseek.com'),
        ],
    },
    {
        id: 'grok', name: 'Grok', blurb: 'Bold and direct: quick, witty answers on what is happening now.',
        colors: c('#000000', '#141414', '#ffffff', '#9a9a9a', '#e6e6e6'), fonts: { display: 'geist-mono', body: 'inter' }, background: 'grain', style: 'brutalist',
        scenes: [
            title('Say hello to', 'Grok', 'Straight answers, in real time'),
            words('No fluff.\nJust the answer.', 'typewriter'),
            chat('Ask it now', ['user', 'What is everyone talking about today?'], ['bot', 'Three stories are trending. Here is the short version of each.'], ['user', 'Give me the funny one'], ['bot', 'A cat took over a live council meeting. The vote went 4 to 3 for the cat.']),
            notifications('Breaking, in short', ['Now', 'A one-line summary lands first'], ['Trending', 'Then the context behind it'], ['Fact-check', 'And what is still unconfirmed']),
            countdown('The next update lands in', 0, 2, 15, 'Placeholder date: set your own'),
            element('burst'),
            end('Ask it anything', 'Try Grok', 'grok.com'),
        ],
    },
    {
        id: 'google', name: 'Google', blurb: 'Open and bright: search, maps and tools that work together.',
        colors: c('#ffffff', '#f1f3f4', '#202124', '#5f6368', '#1a73e8'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'minimal',
        scenes: [
            title('Welcome to', 'Google', 'Find, make and do more, in one place'),
            network('Everything connected', 'Search, Maps, Mail and more, working together'),
            orbit('One account, many tools', 'Search', 'Maps', 'Mail', 'Photos', 'Drive', 'Calendar'),
            steps('Get an answer in three steps', ['Ask', 'Type, speak or point your camera.'], ['Explore', 'See answers, maps and ideas together.'], ['Do', 'Book, save or share with a tap.']),
            places('Helping people everywhere', ['San Francisco', 14, 38], ['London', 46, 26], ['Bangalore', 70, 56], ['Sydney', 88, 82]),
            stats('By the numbers (placeholders)', [3, 'Tools you use every day', '', '+', 'int'], [95, 'Find what they need', '', '%', 'percent'], [1, 'Account for all of it', '', '', 'int']),
            end('Start exploring', 'Open Google', 'google.com'),
        ],
    },
    {
        id: 'microsoft', name: 'Microsoft', blurb: 'Professional and dependable: tools for every team.',
        colors: c('#f3f3f3', '#ffffff', '#1b1b1b', '#616161', '#0078d4'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'editorial',
        scenes: [
            title('Welcome to', 'Microsoft', 'Tools that help every team get more done'),
            statement('together', 'Do more.', 'Together.'),
            card('Team plan', ['Share with the team', 'Sync across devices', 'Notify on changes'], ['Quarterly review', 'Launch checklist', 'Budget sign-off'], 'All changes saved'),
            integrations('Microsoft 365', 'Word', 'Excel', 'Teams', 'Outlook', 'PowerPoint'),
            roadmap('What is next', ['Now', 'Everything in one app', 'done'], ['Next', 'Smarter assistance', 'now'], ['Later', 'Even more connected', 'next']),
            quote('Our whole team works in one place now. Nothing gets lost.', 'Customer name', 'Role, Company'),
            end('Get your team started', 'Try Microsoft 365', 'microsoft.com'),
        ],
    },
    {
        id: 'github', name: 'GitHub', blurb: 'Developer-first: code, collaboration and shipping together.',
        colors: c('#0d1117', '#161b22', '#f0f6fc', '#8b949e', '#2ea043'), fonts: { display: 'inter', body: 'inter' }, background: 'gradient', style: 'snappy',
        scenes: [
            title('Welcome to', 'GitHub', 'The home for your code and collaboration'),
            kinetic('Build it.\nReview it.\nShip it.', 'Ship', 'features, fixes, releases'),
            code('Start in a few lines', 'deploy.yml', "name: Deploy\non: push\njobs:\n  ship:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4"),
            codeToUi('From config to running app', "const app = create({\n  review: true,\n  ci: 'on push',\n});\nawait app.start();", 'Pull request'),
            changelog("What's new", ['v1.0', 'Faster code review'], ['v1.1', 'Built-in automation'], ['v1.2', 'Better search']),
            compare('Why teams choose it', 'GitHub', 'Others', ['Review where the code lives', 'yes', 'partial'], ['Automation built in', 'yes', 'partial'], ['Open collaboration', 'yes', 'no']),
            end('Start building', 'Open GitHub', 'github.com'),
        ],
    },
    {
        id: 'notion', name: 'Notion', blurb: 'Quiet and flexible: notes, docs and projects in one workspace.',
        colors: c('#ffffff', '#f7f6f3', '#37352f', '#787774', '#2383e2'), fonts: { display: 'fraunces', body: 'inter' }, background: 'gradient', style: 'apple-clean',
        scenes: [
            title('Welcome to', 'Notion', 'One workspace for notes, docs and projects'),
            words('Write. Plan. Get it done.', 'rise'),
            cursor('New page', 'Launch plan', 'Create', 'Page created'),
            card('Launch plan', ['Share with team', 'Auto-save', 'Remind me'], ['Write the announcement', 'Review with design', 'Schedule the post'], 'Shared with the team'),
            grid('Everything in one place', ['sparkles', 'Docs', 'Write and organise anything.'], ['users', 'Teams', 'Work together in real time.'], ['zap', 'Projects', 'Track tasks from idea to done.']),
            steps('Set up in minutes', ['Create', 'Start a page.'], ['Organise', 'Add tables, tasks and notes.'], ['Share', 'Invite your team.']),
            end('Make it yours', 'Try Notion', 'notion.so'),
        ],
    },
    {
        id: 'slack', name: 'Slack', blurb: 'Lively and friendly: conversations that move work forward.',
        colors: c('#3f0e40', '#611f69', '#ffffff', '#d1b4d4', '#ecb22e'), fonts: { display: 'dm-sans', body: 'dm-sans' }, background: 'flow', style: 'energetic',
        scenes: [
            title('Say hello to', 'Slack', 'Where work happens'),
            chat('Talk it through', ['user', 'Can someone review the launch post?'], ['bot', 'On it. Two small edits, then it is good to go.'], ['user', 'Thanks! Scheduling it now'], ['bot', 'Scheduled for 9am Tuesday.']),
            notifications('Stay in the loop', ['New message', 'Priya replied in #launch'], ['Reminder', 'Review the post by noon'], ['Huddle', 'Sam started a call']),
            integrations('Slack', 'Google Drive', 'GitHub', 'Zoom', 'Asana', 'Salesforce'),
            proof(4.7, 'from example reviews', 'Favourite team chat'),
            changelog("What's new", ['v1', 'Channels for every topic'], ['v2', 'Quick huddles'], ['v3', 'Smarter search']),
            end('Bring your team together', 'Try Slack', 'slack.com'),
        ],
    },
    {
        id: 'figma', name: 'Figma', blurb: 'Creative and collaborative: design together on one canvas.',
        colors: c('#1e1e1e', '#2c2c2c', '#ffffff', '#a3a3a3', '#a259ff'), fonts: { display: 'outfit', body: 'outfit' }, background: 'flow', style: 'bold',
        scenes: [
            title('Meet', 'Figma', 'Design together, in one place'),
            words('Idea. Design. Handoff.', 'letters'),
            cursor('New frame', 'Landing page', 'Create', 'Frame created'),
            roadmap('From sketch to ship', ['Week 1', 'Explore ideas', 'done'], ['Week 2', 'Design the flow', 'now'], ['Week 3', 'Hand off to build', 'next']),
            progress('bar', 78, 'Design system adopted'),
            quote('Our designers and developers finally work on the same thing.', 'Customer name', 'Role, Company'),
            end('Start designing', 'Try Figma', 'figma.com'),
        ],
    },
    {
        id: 'stripe', name: 'Stripe', blurb: 'Precise and trustworthy: payments that scale with you.',
        colors: c('#0a2540', '#13375c', '#ffffff', '#9fb3c8', '#635bff'), fonts: { display: 'sora', body: 'sora' }, background: 'flow', style: 'cinematic',
        scenes: [
            big('1 line', 'to accept a payment'),
            code('Accept a payment', 'pay.js', "const session = await stripe.checkout.sessions.create({\n  mode: 'payment',\n  line_items: [{ price: 'price_123', quantity: 1 }],\n});"),
            chart('Revenue, quarter by quarter', 'k', ['Q1', 12], ['Q2', 21], ['Q3', 34], ['Q4', 58]),
            stats('Built to scale (placeholders)', [99, 'Uptime', '', '%', 'percent'], [135, 'Currencies', '', '+', 'int'], [1000, 'Teams on board', '', '+', 'compact']),
            pricing('Pay as you grow', ['Starter', '$0', '/month', 'Core payments; Test mode', 'no'], ['Scale', '$49', '/month', 'Everything in Starter; Reports; Priority support', 'yes']),
            places('Global from day one', ['Dublin', 45, 25], ['New York', 24, 38], ['Singapore', 76, 62], ['São Paulo', 32, 70]),
            end('Start accepting payments', 'Try Stripe', 'stripe.com'),
        ],
    },
    {
        id: 'spotify', name: 'Spotify', blurb: 'Playful and energetic: music for every moment.',
        colors: c('#121212', '#1f1f1f', '#ffffff', '#b3b3b3', '#1db954'), fonts: { display: 'outfit', body: 'outfit' }, background: 'gradient', style: 'vapor',
        scenes: [
            countdown('The new playlist drops in', 1, 6, 30, 'Placeholder date: set your own'),
            title('Press play on', 'Spotify', 'Music and podcasts for every mood'),
            element('sparkles'),
            grid('Made for you', ['sparkles', 'Daily mixes', 'Songs picked around your taste.'], ['zap', 'Instant play', 'Start listening in a tap.'], ['users', 'Shared playlists', 'Build one with friends.']),
            progress('ring', 85, 'Songs you will love'),
            kinetic('Listen to\nwhat you love.', 'love', 'music, podcasts, audiobooks'),
            end('Press play', 'Listen on Spotify', 'spotify.com'),
        ],
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
