# Studio mode: remaining work

Written 2026-10-19. This is the handoff for finishing Studio mode in Capturita. A new session
should read it fully, then take items in order. A typical request: "Read docs/studio-remaining.md
and do item 2."

---

## How to work in this repo

- **Reading:** read only the line ranges you need. Never read `node_modules`, `dist`, `target` or lockfiles.
- **Verifying:** use `npx tsc --noEmit -p .` and `cargo check` (run in `src-tauri/`). **Don't write or run tests.**
- **Visual work:** judge it by rendered frames. Export, pull frames with ffmpeg, and look at them
  before saying something looks right. Quality bar: professional launch-video motion graphics.
- **Commits:** none unless the user asks. Don't change files outside the item's scope without asking.
- **Remotion version:** pinned to **4.0.532** everywhere: the app's `package.json` and
  `studio-renderer/package.json`. Any new `@remotion/*` package uses exactly that version.
- **Other sessions:** another session may be editing the same files. Run `git status` and read
  the current code before changing anything. Don't revert changes you didn't make.
- **Reporting:** say plainly what you verified in the running app and what you didn't.

---

## Goal and architecture (decided, don't revisit)

**Goal:** a launch video has a recorded half (Capturita's screen demo) and a generated half:
intros, logo reveals, kinetic text, callouts, device mockups, stats, lower thirds, end cards,
transitions and audio. Studio mode makes the generated half **with Remotion, inside Capturita**.

**Who does what:**
- Capturita owns the timeline, the preview and the final export.
- Remotion only produces scene pieces.
- There is no separate app and no custom canvas renderer. Both were rejected.

**Timeline** (`src/editor/model.ts`):
- `Edit.items` is an ordered list of recording clips (`kind:'recording'`, source-time ranges)
  and scene items (`kind:'scene'`, a composition id plus props plus `duration` in seconds).
- Each item has an optional `transition` (cut or crossfade).
- `Edit.overlays` holds scenes drawn over the timeline at output times, such as a lower third.
- `Edit.brandKit` names the project's brand kit.
- `positionAt(items, t)` returns which recording frame shows, whether the recording is visible,
  and the scenes on screen with their time and opacity.

**Preview:**
- Capturita's playback clock drives everything.
- Recording frames are drawn on the canvas by `drawFrame` (`src/editor/render.ts`).
- Scenes and overlays are `@remotion/player` instances stacked over the canvas
  (`src/studio/SceneLayer.tsx`). Every frame, the editor loop in `src/windows/EditorView.tsx`
  sets their opacity and calls `seekTo`. They never play on their own clock.

**Export:**
1. `src/studio/renderScenes.ts` hashes each piece (props, brand, recording info, frames, size,
   `SCENE_RENDER_VERSION`).
2. It calls the Rust command `studio_render` (`src-tauri/src/studio.rs`). That spawns
   `node studio-renderer/render.mjs --jobs <json> --root <project>` and passes on
   `studio-render-progress` events. It can be cancelled and skips files that already exist.
3. Files are cached in `<project>/scenes/`:
   - scenes are opaque H.264 `.mp4`
   - overlays are VP9 `.webm` with alpha (yuva420p)
4. `src/editor/export.ts` decodes them with mediabunny and composites them with the same
   layering and frame choice as the preview. The output is one MP4 (or GIF) with one audio mix.

**Renderer** (`studio-renderer/`):
- `entry/index.tsx` registers every scene in `SCENES`.
- `render.mjs`:
  - bundles once per run, with remotion, react and react-dom aliased to the app's
    `node_modules`, so preview and export run the same code
  - serves the project folder on 127.0.0.1 with byte-range support, so scenes can load the
    recording and the logo through `props.assets.base`
  - writes `*.part.*` files, then renames them
  - writes H.264 tagged BT.709 limited range
- **The renderer works in dev builds only.** It needs system Node and this folder. See item 8.

**Scene contract** (`src/studio/scenes/`):
- `index.ts` holds the registry: `SCENES`, `SCENE_FPS = 30`, `SCENE_RENDER_VERSION`, and field
  types (`text | color | boolean | choice | segment | rect`) that drive `ScenePanel.tsx`.
- `assets.ts`: everything a scene receives besides its own props: `brand` (colors, display and
  body fonts, logo), `recording` info and `assets` (URL base). It's shared by preview and
  renderer, so keep app code out of it.
- `fonts.ts`: scenes import it, so the renderer loads the same fonts as the preview.
- `RecordingVideo.tsx`: plays a part of the screen recording inside a scene.
- Existing scenes: `LogoSting`, `TitleReveal`, `KineticStatement`, `DeviceShowcase`, `FeatureCallout`,
  `StatCounter`, `LowerThird`, `EndCard`.
- Field types also include `number` and `list` (rows of `text | number | choice` cells, stored as an
  array of objects, with `newItem`, `min`, `max`). `ScenePanel.tsx` edits them.

**Brand kits:**
- Stored app-wide in `Capturita/Brand/kits.json` plus logo files, handled by `src-tauri/src/brand.rs`.
- Code: `src/studio/brandKits.ts`, `BrandSection.tsx`.
- A project copies the logo it uses into `<project>/brand/`.

**Callout targets:**
- `TargetPicker.tsx` lets the user drag a rectangle on the recording frame.
- `sceneEnv.ts` `suggestTarget` proposes one from the recorded clicks (`CursorData.clicks`).

**Rules every scene must follow:**
- Be a pure function of `useCurrentFrame()`. No CSS animations or transitions, no
  `Math.random` (use remotion `random(seed)`), no timers.
- Set `line-height` explicitly. WebKit (preview) and Chrome (renderer) disagree on `normal`.
- Size everything from `useVideoConfig()`, using units of the short side, so every aspect ratio works.
- Bump `SCENE_RENDER_VERSION` whenever a scene's look changes. Otherwise cached files are reused.
- **WKWebView can't decode ProRes.** Files Capturita reads must be H.264 (opaque) or VP9 WebM
  with alpha (transparent). ProRes 4444 is only for files handed to other editors (item 9).

**Decisions already made:**
- Callout targets can be both user-picked and suggested.
- Music and SFX come from a pack the user licenses. Never use Remotion's hosted `@remotion/sfx` URLs.
- Transparent export is required.
- Licensing: building on Remotion is allowed; larger companies need a company license. Don't
  set `acknowledgeRemotionLicense` on the user's behalf.

**Reference material:** `analysis/00–05*.md` is a source-level teardown of Remotion:
- `02`: animation tools
- `03`: recipes for all 13 demo elements, and what Remotion lacks
- `04`: rendering, codecs and transparency
- `05`: AI-generation patterns

---

## Status at time of writing

| Area | Status |
|---|---|
| Scenes on the timeline, preview, crossfades (task 1) | Built |
| Export with scenes: helper, cache, compositing (task 2) | Built. Exported 1080p in the running app; scene pixels match their source files; an unchanged re-export reused every scene file |
| Export color range (exports looked washed out) | Fixed: `src/editor/encoderRange.ts` corrects the MP4 range tag from the SPS. Proven with ffmpeg (page white 251,248,247 in source and export) |
| Brand kit, recording inside scenes, Device showcase, Feature callout, target picking (task 3) | Built. DeviceShowcase checked in preview and export. Target picking and "Suggest" **not yet checked in the app** |
| Overlay track + LowerThird (task 4) | Built. LowerThird checked over a recording and through a crossfade into a scene; preview matches export with clean alpha edges |
| Item 2: four new scenes + `list`/`number` fields (2026-10-19) | **Built, not verified in the app.** Rendered headless at 16:9, 9:16 and 1:1 with no errors; one contact sheet reviewed and fixed (LogoSting wordmark default empty, stacked layout in square/portrait; Kinetic wraps in portrait; Stat/EndCard scale up in portrait). Fixes not re-rendered. Preview vs export not compared |
| Item 3: transitions (2026-10-19) | **Built, not verified anywhere.** tsc passes. No render, preview or export check yet |
| Item 4: audio (2026-10-19) | **Built, not verified anywhere.** tsc and cargo check pass |
| Item 5: captions over scenes (2026-10-19) | **Built, not verified anywhere.** tsc passes |
| Item 6: aspect ratios (2026-10-19) | **Built, not verified in the app.** tsc passes; all 8 scenes rendered headless at 16:9, 9:16, 1:1 and 4:5 with no errors. Frames not reviewed |
| Item 7: AI scene generation (2026-10-19) | **Built, not verified anywhere.** tsc and cargo check pass; no model run, no prompt tried |
| Item 8: renderer in the app (2026-10-19) | **Code written; release build not tried.** tsc and cargo check pass; the shipped runtime rendered a scene headless with the bundled Node and no system Node |
| Item 9: transparent export (2026-10-19) | **Built, not checked in an editor.** tsc and cargo check pass; a whole-timeline ProRes 4444 render checked headless (alpha values right) |
| Item 10: synthesis doc (2026-10-19) | Written: `analysis/06-synthesis.md` |
| Git | **Nothing committed** |

---

## Remaining items, in order

Each item says what "done" means. Don't call an item done until that's met.

### Item 0: Finish checking what exists, then commit it
Already done (2026-10-19): tsc and cargo check pass; a 1080p export with scenes and a LowerThird
overlay was compared with the preview (DeviceShowcase crossfade, the overlay over the recording
and over the scene); an unchanged re-export reused every **scene** file.

Still to do:
1. In the running app (`npm run tauri dev`):
   - add a `TitleReveal` and a `FeatureCallout` and compare their fade-in, middle and fade-out
     frames with the preview (DeviceShowcase and LowerThird are already checked)
   - pick a callout target with "Draw on preview" and try "Suggest"
   - try the logo upload button in the Look tab's Brand section
   - in the Overlays lane: move, trim both edges and delete an overlay
2. Export again unchanged with an overlay on the timeline. Confirm the **overlay** file is reused
   (no new `scenes/overlay-*.webm`, `studio-render-jobs.json` not rewritten).
3. Check playback inside DeviceShowcase/FeatureCallout looks smooth (SceneLayer seeks every
   frame; the DEV slow-frame log showed nothing, but that doesn't cover the Player's own video).
4. Fix anything wrong. Then ask the user whether to commit (main branch unless they say otherwise).

**Done when:** every existing scene and overlay matches between preview and export in frames
you've looked at, and the user has said whether to commit.

**Progress (2026-10-19, second session):**
- Overlay reuse: **confirmed.** An unchanged re-export wrote no new `scenes/` files and didn't
  rewrite `studio-render-jobs.json`.
- TitleReveal middle and fade-in, and FeatureCallout middle: match the export (mean pixel
  difference 2.4–2.9/255).
- Open: one FeatureCallout fade-in capture showed a stale preview (no scene, and a recording frame
  from about 4 s later) after seeking from inside the scene back into its fade-in. A direct seek to
  the same spot was correct. Not yet reproduced. It may be a `SceneLayer`/`syncVideos` bug.
- Found: while paused, the preview's recording sits about 3 frames (~0.1 s) behind the export.
  Both use the same time math (`source - track.offset`), so this is probably WebKit's paused-seek
  frame choice. It's a recording-preview issue, not a Studio one; not fixed.
- Not done: Draw on preview / Suggest, logo upload, overlay move/trim/delete, smoothness.
- **User's instruction:** implement items back to back and verify in batches later. Don't spend
  turns driving the app per item.

### Item 2: Remaining scenes
The full set of 8 planned scenes is: logo sting, title reveal (exists), kinetic statement,
feature callout (exists), device showcase (exists), stat counter, lower third (exists), end card.
Add the four missing ones. Each is registered in `SCENES` with fields, `defaultProps`,
`defaultDuration`, uses brand colors, fonts and logo, and works at 16:9, 9:16 and 1:1.

| Scene | What it does | Settings (suggested) |
|---|---|---|
| `LogoSting` | Brand logo reveal, 2–3 s: scale-pop with a spring, or mask wipe, or stroke draw for SVG logos; optional tagline; optional accent burst | style (`pop`/`wipe`/`draw`/`glow`), tagline, burst |
| `KineticStatement` | 1–4 short lines animated word by word (punch-in, stack build, slot roll, highlight sweep), with emphasis words in the accent color | lines (text, one line each), emphasis words, style |
| `StatCounter` | 1–3 numbers counting up with springs, tabular digits, label under each; optional bar, line or progress chart | stats (value, label, prefix, suffix, format: int/compact/percent/currency), chart kind, chart data |
| `EndCard` | Logo, headline, call-to-action button with a press micro-animation, URL typed out, optional QR code, social icons | headline, cta, url, showQr, socials |

**What's needed beyond the scenes themselves:**
- The panel needs a field type for **lists** (lines, stats, chart data). Add it to `SceneField`
  and `ScenePanel.tsx`.
- Number formatting: use `Intl.NumberFormat`.
- QR code: use a small QR encoder package at an exact pinned version, or a self-written one.
- Recipes: `analysis/03-demo-elements.md` §1, §2, §5 and §10.

**Done when:** each scene has rendered frames reviewed at all three aspects, preview matches
export, and the ✨ picker offers all scenes.

**Built (2026-10-19), still to verify:**
- Files: `src/studio/scenes/{LogoSting,KineticStatement,StatCounter,EndCard}.tsx`, registry
  entries in `scenes/index.ts`, `SCENE_CHOICES` in `EditorView.tsx` (the ✨ menu lists all 8),
  list and number editors in `ScenePanel.tsx`.
- `SCENE_RENDER_VERSION` was left at 3, because no existing scene changed.
- QR codes use `qrcode-generator` at exactly 1.4.4 (added to the app's `package.json`).
- LogoSting's "draw" style is a ring drawn around the logo (labelled "Ring"), not a stroke draw of
  the SVG's own paths.
- Socials are text marks (𝕏, GH, in, ▶, IG), not brand artwork.
- Headless check: `node studio-renderer/render.mjs --jobs <jobs.json> --root <project>`. Each job is
  `{composition, props:{...,brand}, frames, fps:30, width, height, alpha:false, out}`.

### Item 3: More transitions
- Today a transition is a cut or a crossfade. Add slide, push, wipe, zoom-through, blur and
  dip-to-color, each with a direction where it applies.
- Generalise `positionAt`'s scene and recording output from just "opacity" to a transition
  state: progress, kind and direction. Apply the same transform, clip and opacity:
  - in the preview: CSS on the Player layers, plus canvas transforms for the recording
  - in the export: canvas transforms and clipping
- Keep the existing limit: two recording clips can't overlap, because the preview has one
  video. Transitions need a scene on at least one side.
- Optional sound per transition (a whoosh centred on the cut). This connects to item 4.
- Math reference: `analysis/02-animation-primitives.md` §11.

**Done when:** each transition kind is checked frame by frame in an export and matches the preview.

**Built (2026-10-19), still to verify:**
- `model.ts`: `Transition` is `{type: 'cut'}` or `{type: TransitionKind, duration, direction?, color?}`.
  `TransitionKind` is `crossfade | slide | push | wipe | zoom | blur | dip`. Direction is the way
  motion runs.
- `transitionFx(transition, mix, incomingOnTop)` returns a `LayerFx` (`opacity, x, y, scale, clip,
  blur`) for the outgoing and incoming layer, plus a `dip` wash.
- `positionAt` now returns `fx` on each scene, plus `recordingFx` and `dip`. `opacity` is kept and
  equals `fx.opacity`.
- The recording is always the bottom layer. When it's the incoming side, slide and wipe act on the
  outgoing scene instead.
- `render.ts` has `drawLayer` and `drawDip`, used by the export and by the preview canvas. During
  a transition the recording is drawn to an offscreen canvas and composited over `fillBackground`.
- `SceneLayer.tsx` applies the same fx as CSS (`fxStyle`) and owns the dip `<div>`.
- `ScenePanel` has a transition dropdown, direction arrows, a dip colour and a length slider.
  The Timeline tooltip names the kind.
- Old `edit.json` crossfades still load (`normalizeItem`).
- Not done: the optional transition sound (part of item 4).

### Item 4: Audio across the whole video
Today scenes are silent and only recording audio, music and click sounds are scheduled
(`src/editor/audioSchedule.ts`, `renderAudio` in `export.ts`, `usePlayback.ts`).
1. **Music across scenes:** the music track plays continuously over recording and scene items.
2. **Voiceover lane:** import audio files and place them at output times, with a volume per clip.
3. **Sound effects lane:** place sounds at output times, from the user's licensed pack.
   - The pack lives in an app folder such as `Capturita/Sounds/`.
   - Sounds are imported once and copied into the project when used.
   - Transitions and scene beats (logo hit, counter end, button press) can add a sound automatically.
4. **Ducking:** lower the music under voiceover, and optionally under recording speech.
   - Compute a level envelope of the voice (about 50 ms windows) offline.
   - Turn it into a gain curve on the music: a set amount in dB, with attack and release.
   - Use the **same** curve in preview and export.
5. Fades in and out per clip. Keep preview and export sharing one scheduler.
6. Recipes: `analysis/03-demo-elements.md` §12.

**Done when:** an export with music, a voiceover over a scene and two sound effects sounds the
same as the preview; ducking is audible and smooth; nothing clicks at clip edges.

**Built (2026-10-19), still to verify** (tsc and cargo check pass; nothing heard or checked in the app):
- `model.ts`: `AudioMix` has `voiceovers`, `effects` (`AudioClip`: file, name, start, offset, duration,
  `length` of the whole file, volume, fadeIn, fadeOut) and `ducking` (`DEFAULT_DUCKING`: -12 dB,
  80 ms, 0.4 s, off under the mic). `SoundCue {file, name, volume}` on `Transition` (cuts too),
  `SceneClip.sound` and `OverlayClip.sound`. `audioFiles(edit)` lists every file the mix needs. All
  normalized in `normalizeEdit`; only `audio/…` paths are accepted.
- `scenes/index.ts`: `beat` and `beatLabel` on `SceneDefinition`, `sceneBeat(scene, props)`. LogoSting's
  beat follows its style (`LOGO_HITS`, frames 10/16/22/18); StatCounter 1.9 s; EndCard 1.53 s.
- `audioSchedule.ts` (shared by preview and export): `scheduleClip` (own gain, fades, a 5 ms minimum
  ramp at each edge), `soundCues` (transition sound centred on the overlap's midpoint, scene/overlay
  sounds at the beat), `duckCurve` (RMS per 50 ms window, cached per buffer; speech above 0.02 RMS;
  one-pole attack/release; gain in dB) applied by `scheduleCurve` to a gain node between the music
  source and `musicGain`. `loadAudioFile`/`loadAudioFiles`.
- `usePlayback.ts` takes `overlays` and `audioFiles`, decodes each file once, and reschedules when
  clips, ducking or overlays change. `export.ts` `renderAudio` loads the same files and fails the
  export if one is missing.
- Rust `src-tauri/src/sounds.rs`: `import_audio` (→ `audio/voice-<ms>.<ext>` or `sfx-…`),
  `list_sounds`, `import_sound` (into `Movies/Capturita/Sounds/`, keeps the name, numbers duplicates),
  `use_sound` (copies to `audio/sfx-pack-<name>.<ext>` once; recopies if the size differs).
- UI: `src/editor/AudioClipsPanel.tsx` (sound pack hook with audition, `SoundPicker`,
  `AudioClipsSection` "Add at playhead" for voiceover and pack sounds, `DuckingSection`,
  `AudioClipPanel` for a selected clip). Voice and SFX lanes in `Timeline.tsx` (move, trim both
  edges — the start edge moves the file offset — right-click delete, ⌫ delete). Sound pickers on
  transitions ("Coming in"/"Going out"), on scenes with a beat, and on overlays with a beat.
- Not done: waveforms inside voice/SFX clips; a per-lane mute.

**To verify (batch 2–5):** import a voiceover over a scene, add two pack sounds, a transition sound
and a LogoSting beat sound; export and compare with the preview by ear; ducking audible and smooth;
no clicks at clip edges (try a trimmed clip that starts mid-word); trimming can't run past the file.

**Original findings and plan (2026-10-19):**
- Step 1 is **already true.** `scheduleTimeline` plays music along output time, so it runs
  across scenes.
- Planned model: add to `AudioMix` (`edit.audio`)
  - `voiceovers: AudioClip[]` and `effects: AudioClip[]`, where
    `AudioClip = {id, file (project-relative, under audio/), name, start (output s), offset (s into the file), duration, volume, fadeIn, fadeOut}`
  - `ducking: {enabled, amount (dB, default -12), attack (~0.08 s), release (~0.4 s), underRecording}`
  - Normalize all of these in `normalizeEdit`.
- Automatic sounds:
  - `Transition.sound?: {file, volume}`, centred on the transition's midpoint
    (`when = mid - buffer.duration / 2`).
  - `SceneClip.sound?` played at the scene's beat. Add `beat?: number` (seconds) to
    `SceneDefinition`: LogoSting hit ≈ 0.33 s, StatCounter count end ≈ 1.9 s, EndCard press ≈ 1.53 s
    (frame 46).
- Rust (pattern: `import_music` in `recording.rs`):
  - `import_audio` copies bytes into `<project>/audio/<kind>-<time>.<ext>`
  - the sound pack lives in the app folder `Capturita/Sounds/` (find the root the way
    `brand.rs` does): `list_sounds`, `import_sound`, and `use_sound` (copies a pack file into the
    project's `audio/` once)
  - register them in `lib.rs`
- Scheduling, in `audioSchedule.ts` only, so preview and export stay identical:
  - pass decoded clip buffers in `ScheduleOptions` (`clips: Map<file, AudioBuffer>`)
  - each clip gets its own gain node with volume and fade ramps (a short ramp of at least 5 ms
    at the edges so nothing clicks)
  - ducking: RMS per 50 ms window of each voiceover buffer (cache per file), plus the mic track
    over recording clips if `underRecording` (via `positionAt`). Threshold it, then smooth with
    one-pole attack/release, then turn it into a gain curve. Apply it with ramps to a `duckGain`
    node between the music source and `musicGain`.
- Loading: `usePlayback.ts` decodes clip buffers like it does music, and reschedules when they
  change. `export.ts` `renderAudio` loads the same buffers.
- UI:
  - Voiceover and SFX lanes in `Timeline.tsx` (like the Overlays lane: move, trim, delete)
  - add, volume and fade controls in an inspector panel next to `MusicPanel`
  - a ducking section in the Audio tab
  - a "Sound" picker on transitions and scenes in `ScenePanel`

### Item 5: Captions over scenes
- Captions (from `src-tauri/src/captions.rs`, Whisper) currently follow the recording's
  source times.
- Make captions follow output time across the whole video, including voiceover over scenes.
  Transcribe voiceover clips the same way.
- Add an active-word highlight style option.
- Reference: `analysis/03-demo-elements.md` §8.

**Done when:** captions stay in sync through scenes and cuts in an export.

**Built (2026-10-19), still to verify** (tsc passes; nothing checked in the app or an export):
- `Caption.voice?: string` marks a voiceover caption; its times are seconds into that clip's file,
  so it moves and trims with the clip. `recordingCaptions()` filters them out wherever source time
  is assumed (timeline Captions lane, AI pauses/transcript).
- `captionAtOutput(edit, t)`: a voiceover caption under t wins; otherwise the recording's caption,
  only while the recording is on screen (not under a full-screen scene). `captionSpans()` gives
  output-time spans for both; `toSrt` now takes the edit and includes voiceover captions.
- Drawing moved out of `drawFrame` into `drawCaptions(ctx, edit, outputTime, …)` in `render.ts`,
  drawn last: in the export after overlays, in the preview on a new canvas above both
  `SceneLayer`s. Captions no longer move with the recording layer during transitions.
- `captions.ts` `makeVoiceCaptions` transcribes a clip's whole file. "Make captions" includes
  voiceovers (switch "Also caption the voiceovers"); a project with only voiceovers can be captioned.
  Voiceover captions show "VO" in the list and jump to output time.
- Highlight style option `CaptionStyle.highlightStyle`: colour, box (contrasting text), underline, pop.
- Not done: voiceover captions on the timeline's Captions lane; deleting a voiceover leaves its
  captions behind (hidden, but listed as VO).

**To verify (batch 2–5):** export with recording captions across a cut and a scene (captions stop
under the scene, resume after), a voiceover with captions over a scene, each highlight style;
compare with the preview.

### Item 6: Aspect ratios
- `Edit.aspect` already exists, and scenes render at the export size.
- Make every scene lay itself out properly at 16:9, 9:16, 1:1 and 4:5: stack instead of side by
  side in portrait, with safe margins.
- Check each scene in each aspect from rendered frames. Optionally, export several aspects in one go.

**Done when:** a frame strip of every scene at every aspect has been reviewed, with nothing
clipped or cramped.

**Built (2026-10-19), still to verify** (tsc passes; headless render of all 8 scenes × 4 aspects
at small sizes finished with no errors; no frames looked at, preview not checked):
- `src/studio/scenes/layout.ts` `frameLayout(width, height)`: `unit` (1% of short side), `text`
  (unit ×1.3 for 9:16, ×1.12 for 4:5), `portrait` (ratio < 1/1.05), `stacked` (ratio < 1.3, so 1:1
  too), `safeX`/`safeY` (6% landscape, 8%/7% portrait).
- TitleReveal: words wrap and the title fits inside the safe width.
- LowerThird: anchored at the safe margins; sits at 16% from the bottom in portrait (clear of
  phone UI); name and title ellipsize to the room left after bar, padding and logo.
- FeatureCallout: when stacked, the card spans the safe width (≤ 0.84 of the frame) above the ring
  (target in the lower half) or below it, with a vertical arrow; the zoom slides the target to the
  other half. Card text sizes with `layout.text`. Landscape now clamps to the safe margins too.
- DeviceShowcase: `placement: 'side'` falls back to below when stacked (1:1, 4:5, 9:16); portrait
  device and text up to 0.84 of the width; text sizes with `layout.text`.
- Kinetic, Stat, EndCard and LogoSting already treat 4:5 as portrait (`height > width * 1.05`,
  LogoSting stacks below 1.4); left unchanged.
- `SCENE_RENDER_VERSION` 3 → 4.
- Not done: exporting several aspects in one go.

**To verify (batch 6–9):** a frame strip of every scene at every aspect (nothing clipped or
cramped), especially FeatureCallout with targets in each corner at 9:16, long LowerThird names,
DeviceShowcase "side" at 1:1.

### Item 7: AI generation of scenes
Use Capturita's existing local AI: `src-tauri/src/ai.rs`, llama-server with
`response_format: json_schema`, Qwen3-4B or Gemma-12B. Follow `src/editor/aiEdit.ts`'s
"propose, then review with checkboxes" pattern. Patterns are in `analysis/05-ai-generation-loop.md` §12.

1. **Plan:** the prompt goes to a plan, a list of `{scene id, purpose}` taken from the scene
   ids. Use rules first, then a small JSON-schema call.
2. **Fill:** one call per scene fills its props. The JSON schema is generated from that scene's
   `fields`. Inject a short rule sheet and one example per scene on **every** call.
3. **Validate:** schema and value checks (text length, segment inside the recording, rect inside
   0–1). Then a dry render check: render a low-resolution frame and check that text isn't
   clipped and the frame isn't empty.
4. **Retry:** up to 3 silent attempts, feeding back the exact errors. The last attempt asks for
   the whole props object again. Then show the error.
5. **Edits:** "make the title shorter" changes props by scene id; send the list of valid ids.
6. Preserve settings the user edited by hand.

**Done when:** five varied prompts produce sensible, valid scenes on both local models, and the
user can review proposals before they're applied.

**Built (2026-10-19), still to verify** (tsc and cargo check pass; no model call made, nothing run):
- `src/studio/aiScenes.ts`:
  - **Plan** (`planSteps`): `rulePlan` first. One scene kind named by keyword plus an obvious verb
    ("add an end card", "make the title shorter" with one title) skips the model. Otherwise one call
    with a schema whose `scene` and `target` are enums (`new` or the ids `s1…` of scenes and overlays
    already in the video, listed with their texts). Steps are `{action add|edit, scene, target,
    placement start|playhead|end|over, purpose}`; `tidyPlan` makes edits take the target's kind and
    keeps overlays to overlay-capable kinds. One retry if the answer isn't JSON.
  - **Fill** (`fillStep`): one call per step. Schema from the scene's fields (`propsSchema`; segment and
    rect fields excluded, they come from `initialSceneProps` at the placement's time). Every call
    carries `FILL_SYSTEM` (rule sheet), the field list with character limits (`TEXT_LIMITS`,
    `REQUIRED`), a one-line `GUIDES` entry, one `EXAMPLES` entry, product name (brand kit name), the
    aspect, the first 1200 characters of the transcript, and for edits the current settings.
  - **Validate** (`validateProps`): text limits, required texts, placeholders ("Your product"…), enums,
    numbers, list counts, segment inside `recordingRange`, rect inside 0–1, Kinetic accent words in the
    lines, percent 0–100, chart needs ≥ 2 points. An EndCard with no address gets `showQr: false`.
  - **Dry check** (`dryCheck`): mounts `@remotion/player` `Thumbnail` offscreen at 480 px wide (export
    aspect) on the middle frame, waits for fonts; reports text whose box leaves the frame, text cut off
    (`scrollWidth > clientWidth` with overflow not visible: catches LowerThird ellipsis), an empty frame,
    or a draw error.
  - **Retry:** up to 3 silent retries quoting the last answer and its exact problems; the third asks for
    the whole object from scratch (higher temperature). A proposal still failing is shown with its
    problems and can't be ticked.
  - **Hand edits:** `SceneClip.ai` / `OverlayClip.ai` hold the props the AI last wrote (normalized in
    `normalizeEdit`). A field differing from it (or from the defaults if never AI-made) is user-owned:
    the model is told, and the value is kept unless the request names the field (name or label word).
  - **Apply** (`applySceneProposals`): edits replace props; playhead adds go in plan order from the
    playhead (first through `insertScene`), start adds before the first item in plan order, end adds
    after the last, overlays at the playhead. Each stores `ai`.
- UI: `src/studio/SceneAiSection.tsx`, a "Scenes" section at the bottom of the AI tab (also shown on
  recordings without sound): prompt, examples, step progress, proposals with checkboxes listing each
  changed setting (old struck through → new) and kept hand edits, Apply as one undo step.
- Rust: `EditRequest` takes optional `temperature` and `max_tokens` (defaults 0.2 / 1500 as before).
- Not done: the model can't choose which part of the recording a scene shows (always the playhead's
  clip or the click near it); no hosted-model path; the dry check is DOM-based (WebKit), not the
  renderer's Chrome.

**To verify (batch 6–9):** on Qwen3-4B and Gemma-12B: "launch intro with our logo and a title", "add an
end card: try it free at acme.dev", "point out the button I click", "stats: 12k users, 98% happy",
"make the title shorter" after hand-editing its subtitle (subtitle must be kept). Check timings per
call, how often retries fire, and that applied scenes look right in the preview at 16:9 and 9:16.

### Item 8: Ship the renderer inside the app
Today `studio.rs` finds `studio-renderer/` through `CARGO_MANIFEST_DIR` and runs system Node.
That only works in dev builds.
- Decide and implement one of these:
  - (a) ship a Node binary as a Tauri sidecar, plus a webpack bundle prebuilt at build time
  - (b) compile the renderer into one binary
- Remotion downloads Chrome Headless Shell on first use. Put it in the app's data folder, show
  progress, and handle no network.
- Include Remotion's compositor binary for macOS arm64 and x64.
- Code signing: hardened runtime and notarization for every bundled binary.
- Measure the added app size and the first-export time.

**Done when:** a release build (`npm run tauri build`) on a Mac without Node exports a video with scenes.

**Built (2026-10-19): option (a), Node sidecar + prebuilt bundle.**
- `scripts/build-studio-renderer.sh` (in `beforeBuildCommand`; `--dev` in `beforeDevCommand` only
  ensures the files exist):
  - Node v22.20.0 (official, SHA-256 checked against SHASUMS256.txt) → `src-tauri/binaries/studio-node-<triple>`,
    bundled through `externalBin`.
  - `src-tauri/studio-runtime/` (gitignored) → `Resources/studio-renderer/` through `bundle.resources`:
    `render.mjs`, `bundle/` (scenes prebuilt with `render.mjs --build-bundle`; keep the `.map` files,
    renderMedia reads `bundle.js.map`), and `node_modules` with only `@remotion/renderer`, `remotion`,
    react 19.3.0 plus both `@remotion/compositor-darwin-arm64` and `-x64` (the other via `npm pack`).
  - Compositor Mach-Os: bare dylib names are rewritten to `@loader_path/…` (the hardened runtime refuses
    bare names), then re-signed: Developer ID → hardened runtime + timestamp; another identity → no
    hardened runtime (a self-signed cert has no Team ID, so library validation fails); none → ad hoc.
  - Rebuilt only when `render.mjs`, `entry/`, `src/studio/scenes/` or a pinned version changes (`.stamp`).
- `render.mjs`: `--bundle <dir>` uses the prebuilt scenes; `--build-bundle <out>`; `@remotion/bundler` is
  imported lazily. `ensureBrowser` runs first and prints `{"download": 0-1}`; on failure it prints a
  "connect and export again" message and exits 3.
- `studio.rs`: debug builds use `studio-renderer/` source (as before); release uses
  `resource_dir/studio-renderer` + `--bundle`, runs with cwd `app_data_dir/studio-renderer` (it writes a
  `package.json` there), so Chrome Headless Shell lands in `…/node_modules/.remotion` there. Node is the
  sidecar next to the exe, falling back to system Node. `{"download"}` → `studio-browser-download`
  event; exit 3 → the renderer's message.
- Export UI: phase `browser` ("Downloading the scene renderer (once, about 100 MB)…").
- `Entitlements.plist`: `cs.allow-jit` and `cs.allow-unsigned-executable-memory` (V8 in studio-node).
- Measured: Node 106 MB, runtime 86 MB (prebuilt scenes 27 MB, compositors 17 + 25 MB) → about +190 MB
  to the app before compression. Chrome Headless Shell download is 193 MB on disk; it took ~15 s here.
  A DeviceShowcase render with the shipped runtime (browser cached) took 10 s.
- Checked headless only: the shipped runtime rendered DeviceShowcase with `PATH=/usr/bin:/bin`
  (bundled Node only), and the dev path still renders.

**User must do:** run `npm run tauri build` with a Developer ID (`APPLE_SIGNING_IDENTITY`,
`APPLE_ID`/`APPLE_PASSWORD`/`APPLE_TEAM_ID` for notarization), check notarization passes, then install on
a Mac without Node and export a video with scenes (first export downloads the browser; try once offline
to see the message). Not done: a universal (arm64 + x64) app build; Tauri's resource folder copy of
`node_modules` not yet seen in a real bundle.

### Item 9: Transparent export (ProRes 4444)
- Add "Export as transparent video" for an overlay or scene: the renderer writes ProRes 4444
  `.mov` directly (`render.mjs` already supports `--alpha` with `.mov`).
- Save to the Exports folder.
- For a whole-timeline transparent export, only overlays and scenes are drawn; recordings are opaque.

**Done when:** the `.mov` opens in Final Cut or Premiere with correct transparency and no edge
fringing.

**Built (2026-10-19):**
- Per piece: "Export as transparent video" under a selected scene or overlay in the Inspector
  (`src/studio/TransparentExport.tsx`), shown only for scenes with an overlay form (`canBeOverlay`,
  i.e. they can drop their background). Renders at 1080p (export aspect) with `transparent: true`.
- Whole timeline: a third format in the export dialog, "Transparent" (`ExportFormat 'mov'`):
  file only, 30 fps (SCENE_FPS) fixed, no quality, no audio. `exportVideo` hands it to
  `exportTransparent` (export.ts).
  - New composition `TransparentTimeline` (`src/studio/TransparentTimeline.tsx`, registered in
    `studio-renderer/entry` as `TIMELINE_COMPOSITION`): each frame runs `positionAt`/`overlaysAt`
    from model.ts and draws the scenes on screen (opaque backgrounds, with their transition looks
    through `fxStyle`, now in `src/studio/fxStyle.ts`, shared with SceneLayer), the dip colour, then
    overlays. Each piece sits in a `<Sequence>` offset so its frame equals the preview's
    `floor(time × 30)`. Where the recording plays, the frame is empty; captions/text aren't drawn.
- `renderScenes.ts`: `renderTransparent` → `scenes/alpha-<hash>.mov` in the project (cached like
  other scene files; `render.mjs` picks ProRes 4444 `yuva444p10le` from `alpha` + `.mov`).
  New command `export_rendered(name, from)` (export.rs) copies it into Exports under a free name
  (APFS clone; only `.mov` files under the recordings folder).
- `build-studio-renderer.sh` stamp now also hashes TransparentTimeline.tsx, fxStyle.ts and model.ts.
- Checked headless (dev path, 640×360, recording 1 s → TitleReveal with a crossfade → recording, a
  LowerThird overlay): ProRes 4444 with alpha; alpha 0 before the overlay and where the recording
  plays, ~0.53 mid-crossfade, 1 under the scene.

**User must do:** export a scene/overlay and the whole timeline as transparent, import both into
Final Cut (and/or Premiere) over other footage, and check transparency and edges. Remotion writes
straight (unpremultiplied) alpha; if edges show a dark or light fringe, set the clip's Alpha
Handling to Straight (Final Cut: Info inspector → Settings; Premiere: Interpret Footage → Alpha) and
tell me, so I can tag or premultiply the file.

### Item 10: Finish the analysis document (Phase 6)
The original teardown asked for a Phase 6 synthesis. It was deleted because it described a
dropped design. Write `analysis/06-synthesis.md` for the **current** design:
- a) end-to-end architecture diagram (Mermaid)
- b) table: Remotion concept → what Capturita uses → status
- c) the scene data format (`SceneClip`, `OverlayClip`, props) with 3 worked examples: title,
  device showcase, end card
- d) the 8 scenes and their settings
- e) the renderer/export pipeline spec
- f) risks: licensing, performance, determinism, app size
- g) build order: this list
- a final checklist of the 13 demo elements: fully understood, partly understood, or not found

**Done when:** the file exists and matches the code as it is.

**Done (2026-10-19):** `analysis/06-synthesis.md` has sections a–g and the 13-element checklist
(teardown understanding + what Capturita has + where). Field lists, codecs, transition kinds and
file names were checked against the code. Update it when scenes, codecs or the pipeline change.

---

## Target coverage of the 13 demo elements

| # | Element | Now | After items 2–9 |
|---|---|---|---|
| 1 | Intro / logo reveal | Partial (TitleReveal) | Full (LogoSting) |
| 2 | Kinetic typography | Partial | Full (KineticStatement) |
| 3 | Callouts, arrows, spotlight | Full (FeatureCallout) | Full |
| 4 | Device mockups | Full (DeviceShowcase) | Full |
| 5 | Stat counters, charts | None | Full (StatCounter) |
| 6 | Transitions | Partial (crossfade) | Full (item 3) |
| 7 | Backgrounds | Partial | Partial (no 3D/WebGL; out of scope) |
| 8 | Captions | None over scenes | Full (item 5) |
| 9 | Camera motion | Partial (push-ins in scenes) | Partial to full (per-scene moves) |
| 10 | Titles, lower thirds, end cards | Partial | Full (LowerThird, EndCard) |
| 11 | Brand kit | Full | Full |
| 12 | Audio | None for scenes | Full (item 4, with the licensed pack) |
| 13 | Aspect variants | Partial | Full (item 6) |

Out of scope unless the user asks: 3D devices or WebGL effects (`@remotion/three`), Lottie, a
bundled music library.
