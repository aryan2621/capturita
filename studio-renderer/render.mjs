// Renders Studio motion scenes to video files.
//
//   node render.mjs --jobs <jobs.json> [--root <project folder>] [--bundle <prebuilt bundle folder>]
//     jobs.json: [{ composition, props, frames, fps, width, height, alpha?, out, ranges? }]. Bundles once (or
//     uses --bundle), renders each job, and prints one JSON line per update: {"progress": 0-1} for
//     the whole batch, {"download": 0-1} while Chrome Headless Shell downloads (first run only).
//     With --root, the project folder is served on 127.0.0.1 and every job gets
//     props.assets = { base }, so scenes can load the recording and the logo (see src/studio/assets.ts).
//     `ranges` (inclusive frame ranges, transparent .mov only): Chrome renders just those, and the
//     frames between are written as empty (alpha 0) ProRes by ffmpeg, then all are joined.
//     Chrome Headless Shell goes where Remotion keeps it for the working directory; the app runs
//     this from its data folder, so the download lands there and never inside the app bundle.
//
//   node render.mjs --build-bundle <out folder>
//     Bundles the scenes for shipping inside the app (scripts/build-studio-renderer.sh). Needs
//     @remotion/bundler, which the shipped renderer leaves out.
//
//   node render.mjs <compositionId> <out.mp4|out.mov|out.webm> [propsJson] [--alpha]
//     One scene at its registered size, for trying scenes from a terminal.
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';

const here = path.dirname(fileURLToPath(import.meta.url));
const appModules = path.resolve(here, '../node_modules');
// The GPU through ANGLE: the default software GL can't make the WebGL contexts 3D scenes need.
const chromiumOptions = { gl: 'angle' };
const BUNDLE_SHARE = 0.1;

const report = (progress) => process.stdout.write(`${JSON.stringify({ progress: Math.min(1, Math.max(0, progress)) })}\n`);
const argument = (name) => {
    const at = process.argv.indexOf(name);
    return at > 0 ? process.argv[at + 1] : undefined;
};

/** Exit code the app reads as "Chrome Headless Shell couldn't be downloaded". */
const NO_BROWSER = 3;

/** Downloads Chrome Headless Shell on first use, reporting {"download": 0-1}. */
async function browser() {
    try {
        const status = await ensureBrowser({
            onBrowserDownload: () => ({
                version: null,
                onProgress: ({ percent }) => process.stdout.write(`${JSON.stringify({ download: Math.min(1, Math.max(0, percent ?? 0)) })}\n`),
            }),
        });
        // Use the exact executable it found or fetched, when it says which.
        const executable = status?.path;
        return typeof executable === 'string' && (await fs.stat(executable).catch(() => null)) ? executable : undefined;
    } catch (error) {
        console.error(`Motion scenes need a one-time download of Chrome Headless Shell (about 100 MB), and it failed: ${error?.message ?? error}`);
        console.error('Check the internet connection and export again.');
        process.exit(NO_BROWSER);
    }
}

function codecFor(out, alpha) {
    // Overlays: VP9 with an alpha plane, which mediabunny's CanvasSink decodes in WKWebView.
    if (alpha && out.endsWith('.webm')) return { codec: 'vp9', pixelFormat: 'yuva420p', imageFormat: 'png', crf: 18, colorSpace: 'bt709' };
    if (alpha) return { codec: 'prores', proResProfile: '4444', pixelFormat: 'yuva444p10le', imageFormat: 'png' };
    // Limited-range BT.709, tagged like the recordings (the default writes untagged full range).
    return { codec: 'h264', crf: 16, colorSpace: 'bt709' };
}

const TYPES = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.json': 'application/json' };

/**
 * Serves `root` read-only on a free local port, with byte ranges so video can seek without
 * reading whole recordings. Paths arrive URL-encoded (`/%2Fscreen.mov`), like the preview's
 * asset URLs; anything resolving outside `root` is refused.
 */
async function serveFolder(root) {
    const base = path.resolve(root);
    const server = http.createServer(async (request, response) => {
        try {
            const file = path.resolve(base, `.${decodeURIComponent(new URL(request.url, 'http://x').pathname)}`);
            if (!file.startsWith(base + path.sep)) throw Object.assign(new Error('outside'), { status: 403 });
            const { size } = await fs.stat(file);
            const headers = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' };
            const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
            let start = 0;
            let end = size - 1;
            if (range) {
                start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
                end = range[1] && range[2] ? Math.min(end, Number(range[2])) : end;
                if (start > end || start >= size) {
                    response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
                    return;
                }
                response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
            } else {
                response.writeHead(200, { ...headers, 'Content-Length': size });
            }
            if (request.method === 'HEAD') return response.end();
            createReadStream(file, { start, end }).pipe(response);
        } catch (error) {
            response.writeHead(error.status ?? 404).end();
        }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { base: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

// Resolve remotion and react from the app, so export runs exactly the code the preview runs.
async function bundleScenes(onProgress, outDir) {
    // Only development and the app build have the bundler; the shipped renderer uses --bundle.
    const { bundle } = await import('@remotion/bundler');
    return bundle({
        entryPoint: path.join(here, 'entry/index.tsx'),
        ...(outDir ? { outDir } : {}),
        onProgress: (percent) => onProgress?.(percent / 100),
        webpackOverride: (config) => ({
            ...config,
            // `import x from 'file?url'` gives the file's URL, as in Vite (the Rive runtime's wasm).
            module: { ...config.module, rules: [{ resourceQuery: /url/, type: 'asset/resource' }, ...(config.module?.rules ?? [])] },
            resolve: {
                ...config.resolve,
                alias: {
                    ...(config.resolve?.alias ?? {}),
                    remotion: path.join(appModules, 'remotion'),
                    react: path.join(appModules, 'react'),
                    'react-dom': path.join(appModules, 'react-dom'),
                },
            },
        }),
    });
}

/** Runs the ffmpeg that ships with Remotion's compositor for this machine. */
async function ffmpeg(args) {
    const dir = path.dirname(createRequire(import.meta.url).resolve(`@remotion/compositor-darwin-${process.arch}/package.json`));
    await new Promise((resolve, reject) => {
        // Development copies load their dylibs by bare name; shipped ones are relinked to @loader_path.
        const child = spawn(path.join(dir, 'ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd: dir, env: { ...process.env, DYLD_LIBRARY_PATH: dir }, stdio: ['ignore', 'ignore', 'pipe'] });
        let errors = '';
        child.stderr.on('data', (chunk) => (errors += chunk));
        child.on('error', reject);
        child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${errors.trim()}`))));
    });
}

/**
 * A transparent .mov rendered in pieces: Chrome renders the frame ranges that have something on
 * screen, ffmpeg writes the frames between as empty ProRes 4444 (from one all-zero RGBA frame),
 * and the pieces are joined without re-encoding (ProRes is intra-only).
 */
async function renderRanges(serveUrl, composition, inputProps, job, partial, onProgress, browserExecutable) {
    const total = composition.durationInFrames;
    const pieces = [];
    let at = 0;
    for (const [from, to] of job.ranges) {
        const a = Math.max(at, from);
        const b = Math.min(total - 1, to);
        if (b < a) continue;
        if (a > at) pieces.push({ empty: true, from: at, to: a - 1 });
        pieces.push({ empty: false, from: a, to: b });
        at = b + 1;
    }
    if (at < total) pieces.push({ empty: true, from: at, to: total - 1 });
    const dir = `${partial}.pieces`;
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    try {
        const blank = path.join(dir, 'blank.rgba');
        await fs.writeFile(blank, Buffer.alloc(composition.width * composition.height * 4));
        // Chrome frames weigh more than empty ones in the progress.
        const weight = (piece) => (piece.to - piece.from + 1) * (piece.empty ? 0.05 : 1);
        const sum = pieces.reduce((n, piece) => n + weight(piece), 0);
        let done = 0;
        const list = [];
        for (const [index, piece] of pieces.entries()) {
            const file = path.join(dir, `${index}.mov`);
            const frames = piece.to - piece.from + 1;
            if (piece.empty) {
                await ffmpeg([
                    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${composition.width}x${composition.height}`, '-r', String(composition.fps), '-stream_loop', '-1', '-i', blank,
                    '-frames:v', String(frames), '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', '-an', file,
                ]);
            } else {
                await renderMedia({
                    composition,
                    serveUrl,
                    inputProps,
                    outputLocation: file,
                    frameRange: [piece.from, piece.to],
                    ...codecFor(job.out, true),
                    ...(browserExecutable ? { browserExecutable } : {}),
                    chromiumOptions,
                    onProgress: ({ progress }) => onProgress((done + weight(piece) * progress) / sum),
                });
            }
            done += weight(piece);
            onProgress(done / sum);
            list.push(`file '${file.replaceAll("'", "'\\''")}'`);
        }
        const listFile = path.join(dir, 'pieces.txt');
        await fs.writeFile(listFile, `${list.join('\n')}\n`);
        await ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-f', 'mov', partial]);
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

async function renderJob(serveUrl, job, onProgress, browserExecutable) {
    const inputProps = job.props ?? {};
    const registered = await selectComposition({ serveUrl, id: job.composition, inputProps, chromiumOptions, ...(browserExecutable ? { browserExecutable } : {}) });
    // The app decides size, length and rate; the registered values are only defaults.
    const composition = {
        ...registered,
        width: job.width ?? registered.width,
        height: job.height ?? registered.height,
        fps: job.fps ?? registered.fps,
        durationInFrames: job.frames ?? registered.durationInFrames,
    };
    // Render next to the target and rename when done, so a cancelled render never looks finished.
    const extension = path.extname(job.out);
    const partial = `${job.out.slice(0, -extension.length)}.part${extension}`;
    await fs.mkdir(path.dirname(job.out), { recursive: true });
    // A single frame as a picture (to look at a scene without rendering all of it).
    if (Number.isInteger(job.still)) {
        await renderStill({ composition, serveUrl, inputProps, output: partial, frame: job.still, imageFormat: 'jpeg', jpegQuality: 82, chromiumOptions, ...(browserExecutable ? { browserExecutable } : {}) });
        await fs.rename(partial, job.out);
        onProgress(1);
        return;
    }
    if (job.alpha && extension === '.mov' && Array.isArray(job.ranges)) {
        await renderRanges(serveUrl, composition, inputProps, job, partial, onProgress, browserExecutable);
        await fs.rename(partial, job.out);
        return;
    }
    await renderMedia({
        composition,
        serveUrl,
        inputProps,
        outputLocation: partial,
        ...codecFor(job.out, job.alpha),
        ...(browserExecutable ? { browserExecutable } : {}),
        chromiumOptions,
        onProgress: ({ progress }) => onProgress(progress),
    });
    await fs.rename(partial, job.out);
}

/** Saves a remote image as `<base>.<its real type>` when it really is one (and small enough); returns the file name or null. */
async function download(url, base) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        if (!response.ok || !type.startsWith('image/')) return null;
        const extension = { 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico' }[type] ?? type.slice(6).replace(/[^a-z0-9]/g, '') ?? 'png';
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 10_000_000) return null;
        await fs.writeFile(`${base}.${extension}`, bytes);
        return path.basename(`${base}.${extension}`);
    } catch {
        return null;
    }
}

const CAPTURE_SECTIONS = 6;

/**
 * Looks at a product's web page the way a viewer would: a hero shot, up to six more screenshots
 * scrolling down, one tall page, its logo and share image, brand colour and visible text. Files go
 * in `outDir`, named from `prefix`; a single {"capture": …} line on stdout lists them.
 */
async function capturePage(url, outDir, prefix, executablePath) {
    if (!/^https?:\/\//i.test(url)) throw new Error('Enter a web address starting with http:// or https://');
    const { default: puppeteer } = await import('puppeteer-core');
    await fs.mkdir(outDir, { recursive: true });
    const chrome = await puppeteer.launch({ executablePath, headless: 'shell' });
    try {
        const page = await chrome.newPage();
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(async (error) => {
            // Pages that never go quiet (analytics, chat widgets) are fine once they have loaded.
            if (!/timeout/i.test(String(error?.message))) throw error;
        });
        // Best effort: close a cookie banner so it isn't in every shot.
        await page.evaluate(() => {
            const button = [...document.querySelectorAll('button, a[role="button"]')].find((b) => /^(accept( all)?|agree|got it|allow all|ok)\b/i.test((b.textContent ?? '').trim()));
            button?.click();
        });
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const files = { hero: `${prefix}hero.png`, sections: [], full: null, logo: null, share: null };
        await page.screenshot({ path: path.join(outDir, files.hero) });
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let i = 1; i <= CAPTURE_SECTIONS && i * 900 < height; i++) {
            await page.evaluate((y) => window.scrollTo(0, y), i * 900);
            await new Promise((resolve) => setTimeout(resolve, 500));
            const name = `${prefix}section-${i}.png`;
            await page.screenshot({ path: path.join(outDir, name) });
            files.sections.push(name);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise((resolve) => setTimeout(resolve, 300));
        // One tall page for a scrolling shot, capped so a endless feed can't make a huge image.
        files.full = `${prefix}full.png`;
        await page.screenshot({ path: path.join(outDir, files.full), clip: { x: 0, y: 0, width: 1440, height: Math.min(height, 6000) }, captureBeyondViewport: true });

        const meta = await page.evaluate(() => {
            const content = (selector, attribute = 'content') => document.querySelector(selector)?.getAttribute(attribute) ?? '';
            const absolute = (value) => (value ? new URL(value, document.baseURI).href : '');
            return {
                title: content('meta[property="og:title"]') || document.title,
                description: content('meta[name="description"]') || content('meta[property="og:description"]'),
                themeColor: content('meta[name="theme-color"]'),
                share: absolute(content('meta[property="og:image"]')),
                logo: absolute(content('link[rel="apple-touch-icon"]', 'href') || content('link[rel~="icon"]', 'href')),
                text: document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 20000),
            };
        });
        if (meta.share) files.share = await download(meta.share, path.join(outDir, `${prefix}share`));
        if (meta.logo) files.logo = await download(meta.logo, path.join(outDir, `${prefix}logo`));
        process.stdout.write(`${JSON.stringify({ capture: { ...files, title: meta.title, description: meta.description, themeColor: meta.themeColor, text: meta.text } })}\n`);
    } finally {
        await chrome.close();
    }
}

if (process.argv[2] === '--capture') {
    const executable = await browser();
    await capturePage(process.argv[3], path.resolve(argument('--out')), argument('--prefix') ?? '', executable).catch((error) => {
        console.error(`Couldn't capture that page: ${error?.message ?? error}`);
        process.exit(1);
    });
} else if (process.argv[2] === '--build-bundle') {
    const out = path.resolve(process.argv[3]);
    await fs.rm(out, { recursive: true, force: true });
    await bundleScenes(undefined, out);
    console.log(`Bundled scenes into ${out}`);
} else if (process.argv[2] === '--jobs') {
    const jobs = JSON.parse(await fs.readFile(process.argv[3], 'utf8'));
    const root = argument('--root');
    const prebuilt = argument('--bundle');
    const executable = await browser();
    const files = root ? await serveFolder(root) : null;
    report(0);
    const share = prebuilt ? 0 : BUNDLE_SHARE;
    const serveUrl = prebuilt ? path.resolve(prebuilt) : await bundleScenes((p) => report(p * BUNDLE_SHARE));
    for (const [index, job] of jobs.entries()) {
        // `rendering` turns on export-only effects (motion blur) that would make the preview stutter.
        const props = { ...job.props, rendering: true, ...(files ? { assets: { base: files.base } } : {}) };
        const run = () => renderJob(serveUrl, { ...job, props }, (p) => report(share + (1 - share) * ((index + p) / jobs.length)), executable);
        // Chrome's first launch after its download can outlast the connect timeout (macOS scans the
        // new binary, worse under memory pressure); the second launch is quick.
        await run().catch((error) => {
            if (!/trying to connect to the browser/i.test(String(error?.message ?? error))) throw error;
            return run();
        });
    }
    files?.close();
    report(1);
} else {
    const [id, out, propsJson = '{}', ...flags] = process.argv.slice(2);
    const alpha = flags.includes('--alpha');
    const started = Date.now();
    const executable = await browser();
    const serveUrl = await bundleScenes();
    await renderJob(serveUrl, { composition: id, props: { ...JSON.parse(propsJson), transparent: alpha }, out: path.resolve(out), alpha }, (p) => process.stdout.write(`\r${Math.round(p * 100)}%`), executable);
    console.log(`\nRendered ${out} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
