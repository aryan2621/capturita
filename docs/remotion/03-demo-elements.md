# Phase 3: Element catalog (Remotion teardown, for Capturita Studio mode)

Scope: 13 launch-video elements. All paths are relative to `packages/` in the Remotion monorepo unless noted. "UNVERIFIED" = not confirmed in code. Read-only analysis; nothing was run.

## 0. Cross-cutting facts that shape every recipe

- **Everything is a pure function of frame.** `useCurrentFrame()` (`core/src/use-current-frame.ts`) plus `useVideoConfig()` (`core/src/use-video-config.ts`: width, height, fps, durationInFrames) drive all motion. Primitives: `interpolate` (`core/src/interpolate.ts`, supports `easing`, clamp, and `output: 'perceptual-scale'`), `spring` / `measureSpring` (`core/src/spring/`), `Easing` (`core/src/easing.ts`, includes `Easing.spring`), `interpolateColors` (`core/src/interpolate-colors.ts`), seeded `random` (`core/src/random.ts`), `Sequence` (`core/src/Sequence.tsx`), `Freeze`, `Series`, `AbsoluteFill`.
- **Springs are frame-stateless.** `spring()` takes `frame` and `fps` and returns a number, so a stagger is just `frame - i*delay`. `measureSpring` returns how many frames until rest (used by `transitions/src/timings/spring-timing.ts` as an automatic duration).
- **The template that generates scenes with an LLM (`template-prompt-to-motion-graphics`) emits TSX source, not JSON.** `src/remotion/compiler.ts` strips imports from model output, runs it through `@babel/standalone`, and injects a fixed scope (Remotion core, `@remotion/shapes`, `@remotion/three`, `@remotion/transitions`, `@remotion/lottie`, THREE). `src/remotion/DynamicComp.tsx` wraps compile in `delayRender("Compiling code...")`. Prompt "skills" per topic live in `src/skills/*.md` (typography, charts, transitions, 3d, sequencing, spring-physics, social-media, messaging). This is the opposite of Capturita's JSON spec, so it is a prompt-content reference, not an architecture to copy.
- **The only JSON-driven template (`template-prompt-to-video`)** has a minimal timeline: `src/lib/types.ts` (`TimelineSchema`: `shortTitle`, `elements[]` with `startMs/endMs/imageUrl/enterTransition/exitTransition/animations[{type:'scale',from,to}]`, `text[]` with `position: top|center|bottom`, `audio[]`). `src/components/AIVideo.tsx` maps each entry to a `<Sequence from durationInFrames premountFor={3*FPS}>`. Only scale animation and fade/blur/none transitions exist. It is a useful proof that "ms in spec, frames at render" works, nothing more.
- **Time units.** Specs are in ms in the captions/prompt-to-video world; render is in frames. Conversion helper pattern: `frame/fps*1000` (`template-tiktok/src/CaptionedVideo/Page.tsx`), `calculateFrameTiming` (`template-prompt-to-video/src/lib/utils.ts`).
- **Newer APIs present in this checkout** (version newer than public docs I know; treat as unstable): `Interactive.*` elements and `Interactive.withSchema/create` (`core/src/Interactive.tsx`), `Solid` + `effects` prop (`core/src/effects/Solid.tsx`, `effects/src/*`), `HtmlInCanvas` (`core/src/HtmlInCanvas.tsx`), `Easing.spring`, `perceptual-scale`. `@remotion/media` `<Audio>`/`<Video>` replace the older core audio/video components in templates.
- **Render-wait contract.** `delayRender`/`continueRender` (`core/src/delay-render.ts`); default timeout is 30000 ms (`defaultTimeout`). Everything async (fonts, audio data, WebGL canvases, video textures) uses it.

---

## 1. Intro / logo reveal

**Remotion support**
- Official minimal reveal: `template-helloworld/src/HelloWorld/Logo.tsx` (`LogoInner`): wrapper `Interactive.Div` with `scale` from `interpolate(frame,[0,fps],[0,1],{easing: Easing.spring({mass:0.5}), output:'perceptual-scale'})` and `rotate` 0 to 360deg across the composition; three `Arc` children. `HelloWorld.tsx` then fades in the title via `interpolate(frame,[75,105],[0,1])` and lifts the logo with `translate` over frames 25 to 55 (`Easing.spring({damping:100})`).
- Production-grade path logo: `brand/src/animated-logo/AnimatedLogo.tsx` with per-letter SVG components (`e.tsx`, `m.tsx`, ...), `springs.ts`, `extend-viewbox.ts`; uses `spring` + `interpolate` (translateX from -600 to 0). Stinger wrapper `AnimatedLogoStinger.tsx`. UNVERIFIED: exact stagger values (only grepped).
- Stroke-draw reveal: `@remotion/paths` `evolvePath(progress, path)` (`paths/src/evolve-path.ts`) returns strokeDasharray/offset; `getLength`, `getPointAtLength`, `cutPath`, `interpolatePath`, `warpPath` also exported (`paths/src/index.ts`).
- Shapes for reveal masks/bursts: `@remotion/shapes` (`Circle, Rect, Star, Spark, Polygon, Pie, Heart, Triangle, Ellipse, Arrow, Callout`, plus `make*` path generators; `shapes/src/index.ts`).
- Light-leak/starburst accents: `@remotion/starburst` `Starburst` (WebGL shader; props `rays, colors, rotation, smoothness, vignette, originOffsetX/Y`; `starburst/src/Starburst.tsx`), `@remotion/light-leaks` `LightLeak` (`seed`, `hueShift`), and the effects equivalents `effects/src/starburst.ts`, `effects/src/light-leak.ts`.
- Lottie/Rive: `@remotion/lottie` `Lottie` (`lottie/src/Lottie.tsx`), `@remotion/rive`; for designer-made logo stings.

**Recipe (30 fps, ~90 frames)**
1. f0 to 6: background settled (solid or gradient), no motion.
2. f6 to 30: logo mark `scale` 0.6 to 1 via `Easing.spring` (mass 0.5) in perceptual-scale, `opacity` 0 to 1 over f6 to 14.
3. f20 to 50: wordmark per-letter `translateY` 40 to 0 + opacity, stagger 2 to 3 frames/letter via `spring({frame: frame - 20 - i*2})`. Or `evolvePath` on outline SVG f10 to 40 then fill fade f35 to 50.
4. f30: accent hit (Starburst rotation = `frame*k`, or LightLeak overlay), plus whoosh SFX on f6 (see element 12).
5. f50 to 90: hold, then exit (scale 1 to 1.05 + opacity to 0 over last 10 frames) or hand to the transition (element 6).

**Gaps / not provided:** no "logo ingestion" (SVG/PNG to animatable parts); letter splitting is hand-authored per-glyph SVG in `brand`. No pre-built reveal styles to choose from; Capturita must define a preset library. No auto-extract of brand colors from a logo.

---

## 2. Kinetic typography

**Remotion support**
- Primitives only; no `<KineticText>` component in core. Patterns in code:
  - Pop-in per word/page with scale+translateY: `template-tiktok/src/CaptionedVideo/Page.tsx` (`enterProgress` from `spring({damping:200, durationInFrames:5})` in `SubtitlePage.tsx`; `makeTransform([scale(...), translateY(...)])` from `@remotion/animation-utils`, `animation-utils/src/transformation-helpers/make-transform`).
  - Typewriter, word carousel, highlight: `template-prompt-to-motion-graphics/src/examples/code/typewriter-highlight.ts`, `word-carousel.ts`, `text-rotation.ts`; rules in `src/skills/typography.md`: type with `string.slice(0,n)` not per-char opacity; blink caret with smooth `interpolate(frame % 16, ...)`; carousel width from hidden longest word; highlight via two-layer crossfade (typing layer fades out f-8..f+8, final layer with background highlight fades in).
  - Auto font sizing: `@remotion/layout-utils` `fitText`, `fitTextOnNLines`, `fillTextBox`, `measureText` (`layout-utils/src/layouts/*`) to fit text to width before animating.
  - Highlights/annotations: `@remotion/rough-notation` `Highlight, Underline, Circle, Box, Bracket, StrikeThrough, CrossedOff` (`rough-notation/src/Annotation.tsx`) with a `progress` prop (0 to 1) you drive via `interpolate`; guidance in `skills/skills/remotion-markup/text-highlights.md`.
  - Rounded highlight blocks behind multi-line text: `@remotion/rounded-text-box` `createRoundedTextBox` (`rounded-text-box/src/create-rounded-text-box.ts`: inputs `textMeasurements, textAlign, horizontalPadding, borderRadius`, output an SVG path using `@remotion/paths`).
  - Text motion blur / trails: `@remotion/motion-blur` `CameraMotionBlur` (shutterAngle, samples), `Trail` (`layers, lagInFrames, trailOpacity`); implemented by rendering children at time-offset `Freeze` layers (`motion-blur/src/*.tsx`), so cost scales with samples.
  - Randomness: `random(seed)` for deterministic jitter; `@remotion/noise` `noise2D/3D/4D` (simplex, seeded via `random`, `noise/src/index.ts`) for organic wobble.

**Recipe (headline, 1280x720, 30 fps)**
1. Measure: `fitText({fontFamily, text, withinWidth: width*0.8})`, clamp to a design max font size.
2. Split into words (or graphemes) as array; each token gets `delay = i * 3` frames (words) or `i * 1` (letters).
3. Per token: `p = spring({frame: frame - delay, fps, config:{damping:200}})` (smooth, no overshoot) or `damping:12` for bouncy; `opacity = p`, `translateY = interpolate(p,[0,1],[40,0])`, `scale = interpolate(p,[0,1],[0.8,1])`.
4. Emphasis words: overlay `Highlight` with `progress = interpolate(frame,[t0,t0+15],[0,1])`, or animated background-size on a span.
5. Exit: reverse with `interpolate(frame,[end-8,end],[1,0])` applied at container level.
6. Optional: wrap in `CameraMotionBlur` for fast slides.

**Gaps:** no per-character/word split helper (you write `split` and handle graphemes, ligatures, RTL; `rough-notation` has an RTL config flag, text split does not); no text-on-path component (you assemble from `@remotion/paths`); no preset library of text animations; `fitText` measures via DOM so it needs fonts loaded first (see element 11) and a browser (it is not available in a pure Rust renderer).

---

## 3. Feature callouts, annotations, arrows, spotlights

**Remotion support**
- Shapes: `Arrow`, `Callout` (props `width, height, pointerLength, pointerBaseWidth, pointerPosition 0..1, pointerDirection up|down|left|right, cornerRadius`; `shapes/src/components/callout.tsx`), `makeArrow`/`makeCallout` for path data (`shapes/src/utils/make-arrow.ts`: `length, headWidth, headLength, shaftWidth, direction, cornerRadius`).
- Hand-drawn emphasis: `@remotion/rough-notation` (see element 2). Box/Circle/Bracket around any child, sized with `element-size.ts`.
- Draw-on arrows/connectors: `evolvePath` on a custom SVG path; `getPointAtLength`/`getTangentAtLength` to place an arrowhead on the moving tip (`paths/src/`).
- Cursor: `@remotion/mac-cursors` `MacOSCursor` (`cursor` enum of macOS cursor names, `customCursor`, transform props; `mac-cursors/src/MacOSCursor.tsx`, `resolve-cursor.ts`, assets in `cursor-assets.ts`). Useful for fake "click here" demos on non-recorded content.
- Spotlight/dim: no component. Closest primitives: `Solid` with `effects` (`core/src/effects/Solid.tsx`), effects `vignette.ts`, `region-blur`, `radial-progressive-blur`, `glow`, `outline` in `effects/src/`. UNVERIFIED how effects clip to a moving rectangle.
- Vibe-code template demonstrates staggered feature cards: `template-vibe-code/src/remotion/FeatureCards.tsx` (cards in `Sequence from={index*6} layout="none"`, `opacity` f0 to 15, `translate` "0 60px" to "0 0" over 30 frames with `Easing.out(Easing.cubic)`).

**Recipe (callout on a card, 30 fps)**
1. Target rect from spec (x,y,w,h in comp pixels).
2. f0 to 10: dim layer opacity 0 to 0.55 (spotlight = full-frame div with CSS `mask`/radial-gradient or SVG evenodd path cut-out around the rect; animate radius with spring).
3. f6 to 24: `evolvePath` a curved arrow from label to target (strokeDashoffset), arrowhead at `getPointAtLength` tip with rotation from `getTangentAtLength`.
4. f12 to 30: label card scale 0.9 to 1 + opacity; `Circle`/`Box` annotation `progress` 0 to 1.
5. Hold N frames, reverse over last 8.

**Gaps:** no spotlight/focus primitive, no anchor-to-element tracking (you must supply coordinates; Remotion has no layout probe for a screenshot's content except manual rects), no connector routing (elbow, auto-avoid), no numbered-step/badge component. For recorded screenshots, element locations must come from Capturita's own capture metadata.

---

## 4. Device mockups / framed screenshots and video

**Remotion support**
- 3D phone with live video screen: `template-three` (`src/Phone.tsx`, `RoundedBox.tsx`, `helpers/rounded-rectangle.ts`, `layout.ts`, `Scene.tsx`). Body is generated geometry (`RoundedBox`), not a GLB; screen is a `CanvasTexture` fed via `<Video onVideoFrame headless muted/>` from `@remotion/media`. Entrance by `spring` (rotation + translateY from -4 to 0), constant `interpolate` Y rotation. Hosted by `ThreeCanvas` (`three/src/ThreeCanvas.tsx`, requires explicit `width`/`height`). Schema has `deviceType: 'phone' | 'tablet'`, `phoneColor`.
- Video textures for three: `useVideoTexture`, `useOffthreadVideoTexture` (`three/src/use-video-texture.ts`, `use-offthread-video-texture.ts`), both `delayRender` until a frame is ready.
- 2D framing: no frame/bezel component found. Use plain `div` with `borderRadius`, `boxShadow`, `overflow:hidden` and `Img`/`Video` inside (as the recorder template does: `template-recorder/remotion/animations/interpolate-layout.ts` interpolates `left, top, width, height, borderRadius, opacity` between two layouts; layouts in `remotion/layout/get-layout.ts`, `fit-element.ts`).
- Perspective/skew: `@remotion/effects` `corner-pin`, `cylinder`, `sphere`, `skew`, `page-turn` (`effects/src/`), `@remotion/svg-3d-engine` (`extrudeElement`, matrix helpers; `svg-3d-engine/src/`) for faux-3D SVG; `HtmlInCanvas` for rendering DOM into a WebGL texture (`core/src/HtmlInCanvas.tsx`; docs in `skills/.../html-in-canvas.md`).
- Image loading is render-safe via `Img` (`core/src/Img.tsx`, delays render until loaded; also has an `effects` prop).

**Recipe (2D laptop/browser frame)**
1. Frame = rounded rect (radius ~ 24 px), 1 px border, drop shadow (or `effects/drop-shadow`), optional title bar with three dots.
2. Content = `Img`/`Video` with `objectFit: cover` in an inner mask rect.
3. Entrance: translateY 80 to 0 + `rotateX` 12 to 0deg + scale 0.92 to 1 with `spring({damping:200})` over ~25 frames.
4. Idle: slow `interpolate` drift (scale 1 to 1.03 across the scene) for life.
5. Camera moves on the content (element 9) are applied to the inner content only, frame stays fixed.

**Gaps:** no device frame library (iPhone, MacBook, browser chrome) as assets/components; `template-three` has only a generic rounded slab. No cursor-path/click-ripple on screenshots (`mac-cursors` supplies the sprite only). No screenshot auto-framing (safe crop, notch handling).

---

## 5. Stat counters, charts, data viz

**Remotion support**
- No chart package in the monorepo (I checked `packages/*/package.json` for recharts/d3/chart.js/visx; none matched). Charts are hand-built.
- Reference patterns: `template-prompt-to-motion-graphics/src/examples/code/histogram.ts` (value label `Math.round(item.value * progress)`, spring-driven bar heights), `gold-price-chart.ts` (spring header, y-axis ticks with `toLocaleString`, per-bar spring), `progress-bar.ts` (`Math.round(progress)%`). `template-stargazer/src/Content.tsx` animates a star count via `RepoHeader stars={Math.round(progress)}`.
- Rules in `src/skills/charts.md`: stagger bars by 3 to 5 frames (`spring({frame: frame - i*5, config:{damping:18, stiffness:80}})`), always draw y-axis labels, put value labels inside bars when tall enough and fade them after the bar animates, pie via `strokeDasharray`/`strokeDashoffset` starting at 12 o'clock with `rotate(-90)`.
- Helpers: `@remotion/shapes` `Pie`/`makePie`, `@remotion/paths` `evolvePath` for line charts, `interpolatePath` to morph between datasets, `createSmoothSvgPath` in `media-utils/src/create-smooth-svg-path.ts`, `interpolateColors`.

**Recipe (stat counter "12,400 users")**
1. `p = spring({frame: frame - 10, fps, durationInFrames: 45, config:{damping:200}})`.
2. `value = Math.round(interpolate(p,[0,1],[0,target]))`; format with `Intl.NumberFormat` (locale from spec).
3. Fixed-width digits: CSS `font-variant-numeric: tabular-nums` so the layout does not jitter.
4. Suffix/label fades in f30 to 45; optional underline `Highlight` progress.
5. Line chart: `evolvePath(progress, d)` for the line, area fill opacity follows `progress`, end-dot at `getPointAtLength(d, progress*len)`.

**Gaps:** entire data-viz layer (scales, axes, ticks, legends, layout), number formatting, and data-driven chart types are absent; Capturita must define its own chart schema and renderer. No odometer/rolling-digit component.

---

## 6. Scene transitions

**Remotion support (strongest area)**
- `@remotion/transitions`: `TransitionSeries` with `.Sequence`, `.Transition` and `.Overlay` children (`transitions/src/TransitionSeries.tsx`). Timings: `linearTiming({durationInFrames, easing})` and `springTiming({config, durationInFrames, durationRestThreshold, reverse})` (`transitions/src/timings/`); a timing is `{getDurationInFrames({fps}), getProgress({frame, fps})}` (`transitions/src/types.ts`).
- Presentations in `transitions/src/presentations/`: `fade, slide (from-left/right/top/bottom), wipe, flip, clock-wipe, iris, blur-slide, book-flip, cross-zoom, crosswarp, dissolve, dreamy-zoom, film-burn, linear-blur, none, push-cut, ripple, swap, zoom-blur, zoom-in-out`. Some are WebGL/HTML-in-canvas (`html-in-canvas-presentation.tsx`, `upload-element-image.ts`).
- Custom presentation contract (`transitions/src/types.ts`): your component receives `presentationProgress` (0..1), `presentationDirection` ('entering' | 'exiting'), `passedProps`, `presentationDurationInFrames`, `children`. Example `slide.tsx` applies `translateX/Y(%)` to entering vs exiting children with a 0.01 epsilon to prevent a seam.
- Duration math: transitions overlap neighbors, total = sum(sequences) - sum(transitions) (`skills/skills/remotion-markup/transitions.md`, "Duration calculation"); `Overlay` does not alter duration, takes `durationInFrames` and `offset`; light-leak overlay example uses `Solid` + `lightLeak({progress})` effect.
- `useTransitionProgress` hook (`transitions/src/use-transition-progress.ts`) lets a child react to the transition state.
- Alternative hand-rolled approach: recorder template (`template-recorder/remotion/animations/scene-transitions.ts`) slides scenes by canvas width (`getSceneEnter/Exit`), `SCENE_TRANSITION_DURATION = 15`, `B_ROLL_TRANSITION_DURATION = 10` (`config/transitions.ts`), and subtracts 15 frames from the running offset in `audio/AudioTrack.tsx` so audio tracks the overlap.

**Recipe**
1. Spec: ordered scenes `[{durationFrames}]` + between-scene `{type, durationFrames, direction?}`.
2. Render with `TransitionSeries`; effective timeline = sum - overlaps; compute total in `calculateMetadata` (`Composition.calculateMetadata`) before render.
3. Default pair for launch videos: `springTiming({durationInFrames: 18, config:{damping:200}})` with `slide` or `fade`; fast cut accent: `wipe` 12 frames with `linearTiming`; hero change: `cross-zoom`/`zoom-blur` + whoosh SFX at the cut centre.

**Gaps:** no shared-element ("match-cut"/Magic Move) transitions between scenes; no transition that morphs one layout into the next beyond what you code (the recorder `interpolateLayout` is the nearest example); WebGL presentations require WebGL in the renderer (UNVERIFIED for headless Rust equivalents).

---

## 7. Backgrounds (gradients, particles, noise, 3D)

**Remotion support**
- CSS gradient + blurred glow + grid: `template-vibe-code/src/remotion/Background.tsx` (linear-gradient 160deg, 640px accent circle with `filter: blur(80px)` drifting with `Easing.inOut(Easing.sin)` over the whole duration, grid via two repeating linear-gradients, 80 px).
- Shader/effects: `@remotion/effects` has `linear-gradient`, `fractal-noise`, `noise`, `white-noise`, `value-noise-shader`, `dot-grid`, `gridlines`, `checkerboard`, `pattern`, `rings`, `waves`, `halftone`, `scanlines`, `paper`, `burlap`, `flannel`, `liquid-contours`, `contour-lines`, `speckle`, `light-trail`, `glow`, `vignette`, `duotone`, `thermal-vision` (file list in `effects/src/`); applied via `Solid`'s `effects` prop (`core/src/effects/Solid.tsx`, `run-effect-chain.ts`). `Starburst` and `LightLeak` packages are also WebGL.
- Particles/noise-driven motion: `@remotion/noise` (`noise2D(seed, x, y)` etc.), `random(seed)`. Example scenes with particles: `template-prompt-to-motion-graphics/src/examples/code/falling-spheres.ts` (three.js), `jonnys-videos/src/disco-light-show/` (UNVERIFIED contents).
- 3D: `@remotion/three` `ThreeCanvas` (wraps R3F `Canvas`, uses `Freeze`/`Sequence`/`useDelayRender` to advance frames; `three/src/ThreeCanvas.tsx`), WebGPU variant `three/src/webgpu.tsx`. Skia: `@remotion/skia` `SkiaCanvas`. Lottie/Rive for loops.
- Particle caution: rely on `useCurrentFrame`, never `Math.random`/`requestAnimationFrame` (nothing in Remotion enforces this except ESLint plugin `eslint-plugin`, UNVERIFIED rule names).

**Recipe (premium dark background)**
1. Base: `linear-gradient` of 2 to 3 stops, per-theme tokens.
2. 2 to 3 big blurred radial blobs, each position = `base + A*noise2D(seed, frame*0.004, i)` (loops only if noise is sampled on a circle; a looping background needs `sin/cos` of `frame/duration*2π`).
3. Grain overlay: `fractal-noise`/`white-noise` effect at 4 to 8% opacity (also hides banding).
4. Optional particle layer: N points with positions `p0 + v*frame`, positions from `random(\`p${i}\`)`; render as one SVG/canvas, not N divs.
5. Optional 3D: `ThreeCanvas` with ambient + point light and one slowly rotating object.

**Gaps:** no particle system component; no prebuilt mesh-gradient; backgrounds do not auto-loop; GPU effect availability in the final export path unknown (UNVERIFIED).

---

## 8. Captions / subtitles

**Remotion support**
- Data shape (`captions/src/caption.ts`): `Caption = {text, startMs, endMs, timestampMs: number|null, confidence: number|null, pageBreakAfter?}`. Words carry leading spaces in `text`.
- `createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds, breakOnSilenceAfterMilliseconds?})` (`captions/src/create-tiktok-style-captions.ts`) returns `{pages: TikTokPage[]}`; `TikTokPage = {text, startMs, tokens: TikTokToken[], durationMs}`, `TikTokToken = {text, fromMs, toMs, pageBreakAfter?}`. Logic: a new page begins only when a token starts with a space AND (accumulated page duration exceeds the combine window OR a silence gap meets the threshold); `durationMs` of page i is `startMs(i+1) - startMs(i)`, last is `Infinity`. Also `ensure-max-characters-per-line.ts`.
- SRT: `parseSrt`, `serializeSrt` (`captions/src/parse-srt.ts`, `serialize-srt.ts`).
- Rendering pattern (`template-tiktok/src/CaptionedVideo/index.tsx`, `Page.tsx`): each page in a `Sequence` from `page.startMs/1000*fps` for `durationMs` (clamped to the video); inside, `timeInMs = frame/fps*1000`; token active when `fromMs - page.startMs <= timeInMs < toMs - page.startMs`; active token coloured (`HIGHLIGHT_COLOR #39E508`), text sized by `fitText`, stroke via `WebkitTextStroke` + `paintOrder: stroke`.
- Recorder template: themed word colours `WORD_COLOR_ON_BG_APPEARED / GREYED / WORD_HIGHLIGHT_COLOR` in `config/themes.ts` (progressive reveal); caption layout `layout/get-captions-layout.ts`; SRT emit `remotion/captions/srt/EmitSrtFile`.
- Element library: `template-element-library/elements/accent-captions/accent-captions.tsx` and `app/routes/captions.tsx` (UNVERIFIED internals beyond the file list). `skills/skills/remotion-captions/display-captions.md` points to a "Basic Captions" element and requires captions to live in the same `Sequence` as the clip so trim/playbackRate move them together.
- Transcription (all output `Caption[]`):
  - `@remotion/install-whisper-cpp`: `installWhisperCpp`, `downloadWhisperModel`, `transcribe`, `toCaptions` (Node-side, whisper.cpp).
  - `@remotion/openai-whisper`: `openAiWhisperApiToCaptions`, `OpenAiVerboseTranscription`, `isOpenAiWhisperTranscript`.
  - `@remotion/whisper-web`: in-browser WASM (`transcribe`, `downloadWhisperModel`, `canUseWhisperWeb`, `resampleTo16Khz`, `toCaptions`; the `index.ts` re-exports with wrapper functions).
  - `@remotion/whisper-webgpu`: WebGPU variant (`transcribe`, `canUseWhisperWebgpu`, `toCaptions`; file list in `whisper-webgpu/src/`).
  - `@remotion/elevenlabs`: `elevenLabsTranscriptToCaptions` (`elevenlabs/src/elevenlabs-transcript-to-captions.ts`).

**Recipe (word-highlight captions over generated VO)**
1. Build `Caption[]` from VO transcript (word-level timestamps; TTS alignment from ElevenLabs gives character timings, see `template-prompt-to-video` imports `CharacterAlignmentResponseModel`).
2. `createTikTokStyleCaptions({combineTokensWithinMilliseconds: 1200})`.
3. One `Sequence` per page; `spring` enter over 5 frames (`damping:200`); active word colour flip, or scale 1 to 1.1 on active word.
4. Keep inside the owning scene `Sequence` so trims shift captions.

**Gaps:** no per-word easing helper (active state is binary in the template); no caption styling presets beyond templates; for non-recorded scenes, captions are only useful if VO exists; word timing for TTS other than ElevenLabs must be produced by whisper or the TTS vendor.

---

## 9. Camera-style motion (zoom / pan / parallax) on non-recorded content

**Remotion support**
- No `<Camera>` component and no dolly/zoom-follow in core. I searched `brand/src`, `jonnys-videos/src`, `template-recorder/remotion`, `example/src` for parallax/perspective/zoom and found nothing that qualified (UNVERIFIED exhaustiveness; grep errored on one flag set).
- Building blocks: wrap scene in one transformed container and animate `scale`, `translate`, `rotate` with `interpolate`/`spring`; compose with `makeTransform` (`animation-utils`), or `interpolateStyles` (`animation-utils/src/transformation-helpers/interpolate-styles`).
- Motion blur for camera moves: `CameraMotionBlur` (`motion-blur/src/CameraMotionBlur.tsx`; reduces samples at early frames to avoid negative-frame trails via `getNumberOfSamples`).
- Real 3D camera: R3F camera inside `ThreeCanvas`, animated by `useCurrentFrame` (`template-three`).
- Perspective/page effects: `effects/src/corner-pin.ts`, `cylinder.ts`, `fisheye.ts`, `zoom-blur.ts`, `scale.ts`, `translate.ts`.
- Map flythrough camera (maps only): `skills/skills/remotion-maps/techniques/cesium/assets/CesiumFlythrough.tsx`, `flight-path.ts`.

**Recipe**
1. Scene root `div` with `transform-origin` at the focus point.
2. Move: `scale = interpolate(f,[0,dur],[1,1.12],{easing: Easing.inOut(Easing.cubic)})`, `translate` toward focus point; keep < ~0.5 px/frame sub-pixel jitter by using transforms, not top/left.
3. Parallax: N layers with depth d_i; translateX = `-cameraX * (1/d_i)`, scale = `1 + z*depthFactor`.
4. Wrap in `CameraMotionBlur shutterAngle={180} samples={8}` only during fast moves (expensive).

**Gaps:** no camera abstraction (focus targets, keyframed camera, easing presets), no auto-zoom-to-region, no depth/parallax helper. Capturita already has recording-side zoom logic presumably (outside this teardown), so the non-recorded half needs a shared camera-keyframe type.

---

## 10. Titles / lower-thirds / end cards with CTA

**Remotion support**
- Title: `template-recorder/remotion/scenes/Title/Title.tsx` (centred, `textWrap: balance`, subtitle optional); title scenes are first-class in the recorder's scene model (`config/scenes.ts`). Generic animated title: `template-element-library/elements/animated-title/animated-title.tsx` (registry in `elements/registry.ts`: 1280x720, 150 frames, poster frame 45, category "Text").
- Lower third: `template-element-library/elements/lower-third/lower-third.tsx` (150 frames, 560x150, "Overlays"); `template-overlay/src/Overlay.tsx` (UNVERIFIED internals).
- End card with CTA: `template-recorder/remotion/scenes/EndCard/` (`LeftSide.tsx` avatar + `FollowButton`, `IconRow`, `Links`, `RightSide`, `icons.tsx`); config of handles/avatars/platforms in `template-recorder/config/endcard.ts` (platforms youtube/linkedin/instagram/discord/x).
- Brand "AnimatedBanner" and `Showcase`/`Applications` compositions in `brand/src`.
- Registry pattern for packaged elements: `ElementDefinition {slug, displayName, category, width, height, fps, durationInFrames, posterFrame, previewBackground, dimensions, installationMode, initialProps, dependencies, assets}` (`template-element-library/elements/registry.ts`) is a ready-made metadata schema for a library of Capturita presets.

**Recipe (lower third, 30 fps, 90 frames)**
1. f0 to 12: accent bar width 0 to 100% (`spring`, `damping:200`).
2. f6 to 20: name text slides translateX -30 to 0 + opacity; role text delayed +4 frames.
3. f70 to 90: reverse (opacity + translateX to -20).
4. Position from safe-area tokens (recorder: `getSafeSpace = 30`, bottom `140` in landscape, `layout/get-safe-space.ts`, `config/layout.ts`).

**Recipe (end card)** headline (element 2), primary CTA button with `spring` scale 0.9 to 1 and a pulse (`1 + 0.03*sin(frame/6)`), URL line, logo bottom-left, hold >= 3 s.

**Gaps:** no QR-code, no "button press" micro-interaction, no countdown/URL typing; CTA is a styled div. No platform-specific safe-zone overlays (TikTok/Reels UI margins) beyond hand constants.

---

## 11. Brand kit (fonts, colors, logo)

**Fonts: `@remotion/google-fonts`** (`google-fonts/src/base.ts`, one generated file per family e.g. `Inter.ts`)
- Per-family modules export `getInfo()` metadata (family, version, per-subset `unicodeRanges`, `fonts[style][weight][subset] = woff2 URL on fonts.gstatic.com`) and `loadFont(style?, options?)`.
- `loadFonts(meta, style, options)`: requires `weights` and `subsets` (throws without them, v5 behaviour). Skips on server when `FontFace` is undefined. For every style x weight x resolved subset: de-dupe via module-level `loadedFonts` key `family-style-weight-subset`; else `delayRender(label, {timeoutInMilliseconds: 60000})`, `fetchFontData(url)`, `new FontFace(family, data, {weight, style, unicodeRange})`, load with a 20 s timeout, `document.fonts.add`, `NoReactInternals.registerFontFace(...)` (so the renderer can embed it), `continueRender(handle)`; retries once (attempts = 2). Warns above 20 requests (`ignoreTooManyRequestsWarning`). Returns `{fontFamily, fonts, unicodeRanges, waitUntilDone()}`.
- `loadVariableFonts` for variable fonts (`axes` returned).
- Usage: top-level `const {fontFamily} = loadFont()` in `template-prompt-to-video/src/components/AIVideo.tsx`; recorder passes weights (`template-recorder/config/fonts.ts`: Inter 600/700, RobotoMono 500) and exposes `waitForFonts()` that awaits all `waitUntilDone()`; `remotion/captions` etc. gate rendering on `WaitForFonts.tsx` (audiogram and music-visualization templates have the same helper).

**Fonts: `@remotion/fonts`** (`fonts/src/load-font.ts`): `loadFont({family, url, weight, style, format, display, unicodeRange, ascentOverride, descentOverride, lineGapOverride, featureSettings, stretch, variant})`. Flow: `delayRender` -> `fetchFontData(url)` -> `new FontFace` -> `font.load()` -> `document.fonts.add` -> `registerFontFace` -> `continueRender`; errors go to `cancelRender`. Format inferred from extension (`get-font-format.ts`: woff2/woff/opentype/truetype). Use for brand fonts shipped as files. Manual variant without the package: `template-tiktok/src/load-font.ts` (loads `staticFile("theboldfont.ttf")` under a `delayRender`).

**Colors:** no brand package for runtime; patterns are plain token objects: `template-recorder/config/themes.ts` (`COLORS[theme]` with BACKGROUND, BORDER_COLOR, WORD_COLOR_*, ACCENT_COLOR, CTA_BUTTON_*, ENDCARD_TEXT_COLOR for light/dark). `zColor()` from `@remotion/zod-types` makes colors editable props (`template-three/src/Scene.tsx`). `interpolateColors` for tweening.

**Logo:** `Img` with `staticFile`, e.g. `template-recorder/config/endcard.ts` `avatars`. SVG logos as components in `brand/src/SvgLogos`.

**Recipe:** brand JSON `{palette{bg,surface,text,accent,muted}, fonts{display{family,weights,subsets|url}, body{...}}, logo{src, safeMargin}, theme: light|dark}`; at composition mount, load all fonts, `await Promise.all(waitUntilDone())` inside `delayRender`, then render. Pre-compute `fitText` only after fonts are ready.

**Gaps:** no brand-kit schema or extraction (colors from logo, font detection); no icon set (the recorder hand-writes `icons.tsx`); Google Fonts loading requires network at render unless fonts are pre-bundled (UNVERIFIED if offline cache exists); font fallbacks not managed.

---

## 12. Audio: music, voiceover, SFX, volume curves, ducking, visualizer

**Remotion support**
- Components: `Audio` from `@remotion/media` (props include `volume`, `trimBefore`, `trimAfter`/`durationInFrames`, `playbackRate`, `loop`, `toneFrequency`, `loopVolumeCurveBehavior`, `muted`, `from` per `skills/skills/remotion-markup/audio.md`; legacy core props in `core/src/audio/props.ts`). Reverse playback unsupported; `toneFrequency` works only in server render, not Studio/Player (per `audio.md`).
- Volume is `VolumeProp = number | ((frame: number) => number)` (`core/src/volume-prop.ts`, `evaluateVolume` validates number/NaN). The frame given is relative to the audio's own Sequence (UNVERIFIED for loop edge cases; `loopVolumeCurveBehavior: "extend"` keeps the curve continuing across loops, used in the recorder).
- Volume curve / "ducking" by hand: `template-recorder/remotion/audio/AudioTrack.tsx` `calculateVolume` builds a function with: fade in/out over `AUDIO_FADE_IN_FRAMES = 30`, base level `BACKGROUND_VOLUME = 0.04` under speech scenes, `REGULAR_VOLUME = 1` during "loud parts" (title/end-card scenes, `scene.type !== 'video-scene'`), with ramp-in/out inside each loud span (shorter spans collapse to a 1-frame hinge). Music clips are grouped across scenes via `music: 'previous'` and shifted by `SCENE_TRANSITION_DURATION` to match overlapped transitions. This is scene-based ducking, not signal-based.
- No automatic ducking from voice level: searched the whole monorepo for "ducking"/"duck" (matches only `lambda-python`, a docs file, and a PDF; unrelated). Could be implemented by sampling VO with `getAudioData` + `visualizeAudio` per frame and mapping amplitude to music volume (not shipped).
- `@remotion/media-utils` (`media-utils/src/`):
  - `getAudioData(src)` returns `MediaUtilsAudioData {channelWaveforms: Float32Array[], sampleRate, durationInSeconds, numberOfChannels, resultId, isRemote}` (`types.ts`); `getAudioDuration`, `getVideoMetadata`, `getImageDimensions`, `getPartialAudioData`.
  - `useAudioData(src)` loads the full file (delayRender-based).
  - `useWindowedAudioData({src, frame, fps, windowInSeconds, channelIndex?, requestInit?})` returns `{audioData, dataOffsetInSeconds}`; windows the file so long tracks are not fully decoded; uses `useDelayRender`; Mediabunny under the hood (imports `Input`, `InputAudioTrack`; warns about Matroska).
  - `visualizeAudio({audioData, frame, fps, numberOfSamples, optimizeFor?, dataOffsetInSeconds?, smoothing=true})` returns FFT magnitudes (`numberOfSamples` must be a power of 2, sample size internally `numberOfSamples*2`; results cached per `resultId+frame+fps+numberOfSamples`); `visualizeAudioWaveform`; `getWaveformPortion({audioData, startTimeInSeconds, durationInSeconds, numberOfSamples, channel?, outputRange?, normalize?})` returns `{index, amplitude}[]` bars.
  - Beat reaction example: `template-music-visualization/src/Visualizer/BassOverlay.tsx` takes the average of the first 32 of 128 bins x3, maps to overlay opacity `min(0.5, avg*0.8)`. Spectrum/Waveform in the same folder; `template-audiogram/src/Audiogram/Spectrum.tsx`, `Oscilloscope.tsx`, `AudioVizContainer.tsx`.
- `@remotion/sfx` (`sfx/src/index.ts`): not a synth; exports URL constants hosted at `https://remotion.media/*.wav` (`whip, whoosh, pageTurn, uiSwitch, mouseClick, shutterModern, shutterOld, ding, bruh, vineBoom, windowsXpError, ...`). Many are meme sounds; useful for launch video: whoosh, whip, page-turn, switch, mouse-click, shutter, ding. Needs network at render (remote URLs) unless downloaded.
- Voiceover: guide `skills/skills/remotion-markup/voiceover.md` (ElevenLabs TTS via a generation script writing mp3 into `public/`, then `calculateMetadata` measures durations to size scenes). `template-prompt-to-video/cli/` does the same with timeline JSON. `@remotion/elevenlabs` only converts transcripts to captions.
- Silence detection: ffmpeg `loudnorm` + `silencedetect` guide `silence-detection.md` (not code).

**Recipe**
1. Music: one `Audio loop` at top level, `volume = (f) => base(f)*duck(f)`, with fade-in 0 to 30 frames, fade-out last 30.
2. `duck(f)` = for each VO span `[a,b]` (frames, from known VO durations): 1 outside; ramp to 0.25 over 10 frames before `a`, hold, ramp back 15 frames after `b` (use `interpolate` with multiple stops, or `Math.min` over spans).
3. VO per scene: `<Sequence from><Audio src/></Sequence>`; scene durations from measured VO length + padding (`calculateMetadata`).
4. SFX: `<Sequence from={transitionCenter - 3} durationInFrames={..}><Audio src={whoosh} volume={0.5}/></Sequence>`, aligned to transition midpoint (TransitionSeries has no auto SFX).
5. Visualizer / beat pulse: `useWindowedAudioData` + `visualizeAudio({numberOfSamples:128})`, low-bin average drives scale/opacity.

**Gaps:** no loudness normalization/mastering, no true ducking (sidechain), no beat/onset detection or BPM (only FFT bins), no music library (the recorder ships three mp3s under `public/sounds`, `config/sounds.ts`), no audio mixing preview of volume curves outside Studio, no per-track limiter. SFX are hosted remotely and some are meme/novelty clips (licensing UNVERIFIED).

---

## 13. Aspect-ratio variants and responsive layout

**Remotion support**
- Multiple `Composition`s with different `width/height/fps/durationInFrames` sharing one component: `template-vibe-code/src/remotion/Root.tsx` (`Launch` 1280x720/180f and `SquarePost` 1080x1080/120f, `defaultProps`); `template-recorder/config/layout.ts` (`DIMENSIONS`: landscape 1920x1080, square 1080x1080, `canvasLayout` enum) with per-layout modules `remotion/layout/*` and `remotion/scenes/*/landscape.ts`, `square.ts`.
- `useVideoConfig()` supplies `width/height` at runtime; `Composition.calculateMetadata` can override dimensions/duration per props (`template-prompt-to-video/src/Root.tsx`, `template-recorder/remotion/calculate-metadata/calc-metadata.ts`).
- Responsive text: `fitText` against `width*0.8`/`0.9` (tiktok/prompt-to-video).
- Safe space as constants (`getSafeSpace = 30`, bottom 140 in landscape, `layout/get-safe-space.ts`).
- Layout interpolation across states (webcam/display/captions): `remotion/layout/get-layout.ts`, `fit-element.ts`, `interpolate-layout.ts`.
- Social-media guidance for 9:16: `template-prompt-to-motion-graphics/src/skills/social-media.md` (UNVERIFIED content beyond filename; read for TikTok margins).
- `useCurrentScale` (used in `EndCard/LeftSide.tsx`) for scale-aware sizing.

**Recipe**
1. Define layout as function of `{width, height}`: `unit = min(width,height)/1080`; every size = design px * `unit`; safe margins = % of short side.
2. Provide breakpoint switch on aspect (`w/h >= 1.5` landscape, `<=0.7` portrait, else square) choosing alternative block arrangements (stack vs row).
3. One scene spec -> N compositions (16:9, 1:1, 9:16) with per-target duration if needed.
4. Re-run `fitText` per target; never hardcode absolute left/top for text.

**Gaps:** no layout engine (flex/grid in DOM only, so Capturita's own renderer must replicate); no automatic reframing/safe-zone detection of recorded content; no built-in multi-export job beyond running each composition separately (UNVERIFIED for any batch API).

---

## Coverage checklist

| # | Element | Coverage | Basis |
|---|---|---|---|
| 1 | Intro / logo reveal | Partially | HelloWorld `Logo.tsx`, `brand/animated-logo`, `@remotion/paths`, `starburst`; no preset library or logo ingestion |
| 2 | Kinetic typography | Partially | Patterns + `layout-utils`, `rough-notation`, `animation-utils`; no text-split/preset components |
| 3 | Callouts / arrows / spotlights | Partially | `@remotion/shapes` Arrow/Callout, `rough-notation`, `mac-cursors`; spotlight not found |
| 4 | Device mockups / framed media | Partially | `template-three` Phone + `useVideoTexture`; no 2D device frames |
| 5 | Stat counters / charts | Partially | Hand-built examples only; no chart library |
| 6 | Scene transitions | Fully | `@remotion/transitions` (20+ presentations, timings, custom API, overlays) |
| 7 | Backgrounds | Partially | `effects` shaders, `noise`, `three`, `starburst`, `light-leaks`; no particle component |
| 8 | Captions / subtitles | Fully | `@remotion/captions`, TikTok pages, SRT, 4 whisper paths, elevenlabs |
| 9 | Camera-style motion | Not found (as a component) | Only primitives (`interpolate`, `CameraMotionBlur`); no camera/parallax abstraction |
| 10 | Titles / lower-thirds / end cards | Partially | recorder `Title`/`EndCard`, element-library `lower-third`; templates, not packages |
| 11 | Brand kit | Partially | `google-fonts` + `fonts` loaders are solid; colors/logo are ad hoc token objects |
| 12 | Audio | Partially | `Audio` + volume fn, `media-utils`, `sfx` URLs, manual scene ducking; no signal ducking/beat detect/music library |
| 13 | Aspect variants / responsive | Partially | Multiple Compositions + `useVideoConfig`; layout done per template by hand |

## Launch-video needs Remotion does NOT provide (summary)
Preset/style library for text and logo reveals; text split helper; spotlight/focus and anchored callouts; 2D device frames and cursor-click choreography; chart/data-viz layer; camera/parallax abstraction; particle system; brand-kit extraction and schema; signal-based ducking, beat/onset detection, bundled licensed music; automatic safe-zone reframing and multi-aspect export orchestration; shared-element transitions; a JSON scene-spec (the only JSON timeline, `template-prompt-to-video`, supports just image backgrounds, text, scale animation, and fade/blur transitions).

## Open questions
1. Is the Capturita renderer going to run in a browser/Chromium (so DOM, `fitText`, WebGL `effects`, `HtmlInCanvas` carry over conceptually) or in native Rust/wgpu, in which case which of these primitives must be re-derived (spring math is in `core/src/spring/`, `interpolate`, easing) versus replaced?
2. Do you need the `Interactive.*` / `effects` / `Solid` API layer (new in this checkout, UNVERIFIED stability) or only the stable frame-function model?
3. Should audio ducking be scene-based (as in `template-recorder` `AudioTrack.tsx`) or signal-based (needs per-frame analysis; not in Remotion)?
4. Which unread files could change conclusions: `transitions/src/presentations/wipe.tsx`, `template-element-library/elements/*` bodies, `template-overlay`, `jonnys-videos/src/disco-light-show`, `effects` clipping behaviour, `skills/.../remotion-markup/motion-blur.md`, `html-in-canvas.md`, `3d.md`. Not read in detail due to scope.
5. SFX/music licensing: `@remotion/sfx` URLs are remote and include novelty clips; are Capturita-owned assets planned?
6. Offline font loading: `google-fonts` fetches from `fonts.gstatic.com` at render; is a bundled-font mode required for deterministic offline export?
