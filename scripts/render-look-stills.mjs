#!/usr/bin/env node
// Re-renders the look-card stills in src/studio/looks/ (one TitleReveal frame per look in
// src/studio/styles.ts). Run after changing a look or the atmosphere: node scripts/render-look-stills.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'src/studio/looks');
const source = fs.readFileSync(path.join(root, 'src/studio/styles.ts'), 'utf8');
// shortcut: reads the look fields with a regex, not by importing styles.ts (it pulls in React scenes); fine while each look keeps `id:` first.
const list = source.slice(source.indexOf('export const STYLES'));
const looks = list.slice(0, list.indexOf('\n];')).split(/\bid: '/).slice(1).map((chunk) => {
    const body = chunk;
    const field = (name) => body.match(new RegExp(`\\b${name}: '([\\w-]+)'`))?.[1];
    const props = Object.fromEntries(['camera', 'atmosphere', 'type', 'palette', 'enter'].map((n) => [n, field(n)]).filter(([, v]) => v));
    return { id: chunk.slice(0, chunk.indexOf("'")), props };
});
fs.mkdirSync(out, { recursive: true });
const jobs = looks.map(({ id, props }) => ({ composition: 'TitleReveal', props, still: 90, frames: 150, fps: 30, width: 640, height: 360, out: path.join(out, `${id}.jpg`) }));
const file = path.join(os.tmpdir(), 'look-stills.json');
fs.writeFileSync(file, JSON.stringify(jobs));
execFileSync('node', ['render.mjs', '--jobs', file], { cwd: path.join(root, 'studio-renderer'), stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`Rendered ${jobs.length} stills to ${out}`);
