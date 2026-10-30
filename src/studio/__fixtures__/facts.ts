import type { DraftFacts } from '../aiDraft';

const empty: DraftFacts = { name: '', tagline: '', problem: '', features: [], steps: [], numbers: [], pricing: [], quote: { text: '', name: '', role: '' }, url: '', cta: '', code: '' };

export const SAAS: DraftFacts = {
    ...empty,
    name: 'Acme Notes',
    tagline: 'Notes that organise themselves',
    problem: 'Notes pile up and nobody finds anything',
    features: [
        { title: 'Auto tags', text: 'Every note is tagged as you type.' },
        { title: 'Instant search', text: 'Find any note in milliseconds.' },
        { title: 'Shared spaces', text: 'Work on notes together in real time.' },
    ],
    numbers: [{ value: 40, label: 'faster search', prefix: '', suffix: '%' }],
    quote: { text: 'It replaced three tools for us.', name: 'Dana Lee', role: 'Head of Ops' },
    url: 'acmenotes.com',
    cta: 'Start free',
};

export const BARE: DraftFacts = { ...empty, name: 'Tiny CLI', tagline: 'Rename files in bulk', url: 'tinycli.dev' };

// Facts read by hand from this repo's README.md (the only README in the repo): the whole page, and just its opening.
export const README_LONG: DraftFacts = {
    ...empty,
    name: 'Capturita',
    tagline: 'Record your screen, make it look great, share it.',
    features: [
        { title: 'Record', text: 'A screen, a window or an area, with mic, system audio and a camera bubble.' },
        { title: 'Edit', text: 'Trim, split, speed up, and auto-zoom that follows your clicks.' },
        { title: 'Captions', text: 'Captions from your voice, titles, and blur for private info.' },
        { title: 'AI editing', text: 'Type what to cut and review the edits it suggests.' },
        { title: 'Share', text: 'Export an MP4 or GIF, or upload to YouTube or Google Drive.' },
    ],
    steps: [
        { title: 'Record', text: 'Pick a screen, window or area and press Record.' },
        { title: 'Edit', text: 'Zooms are added on your clicks.' },
        { title: 'Export', text: 'Press Command E to export or upload.' },
    ],
    url: 'github.com/aryan2621/capturita',
    cta: 'Download for macOS',
};

export const README_SHORT: DraftFacts = { ...empty, name: 'Capturita', tagline: 'Screen recorder and editor for macOS.', cta: 'Download for macOS', url: 'github.com/aryan2621/capturita' };
