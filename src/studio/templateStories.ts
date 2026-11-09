import type { TemplateScene } from './templates';

export interface TemplateStory {
    question: string;
    name: string;
    tagline: string;
    words: string[];
    reveal: [headline: string, subtitle: string];
    features: [headline: string, ...items: string[]];
    promise: [headline: string, subtitle: string];
    closer: [headline: string, button: string];
}

const items = (list: string[]) => list.map((text) => ({ text }));

export function launchStory(story: TemplateStory): TemplateScene[] {
    const [revealHeadline, revealSubtitle] = story.reveal;
    const [featuresHeadline, ...featureItems] = story.features;
    const [promiseHeadline, promiseSubtitle] = story.promise;
    const [closerHeadline, button] = story.closer;
    return [
        { scene: 'LaunchTypedQuestion', props: { eyebrow: 'Be honest', headline: story.question, subtitle: '' } },
        { scene: 'LaunchCinematicTitle', props: { eyebrow: 'Introducing', headline: story.name, subtitle: story.tagline } },
        { scene: 'LaunchFlyingWordsTunnel', props: { eyebrow: 'All in one place', headline: story.tagline, subtitle: '', items: items(story.words) } },
        { scene: 'LaunchDeviceRise', props: { eyebrow: story.name, headline: revealHeadline, subtitle: revealSubtitle } },
        { scene: 'LaunchFeatureList', props: { eyebrow: 'Everything built in', headline: featuresHeadline, subtitle: '', items: items(featureItems) } },
        { scene: 'LaunchOutlineFill', props: { eyebrow: 'Our promise', headline: promiseHeadline, subtitle: promiseSubtitle } },
        { scene: 'LaunchButtonPress', props: { eyebrow: 'Ready when you are', headline: closerHeadline, subtitle: '', date: button } },
    ];
}

export const STORIES: Record<string, TemplateStory> = {
    chatgpt: { question: 'Why does every small question take ten tabs?', name: 'ChatGPT', tagline: 'An assistant for whatever you are working on', words: ['Ask', 'Draft', 'Plan', 'Learn', 'Code', 'Create'], reveal: ['Ask anything. Get a real answer.', 'From a quick fact to a full draft.'], features: ['Why people reach for it', 'Fast answers', 'Writes and codes', 'Plans and explains', 'Built for everyone'], promise: ['Start with a question', 'The rest follows.'], closer: ['Start a conversation', 'Try ChatGPT'] },
    claude: { question: 'What if your AI actually thought things through?', name: 'Claude', tagline: 'Think it through, then get it done', words: ['Read', 'Reason', 'Write', 'Review', 'Refine', 'Ship'], reveal: ['Long documents, handled with care.', 'Careful with the details that matter.'], features: ['Work it out together', 'Reads whole documents', 'Shows its reasoning', 'Careful with details', 'Explains every change'], promise: ['Thoughtful by default', 'Slow down where it counts.'], closer: ['Think it through', 'Try Claude'] },
    gemini: { question: 'What if one assistant understood everything you share?', name: 'Gemini', tagline: 'Text, images and your Google apps together', words: ['Text', 'Images', 'Docs', 'Mail', 'Maps', 'Ideas'], reveal: ['One assistant, every format.', 'Ask with words, photos or files.'], features: ['Bright and expansive', 'Understands images', 'Connects your apps', 'Summarises in seconds', 'Helps you plan'], promise: ['Curious by design', 'Ask, explore, go further.'], closer: ['Explore what is possible', 'Try Gemini'] },
    deepseek: { question: 'Why do most answers skip the reasoning?', name: 'DeepSeek', tagline: 'Reasoning and code, shown step by step', words: ['Reason', 'Code', 'Debug', 'Prove', 'Explain', 'Solve'], reveal: ['See every step of the thinking.', 'Reasoning you can follow and check.'], features: ['Sharp and technical', 'Step-by-step reasoning', 'Writes and fixes code', 'Works through maths', 'Open about how it got there'], promise: ['Show your work', 'Every answer, every step.'], closer: ['Reason with it', 'Try DeepSeek'] },
    grok: { question: 'What is everyone actually talking about right now?', name: 'Grok', tagline: 'Quick, witty answers on what is happening now', words: ['Now', 'Fast', 'Direct', 'Witty', 'Real', 'Live'], reveal: ['Straight answers. Zero fluff.', 'Ask about right now.'], features: ['Bold and direct', 'Live and current', 'No hedging', 'A sense of humour', 'Short and sharp'], promise: ['Say it plainly', 'No filler. Just the answer.'], closer: ['Ask what is new', 'Try Grok'] },
    google: { question: 'Why are your tools scattered everywhere?', name: 'Google', tagline: 'Search, maps and tools that work together', words: ['Search', 'Maps', 'Mail', 'Docs', 'Photos', 'Calendar'], reveal: ['Everything works together.', 'Open, bright and one tap away.'], features: ['Open and bright', 'Search that understands', 'Maps that guide you', 'Docs that sync', 'Photos that stay organised'], promise: ['Built to connect', 'Your tools, working as one.'], closer: ['Find your way', 'Try Google'] },
    microsoft: { question: 'What if every team ran on the same page?', name: 'Microsoft', tagline: 'Tools for every team', words: ['Plan', 'Meet', 'Write', 'Analyse', 'Present', 'Share'], reveal: ['One workspace for the whole team.', 'Dependable tools for every role.'], features: ['Professional and dependable', 'Meetings that run well', 'Documents everyone can edit', 'Data you can trust', 'Secure by default'], promise: ['Built to last', 'Dependable, day after day.'], closer: ['Get your team started', 'Try Microsoft'] },
    github: { question: 'Where does your best code actually live?', name: 'GitHub', tagline: 'Code, collaboration and shipping together', words: ['Commit', 'Review', 'Merge', 'Test', 'Deploy', 'Repeat'], reveal: ['From first commit to shipped.', 'Collaborate without the friction.'], features: ['Developer first', 'Pull requests that flow', 'Reviews that help', 'Actions that automate', 'Releases you can trust'], promise: ['Ship it together', 'Every change, in the open.'], closer: ['Start building', 'Try GitHub'] },
    notion: { question: 'Why are your notes, docs and tasks in four places?', name: 'Notion', tagline: 'Notes, docs and projects in one workspace', words: ['Notes', 'Docs', 'Tasks', 'Wikis', 'Plans', 'Ideas'], reveal: ['One calm workspace.', 'Flexible enough for how you think.'], features: ['Quiet and flexible', 'Notes that grow into docs', 'Projects with context', 'Wikis your team keeps', 'Templates to start fast'], promise: ['Make it yours', 'Shape it however you work.'], closer: ['Start with a page', 'Try Notion'] },
    slack: { question: 'What if work conversations felt this easy?', name: 'Slack', tagline: 'Conversations that move work forward', words: ['Chat', 'Huddle', 'Share', 'Thread', 'Decide', 'Ship'], reveal: ['Where the team talks it through.', 'Channels, threads and quick huddles.'], features: ['Lively and friendly', 'Channels for every topic', 'Threads that stay tidy', 'Huddles in one click', 'Apps that plug in'], promise: ['Stay in the loop', 'Everyone, in the conversation.'], closer: ['Bring your team together', 'Try Slack'] },
    figma: { question: 'Why does design still happen in separate files?', name: 'Figma', tagline: 'Design together on one canvas', words: ['Sketch', 'Prototype', 'Comment', 'Share', 'Hand off', 'Build'], reveal: ['One canvas for the whole team.', 'Design and feedback in real time.'], features: ['Creative and collaborative', 'Live cursors on the canvas', 'Components that scale', 'Prototypes that feel real', 'Handoff without the guesswork'], promise: ['Design with everyone', 'Together, from first sketch.'], closer: ['Start designing', 'Try Figma'] },
    stripe: { question: 'What if getting paid just worked?', name: 'Stripe', tagline: 'Payments that scale with you', words: ['Charge', 'Subscribe', 'Invoice', 'Payout', 'Refund', 'Grow'], reveal: ['Payments, made precise.', 'From the first sale to the millionth.'], features: ['Precise and trustworthy', 'Accept payments anywhere', 'Subscriptions that renew', 'Invoices that send themselves', 'Reports you can rely on'], promise: ['Built to be trusted', 'Accurate, every time.'], closer: ['Start accepting payments', 'Try Stripe'] },
    spotify: { question: 'What does your next favourite song sound like?', name: 'Spotify', tagline: 'Music for every moment', words: ['Play', 'Discover', 'Share', 'Queue', 'Repeat', 'Dance'], reveal: ['A soundtrack for every moment.', 'Find something new, any time.'], features: ['Playful and energetic', 'Playlists made for you', 'Podcasts and music together', 'Share what you love', 'Listen anywhere'], promise: ['Turn it up', 'Your day, with a soundtrack.'], closer: ['Press play', 'Listen on Spotify'] },
};
