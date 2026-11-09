// The launch-scene catalog: one entry per scene, the single source of truth for the Scene library
// (what it shows) and for SCENES (what it edits). Kept free of app code: the renderer bundles it.
import type { ComponentType } from 'react';
import { AwardBadges, ButtonPress, FeatureListDrop, GithubStars, HighlightSweep, LaunchDateBadge, QrEndCard, QuoteWall, ScrambleResolve, UrlTyped, WaitlistEmail, WordFlip } from './story';
import { AiAgentSteps, AiPromptToResult, AiVoiceWave, ApiRequestResponse, OneCommandInstall, TerminalSession } from './tech';
import { BarChartRise, LeaderboardRace, LineChartDraw, MetricsGrid, OdometerDigits, RingProgress } from './data';
import { BentoTour, CommandPalette, DeviceRise, DropFileUpload, FormFillSuccess, KanbanDrag, MultiplayerCursors, OrbitGallery, SelectAskAi, SpotlightCard, ThemeRipple, ToastCascade, WindowFan } from './product';
import { BeforeAfter, ChaosCollapse, CinematicTitle, ColdOpen, Countdown, CostTicker, ErrorToCalm, FocusPull, PatternInterrupt, PersonaCallout, ShockStat, StrikeOldWay, TypedQuestion } from './hooks';
import type { LaunchItem, LaunchProps } from './kit';
import { MEDIA_SCENES } from './catalog-media';
import { BUILD_SCENES } from './catalog-build';
import { INSIGHT_SCENES } from './catalog-insight';
import { TYPE_SCENES } from './catalog-type';
import { SHAPE_SCENES } from './catalog-shapes';

export const LAUNCH_CATEGORIES = ['Hooks', 'Problem', 'Product reveal', 'UI demo', 'Code & AI', 'Data', 'Diagrams', 'Shapes', 'Text', 'Social proof', 'Closers'] as const;
type LaunchCategory = (typeof LAUNCH_CATEGORIES)[number];

/** The story beat a scene serves, in the order a launch video usually plays them. */
type LaunchBeat = 'Hook' | 'Problem' | 'Reveal' | 'Demo' | 'Proof' | 'Text' | 'CTA';

export interface LaunchScene {
    /** Composition id, as stored on the timeline. */
    id: string;
    title: string;
    category: LaunchCategory;
    beat: LaunchBeat;
    /** Seconds a new scene plays for. */
    duration: number;
    /** Seconds in of the moment sound should hit (the landing, the click, the reveal). */
    hit: number;
    difficulty: 'Simple' | 'Layered' | 'Showpiece';
    tags: string[];
    description: string;
    /** What happens, in order. */
    choreography: string;
    /** Advice for the person editing it. */
    tip: string;
    component: ComponentType<LaunchProps>;
    defaults: Partial<Pick<LaunchProps, 'eyebrow' | 'headline' | 'subtitle' | 'metric' | 'date' | 'items'>>;
    /** Extra settings beyond eyebrow and headline, with their labels. A missing key means the scene ignores it. */
    labels: Partial<Record<'subtitle' | 'metric' | 'date' | 'items' | 'image' | 'segment' | 'images', string>>;
    /** What each entry of its list holds (text, detail), and how many it takes. */
    list?: { text: string; detail?: string; max: number };
}

const L = (items: [string, string?][]): LaunchItem[] => items.map(([text, detail]) => ({ text, ...(detail ? { detail } : {}) }));
const sub = { subtitle: 'Supporting line' };

const CORE_SCENES: LaunchScene[] = [
    // ---- Hooks ----
    { id: 'LaunchColdOpen', title: 'Cold open', category: 'Hooks', beat: 'Hook', duration: 3, hit: 1, difficulty: 'Simple', tags: ['hook', 'type', 'fast'], component: ColdOpen,
        description: 'One bold sentence lands word by word and names the outcome before anyone scrolls past.',
        choreography: 'Words pop in on a stagger, the last one in accent colour, then a rule draws and the subtitle follows.',
        tip: 'Nine words or fewer; the last word is the one that gets the accent.',
        defaults: { eyebrow: 'A better way to work', headline: 'Make every second count', subtitle: 'A clear promise for your launch.' }, labels: sub },
    { id: 'LaunchTypedQuestion', title: 'Typed question', category: 'Hooks', beat: 'Hook', duration: 3.6, hit: 1.7, difficulty: 'Simple', tags: ['hook', 'ai', 'typing'], component: TypedQuestion,
        description: 'A question types into a search box and invites the viewer to find out the answer.',
        choreography: 'The box glows, the question types, then the enter key lights up as the scene ends.',
        tip: 'One line only, especially in vertical video.',
        defaults: { eyebrow: 'What if', headline: 'Your next launch took minutes?', subtitle: 'Press enter to find out.' }, labels: sub },
    { id: 'LaunchShockStat', title: 'Shock stat', category: 'Hooks', beat: 'Hook', duration: 3.4, hit: 1.5, difficulty: 'Simple', tags: ['hook', 'number', 'stat'], component: ShockStat,
        description: 'A huge number counts up, lands with a flash, and a one-line claim explains it.',
        choreography: 'The figure counts, pops on landing, the rule draws, then the claim and source fade in.',
        tip: 'Use a number you can source; the "+" is added for you.',
        defaults: { eyebrow: 'In the first month', headline: 'teams switched', subtitle: 'Replace this with a verified result.', metric: 1200 }, labels: { ...sub, metric: 'Number' } },
    { id: 'LaunchPatternInterrupt', title: 'Pattern interrupt', category: 'Hooks', beat: 'Hook', duration: 2.4, hit: 0.8, difficulty: 'Simple', tags: ['hook', 'glitch', 'bold'], component: PatternInterrupt,
        description: 'A jolt of RGB-split glitch snaps the viewer awake, then the line settles.',
        choreography: 'A white flash, a jittering split-colour headline that calms to a steady one, then the subtitle.',
        tip: 'Use once per video; it only works as a surprise.',
        defaults: { eyebrow: 'Stop scrolling', headline: 'This changes everything', subtitle: 'Seriously. Watch.' }, labels: sub },
    { id: 'LaunchCountdown', title: 'Countdown', category: 'Hooks', beat: 'Hook', duration: 3.6, hit: 1.8, difficulty: 'Simple', tags: ['hook', 'countdown', 'event'], component: Countdown,
        description: 'A ring counts down to GO with a date underneath, for launch-day energy.',
        choreography: 'The ring sweeps once per number, each digit punches in, and GO lands in accent colour.',
        tip: 'Counts from 1 to 5; keep it to 3 for a short clip.',
        defaults: { eyebrow: 'Launching', headline: 'Launch day', subtitle: 'Something new is here.', metric: 3, date: 'Tuesday · 9:00 AM' }, labels: { ...sub, metric: 'Count from', date: 'Line under the count' } },
    { id: 'LaunchCinematicTitle', title: 'Cinematic title', category: 'Hooks', beat: 'Hook', duration: 3.6, hit: 1.2, difficulty: 'Simple', tags: ['hook', 'film', 'title'], component: CinematicTitle,
        description: 'Letterbox bars close in and a wide-tracked title fades up like a film opening.',
        choreography: 'Bars slide in, tracking tightens as the title fades up, a rule draws, then the subtitle.',
        tip: 'Short titles read best with this much letter-spacing.',
        defaults: { eyebrow: 'Introducing', headline: 'The Next Chapter', subtitle: 'Available today.' }, labels: sub },
    { id: 'LaunchFocusPull', title: 'Focus pull', category: 'Hooks', beat: 'Hook', duration: 3.2, hit: 1, difficulty: 'Simple', tags: ['hook', 'blur', 'title'], component: FocusPull,
        description: 'A blurred headline snaps into focus as a light sweep crosses the frame.',
        choreography: 'Blur resolves and scale settles, then a sheen sweeps across and the subtitle appears.',
        tip: 'Pairs well after a dark, empty frame.',
        defaults: { eyebrow: 'Now in focus', headline: 'See your work clearly', subtitle: 'Everything in one place.' }, labels: sub },
    { id: 'LaunchPersonaCallout', title: 'Who it\'s for', category: 'Hooks', beat: 'Hook', duration: 3.6, hit: 1.7, difficulty: 'Simple', tags: ['hook', 'audience', 'chips'], component: PersonaCallout,
        description: 'Audience chips light up one by one, then the headline speaks to all of them.',
        choreography: 'Chips pop in, each takes a turn highlighted, then all light together as the headline rises.',
        tip: 'Three to five audiences; name real roles, not "everyone".',
        defaults: { eyebrow: 'Built for', headline: 'Teams that ship fast', subtitle: 'No matter how big the team.', items: L([['Founders'], ['Designers'], ['Engineers'], ['Marketers']]) }, labels: { ...sub, items: 'Audiences' }, list: { text: 'Audience', max: 5 } },

    // ---- Problem ----
    { id: 'LaunchStrikeOldWay', title: 'Strike the old way', category: 'Problem', beat: 'Problem', duration: 4.2, hit: 2, difficulty: 'Simple', tags: ['problem', 'list', 'strike'], component: StrikeOldWay,
        description: 'Frustrating steps appear and are crossed out one by one before the fix lands.',
        choreography: 'Steps slide in, each is struck through in turn and dims, then the new headline fades in.',
        tip: 'Three steps is plenty. Make them painfully specific.',
        defaults: { eyebrow: 'The old way', headline: 'There is a faster way.', items: L([['Copy the same details again'], ['Wait for another approval'], ['Chase updates across tabs']]) }, labels: { items: 'Steps' }, list: { text: 'Step', max: 5 } },
    { id: 'LaunchChaosCollapse', title: 'Chaos collapse', category: 'Problem', beat: 'Problem', duration: 3.6, hit: 1.4, difficulty: 'Layered', tags: ['problem', 'clutter', 'reveal'], component: ChaosCollapse,
        description: 'A mess of scattered tools and files pulls into one calm card.',
        choreography: 'Chips drift around the frame, then fly to the centre and fade as the answer card scales up.',
        tip: 'Use names from your audience\'s real day.',
        defaults: { eyebrow: 'All in one place', headline: 'One calm workspace', subtitle: 'Everything finally connected.', items: L([['Inbox · 12'], ['Untitled.csv'], ['Meeting notes'], ['Draft v4'], ['Approval needed'], ['Copy of copy']]) }, labels: { ...sub, items: 'Clutter' }, list: { text: 'Item', max: 8 } },
    { id: 'LaunchBeforeAfter', title: 'Before / after', category: 'Problem', beat: 'Problem', duration: 4, hit: 1.5, difficulty: 'Simple', tags: ['problem', 'compare', 'wipe'], component: BeforeAfter,
        description: 'A divider wipes a messy "before" into a clean, coloured "after".',
        choreography: 'The wipe sweeps right, the old side desaturates and the new side stays vivid, then the caption.',
        tip: 'The first two lines are the Before and After; detail is the big line on each.',
        defaults: { headline: 'Same work. Half the effort.', subtitle: 'See the difference.', items: L([['Before', 'Six tools, scattered notes'], ['After', 'One shared workspace']]) }, labels: { ...sub, items: 'Before and after' }, list: { text: 'Label', detail: 'Description', max: 2 } },
    { id: 'LaunchCostTicker', title: 'Cost ticker', category: 'Problem', beat: 'Problem', duration: 3.6, hit: 2, difficulty: 'Simple', tags: ['problem', 'money', 'number'], component: CostTicker,
        description: 'A red meter climbs to show what the problem costs.',
        choreography: 'The figure accelerates upward with a pulsing red glow while a bar fills, then the caption.',
        tip: 'The symbol before the first digit of "Currency" is used; keep the cost believable.',
        defaults: { eyebrow: 'The hidden cost', headline: 'lost to busywork every year', subtitle: 'Per team, on average.', metric: 48000, date: '$' }, labels: { ...sub, metric: 'Amount', date: 'Currency symbol' } },
    { id: 'LaunchErrorToCalm', title: 'Error to calm', category: 'Problem', beat: 'Problem', duration: 3.8, hit: 1.5, difficulty: 'Layered', tags: ['problem', 'errors', 'relief'], component: ErrorToCalm,
        description: 'Shaking error toasts clear to make room for a calm, confirmed state.',
        choreography: 'Red warnings stack and tremble, then dissolve as a card with a drawn check scales in.',
        tip: 'Use the exact error wording your users know.',
        defaults: { eyebrow: 'Fixed', headline: 'Everything just works', subtitle: 'No more error messages.', items: L([['Something went wrong'], ['Could not sync changes'], ['Try again later']]) }, labels: { ...sub, items: 'Errors' }, list: { text: 'Message', max: 4 } },

    // ---- Product reveal ----
    { id: 'LaunchDeviceRise', title: 'Device rise', category: 'Product reveal', beat: 'Reveal', duration: 4.6, hit: 0.55, difficulty: 'Layered', tags: ['reveal', 'device', '3d'], component: DeviceRise,
        description: 'A laptop tilts up out of the dark showing your product, with the headline beneath.',
        choreography: 'The device rises and un-tilts in perspective, then the headline and subtitle fade in.',
        tip: 'Shows your recording (or a screenshot) on the screen.',
        defaults: { eyebrow: 'Meet the new workspace', headline: 'Built for the way you work', subtitle: 'Fast, focused and finally yours.' }, labels: { ...sub, segment: 'Part of the recording', images: 'Screenshots (instead of the recording)' } },
    { id: 'LaunchSpotlightCard', title: 'Spotlight card', category: 'Product reveal', beat: 'Reveal', duration: 4.2, hit: 0.4, difficulty: 'Simple', tags: ['reveal', 'card', 'glow'], component: SpotlightCard,
        description: 'A single card with a roaming light that follows the eye across the headline.',
        choreography: 'The card rises into place while a coloured spotlight drifts across its surface.',
        tip: 'Good for a single, important statement.',
        defaults: { eyebrow: 'The big idea', headline: 'One place for everything', subtitle: 'Bring the whole story together.' }, labels: sub },
    { id: 'LaunchBentoTour', title: 'Bento tour', category: 'Product reveal', beat: 'Reveal', duration: 4.8, hit: 0.9, difficulty: 'Layered', tags: ['reveal', 'features', 'grid'], component: BentoTour,
        description: 'A grid of feature tiles builds up and the highlight tours through each one.',
        choreography: 'Tiles rise on a stagger, then a glow moves from tile to tile.',
        tip: 'Three to six features; the first tile is the widest.',
        defaults: { headline: 'Everything you need', subtitle: 'And nothing you don\'t.', items: L([['Make it yours', 'Themes and brand kits'], ['Move faster', 'Shortcuts everywhere'], ['Stay in sync', 'Live across devices'], ['Share it', 'One link, anyone']]) }, labels: { ...sub, items: 'Features' }, list: { text: 'Feature', detail: 'Detail', max: 6 } },
    { id: 'LaunchOrbitGallery', title: 'Orbit', category: 'Product reveal', beat: 'Reveal', duration: 5, hit: 2.2, difficulty: 'Showpiece', tags: ['reveal', 'orbit', 'features'], component: OrbitGallery,
        description: 'Feature labels circle a central headline, growing as they pass in front.',
        choreography: 'Labels pop in and orbit with depth; those nearer the camera scale up and brighten.',
        tip: 'Four to six short labels.',
        defaults: { eyebrow: 'Around one idea', headline: 'Explore what is possible', subtitle: 'A few highlights.', items: L([['Create'], ['Review'], ['Share'], ['Automate'], ['Measure']]) }, labels: { ...sub, items: 'Orbiting labels' }, list: { text: 'Label', max: 6 } },
    { id: 'LaunchWindowFan', title: 'Window fan', category: 'Product reveal', beat: 'Reveal', duration: 4.6, hit: 0.7, difficulty: 'Layered', tags: ['reveal', 'windows', 'screens'], component: WindowFan,
        description: 'A stack of app windows fans out like a hand of cards.',
        choreography: 'Windows start stacked and spread out and tilt, then the headline appears.',
        tip: 'Name each window after a screen of your product.',
        defaults: { headline: 'Every screen, polished', subtitle: 'Designed to work together.', items: L([['Home', 'Overview'], ['Editor', 'Create'], ['Review', 'Feedback'], ['Share', 'Publish'], ['Insights', 'Results']]) }, labels: { ...sub, items: 'Windows', images: 'Screenshots (one per window; the first window shows the recording if none)' }, list: { text: 'Title', detail: 'Caption', max: 5 } },

    // ---- UI demo ----
    { id: 'LaunchCommandPalette', title: 'Command palette', category: 'UI demo', beat: 'Demo', duration: 4.6, hit: 2.4, difficulty: 'Layered', tags: ['demo', 'ui', 'shortcut'], component: CommandPalette,
        description: 'A palette opens over the app, filters as you type and runs the first action.',
        choreography: 'The backdrop dims, the palette opens, a query types, the list filters and a confirmation toast appears.',
        tip: 'The first action is the one that runs.',
        defaults: { eyebrow: 'Keyboard first', headline: 'Do anything in two keystrokes', subtitle: 'Press ⌘K from anywhere.', items: L([['New project', '⌘N'], ['New note', '⇧N'], ['Open recent', '⌘O'], ['Search files', '⌘F'], ['Settings', '⌘,']]) }, labels: { ...sub, items: 'Actions', segment: 'Part of the recording', images: 'Screenshots (instead of the recording)' }, list: { text: 'Action', detail: 'Shortcut', max: 5 } },
    { id: 'LaunchToastCascade', title: 'Toast cascade', category: 'UI demo', beat: 'Demo', duration: 4.6, hit: 0.7, difficulty: 'Simple', tags: ['demo', 'notifications', 'stack'], component: ToastCascade,
        description: 'Notification toasts slide in one after another, each ticking its check.',
        choreography: 'Toasts spring in from the right on a stagger and their checks draw.',
        tip: 'Show real outcomes: what the product just did for the user.',
        defaults: { eyebrow: 'While you were away', headline: 'It handled everything', subtitle: 'Notifications that matter.', items: L([['Export finished', 'launch-video.mp4 is ready'], ['Invite accepted', 'Sam joined the workspace'], ['Backup complete', 'Everything is safe']]) }, labels: { ...sub, items: 'Toasts' }, list: { text: 'Title', detail: 'Message', max: 4 } },
    { id: 'LaunchKanbanDrag', title: 'Kanban drag', category: 'UI demo', beat: 'Demo', duration: 4.2, hit: 1.8, difficulty: 'Layered', tags: ['demo', 'drag', 'board'], component: KanbanDrag,
        description: 'A card is picked up, tilts, and dropped into the next column.',
        choreography: 'A cursor grabs the first card, carries it across with a tilt, and the target column highlights.',
        tip: 'The first card is the one that moves.',
        defaults: { eyebrow: 'Drag. Drop. Done.', headline: 'Planning that moves with you', subtitle: 'Reorganise in a single gesture.', items: L([['Write launch post'], ['Design hero image'], ['Review pricing'], ['Record demo']]) }, labels: { ...sub, items: 'Cards' }, list: { text: 'Card', max: 4 } },
    { id: 'LaunchFormFill', title: 'Form fill', category: 'UI demo', beat: 'Demo', duration: 4.6, hit: 3.1, difficulty: 'Layered', tags: ['demo', 'form', 'signup'], component: FormFillSuccess,
        description: 'Fields fill in with validation ticks, the button presses, and a success check bursts in.',
        choreography: 'Each field types and ticks, the cursor clicks submit, and the form fades to a big check.',
        tip: 'Each entry is a field label and the value typed into it.',
        defaults: { eyebrow: 'Sign up in seconds', headline: 'From zero to started', subtitle: 'No credit card required.', items: L([['Name', 'Alex Morgan'], ['Email', 'alex@studio.co'], ['Team', 'Studio']]) }, labels: { ...sub, items: 'Fields' }, list: { text: 'Field', detail: 'Value', max: 4 } },
    { id: 'LaunchSelectAskAi', title: 'Select and ask AI', category: 'UI demo', beat: 'Demo', duration: 5, hit: 1.8, difficulty: 'Layered', tags: ['demo', 'ai', 'text'], component: SelectAskAi,
        description: 'Text is selected, a floating toolbar appears and an AI answer streams in below.',
        choreography: 'The cursor drags a highlight, the toolbar pops, then the answer types out.',
        tip: 'The supporting line is what the AI says.',
        defaults: { eyebrow: 'AI where you work', headline: 'Highlight. Ask. Done.', subtitle: 'Shorter, clearer, and ready to send in one pass.' }, labels: { subtitle: 'AI answer' } },
    { id: 'LaunchDropUpload', title: 'Drop to upload', category: 'UI demo', beat: 'Demo', duration: 4.2, hit: 1.1, difficulty: 'Layered', tags: ['demo', 'upload', 'drag'], component: DropFileUpload,
        description: 'A file is dragged into a drop zone, the zone lights up and a progress bar fills.',
        choreography: 'The file chip flies in, the zone highlights, then the file card appears and uploads.',
        tip: 'Enter your own file name as the first line.',
        defaults: { eyebrow: 'Just drop it in', headline: 'Upload without thinking', subtitle: 'Any file, any size.', items: L([['launch-plan.pdf']]) }, labels: { ...sub, items: 'File' }, list: { text: 'File name', max: 1 } },
    { id: 'LaunchMultiplayer', title: 'Multiplayer cursors', category: 'UI demo', beat: 'Demo', duration: 5, hit: 0.5, difficulty: 'Layered', tags: ['demo', 'collab', 'cursors'], component: MultiplayerCursors,
        description: 'Named cursors glide across a shared canvas, working at the same time.',
        choreography: 'Cursors fade in with name tags and drift along their own paths over placeholder blocks.',
        tip: 'Use your teammates\' real first names.',
        defaults: { eyebrow: 'Better together', headline: 'Everyone, in the same place', subtitle: 'Real-time collaboration.', items: L([['Priya'], ['Sam'], ['Jordan']]) }, labels: { ...sub, items: 'People' }, list: { text: 'Name', max: 4 } },
    { id: 'LaunchThemeRipple', title: 'Theme ripple', category: 'UI demo', beat: 'Demo', duration: 4.6, hit: 0.9, difficulty: 'Simple', tags: ['demo', 'theme', 'dark-mode'], component: ThemeRipple,
        description: 'Switching to light mode sends a circular ripple of the new theme across the UI.',
        choreography: 'The cursor clicks the toggle and a circle of light theme expands from it.',
        tip: 'The eyebrow doubles as the screen\'s title.',
        defaults: { eyebrow: 'Dashboard', headline: 'Light, dark or yours', subtitle: 'Make it match your brand.' }, labels: sub },

    // ---- Code & AI ----
    { id: 'LaunchTerminalSession', title: 'Terminal session', category: 'Code & AI', beat: 'Demo', duration: 4.4, hit: 2.8, difficulty: 'Simple', tags: ['code', 'terminal', 'dev'], component: TerminalSession,
        description: 'Commands type into a terminal one by one, each with a green result.',
        choreography: 'Each command types with a caret, then its result appears with a tick.',
        tip: 'Detail is the result printed under each command.',
        defaults: { eyebrow: 'From your terminal', headline: 'Deploy in three commands', subtitle: 'Works with the tools you already use.', items: L([['git push', 'Pushed to main'], ['npm run build', 'Built in 4.2s'], ['launch deploy', 'Live at launch.app']]) }, labels: { ...sub, items: 'Commands' }, list: { text: 'Command', detail: 'Result', max: 4 } },
    { id: 'LaunchOneCommand', title: 'One-command install', category: 'Code & AI', beat: 'Demo', duration: 3.8, hit: 2.5, difficulty: 'Simple', tags: ['code', 'install', 'dev'], component: OneCommandInstall,
        description: 'One install command types, a progress bar fills, and "ready" lands.',
        choreography: 'The command types, the bar fills with a glow, then the success line rises.',
        tip: 'Detail is the line printed once it finishes.',
        defaults: { eyebrow: 'Get started', headline: 'One command. That\'s it.', subtitle: 'No config, no setup.', items: L([['npm create launch@latest', 'Ready in 4 seconds']]) }, labels: { ...sub, items: 'Command' }, list: { text: 'Command', detail: 'Success line', max: 1 } },
    { id: 'LaunchAiPrompt', title: 'Prompt to result', category: 'Code & AI', beat: 'Demo', duration: 5, hit: 1.7, difficulty: 'Layered', tags: ['ai', 'prompt', 'stream'], component: AiPromptToResult,
        description: 'A prompt is typed and sent, then a thought and a streaming answer appear.',
        choreography: 'The prompt types, the send button presses, the card shows Thinking then streams the answer.',
        tip: 'The supporting line is the answer; keep it two sentences.',
        defaults: { eyebrow: 'Ask anything', headline: 'Plan my launch week', subtitle: 'Start with a teaser on Monday, reveal the product on Wednesday and close with a clear call to action on Friday.' }, labels: { subtitle: 'Answer' } },
    { id: 'LaunchAgentSteps', title: 'Agent at work', category: 'Code & AI', beat: 'Demo', duration: 4.2, hit: 2.4, difficulty: 'Layered', tags: ['ai', 'agent', 'checklist'], component: AiAgentSteps,
        description: 'An agent works through a checklist, each step spinning and then ticking.',
        choreography: 'Steps light up in order, a spinner runs on the active one and a check draws when it finishes.',
        tip: 'Phrase steps as actions: "Reading the brief".',
        defaults: { eyebrow: 'Working on it', headline: 'Your agent handles it', subtitle: 'Hands-free from start to finish.', items: L([['Reading the brief', '2 pages'], ['Drafting the plan', '5 tasks'], ['Booking the team', 'Done'], ['Sending the update']]) }, labels: { ...sub, items: 'Steps' }, list: { text: 'Step', detail: 'Result', max: 5 } },
    { id: 'LaunchApiFlow', title: 'Request and response', category: 'Code & AI', beat: 'Demo', duration: 4, hit: 1.9, difficulty: 'Layered', tags: ['code', 'api', 'dev'], component: ApiRequestResponse,
        description: 'A request travels across and a 200 OK response comes back.',
        choreography: 'A dot carries the request out, the server panel lights up, and the response returns.',
        tip: 'Name is shown in the request, detail (a URL) in the response.',
        defaults: { eyebrow: 'One API call', headline: 'Ship it with one request', subtitle: 'Simple, predictable and fast.', items: L([['My product', 'launch.app']]) }, labels: { ...sub, items: 'Payload' }, list: { text: 'Name', detail: 'URL', max: 1 } },
    { id: 'LaunchVoiceWave', title: 'Voice input', category: 'Code & AI', beat: 'Demo', duration: 4.4, hit: 2.3, difficulty: 'Layered', tags: ['ai', 'voice', 'audio'], component: AiVoiceWave,
        description: 'A pulsing mic and live waveform turn speech into a typed line.',
        choreography: 'Rings pulse from the mic, bars dance, and the transcript types beneath.',
        tip: 'The headline is the spoken sentence.',
        defaults: { eyebrow: 'Just say it', headline: 'Schedule it for Friday morning', subtitle: 'Understood. Added to your calendar.' }, labels: sub },

    // ---- Data ----
    { id: 'LaunchLineChart', title: 'Line chart draw', category: 'Data', beat: 'Proof', duration: 4.4, hit: 2.3, difficulty: 'Simple', tags: ['data', 'chart', 'growth'], component: LineChartDraw,
        description: 'A growth curve draws itself while the headline number counts up.',
        choreography: 'The line draws with a filling area and a leading dot while the figure counts.',
        tip: 'The curve is illustrative; the number is what you set.',
        defaults: { eyebrow: 'Growth', headline: 'Weekly active teams', subtitle: 'Up and to the right.', metric: 12400 }, labels: { ...sub, metric: 'Final number' } },
    { id: 'LaunchBarChart', title: 'Bar chart rise', category: 'Data', beat: 'Proof', duration: 3.8, hit: 1.7, difficulty: 'Simple', tags: ['data', 'chart', 'compare'], component: BarChartRise,
        description: 'Bars grow one after another with values counting up; the tallest glows.',
        choreography: 'Bars rise on a stagger, values count with them, and the biggest takes the accent.',
        tip: 'Detail is the value ("42", "$3M", "88%").',
        defaults: { eyebrow: 'Results', headline: 'Quarter over quarter', subtitle: 'Every quarter beats the last.', items: L([['Q1', '28'], ['Q2', '41'], ['Q3', '57'], ['Q4', '86']]) }, labels: { ...sub, items: 'Bars' }, list: { text: 'Label', detail: 'Value', max: 6 } },
    { id: 'LaunchRingProgress', title: 'Ring progress', category: 'Data', beat: 'Proof', duration: 3.6, hit: 1.9, difficulty: 'Simple', tags: ['data', 'percent', 'ring'], component: RingProgress,
        description: 'A glowing ring fills to a percentage with a big counter in the middle.',
        choreography: 'The ring sweeps to its value as the percentage counts up.',
        tip: 'Percentage runs 0–100.',
        defaults: { eyebrow: 'Satisfaction', headline: 'of customers recommend us', subtitle: 'Based on 2,000 reviews.', metric: 94 }, labels: { ...sub, metric: 'Percent' } },
    { id: 'LaunchLeaderboard', title: 'Leaderboard race', category: 'Data', beat: 'Proof', duration: 4.4, hit: 2.4, difficulty: 'Showpiece', tags: ['data', 'ranking', 'race'], component: LeaderboardRace,
        description: 'Rows race and trade places until the last one takes the lead.',
        choreography: 'Values climb, rows slide past each other smoothly, and the winner is outlined.',
        tip: 'Detail is each score; later rows climb slower, so a big value in the last row overtakes the rest.',
        defaults: { eyebrow: 'The ranking', headline: 'Watch us overtake', subtitle: 'From last place to first.', items: L([['Legacy suite', '72'], ['Tool B', '64'], ['Tool C', '58'], ['Us', '91']]) }, labels: { ...sub, items: 'Rows' }, list: { text: 'Name', detail: 'Score', max: 6 } },
    { id: 'LaunchOdometer', title: 'Odometer', category: 'Data', beat: 'Proof', duration: 3.8, hit: 1.8, difficulty: 'Layered', tags: ['data', 'number', 'counter'], component: OdometerDigits,
        description: 'Digit wheels roll like an odometer and lock onto the final number.',
        choreography: 'Each wheel spins and settles in turn from the left, then the label fades up.',
        tip: 'Whole numbers read best.',
        defaults: { eyebrow: 'And counting', headline: 'creators and counting', subtitle: 'Join them today.', metric: 125000 }, labels: { ...sub, metric: 'Number' } },
    { id: 'LaunchMetricsGrid', title: 'Metrics grid', category: 'Data', beat: 'Proof', duration: 4, hit: 1.4, difficulty: 'Simple', tags: ['data', 'stats', 'grid'], component: MetricsGrid,
        description: 'Three or four stat tiles count up side by side.',
        choreography: 'Tiles rise on a stagger and their numbers count up with the unit kept in accent.',
        tip: 'Detail is the figure with its sign or unit ("4.8★", "99%", "$2M").',
        defaults: { eyebrow: 'By the numbers', headline: 'Results that speak for themselves', subtitle: '', items: L([['Faster launches', '3x'], ['Time saved', '40%'], ['Happy teams', '2000']]) }, labels: { ...sub, items: 'Stats' }, list: { text: 'Label', detail: 'Figure', max: 4 } },

    // ---- Text ----
    { id: 'LaunchWordFlip', title: 'Word flip', category: 'Text', beat: 'Text', duration: 4.4, hit: 2.8, difficulty: 'Simple', tags: ['type', 'words', 'rotating'], component: WordFlip,
        description: 'A fixed phrase with one word that flips through your audiences or benefits.',
        choreography: 'The words roll up through a mask one at a time and stop on the last.',
        tip: 'Keep the flipping words about the same length.',
        defaults: { eyebrow: 'Made for', headline: 'Built for', subtitle: 'Whoever you are.', items: L([['founders'], ['designers'], ['makers'], ['everyone']]) }, labels: { ...sub, items: 'Flipping words' }, list: { text: 'Word', max: 5 } },
    { id: 'LaunchHighlightSweep', title: 'Highlight sweep', category: 'Text', beat: 'Text', duration: 3.4, hit: 1, difficulty: 'Simple', tags: ['type', 'highlight', 'emphasis'], component: HighlightSweep,
        description: 'A marker sweeps behind the key phrase of the headline.',
        choreography: 'The headline fades in, then a colour bar wipes behind its last two words.',
        tip: 'The last two words get the highlight.',
        defaults: { eyebrow: 'Why it matters', headline: 'Launch with confidence', subtitle: 'Every detail handled.' }, labels: sub },
    { id: 'LaunchScramble', title: 'Scramble resolve', category: 'Text', beat: 'Text', duration: 3.6, hit: 1.5, difficulty: 'Simple', tags: ['type', 'tech', 'glitch'], component: ScrambleResolve,
        description: 'Random characters scramble and resolve into the headline, left to right.',
        choreography: 'Glyphs flicker and lock in order; the rule draws as it resolves.',
        tip: 'Great for technical or security products; keep the line short.',
        defaults: { eyebrow: 'Decoding', headline: 'Secure by default', subtitle: 'Encrypted end to end.' }, labels: sub },
    { id: 'LaunchFeatureList', title: 'Feature list drop', category: 'Text', beat: 'Text', duration: 4.6, hit: 0.45, difficulty: 'Simple', tags: ['type', 'features', 'list'], component: FeatureListDrop,
        description: 'Benefit lines drop in one by one, each with a drawn check.',
        choreography: 'Lines fall into place on a bounce while their checks draw.',
        tip: 'Three to five lines; detail is an optional tag at the right.',
        defaults: { eyebrow: 'What you get', headline: 'Everything included', subtitle: '', items: L([['Unlimited projects'], ['Brand kits', 'New'], ['Priority export'], ['Free updates']]) }, labels: { ...sub, items: 'Benefits' }, list: { text: 'Benefit', detail: 'Tag', max: 6 } },

    // ---- Social proof ----
    { id: 'LaunchQuoteWall', title: 'Quote wall', category: 'Social proof', beat: 'Proof', duration: 5.4, hit: 0.5, difficulty: 'Layered', tags: ['proof', 'reviews', 'quotes'], component: QuoteWall,
        description: 'A staggered wall of customer quotes drifts gently upward.',
        choreography: 'Quote cards pop in column by column while the wall drifts.',
        tip: 'Use real quotes with names and roles; detail is the attribution.',
        defaults: { eyebrow: 'Loved by teams', headline: 'Don\'t take our word for it', items: L([['It paid for itself in a week.', 'Priya · Head of Ops'], ['The cleanest tool we\'ve used.', 'Sam · Designer'], ['We shipped in half the time.', 'Jordan · Founder'], ['Our whole team switched.', 'Maya · Engineer']]) }, labels: { items: 'Quotes' }, list: { text: 'Quote', detail: 'Attribution', max: 6 } },
    { id: 'LaunchGithubStars', title: 'Stars counter', category: 'Social proof', beat: 'Proof', duration: 4.2, hit: 1.6, difficulty: 'Simple', tags: ['proof', 'stars', 'open-source'], component: GithubStars,
        description: 'A star spins in and a counter climbs, ending with a flare.',
        choreography: 'The star rotates upright while the count rises, then pulses on the final number.',
        tip: 'Use the real count at publish time.',
        defaults: { eyebrow: 'Open source', headline: 'stars on GitHub', subtitle: 'Thank you for building with us.', metric: 18400 }, labels: { ...sub, metric: 'Stars' } },
    { id: 'LaunchAwardBadges', title: 'Award badges', category: 'Social proof', beat: 'Proof', duration: 4.4, hit: 0.5, difficulty: 'Simple', tags: ['proof', 'awards', 'badges'], component: AwardBadges,
        description: 'Award badges pop in and catch a passing shine.',
        choreography: 'Badges spring in on a stagger, then a sheen sweeps across each.',
        tip: 'Only show awards you have actually won.',
        defaults: { eyebrow: 'Recognised by', headline: 'Awards and honours', subtitle: '', items: L([['Product of the Day', '#1 · 2026'], ['Editor\'s Choice', 'App Store'], ['Best New Tool', 'Design Awards']]) }, labels: { ...sub, items: 'Badges' }, list: { text: 'Award', detail: 'Source', max: 4 } },

    // ---- Closers ----
    { id: 'LaunchUrlTyped', title: 'URL typed', category: 'Closers', beat: 'CTA', duration: 4.4, hit: 2, difficulty: 'Simple', tags: ['cta', 'url', 'browser'], component: UrlTyped,
        description: 'A web address types into a browser bar and the page loads with a button.',
        choreography: 'The URL types, a load bar runs, then the page headline and button appear.',
        tip: 'The "Detail" is the URL typed; keep it short enough to read.',
        defaults: { eyebrow: 'Try it today', headline: 'Start free today', subtitle: 'No credit card needed.', date: 'launch.app/start' }, labels: { ...sub, date: 'URL' } },
    { id: 'LaunchWaitlist', title: 'Waitlist signup', category: 'Closers', beat: 'CTA', duration: 4.4, hit: 2, difficulty: 'Simple', tags: ['cta', 'email', 'signup'], component: WaitlistEmail,
        description: 'An email address types into a pill field and the button flips to "You\'re in".',
        choreography: 'The email types, the button presses and turns green with a check.',
        tip: 'The "Detail" is the email shown in the field.',
        defaults: { eyebrow: 'Early access', headline: 'Be first in line', subtitle: 'Join 4,000 others on the waitlist.', date: 'you@company.com' }, labels: { ...sub, date: 'Email shown' } },
    { id: 'LaunchDateBadge', title: 'Launch date badge', category: 'Closers', beat: 'CTA', duration: 4.4, hit: 0.35, difficulty: 'Layered', tags: ['cta', 'date', 'badge'], component: LaunchDateBadge,
        description: 'A glowing badge with the launch date, ringed by slowly turning text.',
        choreography: 'The badge lands with a spin and settles; the ring keeps turning.',
        tip: 'The ring repeats the top line; keep it to a word or two.',
        defaults: { eyebrow: 'Launching', headline: 'Mark your calendar', subtitle: 'See you there.', date: 'Mar 18' }, labels: { ...sub, date: 'Date' } },
    { id: 'LaunchButtonPress', title: 'Button press', category: 'Closers', beat: 'CTA', duration: 3.8, hit: 1.3, difficulty: 'Simple', tags: ['cta', 'button', 'click'], component: ButtonPress,
        description: 'A pulsing call-to-action button gets clicked by a cursor.',
        choreography: 'The button pulses with rings, the cursor slides in and presses it.',
        tip: 'The button text should be a verb: "Start free".',
        defaults: { eyebrow: 'Ready?', headline: 'Make your move', subtitle: 'Free for 14 days.', date: 'Start free' }, labels: { ...sub, date: 'Button text' } },
    { id: 'LaunchQrEndCard', title: 'QR end card', category: 'Closers', beat: 'CTA', duration: 5.4, hit: 1.3, difficulty: 'Simple', tags: ['cta', 'qr', 'end-card'], component: QrEndCard,
        description: 'An end card with a scannable QR code, a headline and a short link.',
        choreography: 'The code and text fade up together and hold.',
        tip: 'Add your own QR image; the placeholder is not a real code.',
        defaults: { eyebrow: 'Scan to start', headline: 'Get it on your phone', subtitle: 'Available on iOS and Android.', date: 'launch.app/get' }, labels: { ...sub, date: 'Short link', image: 'QR code image' } },
];

export const LAUNCH_SCENES: LaunchScene[] = [...CORE_SCENES, ...MEDIA_SCENES, ...BUILD_SCENES, ...INSIGHT_SCENES, ...TYPE_SCENES, ...SHAPE_SCENES];
