# Bundled Studio assets

Shown in the "Library…" menus (Lottie scene, Music). Every file here must have a licence that
allows shipping it inside the app; list each source below.

## lottie/
Animated icons from useAnimations, https://github.com/useAnimations/react-useanimations
(`icons/`), MIT licence — full text in `LICENSE-useAnimations.txt`, which must ship with them.
Files: award, barChart, calendar, checkCircle, clock, download, heart, loading, lock, mail,
notification, settings, star, trendingUp, userPlus, zap.

## music/
Empty until tracks are added. Use only CC0 / public-domain music (e.g. FreePD.com) and add
each file's source URL here. Name files `<mood>-<bpm>.mp3` (e.g. `upbeat-120.mp3`).

## sfx/
Transition sounds (whoosh, swoosh, pop, click, riser, impact) made from scratch with
`scripts/make-sfx.sh` (synthesised noise and tones through ffmpeg). Original work, no third-party
material, so no licence to carry; re-run the script to change them.
