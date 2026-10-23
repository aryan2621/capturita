# Studio test checklist (Round 5)

**How to use this:** Run the dev app (`npm run tauri dev`). Each step says **where to go**, **what to click**, and **what you should see**. Tick the box if it works. If it doesn't, write down the step number and take a screenshot.

## Getting around the app

| To… | Do this |
|---|---|
| Make a new Studio video | In the library, click **New Studio video** at the top. The editor opens. |
| Open a project | Click it in the library. Studio videos have a **Studio** badge. |
| Go back to the library | Click **←** at the top left of the editor. |
| Add a scene | Under the preview, on the left of the play bar, click **✨ Add scene**. Pick a scene from the list. It goes in at the playhead. |
| Change a scene | Click the scene on the timeline. Its settings open on the right. Click **‹ Scene** or press **Esc** to close them. |
| Right-hand tabs | **Brand · Audio · Captions · Thumbnail · AI**. In a recording, **Brand** is called **Look**. |
| Change the shape | Use the dropdown at the top centre (e.g. **16:9 · Wide**, **9:16 · Vertical**). |
| Play / pause | Press **Space** or click the round play button. |

---

## A. Studio video (no recording)

Start with **New Studio video**.

### 1. Let the AI draft a whole video
**Where:** **AI** tab → **Whole video**. It's already picked in a Studio video.

- [ ] Paste a README or product description into the big text box. Click **Screenshots** and pick 2 images. Click **Music** and pick a song. Set **Scenes** to 8. Under **Style**, pick **Cinematic**. Click **Make a draft** and wait a minute or two.
  **Expect:** a list of about 8 scenes. If your text doesn't have enough for 8, it says "The text supports X of the 8 asked for".
- [ ] Do it again with **Scenes** at 3, then at 12.
  **Expect:** 12 gives you more scenes than 3.
- [ ] Click **Replace the timeline with N**.
  **Expect:** your first screenshot is shown on a **3D phone or laptop**. The other screenshots fill the screenshot scenes.
- [ ] Press play.
  **Expect:** the song plays, and the cuts between scenes land on the beat.
- [ ] **Text with no features.** Clear the text box and paste only: `Capturita is a screen recorder for Mac. Try it free at capturita.app.` Add 3 screenshots, then click **Make a draft**.
  **Expect:** 3 screenshot scenes, one per image, plus usually an intro and an end card. You should not get an empty draft or an error.

### 2. Ask the AI for one scene
**Where:** **AI** tab → click **Scenes** (next to **Whole video**) → type in the box → press **Enter** or click **Suggest scenes** → click **Apply**.

- [ ] In a video that already has screenshot scenes, type: `Add a feature grid`.
  **Expect:** a grid built from those screenshots, with no refusal.
- [ ] Type: `Add a stats scene with 10k users`.
  **Expect:** one **Stat counter** scene.

### 3. Video styles and camera moves
- [ ] **Brand** tab → dropdown **Apply a video style…** → try **Minimal**, **Bold**, **Smooth**, **Cinematic**. The dropdown only shows once the video has a scene.
  **Expect:** the transitions and pace change each time.
- [ ] Click a scene on the timeline. At the bottom of its settings, set **Camera move** to **Slow push in**, **Slow pull out**, **Pan left** or **Pan right**, then play.
  **Expect:** the scene drifts slowly that way.

### 4. 3D device scene
**Where:** **✨ Add scene** → **3D showcase** → click it on the timeline → **Show**.

- [ ] **Phone**: rounded screen, island cutout at the top, side buttons.
- [ ] **Laptop**: keyboard, trackpad and camera notch, and the lid opens.
- [ ] **Logo**: your brand logo on a tile.

You can add a picture with **Screenshot (phone or laptop)**.

### 5. Custom scene with layers
**Where:** **✨ Add scene** → **Custom (layers)** → click it on the timeline. Add layers with the **Add layer…** dropdown, e.g. **Headline**, **Box**, **Logo**. Pause the video before dragging.

- [ ] Drag and resize a layer on the preview.
  **Expect:** guide lines show and the layer snaps to them. Hold **⌥ Option** while dragging to turn snapping off.
- [ ] Set one layer's **Rotation°** to 30, then drag another layer next to it.
  **Expect:** it snaps to the rotated layer's **visible** edge.
- [ ] Switch the shape to **9:16 · Vertical**. Turn on **Own layout in tall frames**, drag the layer somewhere new, then switch back to **16:9 · Wide**.
  **Expect:** the 16:9 version is unchanged.
- [ ] In the layer list, try the copy icon (**Duplicate**) and the chain icon (**Group with the layer above**).
  **Expect:** both work.
- [ ] Under **Keyframes**, click **Add at X s**. Move the playhead, drag the layer, and click **Add** again. In the second row, change **Easing**.
  **Expect:** the layer animates between the two places.
- [ ] **AI** tab → **Scenes** → type `make a custom scene announcing v2` → **Apply**. Then type `change the headline to "Now live"` → **Apply**.
  **Expect:** only that text changes, and the animation stays on the right layers.

### 6. Animated icon (Lottie / Rive)
**Where:** **✨ Add scene** → **Lottie / Rive animation** → click it on the timeline.

- [ ] Next to **Animation**, open **Library…** and pick an icon, e.g. **Award**.
  **Expect:** it plays in the brand's text colour.
- [ ] Set **Colour (Lottie)** to **Accent**, then **As drawn**.
  **Expect:** the colour changes each time.
- [ ] Click **Add a Lottie or Rive file** and pick your own `.riv`. Optionally fill in **Rive artboard**, **Rive animation or state machine**, and **Rive inputs** (e.g. `speed=2`). Then turn **Wi-Fi off** and play.
  **Expect:** it still plays.

### 7. Brand kit
**Where:** **Brand** tab.

- [ ] Click **From a website**, type a site with a dark logo (e.g. `github.com`), then click **Make kit**.
  **Expect:** a light background, and the site's font is used.
- [ ] Click **Start from a look (18)** and click a few cards.
  **Expect:** each makes a new kit with that look's colours and fonts. If the video has scenes, their transitions and pace change too (e.g. **Neon Arcade** is fast zooms, **Forest** is soft blurs).
- [ ] On a kit that has a logo, click **Colours from the logo**. If there's no logo yet, click **Add a logo** first.
  **Expect:** the kit's colours change to match the logo.

### 8. Sound
**Where:** **Audio** tab, and the rows under the timeline.

- [ ] Click **Add music** and pick a song, then press play.
  **Expect:** you hear it. If not, go back to the library and reopen the project.
- [ ] Look under the timeline.
  **Expect:** a **Music** row with thin beat lines. Click the word **Music** to mute it. The row fades and the word is crossed out. Click again to unmute.
- [ ] Click **Cut scenes on the beat**. If it isn't there, click **Find the beats** first.
  **Expect:** scene edges move onto beats.
- [ ] Next to **Voiceover**, click **Text to speech**. Type something, pick a **Voice**, then click **Add voice**. Keep **Lower music under speech** on.
  **Expect:** the voice plays and the music gets quieter while it talks.
- [ ] Click the words **Voice** and **SFX** on the timeline.
  **Expect:** each one mutes its own row.
- [ ] Add a **Video clip (b-roll)** or **Audio waveform** scene and give it a file.
  **Expect:** a message says which row its sound went on, and the sound shows on that row.

### 9. Captions
**Where:** **Captions** tab. You need a voiceover first (step 8).

- [ ] Click **Make captions**, then turn on **Show captions in the video**.
- [ ] Turn on **Highlight the word being said**, then try **Colour**, **Box**, **Line** and **Pop**.
  **Expect:** the spoken word is highlighted in each style.

### 10. Export
**Where:** **Export** at the top right, or **⌘E**.

- [ ] Under **Aspect ratios**, pick both **16:9** and **9:16**, then click **Export 2 files**.
  **Expect:** two MP4s that look like the preview, with music, voice and captions, and sound in sync.

---

## B. Recording project
**Start:** in the library, click **New recording** → **Start recording**. Talk and click around for about a minute, then stop. The editor opens on its own.

- [ ] **11. Captions:** **Captions** tab → **Make captions**.
- [ ] **12. AI uses what you said:** **AI** tab → **Scenes** → type `Add a feature callout where I [something you said]` → **Suggest scenes** → **Apply**.
  **Expect:** the callout shows **that moment** of the recording, not wherever the playhead is.
- [ ] **13. Pick the target:** click the **Feature callout** scene. In **Target**, try **Draw on preview** (draw a box on the preview), then **Suggest**.
  **Expect:** both put a box around the right spot. **Suggest** is greyed out if you never clicked during the recording.
- [ ] **14. Smooth playback:** add a **Device showcase** and a **Feature callout**, then play through them.
  **Expect:** no stutter.
- [ ] **15. Old frame flash (bug #5):** put a **Feature callout** right after a recording clip. Pause inside the callout, then click on the timeline at the very start of the callout, where it fades in.
  **The bug happened if:** you see a frame from later in the recording, with no scene on top.
- [ ] **16. Timing offset (bug #6):** pause on a frame where something visibly changes and note the time. Export, then open the file and go to the same time.
  **The bug happened if:** the exported frame is a little **later** than the preview.
- [ ] **17. Whole video from a recording:** **AI** tab → **Whole video** → fill in the form as in step 1 → **Make a draft** → **Add N at the end**.
  **Expect:** device scenes that show different parts of your recording, plus one feature callout.

---

## C. Known limits, not bugs
- The **Library…** music menu stays hidden until CC0 MP3s are added to `studio-assets/music/`.
- No Rive animations come with the app. Use your own `.riv` file.
- **Device showcase** and **Feature callout** only appear in recordings, because they need recorded footage.
- If the AI model isn't downloaded, the **AI** tab only shows **Download the AI model**.

## D. If there's no sound
This happened once on 2026-10-23, and reopening the app fixed it. The app was making sound, but the Mac wasn't playing it. Most likely the sound output changed while the project was open.

- [ ] If it happens again, go back to the library and reopen the project. Note whether that brings the sound back.
