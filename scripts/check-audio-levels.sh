#!/bin/bash
# Checks an exported video's audio: integrated loudness near -14 LUFS (+-1), true peak <= -1.3 dBTP,
# and no second quieter than -30 dBFS RMS between the first and last second. Prints one line per check; exit 1 on any failure.
# Documented command only, not part of the app:  scripts/check-audio-levels.sh export.mp4
set -euo pipefail
FFMPEG=${FFMPEG:-/opt/homebrew/bin/ffmpeg}
FILE=${1:?usage: check-audio-levels.sh <file>}
fail=0
# Integrated loudness and true peak from the summary ebur128 prints at the end.
SUMMARY=$("$FFMPEG" -nostats -i "$FILE" -vn -af ebur128=peak=true -f null - 2>&1 | awk '/Summary:/ {s=1} s')
LUFS=$(echo "$SUMMARY" | awk '/ I:/ {print $2}')
TP=$(echo "$SUMMARY" | awk '/Peak:/ {print $2}')
awk -v l="$LUFS" 'BEGIN {ok = (l >= -15 && l <= -13); printf "loudness %s LUFS (want -14 +-1): %s\n", l, ok ? "ok" : "FAIL"; exit !ok}' || fail=1
awk -v p="$TP" 'BEGIN {ok = (p <= -1.3); printf "true peak %s dBTP (want <= -1.3): %s\n", p, ok ? "ok" : "FAIL"; exit !ok}' || fail=1
# RMS per second: one asetnsamples window per second, via astats.
RMS=$("$FFMPEG" -v error -i "$FILE" -vn -af "aresample=48000,asetnsamples=n=48000:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - | awk -F= '/RMS_level/ {print $2}')
echo "$RMS" | awk 'NR>2 {if (prev != "") { if (prev == "-inf" || prev < -30) { bad++; printf "second %d at %s dBFS\n", NR-2, prev } } } {prev=$1} END {if (bad) {printf "RMS: %d second(s) below -30 dBFS: FAIL\n", bad; exit 1} print "RMS: every second above -30 dBFS: ok"}' || fail=1
exit $fail
