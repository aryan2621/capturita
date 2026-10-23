# Remotion teardown, Phase 2: Animation primitives

Repo root `R` = remotion monorepo; all paths below are relative to `packages/` unless noted. Everything here was read from source; "UNVERIFIED" marks things not provable from code. Design takeaway for Capturita: nearly every primitive is a **pure function of (frame, fps, params)**, which is exactly what a JSON-spec canvas renderer needs. The React-specific parts (Sequence, Freeze, CSS clip-path, DOM measurement) are the parts you must replace.

## Summary table

| Primitive | Pure fn of frame? | Enables |
|---|---|---|
| `interpolate` | yes | every keyframe track: fades, slides, scale pops, counters, multi-stop timelines |
| `spring` / `measureSpring` | yes (iterated per-frame closed form) | bouncy logo pops, text stagger (delay per index), overshoot UI cards |
| `Easing` | yes | ease-in/out curves for wipes, camera moves, cubic-bezier parity with CSS |
| `interpolateColors` | yes | background color shifts, text highlight tint |
| `random` | yes (seeded) | deterministic particle scatter, jitter, per-letter offsets |
| `@remotion/paths` | yes (string to string) | line-draw / logo stroke reveal, path morph, point-on-path motion, text-on-path |
| `@remotion/shapes` | yes | generated primitives: circles, stars, pies, arrows, callouts, sparks as SVG path strings |
| `@remotion/noise` | yes (seeded simplex) | organic wobble, camera shake, drifting backgrounds |
| `motion-blur` | needs "render child at fractional frame" | cinematic blur on fast moves; echo trails |
| `layout-utils` | DOM-only, cached | fit headline to width, wrap into N lines, size text boxes |
| `transitions` | yes (progress 0..1 per overlap) | scene-to-scene fade/slide/wipe/flip/iris/clock-wipe |
| `animated-emoji` | video-backed | decorative looping emoji via alpha video |
| `lottie` | frame to `goToAndStop` | imported After Effects / icon animations |
| `gif` | frame to ms to GIF frame index | memes/stickers/reactions |

---

## 1. `interpolate` (`core/src/interpolate.ts`)

**Inputs:** `input:number`, `inputRange: readonly number[]` (strictly increasing, finite; `checkValidInputRange`, `checkInfiniteRange`), `outputRange` same length. Options: `easing` (single fn OR array, one per segment), `extrapolateLeft/Right` in `'extend'|'identity'|'clamp'|'wrap'`, `output: 'linear'|'perceptual-scale'`, `outputType` (`font-weight|scale|translate|rotate|transform-origin`), `posterize` (see `InterpolateOptions`).

**Outputs:** number by default. Newer versions also accept numeric tuples (`interpolateTuple`), booleans, and CSS strings for scale/translate/rotate/font-weight/transform-origin (`interpolateString`, `interpolateFontWeight`). The public overloads are around line 1259 to 1301.

**Math (`interpolate` to `interpolateNumber` to `interpolateSegment` to `interpolateFunction`):**
1. Optional posterize: `floor(input / step) * step` (stepped, "on twos" look).
2. `findRange`: scans stops and picks the segment `i` where `inputRange[i+1] >= input`; input past the last stop uses the last segment, below the first uses the first.
3. Within the segment: apply extrapolation to the input only where the input is outside `[min, max]`:
   - `clamp`: pin to the segment end.
   - `extend` (default for both sides, see `interpolateNumber`): no change, linear continuation (easing then sees t<0 or t>1).
   - `identity`: return the raw input unchanged (skips output mapping).
   - `wrap`: modulo into the range (`((x-min)%r + r)%r + min`), i.e. looping.
4. If `outputMin === outputMax` return it. Otherwise `t=(x-in0)/(in1-in0)`, `t=easing(t)`, `out = t*(out1-out0)+out0`.
5. `perceptual-scale`: interpolates in "area" space (`toSignedArea`/`fromSignedArea`, sqrt of signed area), so scale changes feel even. Useful for zoom in/out.
6. Multi-segment: extrapolation is evaluated per-segment, so a clamp applies at the global ends only because inner stops route to the neighbouring segment. A per-segment easing array is supported (`resolveEasingForSegment`).
7. Spring-tail continuation: if an easing carries `remotionShouldExtendRight` (set by `Easing.spring({allowTail:true})`), a `clamp` on the right is lifted to `extend` for that segment, and earlier segments' tails keep adding their overshoot delta to later segments (loop at the end of `interpolateNumber`). This is how overshoot can "ring through" the next keyframe.

**Enables:** all keyframe animation. Spec idea: `{track:[{t,v,ease}]}` maps directly onto inputRange/outputRange/easing[].

## 2. `spring` and `measureSpring` (`core/src/spring/*.ts`)

**`spring` inputs:** `frame` (floats allowed), `fps`, `config:{mass=1, stiffness=100, damping=10, overshootClamping=false}` (`defaultSpringConfig`), `from=0`, `to=1`, `durationInFrames?`, `durationRestThreshold?`, `delay=0`, `reverse=false`. **Output:** number.

**Physics (`spring-utils.ts`: `advance`, `springCalculation`):**
- Models a damped harmonic oscillator going 0 to 1 with initial velocity 0. `zeta = c/(2*sqrt(k*m))`, `omega0 = sqrt(k/m)`, `omega1 = omega0*sqrt(1-zeta^2)`.
- Integration method: **not** numeric Euler/RK. `advance` uses the **analytic closed-form solution** for a time step and carries position+velocity forward. `springCalculation` loops `f = 0..floor(frame)`, each step advancing by one frame's time (`now = f/fps*1000`, and `deltaTime = min(now - last, 64)` ms cap), then one extra partial step for a fractional remainder. So the value is exact per step but the result at frame N depends on N iterations (O(N), memoized by `calculationCache` and `advanceCache`).
- Under-damped (`zeta<1`) uses the sin/cos envelope formula. **For `zeta>=1` the code uses the critically-damped formula** (`zeta < 1 ? under : critical`). So over-damped configs are approximated by critical damping (behavior verified in code; whether that matches "true" over-damped physics is not, UNVERIFIED but analytically it differs).
- `damping <= 0` throws. `overshootClamping` is applied in `spring()` only: `min(current, to)` (or `max` when `to < from`), after the physics, so clamping truncates rather than changes dynamics.
- `from/to`: result of the 0..1 spring is remapped via `interpolate(inner,[0,1],[from,to])` (skipped when 0..1).

**`durationInFrames` stretching (`spring/index.ts`):** computes `naturalDuration = measureSpring(...)`, then scales time: `frame_used = frame_after_delay / (durationInFrames / naturalDuration)`. The curve shape is preserved, only time-scaled. If the delayed frame exceeds `durationInFrames`, returns `to` immediately (hard stop; also kills any overshoot tail).

**`delay`:** subtracts from frame (`frame - delay`); negative frame clamps to 0 inside `springCalculation` (`Math.max(0, frame)`), so before the delay the value sits at `from`. **`reverse`:** `frame' = (durationInFrames ?? naturalDuration) - frame`, and delay is *added* instead of subtracted in reverse mode.

**`measureSpring` (`measure-spring.ts`):** simulates frame by frame until `|current - 1| < threshold` (default 0.005), then keeps simulating until the value stays within threshold for 20 consecutive frames (resets the counter on any excursion), returns the first frame of that stable window. `threshold===0` returns Infinity, `1` returns 0. Cached by fps/config/threshold.

**`Easing.spring`** (below) wraps this at a fixed virtual 30 fps.

**Enables:** logo pop with overshoot, card entrances, staggered text (call `spring({frame, fps, delay: i*N})` per letter/word).

## 3. `Easing` (`core/src/easing.ts`, `core/src/bezier.ts`)

All static functions on 0..1 (from React Native Animated, per file header). Definitions:
- `linear t`; `quad t^2`; `cubic t^3`; `poly(n) t^n`; `sin 1-cos(t*pi/2)`; `circle 1-sqrt(1-t^2)` (clamped to [0,1]); `exp 2^(10(t-1))`.
- `ease = bezier(0.42,0,1,1)` (note: this is CSS "ease-in", not CSS "ease").
- `elastic(b=1)`: `1 - cos(t*pi/2)^3 * cos(t*b*pi)`. `back(s=1.70158)`: `t*t*((s+1)t - s)`.
- `bounce`: standard 4-parabola piecewise (7.5625 constants), input clamped.
- `step0`, `step1`: step functions.
- Combinators: `in(f)=f`, `out(f)=1-f(1-t)`, `inOut(f)`: first half `f(2t)/2`, second `1-f(2(1-t))/2`.
- `spring({damping,mass,stiffness,overshootClamping,allowTail,durationRestThreshold})`: returns 0 for t<=0; without `allowTail`, 1 for t>=1 and inside it calls `spring()` at fps=30 with `durationInFrames=30` (so progress t maps to a duration-stretched spring); with `allowTail` it uses natural duration and sets `remotionShouldExtendRight` (see interpolate step 7).
- **Bezier solver (`bezier.ts`):** the standard gre/bezier-easing algorithm. Validates x1,x2 in [0,1]. Precomputes an 11-sample table of x(t) (`kSplineTableSize=11`). To solve t for x: locate interval in table, linearly guess t, then by local slope: if slope >= 0.001 run up to 4 Newton-Raphson iterations (`NEWTON_ITERATIONS`), if slope == 0 return guess, else binary subdivision (max 10 iterations, precision 1e-7). Output clamps x to [0,1], returns exact 0 and 1 at the ends, and short-circuits to linear when `x1===y1 && x2===y2`.

**Enables:** CSS-parity curves for wipes/slides and camera pushes.

## 4. `interpolateColors` (`core/src/interpolate-colors.ts`)

**Inputs:** `input`, `inputRange`, `outputRange: string[]` (any CSS color the parser knows: hex, rgb/rgba, hsl, named, plus modern `oklab/oklch/lab/lch`-style parsing via `modernColorCall`, `oklabToSrgb`, `labToSrgb`), options `easing`, `posterize`. **Output:** `rgba(r,g,b,a)` string.
**Behavior:** every stop is parsed to packed ARGB (`processColor`), then **each of R, G, B, A is interpolated independently in gamma-encoded sRGB** using `interpolate` with both extrapolations forced to `clamp` (`interpolateColorsRGB`). RGB channels are rounded to ints, alpha to 3 decimals. Not premultiplied, not perceptual: mid-points between complementary colors go muddy. The oklab/lab support is for *parsing inputs only*, not for interpolating in that space (verified: only the RGB path exists).
**Enables:** background/gradient-stop color transitions. For nicer results Capturita could interpolate in OKLab itself (design choice, not in Remotion).

## 5. `random` (`core/src/random.ts`)

**Inputs:** seed `number|string|null`. **Output:** float in [0,1). String seed hashed with Java-style `hashCode` (31-multiplier, int32) then `mulberry32`. Number seed: `mulberry32(seed * 1e10)`. `null` returns `Math.random()` (non-deterministic, avoid). Single call = single value (stateless): to get a sequence use `random(\`${key}-${i}\`)`. **Enables:** per-particle/per-letter jitter that is identical on every render.

## 6. `@remotion/paths` (`paths/src/index.ts`)

All exports: `evolvePath`, `getLength`, `getPointAtLength`, `getTangentAtLength`, `getInstructionIndexAtLength`, `getSubpaths`, `getBoundingBox`, `cutPath`, `interpolatePath`, `interpolatePaths`, `normalizePath`, `parsePath`, `reduceInstructions`, `serializeInstructions`, `resetPath`, `reversePath`, `scalePath`, `translatePath`, `centerPath`, `extendViewBox`, `warpPath`, plus types and `PathInternals {getBoundingBoxFromInstructions, debugPath, cutPath}`. All are pure string/instruction transforms (no DOM).

- **`evolvePath(progress, path)`** (`evolve-path.ts`): returns `{strokeDasharray: "L L", strokeDashoffset: L - progress*L}` with L = `getLength`. At progress 0 it uses 1.5*L for both to hide a browser artifact from slight length underestimation. Classic stroke-draw reveal. For canvas: use `setLineDash([L,L])` and `lineDashOffset`.
- **`getLength`** (`get-length.ts`, `helpers/construct.ts`): copied from svg-path-properties. Lines exact; cubic/quadratic arc length via **Legendre-Gauss quadrature** (`helpers/bezier-values.ts` tables, `helpers/bezier-functions.ts`); arcs via sampling (`helpers/arc.ts`, 300 samples in `approximateArcLengthOfCurve` use).
- **`getPointAtLength(path, len)`**: re-parses on each call (`construct(path)`; no cache visible in that file), returns `{x,y}` or `null` if `len > totalLength`. `getTangentAtLength` similarly returns tangent. For per-frame use on long paths, pre-compute.
- **`cutPath(d, length)`**: truncates path to a given length (`cut-path.ts`, `cut-instruction.ts`), enabling a real geometry-based draw-on (e.g. when dash is not available).
- **`interpolatePath(value, a, b)`** (`interpolate-path/*`, adapted from d3-interpolate-path): returns exactly `a` at 0, `b` at 1. Otherwise parse, `reduceInstructions`, drop trailing `Z` (re-added only if both closed), pad the shorter one via `extendInstruction` (splits segments with De Casteljau, `split-curve.ts`, `de-casteljau.ts`) until equal command counts, `convertToSameInstructionType` (e.g. line to curve), then lerp coordinates (`interpolate-instruction-of-same-kind.ts`).
- **`interpolatePaths(input, range, paths[], opts)`**: multi-stop version. Trick: interpolates a one-hot weight vector with core `interpolate` (inheriting easing/extrapolation/spring tails), returns the exact source string when one weight is 1, otherwise extends all contributing paths to the longest and blends by weights. Extrapolation `identity` is rejected.
- Others: `normalizePath` (absolutize, convert to M/L/C/Z set via `remove-a-s-t-curves.ts`), `reversePath`, `scalePath`, `translatePath`, `centerPath`, `getBoundingBox`, `extendViewBox`, `warpPath(path, fn)` (maps points through a user function, with curve subdivision, `warp-path/warp-helpers.ts`), `getSubpaths`, `resetPath`.

**Enables:** logo stroke-draw reveal, morphing icon A to B, object-follows-path (point + tangent for rotation), text-on-path, animated underlines/connectors.

## 7. `@remotion/shapes` (`shapes/src/index.ts`, `shapes/src/utils/*`)

Components `Circle, Ellipse, Rect, Triangle, Star, Polygon, Pie, Heart, Arrow, Callout, Spark` plus generators `makeCircle, makeEllipse, makeRect, makeTriangle, makeStar, makePolygon, makePie, makeHeart, makeArrow, makeCallout, makeSpark`. Each `makeX(props)` returns `ShapeInfo {path:string (SVG d), width, height, transformOrigin, instructions}` (see `shape-info.ts`); components render an SVG `<path>` (`components/render-svg.tsx`), now also optionally via `HtmlInCanvas` with `effects`.
Details verified: `makeCircle` is two half-arcs + Z starting at (r,0). `makeStar`: `2*points` vertices alternating outer/inner radius, angle `i*pi/points - pi/2` (top-pointing), joined by `joinPoints` (`join-points.ts`) with optional `cornerRadius` (arc/bezier) or `edgeRoundness` (bezier curve rounding, mutually exclusive). `makePie` takes `progress` (used by `clockWipe` to get a swept wedge). Since output is just a path string, shapes compose with `@remotion/paths` (evolve, morph).
**Enables:** badges, burst shapes, callout bubbles, arrows pointing at UI, progress rings (Pie), clip masks.

## 8. `@remotion/noise` (`noise/src/index.ts`)

Exports `noise2D(seed,x,y)`, `noise3D(seed,x,y,z)`, `noise4D(...)`. Backed by the third-party `simplex-noise` package (`createNoise2D/3D/4D`) with the PRNG argument `() => random(seed)` (core `random`). Output in [-1,1]. FIFO cache of up to ~11 generators per dimension. Verified quirk: `noise3D/4D` pass `random(seed)` (a float) as the cache key/seed whereas `noise2D` passes `seed` directly; and the PRNG callback is a *constant* function of seed (stateless `random` returns the same value each call), so the permutation table derives from a degenerate constant stream. Output is still deterministic; quality of seed-to-pattern variation is UNVERIFIED. Animation: feed `frame*speed` as one axis.
**Enables:** camera shake, floating blobs, organic wiggle, grain driving.

## 9. `@remotion/motion-blur` (`motion-blur/src/*`)

- **`<Trail layers lagInFrames trailOpacity>`** (`Trail.tsx`): renders children `layers` extra times, each in `<Freeze frame={frame - lagInFrames*(layers-i)}>` (a past frame), with opacity `trailOpacity - ((layers-i)/layers)*trailOpacity`, then the live child on top. Pure echo/ghost trail; integer layers only.
- **`<CameraMotionBlur shutterAngle=180 samples=10>`** (`CameraMotionBlur.tsx`): `shutterFraction = angle/360`. Renders `n` copies, each `Freeze`d at fractional frame `currentFrame - shutterFraction*(k/n) + 1` (k=1..n), stacked with `mix-blend-mode: plus-lighter` and each at `opacity(1/n)` inside an `isolation:isolate` container, i.e. an additive average of sub-frames across the shutter window. `getNumberOfSamples` reduces `n` near frame 0 so samples never go to negative frames. Requires the child to be a pure function of (fractional) frame; works since all animation math accepts floats.
- **`HtmlInCanvasMotionBlur`** (`HtmlInCanvasMotionBlur.tsx`): experimental canvas variant. Sample k of n sits at `frame + ((k+0.5)/n - 0.5)*shutterInFrames` (centered on current frame, clamped to the sequence), each captured as an element image (`captureElementImage`) and drawn with `globalCompositeOperation='lighter'`, `globalAlpha=1/n`. Samples 1..64, default 8. Needs a Chrome feature (HTML-in-canvas); shown in code as "Experimental".
**Enables:** fast whip pans/slides looking cinematic; canvas port = N draws of the scene at sub-frame times accumulated with additive blending (or average in a float buffer).

## 10. `@remotion/layout-utils` (`layout-utils/src/layouts/*`)

Browser/DOM only (`measureText` throws if `document` undefined).
- **`measureText({text,fontFamily,fontSize,fontWeight,letterSpacing,fontVariantNumeric,textTransform,additionalStyles,validateFontIsLoaded})`** returns `{width,height}`: creates an absolutely positioned off-screen `<span>` (`top:-10000px`, `white-space:pre`, `inline-block`), sets styles, appends to body, reads `getBoundingClientRect()`, removes it. Cached by a string key of the params (`wordCache`). With `validateFontIsLoaded` it re-measures with the fallback font and throws if dimensions match the fallback while the computed families differ (needs >4 unique chars to avoid false positives).
- **`fitText({text,withinWidth,...})`**: measures at a 100px sample and returns `fontSize = withinWidth / width100 * 100` (linear scaling, single line).
- **`fillTextBox({maxBoxWidth,maxLines})`**: returns `.add(word)` which tries to append a word to the current line (sums per-word `measureText` widths, accepts if `ceil(total) <= maxBoxWidth`), otherwise starts a new line, else reports `exceedsBox` at the last line. Per-word summation ignores kerning across word boundaries (inferred from the code, which sums separately measured words).
- **`fitTextOnNLines({text,maxLines,maxBoxWidth,maxFontSize?})`**: binary searches font size (0.1 up to `maxFontSize` default 2000, resolution 1/100) using `fillTextBox` with space-split words; returns font size and lines.
Replacement for Capturita: canvas `ctx.measureText` (same approach: measure then scale/binary-search) and compute per-line widths; fonts must be loaded before measuring (`document.fonts.load`).
**Enables:** headline auto-fit, caption boxes, balanced multiline titles.

## 11. `@remotion/transitions` (`transitions/src/*`)

**Model:** `<TransitionSeries>` children are `<TransitionSeries.Sequence durationInFrames offset?>`, `<TransitionSeries.Transition timing presentation>` between two sequences, and `<TransitionSeries.Overlay>` (a centered effect on the cut, `durationInFrames`, `offset`).
**Timing objects** (`types.ts: TransitionTiming = {getDurationInFrames({fps}), getProgress({frame,fps})}`):
- `linearTiming({durationInFrames, easing?})`: progress = clamped `interpolate(frame,[0,dur],[0,1])`.
- `springTiming({config, durationInFrames?, durationRestThreshold?, reverse?})`: duration is either given or `measureSpring(config)`; progress is `spring(...)`.
**Overlap and total length (`TransitionSeries.tsx`):** each Transition's duration is subtracted from a running `transitionOffsets` (`resolvedTransitionOffsets -= duration`), and the next sequence's start is `currentStartFrame + transitionOffsets`. So the two scenes **overlap for exactly the transition duration**, and total length = sum(sequence durations) - sum(transition durations) (+ offsets). Validation throws if a sequence is shorter than an adjacent transition (checks around the `getDurationInFrames` comparisons) and a Transition can't be adjacent to an Overlay.
**Progress per scene:** for the outgoing scene, `nextProgress` uses `frame - actualStart - dur + nextDuration` mapped through `timing.getProgress` while in `[0, nextDuration)`; incoming uses `frame - actualStart`. Both are passed through contexts (`EnteringContext/ExitingContext`) and exposed via `useTransitionProgress()` (`entering`, `exiting` in 0..1) for in-scene animation.
**Custom presentation:** `TransitionPresentation<Props> = {component, props}`. The component receives `{presentationProgress (0..1), presentationDirection: 'entering'|'exiting', children, passedProps, presentationDurationInFrames, bothEnteringAndExiting, onElementImage, onUnmount}` and wraps children in styling (opacity/transform/clip). `none()` is the "do nothing" presentation, so you drive visuals yourself with `useTransitionProgress`. `makeHtmlInCanvasPresentation` (`html-in-canvas-presentation.tsx`) lets a presentation be a WebGL/shader pass over both scenes' captured element images (used by the newer ones such as dissolve/ripple, UNVERIFIED which exactly, I confirmed the file exists and exports `HtmlInCanvasShader` types).
**Presentation list** (files in `transitions/src/presentations/`; subpath exports in `transitions/package.json`): `fade`, `slide`, `wipe`, `flip`, `clockWipe`, `iris`, `none`, `blurSlide`, `bookFlip`, `crossZoom`, `crosswarp`, `dissolve`, `dreamyZoom`, `filmBurn`, `linearBlur`, `pushCut`, `ripple`, `swap`, `zoomBlur`, `zoomInOut`. **No `cube` presentation exists** (searched the package).
Verified behaviors:
- `fade`: entering opacity = progress; exiting stays 1 unless `shouldFadeOutExitingScene`.
- `slide`: entering translates from direction by `-100+p*100 %`; exiting is pushed out by `p*100 %`; a 0.01% epsilon overlap avoids a seam line until p==1. Directions from-left/right/top/bottom.
- `wipe`: CSS `clip-path: polygon(...)` that grows a rect from an edge or a triangle (diagonals use `p*2`); 8 directions (`wipe.tsx`).
- `flip`: entering rotates from +-180deg to 0 and exiting from 0 to +-180 around Y (or X for top/bottom) with `backface-visibility:hidden`, `perspective` default 1000.
- `clockWipe`: clipPath of a `makePie({radius: half diagonal, progress})` path translated to center (needs width/height props). `iris`: entering clipPath is a circle with radius from 0 to half-diagonal (`makeCircle`), centered.
**Enables:** scene cuts in a multi-scene Studio spec. Canvas port: render scene A and B to two offscreen canvases per frame in the overlap and composite with a function of progress (alpha, offset, clip path, shader).

## 12. `@remotion/animated-emoji` (`animated-emoji/src/AnimatedEmoji.tsx`)

Not vector animation: wraps `<OffthreadVideo transparent muted>` inside `<Loop durationInFrames=floor(durationInSeconds*fps/playbackRate)>`; source from `calculate-emoji-src.ts` (`staticFile("<emoji>-<scale>x.webm|mp4")`, WebM VP8/9 alpha in Chromium, HEVC mp4 in WebKit). Frame sync comes from OffthreadVideo (per-frame extraction by Remotion's compositor) plus Loop modulo. `emoji-data.ts` has the catalogue with per-emoji durations. UNVERIFIED: asset hosting (assets are resolved via `staticFile`, not shipped in the package source I read).

## 13. `@remotion/lottie` (`lottie/src/Lottie.tsx`, `utils.ts`)

Wraps `lottie-web`. Each rendered frame calls `animation.goToAndStop(frame, true)` (isFrame=true) where `getLottieFrame` = `loop ? frame % totalFrames : min(frame, totalFrames-1)`, and `direction==='backward'` returns `totalFrames - n`. Initial mount seeks twice (`max(0,f-1)` then `f`) as a workaround for an init bug (comment in code), and holds the render with `delayRender` until the DOM is ready. Lottie's own fps is ignored: Lottie frame index = Remotion frame (times playbackRate through the surrounding `Sequence`/loop wrapper with `Internals.resolveSequenceDuration`, and implicit loop duration = lottie `totalFrames`). If the Lottie fps differs from the composition fps, speed is shifted (via `playbackRate`; UNVERIFIED whether any automatic fps conversion exists, I saw none). `getLottieMetadata` reads dimensions/fps/duration.

## 14. `@remotion/gif` (`gif/src/*`)

Rendering path (`GifForRendering.tsx`): GIF fetched, parsed in `parse-generate.ts` (gifuct-js) into full composited frames (handling disposal types 2 and 3 by clearing / restoring a canvas snapshot) plus `delays[]` (ms). `useCurrentGifIndex`: `time_ms = frame/fps*1000*playbackRate`; `time % totalDelay` (loop) then walks cumulative `delays` to find the index; `loopBehavior` options `pause-after-finish` (last frame) and `unmount-after-finish` (-1). The chosen frame is drawn to a canvas; `delayRender` blocks until the GIF is loaded. `getGifDurationInSeconds` sums delays. Sync is wall-time based, so GIF frames hold across several video frames and are not resampled.

---

## Newer packages (one line each)

- `animation-utils/src/transformation-helpers/{interpolate-styles,make-transform}`: helpers to interpolate CSS style/transform strings and build typed transform strings (`index.ts`).
- `effects/src/index.ts` (+ ~90 files): GPU/canvas effects applied to an element: blur, glow, drop-shadow, chromatic-aberration, barrel-distortion/fisheye, halftone, duotone, LUT, color-correction, zoom-blur, page-turn, tv-signal-off, light-trail, evolve, wave, noise-displacement, pixelate, vignette, etc. (file names in `effects/src`). Highly relevant if Capturita wants shader-style polish.
- `light-leaks/src/LightLeak.tsx`: film light-leak overlay component plus `lightLeak` canvas effect (`light-leak-internals.ts`).
- `starburst/src/Starburst.tsx`: static WebGL ray-burst pattern (rays, colors, rotation, edge smoothness, vignette props), also exported as an effect.
- `rounded-text-box/src/create-rounded-text-box.ts`: builds an SVG path for a rounded highlight box around multiline text from per-line measurements (`textMeasurements`, `textAlign`, `horizontalPadding`, `borderRadius`), the "marker highlight" caption background.
- `rough-notation/src/Annotation.tsx`: hand-drawn Box/Circle/Underline/Highlight/StrikeThrough/CrossedOff/Bracket annotations (rough.js-style, `rough.ts`).
- `svg-3d-engine/src/index.ts`: 4D matrix transforms + path extrusion to project 3D shapes into SVG paths (`threeDIntoSvgPath`, `extrudeElement`, `interpolateMatrix4d`).
- `gsap/src/use-gsap-timeline.ts`: `useGsapTimeline` creates a paused GSAP timeline and seeks it with `totalTime` from `frameToSeconds(frame,fps)` (`frame-time.ts`); forbids play/pause inside builders (deterministic scrubbing).
- `rive/src/RemotionRiveCanvas.tsx`: Rive canvas wrapper advancing a state machine/artboard frame-wise (`@rive-app/canvas-advanced`); exact stepping logic not read (UNVERIFIED).
- `sfx/src/index.ts`: URL constants for hosted sound effects (whip, whoosh, page-turn, ding, mouse-click...), served from remotion.media.
- `timeline-utils/src/index.ts`: Studio timeline helpers (audio waveform peaks, frame-strip extraction for thumbnails), not motion-graphics.

## Open questions

1. `spring` for `zeta > 1`: code reuses the critically damped formula. Do we want true over-damped math, or does visual parity with Remotion not matter for Capturita's own spec?
2. `springTiming({reverse:true})` passes both swapped `from/to` and `reverse:true` to `spring`; the combined effect (double reversal?) was not tested (UNVERIFIED, would need running; not run per rules).
3. Frame-iteration cost: spring is O(frame) per call with memoization; for a canvas renderer decide whether to precompute a per-config LUT per scene.
4. `interpolateColors` is gamma-space RGB; should Capturita use OKLab for nicer gradients (a deliberate deviation)?
5. `noise3D/4D` seeding quirk (random(seed) as seed; constant PRNG stream): reproduce, or use a proper seeded PRNG (e.g. mulberry32 stream) in our reimplementation?
6. Motion blur on canvas: N full-scene draws per frame (additive, 1/N alpha) is expensive; consider only blurring layers with velocity above a threshold, or accumulating in WebGL.
7. Which transitions are shader-based (`makeHtmlInCanvasPresentation`) vs CSS-based? Only fade/slide/wipe/flip/clockWipe/iris/none were read in full; the rest (dissolve, ripple, crosswarp, etc.) were not.
8. Lottie fps mismatch handling and Rive stepping were not fully traced.
9. `layout-utils` uses DOM measurement; for a Tauri webview canvas renderer, confirm `ctx.measureText` (with `fontBoundingBox*`) gives line heights matching the DOM used for preview.
10. Gif/Emoji/Lottie are asset-backed and need preloading and a "decode-ready before frame N" guarantee; Remotion uses `delayRender` for this. Capturita needs an equivalent asset-ready gate in the deterministic renderer.
