# Phase 5: AI generation loop (Remotion prompt-to-motion-graphics)

Paths are relative to `remotion/packages/template-prompt-to-motion-graphics/` (the "template") unless stated. The standalone repo copy was compared file by file: only `package.json` differs (workspace:* deps in the monorepo vs ^4.0.0 in the standalone). Everything else, including the prompts, is byte-identical.

## 1. Architecture at a glance

Pipeline (all in `src/app/api/generate/route.ts`, `POST`):
1. Gate: `generateObject` with `VALIDATION_PROMPT` and schema `{valid: boolean}`, first generation only.
2. Classifier: `generateObject` with `SKILL_DETECTION_PROMPT` (from `src/skills/index.ts`) and schema `{skills: enum[]}`.
3. First generation: `streamText` with `SYSTEM_PROMPT` plus the injected skill text. Output is raw code streamed over SSE.
4. Follow-up: one non-streaming `generateObject` with `FOLLOW_UP_SYSTEM_PROMPT` and `FollowUpResponseSchema`. It returns either search/replace edits or a full rewrite.
5. Client compiles the code (Babel plus `new Function`), the Player surfaces runtime errors, and `useAutoCorrection` feeds errors back into step 4, up to 3 attempts.

SDK and models: Vercel AI SDK v5 (`ai` 5.0.104, `@ai-sdk/openai` 2.0.74, `zod` 4.5.4, per `package.json`). OpenAI only. The gate and classifier are hardcoded to `gpt-5.2`. Generation uses the model chosen in the UI, from `MODELS` in `src/types/generation.ts` (gpt-5.2 at none/low/medium/high reasoning, gpt-5.2-pro at medium/high/xhigh). The id format is `name:reasoningEffort`, split in `POST` and passed as `providerOptions.openai.reasoningEffort` to `streamText`. The follow-up `generateObject` call does not pass reasoning effort.

## 2. System prompt structure

`SYSTEM_PROMPT` (route.ts), the initial-generation prompt, is plain markdown-ish headed sections:
- COMPONENT STRUCTURE: imports first, then `export const MyAnimation = () => {}`, with a fixed body order (comment, hooks, constants, derived values, JSX).
- CONSTANTS RULES (CRITICAL): all tunables must be UPPER_SNAKE_CASE constants inside the component body, after the hooks, so users can customize them.
- LAYOUT RULES: use full width, no small centered box, responsive sizing formula.
- ANIMATION RULES: spring for organic motion, interpolate for linear progress, always clamp extrapolation, stagger delays.
- AVAILABLE IMPORTS: a closed whitelist shown as a code block.
- RESERVED NAMES (CRITICAL): don't shadow `spring`, `interpolate`, etc.
- STYLING RULES: inline styles only, fixed font, 2-4 colors, background present from frame 0.
- OUTPUT FORMAT (CRITICAL): output only code, start with "import", end with "};", never ask clarifying questions.

There are no inline few-shot examples in the base prompt. Examples arrive only through the skill mechanism (section 3). The CRITICAL tags and the "never ask, make a reasonable choice" rule are the notable style choices.

`FOLLOW_UP_SYSTEM_PROMPT` is a separate, much shorter prompt. It frames the model as an editor and gives explicit decision criteria (see section 5) and an edit format spec. It ends with "preserve user edits".

`VALIDATION_PROMPT` is a classifier prompt with VALID and INVALID bullet lists.

## 3. Knowledge injection (classifier-selected, then static concatenation)

`src/skills/index.ts`:
- 8 guidance skills (markdown imported at build time via `src/markdown.d.ts`): charts, typography, social-media, messaging, 3d, transitions, sequencing, spring-physics (`src/skills/*.md`, 106-135 lines each). The ones I opened (charts.md) have front matter (`title`, `impact`, `impactDescription`, `tags`) and "Incorrect / Correct" code pairs.
- 9 example skills: complete working components from `src/examples/code/*.ts`, wrapped by `getSkillContent` as "## Example: name, description, tsx block".
- Selection is made by an LLM classifier: `SKILL_DETECTION_PROMPT` lists every category with a one-line trigger description, says "ALL applicable... only clearly relevant", and the schema is `z.array(z.enum(SKILL_NAMES))`. The enum is constrained, so the model cannot invent names.
- Injection: `getCombinedSkillContent` joins the selected files with `---` separators and appends them to `SYSTEM_PROMPT` under "## SKILL-SPECIFIC GUIDANCE" (`enhancedSystemPrompt` in `POST`). The prompt text itself is what gets classified, not the code.
- De-duplication: the client sends `previouslyUsedSkills` (`getPreviouslyUsedSkills` in `src/hooks/useConversationState.ts`, collected from assistant message metadata). The server drops already-used skills (`newSkills`) so the same text isn't re-sent. This assumes the earlier text is still in context. See the bug note below.
- The chosen skills are sent to the client first as a custom SSE event `{type:"metadata", skills}`, prepended to the stream in `POST`, so the UI can show "using charts, typography" while generating.

Observed gap (bug or limitation): in follow-up mode `POST` uses `FOLLOW_UP_SYSTEM_PROMPT` and never uses `enhancedSystemPrompt`. Skills are detected and returned in metadata, but their content is not given to the follow-up model. Also the follow-up request is a single user message built from `currentCode` and a text summary, so skills from the first turn are not "already in context" for follow-ups. Treat the dedupe as only correct for the initial turn. Verified by reading `POST`; the follow-up branch references only `FOLLOW_UP_SYSTEM_PROMPT`.

## 4. Structured outputs

- Gate: `z.object({valid: z.boolean()})` via `generateObject`.
- Classifier: `z.object({skills: z.array(z.enum(SKILL_NAMES))})`.
- Follow-up: `FollowUpResponseSchema` is a flat object: `type: "edit"|"full"`, `summary`, optional `edits[] {description, old_string, new_string}`, optional `code`. The source comment says it is flat because OpenAI does not support discriminated unions. The consequence is that "required when type is X" lives only in `.describe()` text, and the server checks it afterwards (section 5).
- The initial generation is not structured at all. It is free-form text from `streamText`, post-processed by regex and brace counting.
- `summary` is a one-sentence changelog the UI shows as the assistant chat message (`handleGenerationComplete` in `src/app/generate/page.tsx`).

## 5. Edit vs full rewrite

- The model decides. `FOLLOW_UP_SYSTEM_PROMPT` gives thresholds: edit for colors, text, numbers, timing, a single element, changes under about 30 percent of the code; full for a different style, restructuring, "start fresh", over 50 percent. The 30 to 50 percent band is left to the model.
- Edit format is a list of exact-match search/replace pairs, each with a `description`. The prompt says to match character for character, include enough surrounding context to be unique, and keep indentation.
- Application is `applyEdits` in route.ts: sequential, in-memory. For each edit it checks the string exists (`includes`), checks it is unique (`split(...).length - 1 > 1` means ambiguous), records a line number (`getLineNumber`), then does a first-match `replace`. On the first failure it aborts the whole batch, keeping the original code, and returns `{error, failedEdit}`. This is atomic, all or nothing.
- Failure response: HTTP 400 with `type: "edit_failed"` and the `failedEdit`. Same for a response whose `type` does not match its populated field.
- Fallback: there is no server-side fallback to a full rewrite. The client retries through the auto-correction loop (section 8), where the failed edit is quoted back in the prompt, with the instruction to add more context.
- Edit metadata (`editType`, enriched edits with line numbers) travels back in `metadata` for the UI to display.

## 6. Input validation and sanitization

Prompt gate: `VALIDATION_PROMPT` plus `generateObject {valid}`, run only when `!isFollowUp`. If invalid, it returns 400 with `type: "validation"` and a friendly message. It fails open: a thrown error in the gate is logged and the request goes through. It is a very permissive classifier ("Any visual/animated content" is valid), mainly rejecting Q&A and text requests.

Output sanitization (client, `src/helpers/sanitize-response.ts`, called from `useGenerationApi`):
- `stripMarkdownFences`: regexes remove a leading tsx/ts/jsx/js fence and a trailing fence. Applied on every delta so the live editor view stays clean.
- `extractComponentCode`: finds `export const X = () => {` and brace-counts to the matching close, which drops trailing commentary. It appends `;` if missing. It does not account for braces inside strings or template literals, so it is a heuristic (my reading of the function). If no match, it returns the code unchanged.
- `validateGptResponse`: only checks that something looks like a JSX tag. A cheap "was this code at all" check; failure surfaces as a `validation` error.
- Import stripping happens in the compiler, not the sanitizer (section 7).

## 7. Compile, execute, error detection

`src/remotion/compiler.ts`, `compileCode`:
1. `extractComponentBody` removes every import form by regex (type, default+named, named, namespace, default, side-effect), then unwraps `export const X = () => { BODY };` into just BODY (helpers declared before the export are kept ahead of the body).
2. The body is rewrapped as `const DynamicAnimation = () => { BODY };` and transpiled with `@babel/standalone` (`presets: ["react","typescript"]`). Babel is the compiler. Syntax errors throw here.
3. Execution is `new Function(...argNames, transpiled + "return DynamicAnimation;")`, called with real values. This is the whitelist: React, `Remotion` object, RemotionShapes (all shapes and `make*` helpers), Lottie, ThreeCanvas, THREE, AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring, Sequence, Img, useState/useEffect/useMemo/useRef, TransitionSeries, linearTiming, springTiming, fade, slide, wipe, flip, clockWipe. The prompt's AVAILABLE IMPORTS is a subset of what is injected.
4. A returned non-function gives the error "Code must be a function...". All exceptions are caught and the message is returned as `{Component:null, error}`.

Safety: NOT a sandbox. `new Function` runs in the page's global scope, so the generated code can touch `window`, `fetch`, `document`, etc. Injection only controls what is convenient, not what is reachable. The Remotion docs page `docs/docs/ai/dynamic-compilation.mdx` documents the same technique. (I did not see a warning about this in the part I read, UNVERIFIED for the rest.)

When it runs:
- `useAnimationState.compileCode` does the compile in the browser. `src/app/generate/page.tsx` skips compilation while streaming (`isStreamingRef`), compiles once when streaming ends, and for manual edits compiles after a 500 ms debounce.
- Compile errors go into `compilationError`.
- Runtime errors: `src/components/AnimationPlayer/index.tsx` renders `@remotion/player` `Player` with `component={Component}`, `key={Component.toString()}` (remounts on any code change), and an `errorFallback` (`renderErrorFallback`, which shows a "Runtime Error" panel). It also listens to the Player's `error` event and calls `onRuntimeError`, which sets `runtimeError` in the page. `codeError = compilationError || runtimeError` merges both into one signal.
- A second route for rendering: `src/remotion/DynamicComp.tsx` re-runs `compileCode` inside a composition for Lambda rendering (reads `getInputProps().code`, uses `delayRender`, shows an error panel if compile fails). Same compile path in the browser preview and in the server render.
- Frame capture: `src/helpers/capture-frame.ts` uses `renderStillOnWeb` from `@remotion/web-renderer` at scale 0.5, producing a JPEG data URL. Used by `ChatInput.tsx` to attach the current frame as an image to the next request.

## 8. Self-correction loop

`src/hooks/useAutoCorrection.ts` with `MAX_CORRECTION_ATTEMPTS = 3` (`src/app/generate/page.tsx`):
- Triggers on (a) `compilationError`/runtime error (combined), when not streaming, not compiling, no generation error and code non-empty; or (b) a generation/API error (includes `edit_failed`).
- Guard: `shouldAutoCorrect` requires `hasGeneratedOnce`, not streaming, `lastChangeSourceRef === "ai"` (so errors from the user's own manual edits are not auto-fixed), and `attemptNumber < maxAttempts`.
- Action: `onAddErrorMessage` logs an error message in the chat for compile errors, then `onTriggerCorrection` sets `errorCorrection = {error, attemptNumber, maxAttempts, failedEdit?}`, sets the prompt to the literal "Fix the compilation error" (or "Retry the previous request"), and calls `triggerGeneration({silent:true, attachedImages: last user images})` after 100 ms. Silent means no new user bubble.
- What the server feeds the model (follow-up branch of `POST`): the current code, recent conversation, and an `errorCorrectionNotice`. There are two templates. Edit failure: "EDIT FAILED (ATTEMPT n/max)", error text, the failed `old_string`/`new_string`, and an instruction to include more context. Compile error: "COMPILATION ERROR (ATTEMPT n/max)", the error in a fenced block, a list of common causes, and "Focus ONLY on fixing the error". The branch is picked by string matching: error contains "Edit" and "failed".
- Reset: `errorCorrection` is cleared once code compiles with no error. After 3 attempts it stops silently; the error panel stays visible. No stack trace or line info is sent, only the message string. No frame screenshot is auto-attached for visual bugs (images are only those from the last user message).
- Note the correction always runs through the follow-up path, so a failed first generation is also repaired by edit-or-full, with the broken code as `currentCode`.

## 9. Conversation state

`src/hooks/useConversationState.ts`, `src/types/conversation.ts`:
- Messages: user / assistant / error. Assistant messages store a `codeSnapshot` and metadata (skills, editType, edits, model). Error messages are kept for the UI but filtered out of model context.
- Model context (`getFullContext`): user messages as text (plus attached images), assistant messages replaced by the literal "[Generated Code]". Only the last 6 messages are used (`conversationHistory.slice(-6)` in `POST`). History is rendered as plain text "ROLE: content" with an "[with N attached images]" note. The images in history are NOT re-sent, only noted. Only current-turn `frameImages` are sent, as image parts.
- The current code is always sent whole in a fenced block ("## CURRENT CODE"). The prompt places code, then history, then manual-edit note, then error notice, then "## USER REQUEST", then an instruction to decide edit vs full.
- Manual edits: `markManualEdit` compares the editor text with `lastAiCodeRef`. `hasManualEdits` is sent, and the server adds "NOTE: user has made manual edits... Preserve". The code itself is the source of truth, so user edits are naturally included.
- Images: `useImageAttachments.ts` (user uploads, base64) and `captureFrame`. Sent to the model as `{type:"image", image: dataURL}` content parts on both initial and follow-up requests.
- State lives client-side; the server is stateless (each request carries everything).

## 10. Remotion's agent skills material

Location: `packages/skills/skills/` (source of truth), 12 skill folders, about 118 files: remotion-best-practices (router), remotion-create, remotion-markup (largest; about 30 topic files such as sequencing, transitions, timing, 3d, audio, effects, measuring-text, light-leaks), remotion-maps, remotion-captions, remotion-multimedia, remotion-interactivity, remotion-studio, remotion-render, remotion-saas, remotion-docs, remotion-upgrade.
- Format: Agent Skills standard (agentskills.io, per `packages/skills/README.md`). Each has a `SKILL.md` with front matter `name`, `description`, `version` (e.g. 4.0.536), plus topic files linked by relative markdown links. Topic files carry `metadata.tags`.
- Loading model: progressive disclosure through routing. `remotion-best-practices/SKILL.md` is a router: "if the user asks to create a video, load remotion-create", "if writing markup, load remotion-markup", etc. Each skill's description states when it applies, and each says "if this is not relevant, load Best Practices instead". The agent client (Claude Code, Codex, Cursor) decides what to load, and no classifier is built in. Contrast with the template, which uses an explicit classifier call.
- Content style: imperative rules with reasons ("CSS transitions will not render correctly, drive animation with `useCurrentFrame()`"), short code, "preserve user changes" repeated at the top of two skills, and process rules ("open the Studio preview before building, don't render unless asked").
- Distribution: `packages/skills/scripts/sync-embedded-skills.ts` maintains symlinks so best-practices embeds all other skills (and markup embeds maps), with a `--check` mode. `validate-links.ts` checks links. `sync-readme.ts` generates the README. `packages/claude-code-plugin/build.mts` copies skills (dereferenced, dropping `.tsx`) into the plugin; `packages/codex-plugin/skills/` and `packages/agent-plugin` hold copies for other clients. `packages/mcp/src/index.ts` exposes one tool, `remotion-documentation`, which proxies a docs search to `https://mcp.remotion.dev`. The `remotion-docs` skill instead describes searching docs via an Algolia API.
- Docs page `docs/docs/ai/generate.mdx` shows the minimal pattern (a short rules prompt with `generateText`, gpt-5.2), explicitly labeled as relying on model knowledge, suggesting the template is the "advanced" version.

## 11. skills-evals

`packages/skills-evals` (README says only "internal package"):
- `scenarios.ts`: 5 fixed natural-language scenarios (vertical promo, landscape promo, map trip, bar+line chart with exact numbers/hex colors, YouTube lower third with curl scraping), each with `model` (`openai-codex/gpt-5.5`) and 20-minute timeouts.
- `src/run-skill-eval.ts`: sets up a throwaway project, copies the skills into `.pi/skills` (`copySkillsForPiDiscovery`), runs an agent runner (`src/pi.ts`, "pi"), then sends a follow-up `createRenderPrompt` telling it to render an MP4 to an exact path. Phases: install, pi, pi-render, pi-export. It exports the session transcript.
- `src/compare.ts`: A/B comparison of skills at a `gitRef` versus the working tree (`copyGitSkills` via git archive). A local web UI (`src/server.tsx`, `src/app/*`) shows outputs side by side; `export-static-site.ts` publishes a static page.
- Scoring: I found no automatic grader or assertions in the files grepped (only path assertions). Evaluation appears to be human visual comparison of rendered video and session logs. UNVERIFIED beyond a grep, I did not read every file.

## 12. Reusable patterns, adapted to a JSON scene spec

1. **Cheap gate before the expensive call.** Template: `VALIDATION_PROMPT` with `{valid}`. Capturita: a tiny classifier with `{intent: "new_scene"|"edit"|"question"|"off_topic"}`. Skip for follow-ups; fail open. Better: a deterministic pre-check (empty prompt, no scene) before any LLM call.
2. **Closed-enum skill/knowledge router.** Template: classifier with `z.enum(SKILL_NAMES)` and one-line trigger descriptions. Capturita: enum of "recipes" (title card, lower third, chart, kinetic text, device mockup...), each a markdown rule file and one or two canonical JSON example scenes. Inject only selected ones. Since the schema constrains output, use an enum, not free text. For a local small model (llama-server), this classifier can be keyword rules first, LLM second.
3. **Fix the template bug: inject knowledge on every path.** Follow-ups in the template drop the skill text. In Studio, build the edit prompt from the same layered builder: base rules + selected recipes + current spec + request.
4. **Examples as skills.** The template ships full working components as retrievable examples. Capturita: ship validated JSON specs as examples (they double as test fixtures and as the renderer's golden files).
5. **Constrained "available imports" becomes the schema itself.** The whitelist of injected globals maps to a closed set of node types/props in the zod schema or JSON Schema. The model can't call what doesn't exist. Prefer a discriminated union on `type` in your own validator; if using a provider that rejects unions in structured output, use the template's flat object workaround and validate the rest in zod.
6. **Edit vs full rewrite decision in the schema.** Keep `type: "patch"|"replace"` with explicit thresholds in the prompt. Replace search/replace strings with JSON Patch (RFC 6902) or, more robust, id-addressed operations: `{op:"set", id:"title-1", path:"style.color", value:"#fff"}`, `{op:"add", parent, index, node}`, `{op:"remove", id}`. Stable node ids eliminate the template's uniqueness/ambiguity failure class. Keep atomic application (apply all to a clone, validate, then commit) and keep the `description` field per op for UI change lists.
7. **Edit failure feedback.** Template quotes the failed edit and says "add more context". In JSON: quote the failing op plus the exact error ("id 'title-9' not found; valid ids: [...]", "path style.colour unknown, did you mean style.color"). Giving the list of valid ids is cheap and removes most retries.
8. **zod/ajv validation as the compiler.** Template: Babel syntax errors. JSON: parse, schema-validate, then semantic validate (ids unique, times inside duration, referenced assets exist, no overlap rules). Return zod issue paths, which are a better error message than Babel's. Use zod's `safeParse` and format `issue.path` + `issue.message` for the retry prompt.
9. **Render-and-check as runtime error detection.** Template: Player `error` event plus ErrorBoundary. Capturita: do a dry render of frames 0, mid, last in the deterministic renderer (Rust or canvas) and collect thrown errors plus cheap automated checks: text overflowing the frame, zero-size nodes, contrast, empty frame. Report these as structured warnings to the retry prompt.
10. **Visual feedback.** Template attaches a captured frame only when the user asks. Capturita can auto-attach a rendered frame on the final retry or on a "looks wrong" request, if the model is multimodal. UNVERIFIED which local model.
11. **Bounded self-correction (max 3), silent, AI-only.** Copy this exactly: attempt counter in the request, no user bubble, only auto-fix errors caused by the AI's last output (not manual edits), reset on success, stop and show the error after the cap. Improve: escalate on attempt 3 to "full replace" mode, and include the previous invalid output and the validation issues, not a fixed phrase.
12. **Stateless server, rich client context.** Each request carries current spec, last N messages, manual-edit flag. For Tauri: `ai.rs` should receive the spec JSON, not session state. Replace assistant history with "[Generated scene]" as the template does, to save tokens.
13. **Preserve user edits.** Compare current spec to the last AI spec (hash or deep-equal) and tell the model. In JSON you can do better: send a diff of user changes since the last AI output and mark those node ids as "user-owned".
14. **Streaming for first generation with a live preview.** The template streams text, strips fences per delta, and compiles once at the end. JSON can be partially parsed progressively (partial-JSON parser) and rendered scene-by-scene, or stream a "plan" (scene list) first, then details. With constrained decoding (llama.cpp grammar / JSON schema mode) fences and prose disappear entirely, which removes the whole sanitizer layer. Keep a defensive fence/trim stripper anyway for non-constrained models.
15. **Prompt style that worked here.** Short headed sections, CRITICAL tags only for failure-prone rules, "never ask clarifying questions, choose sensibly", constants/tunables separated from structure (in JSON: theme tokens and named timing constants at the top of the spec so a single edit changes the whole look), forbidden-names list (in JSON: reserved ids). Negative/positive "Incorrect/Correct" pairs in skill files (charts.md) are effective and cheap to reuse for spec recipes.
16. **Skills router for external agent use.** If Capturita ever exposes Studio to Claude Code/Codex, mirror Remotion's layout: one router SKILL.md plus topic files, with descriptions that say when to load. Only relevant if you want agent-driven editing; the in-app flow does not need it.
17. **Evals.** Remotion's approach: fixed scenarios, A/B between skill versions at a git ref, human review. Capturita: a `scenarios.json` of prompts, run before/after a prompt change, render each to a PNG strip, plus automatic checks from (8)/(9) (schema-valid rate, retries needed, render-warning count). The automatic part is something Remotion's harness does not appear to have.
18. **Model routing.** Template uses the same large model for gate, classifier and generation. For local use, run gate and classifier on rules or a small model and reserve the big model for generation.

## 13. Pitfalls to avoid (seen in the template)

- Follow-up path ignores skills (section 3).
- Flat schema with prose-only conditionals pushes validation onto custom code.
- Error branch selection by `error.includes("Edit")` string matching is brittle. Use a typed `kind`.
- `new Function` is no security boundary. For a JSON spec this problem disappears, which is the main argument for Capturita's design.
- Retry prompt is a fixed phrase and the model sees only an error message string, no location.
- Brace-counting extraction ignores braces in strings.
- History drops assistant output entirely ("[Generated Code]"), so the model can't see its previous explanation; fine because the code is attached, but a summary of past turns would help long sessions.

## Open questions

- Which model will Studio mode use (local llama-server vs a hosted API)? This decides whether JSON-schema constrained decoding (grammar) is available, and so whether a sanitizer and a flat schema are needed. UNVERIFIED in `capturita/src-tauri/src/ai.rs`; I did not read it.
- How are scene nodes identified? Id-addressed patches (pattern 6) require stable ids in the spec format.
- Is there a deterministic renderer entry point that can report errors and measurements per frame without a window (needed for pattern 9)?
- How many recipes/examples will exist? A classifier is worth it only above roughly 5 to 8 recipes; below that, always inject everything and skip a call.
- Do users hand-edit the JSON (code-editor style) or only through the UI? That decides whether "preserve user edits" needs diffing.
- Whether skills-evals has additional grading logic in files I did not read (`src/manifest.ts`, `src/app/*`).
