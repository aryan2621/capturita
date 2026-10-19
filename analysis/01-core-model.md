# Remotion teardown, Phase 1: Core model

Source: Remotion monorepo (shallow clone), `packages/core/src` unless noted. Read from source; docs not used. Note: this checkout is a recent version; Sequence has `trimBefore`, `playbackRate`, `loop`, `freeze` props and a Studio-only "activity" subsystem that older Remotion lacked.

## 1. The frame-as-a-function model
- Rendering is "set one integer frame on the page, wait until the page says it's ready, screenshot". There is no clock in the page during render.
- The renderer (`packages/renderer/src/seek-to-frame.ts`, `seekToFrame`) does: `waitForReady` -> `page.evaluate(window.remotion_setFrame(f, compId, attempt))` -> `waitForReady` -> `document.fonts.ready`.
- `window.remotion_setFrame` is installed in a layout effect in the timeline provider (`TimelineContext.tsx`). It calls `delayRender("Setting the current frame to f")`, writes `{[compositionId]: f}` into the `frame` state record, then `continueRender` on the next `requestAnimationFrame` (or immediately if the frame was unchanged).
- Initial frame comes from `window.remotion_initialFrame`, injected via `evaluateOnNewDocument` in `renderer/src/set-props-and-env.ts` (same place that sets `window.remotion_inputProps`, `remotion_attempt`, `remotion_logLevel`, etc.).
- Animation is therefore pure: components call `useCurrentFrame()` and derive output (interpolate/spring) from it. Determinism = same (props, frame) -> same React tree.

## 2. How the frame flows (contexts)
- Absolute frame: `TimelineContext` (`TimelineContext.tsx`) holds `frame: Record<compositionId, number>`, `isPlaying()`, `isInsideFreeze`, `audioAndVideoTags`. Per-composition map, not a single number.
- `useTimelinePosition` (`timeline-position-state.ts`, `useTimelinePositionFromContext`) reads `state.frame[videoConfig.id]` and clamps to `[0, durationInFrames-1]` (`clampFrameToCompositionRange`), except for the Studio "dormant" case. Falls back to `window.remotion_initialFrame`.
- `useCurrentFrame` (`use-current-frame.ts`, `useCurrentFrameWithOptionalSubscription`): throws if outside `CanUseRemotionHooks`; returns `(timelineFrame - (seq.cumulatedFrom + seq.relativeFrom)) * (seq.playbackRate ?? 1)`. Offset comes from the nearest `SequenceContext`; with no Sequence the offset is 0. A non-subscribing variant returns 0 and reads a never-changing context to avoid re-renders.
- `SequenceContext` (`SequenceContext.tsx`) fields: `cumulatedFrom`, `relativeFrom`, `absoluteFrom`, `parentFrom`, `cumulatedNegativeFrom`, `durationInFrames`, `playbackRate`, `premounting`, `postmounting`, `width`, `height`, `id`, display values.
- `useVideoConfig` (`use-video-config.ts`) reads `useUnsafeVideoConfig()` and throws if none or if `CanUseRemotionHooks` is missing. Returns `VideoConfig` (`video-config.ts`): width, height, fps, durationInFrames, id, defaultProps, props, default codec/outName/pixel format etc.

## 3. Composition
- `Composition.tsx`, props: `id`, `component` or `lazyComponent`, `width/height/fps/durationInFrames`, `defaultProps`, `schema` (zod), `calculateMetadata`. Types (`CompositionCalculateMetadataOrExplicit`) force either explicit width/height/fps/duration OR a `calculateMetadata` that supplies them.
- It does not render itself directly: an effect registers a composition record (id, component, defaultProps passed through `serializeThenDeserializeInStudio`, schema, calculateMetadata) in the composition manager; the selected composition is rendered through a React portal (`portalNode()`), wrapped in `CanUseRemotionHooksProvider` and `Suspense`. During rendering the Suspense fallback calls `delayRender("Waiting for Root component to unsuspend")` so a lazy component gates capture.
- `validateCompositionId`, `validateDefaultAndInputProps` (object, not array) run at registration.

## 4. Sequence (`Sequence.tsx`)
- Props: `from`, `durationInFrames`, `layout` ('absolute-fill' default, or 'none'), `premountFor`, `postmountFor`, `trimBefore`, `playbackRate`, `loop`, `freeze`, crop*, width/height, `name`, `hidden`, `showInTimeline`.
- `layout='absolute-fill'` wraps children in an absolutely positioned fill div (style/className allowed); `'none'` renders children bare and forbids style/crop/ref. Validated in `RegularSequenceRefForwardingFunction`.
- Offsets: `cumulatedFrom = parent.cumulatedFrom + parent.relativeFrom` (0 at root). `relativeFrom = (from + loopOffset - trimBefore/playbackRate) / parentPlaybackRate`. `absoluteFrom = parent.absoluteFrom + relativeFrom`. So relative frame in `useCurrentFrame` = absolute - sum of all ancestors' `from` (adjusted for rate/trim).
- Visibility: `contentVisible = frameInParent - from >= -tol && frameInParent - (from + duration) < -tol`, where `frameInParent = (absoluteFrame - cumulatedFrom) * parentPlaybackRate`. End is exclusive. Outside the window, children are not rendered at all (null) in render mode. Tolerance from `get-sequence-boundary-tolerance.ts`.
- Duration is clamped by `min(compositionDuration - from, parentSequenceDuration - windowRelativeFrom)`, so nesting can only shorten.
- Loop on a Sequence: iteration index from `(frameInParent - from)/loopPeriod` with float-boundary snapping (`Number.EPSILON * 4`); the clock origin shifts by `iteration * period`; `LoopContext` provides `iteration`.
- `freeze` prop wraps content in `<Freeze>`.
- Sequence ids use `Math.random()` but only for UI/registration identity (`Sequence.tsx`: `useState(() => String(Math.random()))`), not visual output.

## 5. Series (`series/index.tsx`)
- `Series` accepts only `Series.Sequence` children (throws otherwise, whitespace strings tolerated). `SeriesInner.renderChildren` recursively threads `startFrame`: each child becomes a `Sequence` with `from = startFrame + offset`, and the next start = `startFrame + durationInFrames/playbackRate + offset`.
- `offset` must be a finite integer (negative = overlap, positive = gap). `durationInFrames` validated (floats allowed); only the last item may be `Infinity`. `loop` is rejected on Series.Sequence. `from` is stripped. Wrapped in a `Track` with layout none.

## 6. Freeze (`freeze.tsx`)
- Validates `frame` is a finite number. When active, replaces `TimelineContext` with a fixed value `{frame: {[compId]: frameToFreeze / playbackRate + relativeFrom}, isPlaying: () => false, isInsideFreeze: true}` and sets `SequenceContext.cumulatedFrom = 0`, so descendants' `useCurrentFrame()` returns the frozen frame regardless of outer time. `active` can be a boolean or `(frame) => boolean`.

## 7. Loop (`loop/index.tsx`)
- Component built on Sequence. Computes `iterationDuration = durationInFrames/playbackRate`, `iteration = clamp(floor(currentFrame/iterationDuration))` with the same epsilon boundary snap, `from = iteration * iterationDuration` clamped, then renders `<Sequence from={from} durationInFrames>`, so children see a frame that restarts at 0. `times` (integer, default Infinity), capped by `ceil(compDuration/iterationDuration)`. Provides `LoopContext {iteration, durationInFrames}`.

## 8. Resolving duration / fps / width / height (`resolve-video-config.ts`, `ResolveCompositionConfig.tsx`)
- Precedence per field: `calculateMetadata()` result, else `<Composition>` prop, else validation error (no implicit default for the four dimensions). `validateCalculated` runs `validateDimension`, `validateFps`, `validateDurationInFrames` (integers, `allowFloats:false`), `validateCodec`. Codec/outName/imageFormat/pixelFormat/proRes/sampleRate are optional overrides from calculateMetadata only.
- `calculateMetadata({defaultProps, props, abortSignal, compositionId, isRendering})` may be sync or async; return may override `props`, which replaces the original props in the resolved config (`props: calculated?.props ?? originalProps`). `metadataSource` records which fields came from where.
- Renderer path: `renderer/src/select-composition.ts` calls `window.remotion_calculateComposition(id)` in the page (declared in `core/src/index.ts`).

## 9. How props reach a composition
- `defaultProps` on `<Composition>` (stored on the registered composition).
- Non-metadata path in `ResolveCompositionConfig.tsx`: `props = {...defaultProps, ...selectedEditorProps (Studio), ...getInputProps()}` (input props only if not Player and `window.remotion_inputProps` set). So inputProps shallow-override defaultProps, top level only.
- Metadata path: `calculateMetadata` receives `defaultProps` and `props` (the input props) separately and decides the final `props`.
- `getInputProps()` (`config/input-props.ts`): reads `window.remotion_inputProps` (a JSON string injected by renderer), deserialised with `deserializeJSONWithSpecialTypes`. Throws in Player and when unset; has a Studio localStorage override (`input-props-override.ts`). Empty object on server.
- Serialization (`input-props-serialization.ts`): JSON with special tokens for Date (`remotion-date:`), static files (`remotion-file:`), Map/Set flagged. `serializeThenDeserializeInStudio` round-trips defaultProps/props in Studio so users see the same lossy JSON semantic as render.
- Zod: `schema` is only stored on the composition record in core (`Composition.tsx`); core never calls parse. Consumers are Studio (`packages/studio/src/components/RenderModal/SchemaEditor/*`, prop editing UI). The `zod-types` package supplies `zColor`, `zMatrix`, `zTextarea`. `AnyZodObject` (`any-zod-type.ts`) accepts zod v3 and v4. UNVERIFIED: whether CLI/renderer validate input props against the schema at render time (grep of renderer/core found no `safeParse`).

## 10. delayRender / continueRender (`delay-render.ts`, `use-delay-render.tsx`)
- Global state on `window`: `remotion_renderReady`, `remotion_delayRenderHandles[]`, `remotion_delayRenderTimeouts{}`, `remotion_cancelledError`, `remotion_attempt`.
- `delayRenderInternal`: random numeric handle pushed to the list, `remotion_renderReady = false`. When rendering, sets a timeout (puppeteer timeout minus 2s, default base 30s); on expiry cancels the render with an error carrying the label, callstack and retries-left tokens (client-side rendering stores the error instead of throwing). Options: `timeoutInMilliseconds`, `retries`.
- `continueRenderInternal`: validates handle, clears its timeout, removes it from the list; when the list is empty sets `remotion_renderReady = true`.
- Gate: `waitForReady` (`renderer/src/seek-to-frame.ts`) polls in-page `window.remotion_renderReady === true` (or cancelledError set) via puppeteer `waitForFunction`, timeout = user timeout + 3s so the in-page error surfaces first; on timeout it lists open labelled handles. Hook version `useDelayRender` scopes handles for client-side rendering.
- Retry: whole frame is retried with `remotion_attempt` incremented.

## 11. random() (`random.ts`)
- `random(seed)`: string seed -> `hashCode` (Java-style 32-bit) -> mulberry32; number seed -> `mulberry32(seed * 1e10)`; `null` -> real `Math.random()` (explicit opt-out); second arg throws (guards `random('a', x)` misuse). Stateless: same seed gives the same value, so per-element randomness is `random(\`item-${i}\`)`.

## 12. Other determinism mechanisms
- Hooks are only valid inside composition context (`CanUseRemotionHooks`), and frame is clamped.
- Media seeking: `Html5Video` render path (`video/VideoForRendering.tsx`) computes media time from the frame via `getMediaTime` (`video/get-current-time.ts`: frame*1000/fps, scaled by playbackRate/startFrom), takes a `delayRender`, and seeks with `seekToTimeMultipleUntilRight` (`video/seek-until-right.ts`, uses `requestVideoFrameCallback` + `seeked` event, retries until the presented frame matches desired time).
- `OffthreadVideo` (`video/OffthreadVideoForRendering.tsx`): computes `currentTime` from frame, `delayRender("Fetching ... from server")`, fetches a decoded frame image from the render server (proxy port `window.remotion_proxyPort`), so no `<video>` seeking in the browser.
- `Img` (`Img.tsx`): in render mode takes a `delayRender`, awaits `img.decode()` (falls back to onload), has retry/`onError` handling, and `continueRender`s when loaded.
- Fonts: `document.fonts.ready` awaited after each frame set (`seekToFrame`).
- `window.alert` is overridden to cancel render (`set-props-and-env.ts`).
- Not enforced: nothing blocks `Math.random()`/`Date.now()` in user code (core itself uses `Math.random()` for ids and `Date.now()` in `RemotionRoot.tsx` for mountTime, UI-only). Determinism of user code is by convention. UNVERIFIED: any virtual-time or animation-freezing of CSS animations/transitions (grep found none in renderer/src/*.ts).
- Premounting (`use-premounting.ts`, `Sequence.tsx` `PremountedPostmountedSequence`): `premountFor`/`postmountFor` frames before/after the window keep children mounted but hidden (opacity style) and wrapped in `<Freeze>` at the boundary frame, so media/images preload. `premountingActive`/`postmountingActive` are forced false when `environment.isRendering`, so premount is a preview-only optimization; renders just unmount outside the window. Default premount seconds via `DefaultPremountContext`.

## Design takeaways for a canvas/JSON renderer
1. Make the renderer a pure function `draw(spec, props, frameIndex, ctx)`. Remotion's whole model is: integer frame in, pixels out; no wall clock.
2. Keep a tiny time-scope stack (offset + rate + duration) instead of React contexts: `local = (abs - cumulativeFrom) * rate`; visibility is half-open `[from, from+dur)`; child duration clamps to parent. Series = precomputed cumulative starts with signed integer offset; Freeze = override local time; Loop = `local mod period` plus iteration index. In JSON these become node fields (`from`, `duration`, `offset`, `freeze`, `loop`, `rate`) resolved at spec-compile time.
3. Resolve metadata first (fps/size/duration) with explicit precedence and validation (integers, positive) before any frame draws; allow a pre-render "calculate" hook for data-dependent duration (the calculateMetadata pattern), returning final props.
4. Seed all randomness from stable string ids (`hash(id) -> mulberry32`) and ban the global RNG/time in generated scene code. Remotion only enforces this by convention; a JSON spec can enforce it structurally.
5. Readiness gating: handle-counter with labels and timeouts, "ready when zero handles", plus per-frame retry. In a canvas renderer, preload images/fonts/video frames as a pre-pass keyed by spec, and fail loudly on timeout.
6. For video clips, map frame -> source time arithmetically and decode explicitly (offthread/decoder in Rust) rather than relying on element seeking.
7. Props merging: defaults < overrides, shallow; JSON with special-type tokens (dates, files). Validate against a schema at the boundary (Remotion core does not parse; add this yourself).
8. Premount is a preview-only concern; skip for deterministic export.

## Open questions
- Does any Remotion CLI/renderer path validate inputProps against the zod schema at render time (not found in core/renderer)?
- How are CSS animations/transitions and `requestAnimationFrame` effects neutralised, if at all (not found)?
- How does `calculateMetadata`-returned `props` interact with Studio `selectedEditorProps` when both exist (metadata path ignores them in the code read)?
- Exact tolerance math in `get-sequence-boundary-tolerance.ts` for fractional frames (not read).
- How `OffthreadVideo` frames are extracted server-side (Rust compositor in `packages/compositor`, not covered here).
- Frame retry semantics across the full pipeline (`attempt` usage beyond `remotion_attempt`).
