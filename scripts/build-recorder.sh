#!/bin/sh
# Builds the Swift capture helper and places it where Tauri expects the sidecar:
# src-tauri/binaries/capturita-recorder-<target-triple>
# The triple is Tauri's build target (TAURI_ENV_TARGET_TRIPLE, e.g. universal-apple-darwin for a
# universal app), or this machine's when run by hand.
set -e
cd "$(dirname "$0")/.."
TRIPLE=${TAURI_ENV_TARGET_TRIPLE:-$(rustc -vV | sed -n 's/^host: //p')}
case "$TRIPLE" in
  universal-apple-darwin) ARCHS="arm64 x86_64" ;;
  aarch64-apple-darwin) ARCHS="arm64" ;;
  x86_64-apple-darwin) ARCHS="x86_64" ;;
  *) ARCHS="" ;;
esac
OUT="src-tauri/binaries/capturita-recorder-$TRIPLE"
mkdir -p src-tauri/binaries
if [ -z "$ARCHS" ]; then
  swift build -c release --package-path recorder
  cp "$(swift build -c release --package-path recorder --show-bin-path)/capturita-recorder" "$OUT"
  exit 0
fi
# One architecture per build, joined with lipo: several --arch flags at once need full Xcode's xcbuild.
BINS=""
for arch in $ARCHS; do
  swift build -c release --package-path recorder --arch "$arch"
  BINS="$BINS $(swift build -c release --package-path recorder --arch "$arch" --show-bin-path)/capturita-recorder"
done
# shellcheck disable=SC2086
lipo -create $BINS -output "$OUT"
# Tauri's universal build compiles each architecture and checks its sidecar by that triple too; the fat binary serves both.
if [ "$TRIPLE" = universal-apple-darwin ]; then
  for t in aarch64 x86_64; do cp "$OUT" "src-tauri/binaries/capturita-recorder-$t-apple-darwin"; done
fi
