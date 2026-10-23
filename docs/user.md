# Capturita: user guide

[← Back to README](../README.md) · [Developer guide](dev.md)

- [Install](#install) · [Home](#home) · [Record](#record) · [Edit](#edit) · [Text](#text) · [Captions](#captions)
- [Hide private info](#hide-private-info) · [Audio](#audio) · [AI editing](#ai-editing)
- [Export and upload](#export-and-upload) · [Settings](#settings) · [Shortcuts](#shortcuts) · [Your files](#your-files) · [Troubleshooting](#troubleshooting)

## Install

1. Download [`Capturita_0.1.0_aarch64.dmg`](https://github.com/aryan2621/capturita/releases/latest/download/Capturita_0.1.0_aarch64.dmg)
   (macOS 15 or later, Apple silicon).
2. Open it, drag **Capturita** into **Applications**, and open Capturita.

**"Apple could not verify Capturita is free of malware":** Capturita isn't signed with a paid
Apple Developer certificate, so macOS warns you the first time. Click **Done**, open **System
Settings → Privacy & Security**, scroll down, click **Open Anyway** next to Capturita and confirm.
If macOS says Capturita **"is damaged and can't be opened"**, run this once in Terminal and open it again:

```bash
xattr -dr com.apple.quarantine /Applications/Capturita.app
```

**First run:** a one-minute setup asks for **Screen Recording** (needed to record), **Microphone**
and **Camera** (only if you use them), and offers to download the captions model now (547 MB,
once) so captions are instant later. macOS may ask you to quit and reopen Capturita after
allowing Screen Recording.

## Home

Your recordings, newest first, as a **grid** or a **list** (switch at the top right; Capturita
remembers your choice). Click a recording to open it in the editor. Each one has **Show in
Finder** and **Move to Trash** buttons; a deleted recording can be put back from the Trash in Finder.

## Record

- Click **New recording** (top right) and choose **Screen**, **Window** or **Area** at the top, then pick one.
- **Microphone** with optional **echo cancellation** (keeps speaker sound out of your mic; turn it
  off with headphones for the most natural voice), **system audio**, and a **camera** bubble.
- The camera bubble can be dragged anywhere. It's recorded separately, so you can move or hide it
  later in the editor.
- The mic, camera and Mac audio are the chips next to **Record**. Start and stop with **Record**
  or **⌘⇧R** from any app. Capturita's window hides while you record.

## Edit

The editor opens when you stop. Nothing you do changes the original recording.

The settings are in tabs on the right: **Look**, **Zoom**, **Cursor**, **Camera**, **Audio**,
**Captions**, **Annotate** (text and hidden areas), **Thumbnail** and **AI**. Selecting a zoom, text or hidden
area on the timeline shows its own settings there (**Esc** or the back arrow returns).
**Aspect ratio** and **Crop** are at the top.

- **Trim, split and cut:** drag clip edges on the timeline. **S** splits the clip at the playhead;
  **C** marks a part, **C** again cuts it.
- **Speed:** speed up any clip.
- **Zoom:** a new recording gets zooms around your clicks (re-make them with **Auto zoom**). The
  camera eases in with a spring, pans to keep the cursor in view, and glides between nearby
  zooms. Click an empty spot on the **Zoom** lane (or press **Z**) to add one; drag a zoom to move
  it, drag its edges to resize it, right-click for **Make instant** or **Fixed point**. A
  fixed-point zoom shows a box on the preview to drag where it should zoom. **Camera:** Smooth or
  Focused; **Motion blur** is added to zooms in the export.
- **Cursor:** arrow, hand or dot; **Mellow**, **Smooth**, **Quick** or **Off** movement (hand
  shake is removed, and the cursor lands exactly on each click); hide it when it isn't moving;
  click ripple or pulse in any colour; click sounds.
- **Look:** gradients, colours or your own image (with blur) as the background; padding, rounded
  corners and shadow.
- **Camera:** corner, size, circle or rounded, and **Shrink while zoomed in**.

**Thumbnail** (its own tab): **Use current frame** (the frame on the preview, as it looks in the
video) or **Upload image**. It's shown in your library, and a custom one is sent with YouTube
uploads (YouTube only accepts it on channels verified by phone).

Busy, full-size Retina recordings are previewed from a lighter 1080p copy, made the first time
you open them ("Preparing a smooth preview…"). Exports always use the original.

## Text

Titles and labels with fonts, colours and animations: fade, rise, pop, slide, blur, typewriter,
word by word. Press **T** to add text at the playhead.

## Captions

Made on this Mac with Whisper (the speech model downloads once; choose another in **Settings →
Captions**). **Caption what:** your **microphone** (the default), the Mac's **system audio** (a
video or a call), or **both**: each is transcribed on its own, in its own language. Fix any word,
style them (font, size, box or shadow, highlight the word being spoken), burn them into the
video and/or save an `.srt` file. **Redo** makes them again, letting you change the language or
what to caption.

## Hide private info

Pixelate, blur or cover parts of the screen (emails, passwords, API keys, chats) for as long as
you choose. Press **H** to add one at the playhead. Boxes stay on the content while zooming and
are baked into every export.

## Audio

Volume per track (mic, system, music), fade in and out, and background music.

## AI editing

Describe an edit and an AI model on this Mac proposes cuts, speed-ups, zooms and titles. It
downloads once; pick which model in **Settings → AI editing**:

| Model | Download | Memory | |
|---|---|---|---|
| Qwen3 4B (default) | 2.4 GB | 8 GB | Quick, and good at most edits |
| Gemma 4 12B | 6.4 GB | 16 GB | Follows longer, more detailed requests more closely; slower |
| Gemma 4 26B A4B | 14.3 GB | 32 GB | Large but quick; better at writing scenes |
| Qwen3.8 27B | 16.5 GB | 32 GB | The most capable, for long requests; slowest |

It proposes a list of edits. Review each one (include or leave it out, or jump to where it happens),
then apply.

Try: *"Cut the part about pricing"*, *"Speed up the parts where nothing happens"*, *"Add a title
at the start"*. It reads what you said (from captions), so it works best on recordings with speech.

One-click clean-ups remove **filler words** ("um", "uh") and **long pauses**.

## Studio

A Studio video is made only of motion scenes, with no screen recording. On Home, click
**New Studio video**: it starts as a short teaser (logo, a statement, an end card) to edit.

**Draft a whole video:** open the **AI** tab, choose **Whole video**, paste your README, landing
page text or a description, pick **Short** or **Full** and a style, then **Make a draft**. It takes a
minute or two on your Mac and uses only facts from your text. Add **Screenshots** to show them in the
feature spotlights (in the order you add them) and **Music** to use a song: the scenes are then cut on
its beats. Untick scenes you don't want, then replace the timeline with the draft.

Add a scene with the **✨** button at the left of the timeline toolbar (it goes in at the playhead). **Scene** fills the
screen; **Overlay** is drawn over the video. Select a scene to change its text, images and timing.

| Scene | What it shows |
|---|---|
| Logo sting | Your logo with a reveal (pop, wipe, ring or glow) |
| Title reveal | An eyebrow, a title and a subtitle |
| Kinetic statement | A short line, word by word, with one word picked out |
| Device showcase, Feature callout | Part of your recording in a device, or a zoom on one spot (recordings only) |
| Stat counter | Up to three numbers counting up, with an optional chart |
| Lower third | A name and title in the corner |
| End card | A call to action, link, QR code and socials |
| Screenshot showcase | A screenshot in a phone, tablet, laptop or browser frame |
| Feature grid | Features with icons, in a grid |
| Testimonial | A quote, a name, a photo and a star rating |
| Pricing | Price tiers, with one picked out |
| Before / after | Two images with a sliding divider |
| Logo wall | Customer logos, in a grid or scrolling past |
| Code typing | Code typed out with highlighting |
| Comparison | A table of features: you against others |
| Lottie / Rive animation | A Lottie (.json) or Rive (.riv) animation, with a caption |
| Roadmap | Milestones on a line: done, now and next |
| Team | People with photos (or initials), names and roles |
| Video clip | A video you add (b-roll), full frame or in a card |
| Audio waveform | Bars that move with an audio file you add |

**Video clip and audio waveform sound:** when you choose the file, its sound is added on an audio lane
at the scene's start (a video's on **SFX**, an audio file's on **Voice**, so music ducks under it),
trimmed to the scene. Move, trim or delete it there like any other clip.
| 3D showcase | A phone or laptop showing your screenshot, or your logo on a tile, turning in 3D |
| Custom (layers) | Your own layout: text, shapes, icons, animated elements, the logo and images |

**Images:** image fields take PNG, JPEG, WebP, SVG or GIF (GIFs play). The file is copied into
the project, so moving or deleting the original is fine.

**Custom scene:** add layers from **Add layer…** (headline, subtitle, badge, shapes, icon, logo,
image, and animated elements: checkmark, arrow, underline, hand-drawn ring, sparkles, burst, confetti).
Click a layer in the list or on the preview, drag it to move, and drag its corner to resize. Each layer
has an **Entrance** (fade, rise, pop, slide, wipe, blur, type, words) and a **Comes in at** time.
**Keyframes:** move the playhead, click **Add at …**, then move the playhead again and drag the layer:
it animates between the two. Each keyframe also sets scale, opacity and easing (how it moves into that
keyframe: smooth, linear, in, out or overshoot). Earlier layers sit behind later ones.
While dragging, layers snap to the frame's edges and centre and to other layers, with a guide line;
hold Option to place freely. In the layer list, the copy button duplicates a layer and the link button
groups it with the layer above so they move together.
Positions are a share of the frame. To arrange a layer differently for tall (9:16) or wide frames,
switch the aspect ratio and turn on **Own layout in … frames**; changes then apply only to that shape.

**Video and audio files:** the Video clip and Audio waveform scenes take MP4, MOV or WebM, and M4A,
MP3 or WAV. They're silent in the scene: to hear the sound, add the same file as music or a voiceover.

**Lottie:** export the animation as a Lottie `.json` file and pick it in a Lottie animation scene.

**Brand kit:** in the editor, pick or make a brand kit for colours, logo and fonts. The display and
body fonts come from a bundled set (Inter, Space Grotesk, Manrope, Playfair Display and more), so
they work offline. **Colours from the logo** sets the five colours from the logo's main colour.
**From a website** makes a kit from a site's home page: type its address (like `example.com`) and
Capturita takes its name, logo, theme colour (or the logo's colours) and, when the page names one, a
matching bundled font. Check the logo: a dark wordmark may need a light version for dark scenes.
**Background** is a plain **Gradient**, **Gradient with film grain**, or
**Drifting colour**.

**Video style:** in the **Brand** tab, **Apply a video style** sets every transition, scene length
and camera move at once: **Minimal**, **Bold**, **Smooth** or **Cinematic**. Colours and fonts stay
your brand kit's.

**Camera move:** each scene can drift: **Slow push in**, **Slow pull out**, **Pan left** or **Pan right**.

**Voice from text:** in the **Audio** tab, click the **T** button beside Voiceover, type a script,
pick a Mac voice and click **Add voice**. It's read on your Mac, offline. Caption it in the
**Captions** tab, which has four looks (Clean, Bold pop, Boxed, Subtle).

**Sounds on scenes:** most scenes have a **Sound at …** setting (the logo hit, a key word, the first
card, the count ending, the button press) to play a sound from your sound pack at that moment.

**Music on the beat:** the beats of a song are found when you add it (or click **Find the beats**).
Edges snap to beats on the timeline, and **Cut scenes on the beat** nudges each scene's length so the
change to the next lands on a beat.

**Mute a lane:** click **Voice** or **SFX** at the left of the timeline to mute or unmute that lane
in the preview and the export.

**Motion blur:** most scenes have a **Motion blur (in exports)** switch. It's added only when you
export, so the preview stays fast.

## Export and upload

**⌘E** opens export. Choose:

- **Where:** **File** (on this Mac), **YouTube** or **Drive** (exported, then uploaded).
- **Preset:** **Web** (1080p, 30 fps), **Studio** (4K, 60 fps), **Social** (1080p, 60 fps),
  **Small** (720p, 30 fps) or **GIF** (480p, 15 fps, silent, loops). **Customize** sets the format
  (MP4 or GIF), resolution, frame rate and quality yourself.
- **File name:** type any name. If a file with that name exists, a number is added; nothing is overwritten.

When it's done, **Copy** puts the file on the clipboard to paste into Slack, Mail or Finder.

**Connecting Google (for YouTube and Drive):** uploads use your own free Google Cloud project,
so no shared key ships with the app and your keys stay in your Mac's Keychain. It's a one-time,
5-minute setup; then paste the Client ID and Client Secret in **Settings (⚙) → Google**.
Step by step, with privacy notes and fixes for every error: **[Google setup guide](google-setup.md)**.

YouTube keeps uploads **private** until your API project is audited by Google. To make one
public, upload the MP4 in YouTube Studio instead.

## Settings

Open with ⚙ in the header.

- **General:** light, dark or follow macOS; open the recordings folder; run setup again.
- **AI editing:** download, choose or delete AI models (see [AI editing](#ai-editing)).
- **Captions:** the speech model captions use, the same seven as Murmur:

  | Model | Download | |
  |---|---|---|
  | Large v3 Turbo (default) | 547 MB | Best accuracy for its speed |
  | Large v3 Turbo (full) | 1.6 GB | Marginally more accurate |
  | Large v3 | 1.1 GB | Slower; the most careful with accents and mixed languages |
  | Small (multilingual) | 466 MB | Fast; good for Hindi |
  | Small / Base / Tiny (English) | 466 / 142 / 75 MB | Faster, English only |

  **Use** switches (downloading first if needed); the bin icon deletes a downloaded one.
- **Google:** your Client ID and Client Secret for uploads, who you're signed in as, sign out.

## Shortcuts

Press **?** in the editor to see these.

| Key | Action |
|---|---|
| **Space** | Play / pause |
| **← / →** | Back / forward 5 seconds |
| **S** | Split the clip at the playhead |
| **C** | Mark a part to cut, then cut it (**Esc** cancels) |
| **Z** | Add a zoom at the playhead |
| **T** | Add text at the playhead |
| **H** | Hide part of the screen at the playhead |
| **⌫** | Delete the selected clip, zoom, text, hidden area or caption |
| **Esc** | Deselect |
| **⌘Z / ⌘⇧Z** | Undo / redo |
| **⌘+ / ⌘− / ⌘0** | Zoom the timeline in / out / fit |
| **⌥** while dragging | Skip snapping |
| **⌘E** | Export or upload |
| **⌘⇧R** | Start / stop recording (from anywhere) |

## Your files

- Recordings: `~/Movies/Capturita`
- Exports (MP4, GIF and `.srt`): `~/Movies/Capturita/Exports`
- Each recording's folder also holds `thumb.jpg` (the library picture) and `screen-preview.mp4`
  (the smooth preview copy); both are remade if deleted
- Google Client ID, Client Secret and sign-in: the macOS Keychain
- AI and speech models: `~/Library/Application Support/com.capturita.app/models`

## Troubleshooting

- **No screens or windows listed:** allow Capturita under **System Settings → Privacy & Security →
  Screen Recording**, then quit and reopen it.
- **Stopped recording after an update:** macOS can forget permissions for unsigned apps. Remove
  Capturita from Screen Recording, add it back, and reopen.
- **Your voice echoes or sounds thin:** with headphones, turn **Echo cancellation** off.
- **Captions in the wrong language:** pick the **Language spoken** after **Redo** instead of
  "Detect automatically". English-only speech models always caption in English.
- **Captions include a video playing on screen:** choose **Microphone only (you)** under **Caption what**.
- **Upload says "Connect Google first", or another Google error:** see the
  [Google setup guide](google-setup.md#troubleshooting).
- **macOS asks to allow Keychain access after an update:** click **Always Allow**.
