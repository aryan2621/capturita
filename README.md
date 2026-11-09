# Capturita

**Record your screen, make it look great, share it. Screen recorder and editor for macOS.**

<!-- DEMO VIDEO: paste the https://github.com/user-attachments/assets/... link on the next line -->

- **Record** a screen, a window or an area, with your mic, system audio and a camera bubble. **⌘⇧R** from anywhere.
- **Edit:** trim, split and cut, speed up, smooth spring auto-zoom on your clicks that follows your cursor, a smoothed cursor with click effects, backgrounds (gradients, colours or your own image), rounded corners and shadow.
- **Edit for free:** trim, split and cut, hide private info, and export or share your videos.
- **Capturita Pro:** on-device captions, AI editing, animated titles, and Studio motion graphics.
- **Share:** export an MP4 (up to 4K, 60 fps) or a GIF with one-click presets, copy it to paste anywhere, or upload straight to YouTube or Google Drive.

Captions and AI editing run on your Mac. Your recordings are never uploaded unless you choose to.

**[⬇ Download for macOS](https://github.com/aryan2621/downloads/releases?q=capturita)**
· macOS 15+, Apple silicon · [all downloads](https://github.com/aryan2621/downloads/releases?q=capturita)
· **macOS only:** recording uses Apple's ScreenCaptureKit, so there's no Windows version yet.

## Free and Pro

Recording and core editing remain free. Capturita Pro is a one-time ₹999 purchase and includes one
year of updates. Pro activation applies to official Capturita builds; this repository remains
MIT-licensed, and source builds are not restricted. Activation is configured in `.github/workflows/build.yml`; keys are sold and checked by the storefront.


## Install

1. Open the `.dmg` and drag **Capturita** into **Applications**, then open it.
2. If macOS says **"Apple could not verify Capturita is free of malware"**: click **Done**, go to
   **System Settings → Privacy & Security**, scroll down and click **Open Anyway**. (Capturita
   isn't signed with a paid Apple certificate; that's the only reason for the warning.)
3. If it says Capturita **"is damaged"**, run this once in Terminal and open it again:
   ```bash
   xattr -dr com.apple.quarantine /Applications/Capturita.app
   ```
4. The setup asks for **Screen Recording** (needed), **Microphone** and **Camera**, and offers the
   captions model (547 MB, optional, once). The local AI editor downloads a 2.4 GB model on Macs under 16 GB of RAM, or 6.4 GB on 16 GB and larger Macs, when you first use it; larger optional models (up to 16.5 GB) are in Settings. Other speech models, AI models, theme and Google uploads are in **Settings** (⚙). Uploading to YouTube or Drive needs your own Google Cloud project: see the [Google setup guide](docs/google-setup.md).

## Quick start

1. Click **New recording**, pick a screen, window or area, turn on mic / camera if you like, and press **Record**.
2. Press **⌘⇧R** (or the stop button) to finish. The editor opens.
3. Zooms are added on your clicks. Press **S** to split, **C** to cut a part, **Z** to add a zoom, **T** to add text (Pro), **H** to hide something. **?** shows every shortcut.
4. **⌘E** to export an MP4 or upload. Files are saved in `~/Movies/Capturita`.

## Studio (Pro)

Studio makes launch videos from motion scenes, with or without a screen recording.

- **130 scenes:** hooks, problems, product reveals, text, UI demos, code and AI, data, diagrams, social proof, shapes and closers. Pick **Add scene** below the preview, or ask the AI to add one.
- **Templates:** **New Studio video** lists 13 ready-made seven-scene launch stories. Each sets its own colours, fonts and style, and every line is placeholder copy to edit.
- **AI draft:** paste your README or a product description, set **Scenes** (up to 16), and the AI reads the facts (name, features, steps, numbers, pricing, quote, link) and builds a video from the whole scene library. It writes only what the text says, so a short description gives fewer scenes.
- **Brand kits:** colours, fonts and logo apply to every scene. Light and dark brands both work.
- **Looks:** each video style sets the transitions, the slow camera push, atmosphere and light leaks (film, cinematic, vapor and dreamy).
- **Music and beats:** add a song, or let the AI draft use the built-in loop. In the Music panel, use **Cut scenes on the beat** (shown once the song's beats are found) so every cut lands on a beat.
- **Recordings:** scenes that show your recording follow your clicks with the same smooth zoom as the editor.
- **Export:** scenes render at 60 fps. Export MP4 or GIF, or a transparent ProRes `.mov` of the scenes alone for another editor. The first export downloads the Chrome headless shell.

## Build from source

```bash
git clone https://github.com/aryan2621/capturita.git
cd capturita && npm install && npx tauri build --bundles app
```

Needs Node, Rust, Xcode's Swift tools and `cmake`.
