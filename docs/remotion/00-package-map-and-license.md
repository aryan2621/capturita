# 00 — Package map and licensing

Source: `remotion-dev/remotion` shallow clone at commit `8716fb8` (2026-10-18), plus
`remotion-dev/template-prompt-to-motion-graphics`. Package descriptions come from each
`packages/*/package.json`.

## Top-level packages → phase

| Phase | Packages |
|---|---|
| **1 Core model** | `core` (Composition, Sequence, Series, Freeze, Loop, hooks, delayRender), `zod-types`, `zod-types-v3`, `preload` |
| **2 Primitives** | `core` (interpolate, spring, Easing, interpolateColors, random), `paths`, `shapes`, `noise`, `motion-blur`, `layout-utils`, `transitions`, `animated-emoji`, `lottie`, `gif`, `animation-utils`, `gsap`, `rive`, `skia` |
| **3 Demo elements** | `captions`, `openai-whisper`, `elevenlabs`, `install-whisper-cpp`, `whisper-web`, `whisper-webgpu`, `google-fonts`, `fonts`, `three`, `svg-3d-engine`, `media-utils`, `sfx`, `light-leaks`, `starburst`, `effects`, `rough-notation`, `rounded-text-box`, `mac-cursors`, `maptiler`, `tailwind`, `tailwind-v4`, `brand`, `design`, `example`, `example-videos`, `jonnys-videos`, `promo-pages`, templates: `template-audiogram`, `template-music-visualization`, `template-tiktok`, `template-three`, `template-skia`, `template-code-hike`, `template-stargazer`, `template-overlay`, `template-still`, `template-element-library` |
| **4 Render/export** | `bundler`, `browser-bundler`, `renderer`, `compositor` (Rust) and the `compositor-*` platform binaries, `cli`, `player`, `player-a11y`, `web-renderer`, `webcodecs`, `media`, `media-parser`, `canvas-capture-extension`, `lambda`, `lambda-client`, `lambda-go/php/python/ruby`, `cloudrun`, `vercel`, `serverless`, `serverless-client`, `streaming`, `studio`, `studio-server`, `studio-shared`, `browser-studio`, `timeline-utils`, `video-matting`, `convert`, `template-render-server`, `template-electron`, `template-recorder` |
| **5 AI loop** | `template-prompt-to-motion-graphics`, `template-prompt-to-video`, `template-vibe-code`, `skills`, `skills-evals`, `mcp`, `claude-code-plugin`, `agent-plugin`, `codex-plugin`, `kimi-code-plugin`, `sdk`, `studio-protocol` |
| Not relevant | `eslint-*`, `babel-loader`, `enable-scss`, `codemods`, `create-video`, `docs`, `docusaurus-plugin`, `discord-poster`, `licensing`, `it-tests`, `react18-tests`, `test-utils`, `bugs`, `astro-example`, `player-example`, `lambda-*-example`, other `template-*` app shells (next, react-router, vercel, blank, helloworld) |

## Licensing: what you may do

The root `LICENSE.md` ("Remotion License") is **source-available, not OSI open source**. In summary:

- **Free License** applies to individuals, for-profit companies with **up to 3 employees**,
  non-profits, and anyone evaluating. It covers creating videos and images, commercially too,
  and modifying the software for your own use case.
- **Disallowed for everyone**: "copy or modify Remotion code for the purpose of selling, renting,
  licensing, relicensing, or sublicensing your own derivate of Remotion."
- Larger for-profit companies need a paid **Company License**. Even with one, the
  allowed use cases are the same as above.
- `LICENSE.md` says Remotion 5.0 will change the terms "slightly" (PR #3750).
  That PR is **UNVERIFIED** here because its content isn't in the repo.

The license is **per package**, according to each `package.json` `license` field:

- **MIT / ISC** (code reuse allowed with attribution): `paths`, `shapes`, `noise`, `motion-blur`,
  `layout-utils`, `captions`, `media-utils`, `animated-emoji`, `fonts`, `three`, `gsap`,
  `rough-notation`, `rounded-text-box`, `sfx`, `preload`, `timeline-utils`, `openai-whisper`,
  `elevenlabs`, `whisper-webgpu`, `video-matting`, `skia`, `studio`, `mcp`, `zod-types`.
  Some of these (`paths`, `shapes`, `media-utils`) ship a `LICENSE.md` with MIT text.
  Others only declare MIT in `package.json`.
- **Remotion License** (explicit): `core`, `player`, `renderer`, `bundler`, `cli`,
  `compositor`, `lottie`, `gif`, `google-fonts`, `light-leaks`, `starburst`, `mac-cursors`,
  `rive`, `web-renderer`, `webcodecs`, `media-parser`, `lambda`, `sdk`, and others.
- **`UNLICENSED` or no field** (`transitions`, `effects`, `svg-3d-engine`, and the
  `template-prompt-to-motion-graphics` and `skills` packages, which are `private`):
  no separate grant, so treat them as covered by the root Remotion License.

### Plain answer for Capturita

*Corrected 2026-10-18. An earlier version called embedding disallowed outright, which reads
the clause too broadly.*

1. **Using Remotion as a library inside a product looks intended, subject to licence tier.**
   - The evidence: Remotion ships `template-prompt-to-motion-graphics`, whose `package.json`
     describes it as a "SaaS template for AI-powered animation generation", and
     `template-electron`, a desktop app template. Both READMEs (§License) say only that "for
     some entities a company license is needed".
   - What the disallowed clause targets: copying or modifying Remotion code in order to sell
     **your own derivative of Remotion**, meaning a fork or competing framework.
   - Free tier: individuals and companies with up to 3 employees. Larger companies need a
     Company License.
   - Still **UNVERIFIED**: whether a desktop app that ships Remotion's renderer to end users
     needs a special licence or per-render pricing. remotion.pro has a FAQ and pricing for
     this; get it in writing before shipping.
2. **MIT packages** (`paths`, `shapes`, `noise`, `motion-blur`, `layout-utils`, `captions`,
   `media-utils`): you may copy or vendor them with the MIT notice kept. Check each package's
   own `package.json` at the version you take.
   - `paths` and `shapes` depend on nothing Remotion-licensed.
   - `noise` wraps `simplex-noise`.
   - `motion-blur`, `layout-utils` and `media-utils` declare `remotion` as a peer or regular
     dependency, so only their pure-math parts can be lifted cleanly.
3. **Reimplementing the ideas** is the default and is safe. Copyright protects code, not
   behavior. Examples: a frame-as-a-function model, an `interpolate` with clamp/extend, a
   damped spring, a sequence time offset, transition presentations. Don't transliterate files
   line by line.
4. **Videos you make with Remotion yourself** (e.g. Capturita's own marketing): allowed for
   free if you qualify as small.

## Open questions
- Does a Company License permit embedding `@remotion/player` in a commercial desktop app?
  Ask Remotion.
- What does the Remotion 5.0 license change (PR #3750) actually alter?
