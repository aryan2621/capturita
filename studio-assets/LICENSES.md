# Bundled Studio assets

Shown in the "Library…" menus (Lottie scene, Music). Every file here must have a licence that
allows shipping it inside the app; list each source below.

## lottie/
Animated icons from useAnimations, https://github.com/useAnimations/react-useanimations
(`icons/`), MIT licence — full text in `LICENSE-useAnimations.txt`, which must ship with them.
Files: award, barChart, calendar, checkCircle, clock, download, heart, loading, lock, mail,
notification, settings, star, trendingUp, userPlus, zap.

## music/
`upbeat-120.mp3` is the default Studio music, made from scratch with `scripts/make-music.sh`
(a synthesised kick, hat, bass and pad through ffmpeg). Original work, no licence to carry. Any other
track added must be CC0 / public domain (e.g. FreePD.com) with its source URL listed here, named `<mood>-<bpm>.mp3`.
The first file by name is the one Studio adds when the user picks no song.

## sfx/
Transition sounds (whoosh, swoosh, pop, click, riser, impact) made from scratch with
`scripts/make-sfx.sh` (synthesised noise and tones through ffmpeg). Original work, no third-party
material, so no licence to carry; re-run the script to change them.
