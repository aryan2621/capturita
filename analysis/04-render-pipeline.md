# 04 - Render pipeline: composition to MP4/GIF/WebM

All paths are relative to the Remotion repo (`packages/...`). Claims are from code; "UNVERIFIED" marks anything I did not confirm in source. Docs were used only for the CSS-limitations list and the flicker rules.

## 0. Key finding for Capturita

Capturita's export already runs the same architecture as Remotion's newer in-browser renderer. `src/editor/export.ts` draws to a canvas, feeds it to mediabunny's `CanvasSource` (WebCodecs `avc`), mixes audio with `AudioBufferSource`, and streams the MP4 bytes to Rust through `export_write` (`src-tauri/src/export.rs`). Remotion's `web-renderer` uses the same encoder library (mediabunny) with the same shape: per frame, render to an OffscreenCanvas, wrap it in a `VideoFrame`, and call `VideoSampleSource.add`. So the work is not a new export path. The work is a new frame source (React/DOM scene to canvas) plugged into the existing encoder.

## 1. Bundler and composition discovery

- **Bundler**: webpack by default, rspack optional. `bundler/src/bundle.ts` imports `webpack` and `rspackConfig`, and selects with an `options.rspack` flag. Configs are `bundler/src/webpack-config.ts` and `bundler/src/rspack-config.ts`. esbuild-loader transpiles TSX with target `chrome85` (`webpackConfig` in `webpack-config.ts`).
- **Entry**: `webpackConfig` builds `entry` via `getStudioEntryPoints` (`@remotion/studio-shared`). It lists the user's root component (`userDefinedComponent`), an environment-setup module (`bundler/src/setup-environment.ts`), and a render entry (`studioRenderEntry`). The output is a static site folder that gets served over HTTP.
- **Registration**: the user calls `registerRoot(Component)` (`core/src/register-root.ts`, throws if called twice). The root renders `<Composition>` elements, which register in a context, and `core/src/Composition.tsx` records `window.remotion_seenCompositionIds`.
- **Discovery**: `getCompositions` (`renderer/src/get-compositions.ts`) opens the bundle in headless Chrome and calls `window.remotion_setBundleMode({type:'evaluation'})`. `selectComposition` (`renderer/src/select-composition.ts`, function `internalSelectComposition`) does the same, then runs `window.remotion_calculateComposition(id)` in the page. That evaluates `calculateMetadata` and returns the resolved width, height, fps, duration and props. Declared globals are in `core/src/index.ts`.
- **Takeaway**: a composition is not a file format. It is a React tree executed in a real page, and discovery means running it.

## 2. Headless browser capture

- **Browser**: Remotion ships a vendored Puppeteer fork (`renderer/src/browser/*`, with `BrowserFetcher.ts`, `Launcher.ts`, `Connection.ts` and others). It speaks CDP directly.
- **Download**: `ensureBrowser` (`renderer/src/ensure-browser.ts`) defaults `chromeMode` to `'headless-shell'`. `browser/get-chrome-download-url.ts` fetches from `remotion.media` for the headless-shell builds. The `chrome-for-testing-public` Google bucket is used for other modes or versions. Version is pinned (`TESTED_VERSION`).
- **Flags**: `renderer/src/open-browser.ts` sets the GL backend (`--use-gl=angle`, swiftshader or egl, vulkan variants) and disables background throttling (`--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows`, `--disable-ipc-flooding-protection`).
- **Setting a frame**: `seekToFrame` (`renderer/src/seek-to-frame.ts`) runs this sequence:
  1. `waitForReady`.
  2. `page.evaluate(window.remotion_setFrame(f, compositionId, attempt))`.
  3. `waitForReady` again.
  4. `document.fonts.ready`.
- **Inside the page**: `window.remotion_setFrame` is installed in `core/src/TimelineContext.tsx`. It calls `delayRender("Setting the current frame")`, updates React state, then calls `continueRender` after a `requestAnimationFrame`. If the frame is unchanged it continues immediately.
- **Readiness**: `core/src/delay-render.ts` keeps `window.remotion_delayRenderHandles`. `window.remotion_renderReady` is false while any handle is open and true when the list empties (`continueRenderInternal`). Each handle has a timeout (`delayRenderInternal`). On timeout it calls `cancelRenderInternal`, which sets `remotion_cancelledError`, and retries are supported. The Node side polls with `waitForFunction("window.remotion_renderReady === true ? ready : remotion_cancelledError !== undefined ? cancelled : false")` (`waitForReady` in `seek-to-frame.ts`, outer timeout is the delayRender timeout plus 3000 ms).
- **Screenshot**: `takeFrame` (`renderer/src/take-frame.ts`) calls `screenshot` (`puppeteer-screenshot.ts`), which calls `screenshotTask` (`screenshot-task.ts`). That sends CDP `Page.captureScreenshot` with `optimizeForSpeed: true`, `captureBeyondViewport: true`, `fromSurface`, and a clip of `width x height`. It does not use `HeadlessExperimental.beginFrame`. The only `beginFrame`-style mechanism is a custom CDP extension (below).
- **Image format**: `renderer/src/image-format.ts` defines `DEFAULT_VIDEO_IMAGE_FORMAT = 'jpeg'`; PNG is used for transparency. `takeFrame` sets `document.body.style.background` to `transparent` for png, pdf and webp, and `black` otherwise, and passes `omitBackground` for png and webp.
- **Remotion-specific CDP extension**: `screenshot-task.ts` passes `remotionFrameSlot`, `remotionFrameId` and `remotionFastViewport`. `renderer/src/remotion-shared-memory.ts` manages a frame pool, and `remotion-shared-memory-ffmpeg.ts` serializes pool and frame messages (`P\t...`, `F\t...`) to an FFmpeg input device named `remotionshm` (`prespawn-ffmpeg.ts`: `-f remotionshm -i remotion`). This is a raw-pixel path through shared memory with no PNG or JPEG encode. It needs a patched Chromium and a patched FFmpeg. I did not check whether those binaries are in this repo. UNVERIFIED which binaries ship it, and it is irrelevant to Capturita.
- **Not a screenshot of "the page" only**: the full window is captured, so anything on the page (CSS filters, `backdrop-filter`, WebGL, video) appears. This is why server-side rendering has near-perfect fidelity, and why the in-browser path (section 7) has a limitations list.

## 3. Stitching and ffmpeg

- **Entry**: `renderMedia` (`renderer/src/render-media.ts`) runs `renderFrames` and the encoder together. `stitchFramesToVideo` (`renderer/src/stitch-frames-to-video.ts`) is the standalone path.
- **Piping vs files**:
  - **Parallel encoding** (`canUseParallelEncoding` in `can-use-parallel-encoding.ts`) applies to h264, h264-mkv, h264-ts, h265, vp8, vp9, av1 and prores. `prespawnFfmpeg` (`prespawn-ffmpeg.ts`) starts FFmpeg before rendering and each captured frame is piped over stdin: `-f image2pipe -i -` (or `remotionshm`). `ensureFramesInOrder` (`ensure-frames-in-order.ts`) serializes writes so frames reach FFmpeg in order even though tabs finish out of order. A second pass in `stitchFramesToVideo` muxes video with audio.
  - **Image sequence on disk**: when not parallel (`outputDir: workingDir` in `render-media.ts`), frames are written to a temp dir and FFmpeg reads `-f image2 -i <imageSequenceName>` (`stitch-frames-to-video.ts`).
  - **GIF**: parallel encoding is excluded because the palette needs the whole video. It uses `-filter_complex split[v],palettegen,[v]paletteuse` (`stitch-frames-to-video.ts`) over the image sequence. Color space is forced to `bt601` for gif (`ffmpeg-args.ts`).
- **FFmpeg is a bundled binary, not a library call**: `call-ffmpeg.ts` spawns it, and `ffmpeg-override.ts` lets users edit the args.
- **Codecs** (`renderer/src/codec.ts`): h264, h265, vp8, vp9, av1, prores, gif, h264-mkv, h264-ts, plus audio-only mp3, aac, wav. Encoder choice is in `get-codec-name.ts`: `libvpx` and `libvpx-vp9` for webm, `prores_ks` for ProRes on software, and hardware variants `h264_videotoolbox`, `hevc_videotoolbox`, `prores_videotoolbox`, `h264_nvenc` and `hevc_nvenc` when hardware acceleration is requested.
- **Alpha** (`renderer/src/pixel-format.ts`, `ffmpeg-args.ts`, `stitch-frames-to-video.ts`):
  - `yuva420p` is allowed only for vp8 and vp9 (`validPixelFormatsForCodec`). It needs `-auto-alt-ref 0` and `alpha_mode=1` metadata.
  - ProRes alpha uses `yuva444p10le` in the pixel-format list. The ProRes 4444 profile mapping lives in `prores-profile.ts` and `get-prores-profile-name.ts`. I did not trace exactly which profiles pair with which format. UNVERIFIED.
  - The frames must be PNG with a transparent page background (`take-frame.ts`).
  - H.264 MP4 has no alpha.
- **Rust compositor role** (`compositor/rust/`): it is not the encoder. It handles video extraction for `<OffthreadVideo>`: decode with `ffmpeg_next`, a frame cache (`frame_cache.rs`, `frame_cache_manager.rs`), scaling (`scalable_frame.rs`), tone mapping (`tone_map.rs`) and PNG output (`image.rs`, via the `png` crate). It also provides `get_video_metadata`, `extract_audio` and `get_silent_parts` (`commands/mod.rs`). Node spawns it as a long-running child process and talks to it with JSON commands and nonce-tagged replies (`renderer/src/compositor/compositor.ts`).
- **OffthreadVideo**: `core/src/video/offthread-video-source.ts` builds `http://localhost:<remotion_proxyPort>/proxy?src=...&time=...&transparent=...&toneMapped=...`. `OffthreadVideoForRendering.tsx` fetches it under a `delayRender` and shows the result in an `<Img>`. The Node side (`renderer/src/offthread-video-server.ts`) asks the compositor for the frame at that time. Result: video frames come from an exact decoder, not from a `<video>` element's seeking.
- **Plain `<Video>`**: `core/src/video/seek-until-right.ts` (`seekToTimeMultipleUntilRight`) re-seeks a `<video>` element until `currentTime` lands within a threshold, using `requestVideoFrameCallback` or `seeked`. This exists because a single `currentTime =` assignment is imprecise.

## 4. Concurrency and frame ranges

- `renderFrames` (`renderer/src/render-frames.ts`): `resolveConcurrency` (`get-concurrency.ts`) defaults to `round(min(8, max(1, cpus/2)))` and caps at the CPU count. It opens `concurrencyOrFramesToRender = min(frameCount, concurrency)` pages as a `Pool` (`pool.ts`) and sends each frame to a free tab. Tabs do not share state. The frame list comes from `frameRange` and `everyNthFrame` (`framesToRender` in `render-frames.ts`, `getFramesToRender`).
- `cycle-browser-tabs.ts` exists (tab rotation to limit memory, not read in detail).
- Each page loads the bundle once, then gets `window.remotion_inputProps`, `remotion_initialFrame` and so on via `set-props-and-env.ts`, and then only `remotion_setFrame` per frame.

## 5. Audio

- **Collection**: each `<Audio>` or `<Video>` calls `registerRenderAsset`. `window.remotion_collectAssets` (`core/src/RenderAssetManager.tsx`) returns and clears the assets registered for the current frame. The renderer calls it after each capture (`renderer/src/collect-assets.ts`).
- **Per asset data**: source, start frame, per-frame volume array, playback rate and so on (`renderer/src/assets/types.ts`, not read line by line). Volume curves are baked: the volume is evaluated in React per frame (so a `volume={(f)=>...}` callback is sampled per frame), then `ffmpeg-volume-expression.ts` compresses the per-frame array into an FFmpeg `volume=` expression, and `calculate-atempo.ts` handles playback rate (atempo is limited to 0.5-2.0).
- **Mixing**: `createAudio` (`renderer/src/create-audio.ts`) downloads and normalizes assets (`convert-assets-to-file-urls.ts`), positions them (`calculate-asset-positions.ts`), preprocesses each track (`preprocess-audio-track.ts`), then merges. `create-ffmpeg-merge-filter.ts` pads each track and uses `amix=...:dropout_transition=0:normalize=0`. Newer inline audio tracks (from the media package) are mixed to a 48 kHz WAV in-process (`assets/inline-audio-mixing.ts`, `merge-inline-audio-tracks.ts`).
- **Seamless chunks**: AAC trimming and priming handling (`aac-priming.ts`, `seamless-aac-trim.ts`, `can-concat-seamlessly.ts`: `canConcatAudioSeamlessly` is AAC-only, `canConcatVideoSeamlessly` is h264-only).

## 6. Lambda and Cloud Run (chunking)

- `serverless/src/plan-frame-ranges.ts` (`planFrameRanges`) splits the frame list into `ceil(frames / framesPerFunction)` contiguous ranges. Each range is rendered by one function invocation (`serverless/src/inner-routine.ts`, `render-with-single-function.ts`).
- The orchestrator downloads the chunks and merges them (`serverless/src/merge-chunks.ts` calls `concatVideos` in `concat-videos.ts`, which uses `RenderInternals` and `renderer/src/combine-chunks.ts`). `combineChunks` uses `combineVideoStreamsSeamlessly` (stream copy) for h264 and `combineVideoStreams` otherwise, then combines audio (`combine-audio.ts`).
- For Capturita this is irrelevant (local app), except as a reminder that a chunk-by-frame-range model works only because every frame is a pure function of its frame number.

## 7. The in-browser path: `web-renderer`

This is the part that matters for a webview. (`web-renderer/src/`.)

- **Pipeline** (`render-media-on-web.tsx`, `renderMediaOnWeb`):
  1. Mount the composition in a hidden div (`create-scaffold.tsx`).
  2. Loop over frames: `timeUpdater.current?.update(frame)` (`update-time.tsx`), then `waitForRenderReady` (`wait-for-ready.ts`, which polls `scope.remotion_renderReady` and `remotion_cancelledError` in the same page, with no CDP).
  3. `createLayer` (`take-screenshot.ts`) makes an `OffscreenCanvas`.
  4. `new VideoFrame(layer.canvas, {timestamp})` with `timestamp = round((frame - first) / fps * 1e6)`.
  5. `addVideoSampleAndCloseFrame` (`add-sample.ts`) into mediabunny's `VideoSampleSource`.
  6. `output.finalize()`.
- **Encoder and containers**: mediabunny (`mediabunny-mappings.ts`, `mediabunny-cleanups.ts`) with WebCodecs `VideoEncoder`. `can-render-media-on-web.ts` checks `typeof VideoEncoder` and `canEncodeVideo`. Containers are mp4 and webm plus audio-only ones. Alpha is `alpha: transparent ? 'keep' : 'discard'` (`render-media-on-web.tsx`). Extra encoders for AAC, FLAC and MP3 are registered via `@mediabunny/*` packages when the browser lacks them (`register-aac-encoder.ts`, etc.). Output goes to a `BufferTarget` or an OPFS-backed target (`web-fs-target.ts`, `can-use-webfs-target.ts`).
- **How the DOM becomes pixels (two modes)**:
  1. **Built-in DOM composer**: `walkTree` / `processNode` (`walk-tree.ts`, `walk-over-node.ts`, `drawing/process-node.ts`) walk the DOM with a tree walker and redraw backgrounds, borders, shadows, gradients, transforms, clip paths, masks, filters and text onto a 2D canvas (`drawing/*`, `drawing/text/draw-text.ts` uses `fillText` and `measureText`). SVG is turned into a drawable (`turn-svg-into-drawable.ts`, with registered fonts embedded via `embed-registered-fonts-in-svg.ts`). It is an emulation of CSS, so it has a documented unsupported list (`docs/docs/client-side-rendering/limitations.mdx`; examples: `perspective`, `transform-style`, `object-position` are listed as not supported).
  2. **HTML-in-canvas**: `html-in-canvas.ts` uses `ctx.drawElementImage` and `canvas.requestPaint` with a `layoutsubtree` canvas (a Chromium feature). `createLayer` falls back to the DOM composer when unavailable. Nested capture needs Chrome 157 or newer (message in `take-screenshot.ts`). Not expected to exist in WKWebView. UNVERIFIED for Safari/WebKit, but nothing in the repo targets it.
- **Responsiveness**: `page-responsiveness.ts` and `background-keepalive.ts` exist to keep the tab from being throttled while rendering (not read in detail).
- **Browser requirement**: WebCodecs. Support in WKWebView is outside this repo. UNVERIFIED here (the existing Capturita export is empirical evidence that `VideoEncoder` with H.264 works in their webview, since it uses `CanvasSource` with `avc`).

## 8. The Player (preview)

- `player/src/use-playback.ts`: a `requestAnimationFrame` loop keeps `startedTime = performance.now()` and `framesAdvanced`. `calculateNextFrame` (`player/src/calculate-next-frame.ts`) computes `framesToAdvance = floor(elapsed * playbackSpeed / (1000/fps)) - framesAdvanced`, so playback is time-driven and can skip frames when the page is slow. It handles loop and reverse. If the tab is backgrounded it switches from rAF to a timeout (comment: "requestAnimationFrame() does not work if the tab is not active", `use-playback.ts`).
- **Audio sync**: media elements play natively and the timeline re-anchors against the audio context state (`player/src/set-global-time-anchor.ts`, `RemotionAudioContextState` handling). Buffering is a store (`readIsBuffering`, `use-buffer-state-emitter.ts`, `BufferingIndicator.tsx`). The newer `media` package has its own `media-player.ts` with an `audio-iterator-manager.ts` and `video-iterator-manager.ts` (mediabunny based). I did not read these in depth.
- So preview is real-time and lossy by design, and export steps frame by frame. Same React code, different clock.

## 9. Preview vs export parity: what breaks it

| Hazard | Why it breaks | Remotion's mitigation |
|---|---|---|
| CSS animations/transitions | Run on wall-clock, per tab; parallel tabs desynchronize; stalled when paused | docs ban them ("Don't use CSS animations", `docs/docs/flickering.mdx`); everything must derive from `useCurrentFrame()` |
| `Math.random()` | Differs per tab and per run | `random(seed)` (`core/src/random.ts`, mulberry32 + string hash); `random(null)` falls back to `Math.random()` |
| Non-awaited async assets (fetch, images, data) | Frame is captured before data arrives | `delayRender` / `continueRender` (`core/src/delay-render.ts`); `<Img>` and `<OffthreadVideo>` hold a handle |
| Video seeking | `<video>.currentTime` is imprecise and async | `OffthreadVideo` via the Rust compositor; `seekToTimeMultipleUntilRight` for `<Video>` |
| Fonts | Late font load changes layout | `document.fonts.ready` awaited every frame (`seek-to-frame.ts`); web-renderer embeds fonts into SVG |
| Timing APIs (`Date.now`, `performance.now`, `setTimeout` animations, rAF loops) | Export steps frames, not time | Not intercepted that I found. UNVERIFIED whether any shim exists; the docs rule is "a component is a function of the frame number" |
| Frame order dependence / mutable state | Tabs render out of order | `ensureFramesInOrder` fixes the encode order only; component purity is the user's job |
| Preview frame skipping | Player drops frames under load; export never does | `calculateNextFrame` is time-based |
| GPU/WebGL | Headless GL backend differs from the user's GPU | `--use-gl=angle` options in `open-browser.ts` |

## 10. Assessment for Capturita

### Can Remotion run unchanged in a Tauri/WKWebView?

- **The server renderer: no.** `@remotion/renderer` needs Node, a vendored Puppeteer on CDP, a downloaded Chromium headless shell, an FFmpeg binary, and the Rust compositor over child-process pipes. WKWebView has no CDP. Shipping Chromium plus Node inside a Tauri app also defeats the point of Tauri. It could be a sidecar, but that adds hundreds of MB and a Node runtime.
- **The Player and core: yes in principle.** `core` and `player` are React packages with no Node dependency at runtime, and `core/src/delay-render.ts`, `useCurrentFrame` and `<Sequence>` run in any webview. I did not run them. UNVERIFIED in WKWebView.
- **`web-renderer`: partly.** It is designed for browsers and needs WebCodecs. Its built-in DOM composer is the portable part. HTML-in-canvas is Chromium-only. This path is also young and has a CSS support list, so anything it cannot draw will differ from preview.
- **Licensing:** every package in this render path (`core`, `player`, `renderer`, `bundler`, `web-renderer`, `webcodecs`, `media-parser`, `compositor`) is under the Remotion License. Only some utility packages are MIT (see `00-package-map-and-license.md`). So reuse the ideas here, not the code.

### The ideas worth taking

1. A scene is a pure function `(frame, props) -> pixels`. No wall-clock, no unseeded randomness.
2. A readiness gate (`delayRender`/`continueRender` equivalent) before each capture, plus `document.fonts.ready`.
3. Frame-indexed seeking of source video through an exact decoder, not `<video>.currentTime`.
4. Per-frame audio events with baked volume curves, mixed offline.
5. Ordered, backpressured frame delivery into the encoder.

### Options

| Path | What it is | Pros | Cons |
|---|---|---|---|
| A. Webview canvas to WebCodecs (extend current export) | Scene renders to a canvas; `VideoFrame` goes to mediabunny `CanvasSource`; bytes stream to Rust via `export_write` | Already exists and works in their app; no new binaries; same code path for recorded and generated scenes; deterministic if the scene is frame-driven | Fidelity limited to what you draw into canvas (not arbitrary CSS); H.264/AAC MP4 only unless you add more; encoder quality is whatever WKWebView/VideoToolbox gives |
| B. Webview canvas, transfer RGBA to Rust, then ffmpeg / VideoToolbox | `getImageData` or `OffscreenCanvas` readback, send via `invoke` binary, Rust pipes to ffmpeg or an `AVAssetWriter` | Full codec/alpha control (ProRes 4444, VP9 alpha, GIF palettes); can reuse Remotion-style `image2pipe` or raw pipe | Readback cost per frame (4K RGBA is about 33 MB/frame); needs bundled ffmpeg; more code; IPC throughput to measure |
| C. Chromium sidecar running real Remotion | Ship headless shell + Node | Max fidelity | Huge, defeats Tauri, license, CDP |

### Recommendation: Path A, with B only as a later add-on for alpha/GIF

Build generated scenes as React (or plain canvas/WebGL) components driven only by a frame number, render each frame to the same canvas that `src/editor/export.ts` already encodes, and feed it into the existing mediabunny pipeline. Concretely:

- Add a "scene" clip type whose renderer implements `drawScene(ctx, frame, props)`. Use the same function for live preview (a rAF loop) and export (a stepped loop). Preview then differs from export only by clock, exactly like Remotion's Player versus `renderMediaOnWeb`.
- Implement a small readiness gate: a counter of pending promises per frame, awaited before capture, with a timeout. Await `document.fonts.ready` and decoded images (`img.decode()`) before drawing.
- Draw scenes natively on canvas (or SVG rasterized with fonts embedded) rather than screenshotting DOM. This sidesteps the CSS-emulation problem that `web-renderer` fights. If you want React/CSS authoring, you accept the limitations list or you render DOM through SVG `foreignObject` (not verified in WKWebView, UNVERIFIED).
- Provide a seeded `random(seed)`, and forbid `Math.random`/`Date.now` in scene code (lint or sandbox).
- Keep video source sampling on mediabunny's `VideoSampleSink.samplesAtTimestamps` as export.ts already does (exact timestamps rather than `<video>` seeking).
- Revisit Path B only if the product needs transparent video (ProRes 4444 / VP9 alpha) or GIF at quality; the Remotion arg set to copy is in `ffmpeg-args.ts` and `stitch-frames-to-video.ts`.

## Open questions

1. Does the Capturita export hit WKWebView `VideoEncoder` limits (max resolution, H.264 profile/level, 60 fps at 4K)? Measure before promising 4K scenes.
2. Is transparent export (alpha WebM or ProRes 4444) a requirement? That decides whether Path B is needed.
3. Authoring model: raw canvas/WebGL drawing, React components rendered to canvas, or DOM/SVG snapshotting? Each has different fidelity and authoring cost; `web-renderer`'s support list is the best data on how hard DOM emulation is.
4. How will generated scenes (from an LLM) be sandboxed and checked for non-determinism (timers, `Math.random`, unawaited fetches)? Remotion only documents rules and does not enforce them (no enforcement mechanism found, UNVERIFIED).
5. Does `core` + `player` run in WKWebView without Chromium-only APIs, and is the Remotion license acceptable for the product size? Not tested.
6. Does `OffscreenCanvas` to `VideoFrame` copying perform acceptably in WKWebView compared with a plain `HTMLCanvasElement` (their current choice)? Not measured.
7. I did not read `media/src/media-player.ts` or the Player audio-anchor code in depth, and did not trace ProRes alpha profile selection. Both are UNVERIFIED beyond what is cited.
