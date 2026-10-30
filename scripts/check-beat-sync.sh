#!/bin/bash
# Beat-sync check: renders TitleReveal with a beat every 0.5 s (120 BPM) and compares the mean
# brightness of frames on the beats with frames between them. Prints the two means; exit 1 if
# beat frames are not brighter. Also writes the matching click track next to the clip.
#   scripts/check-beat-sync.sh [out dir]      (needs ffmpeg and studio-renderer/node_modules)
set -euo pipefail
FFMPEG=${FFMPEG:-/opt/homebrew/bin/ffmpeg}
OUT=${1:-$(mktemp -d)}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$OUT"
"$FFMPEG" -y -v error -f lavfi -i "sine=frequency=1000:duration=0.03:sample_rate=48000,apad=whole_dur=0.5,aloop=loop=19:size=48000" -t 10 "$OUT/click-120bpm.wav"
BEATS=$(node -e 'console.log(JSON.stringify(Array.from({length:20},(_,i)=>i*0.5)))')
PROPS="{\"eyebrow\":\"A\",\"title\":\"Beat\",\"subtitle\":\"sync\",\"atmosphere\":\"neon\",\"camera\":\"still\",\"beats\":$BEATS,\"brand\":{\"colors\":{\"bg\":\"#0b0d17\",\"surface\":\"#1d2440\",\"text\":\"#ffffff\",\"muted\":\"#9aa3c7\",\"accent\":\"#6c8cff\"},\"fonts\":{\"display\":\"inter\",\"body\":\"inter\"}},\"assets\":{}}"
(cd "$ROOT/studio-renderer" && node render.mjs TitleReveal "$OUT/clip.mp4" "$PROPS" >/dev/null)
# Mean luma per frame, then split by distance to the nearest beat (30 fps: a beat every 15 frames).
"$FFMPEG" -v error -i "$OUT/clip.mp4" -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$OUT/yavg.txt" -f null -
awk -F= '/YAVG/ {n=NR_++; if (n>=45) { if (n%15<=1) {on+=$2; a++} else if (n%15>=7 && n%15<=9) {off+=$2; b++} }} END {printf "on-beat %.3f  between %.3f\n", on/a, off/b; exit !(on/a > off/b)}' "$OUT/yavg.txt"
