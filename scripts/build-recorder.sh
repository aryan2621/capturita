#!/bin/sh
# Builds the Swift capture helper and places it where Tauri expects the sidecar:
# src-tauri/binaries/capturita-recorder-<target-triple>
# The triple is Tauri's build target (TAURI_ENV_TARGET_TRIPLE, e.g. universal-apple-darwin for a
# universal app), or this machine's when run by hand.
set -e
cd "$(dirname "$0")/.."
TRIPLE=${TAURI_ENV_TARGET_TRIPLE:-$(rustc -vV | sed -n 's/^host: //p')}
case "$TRIPLE" in
  universal-apple-darwin) ARCHS="--arch arm64 --arch x86_64" ;;
  aarch64-apple-darwin) ARCHS="--arch arm64" ;;
  x86_64-apple-darwin) ARCHS="--arch x86_64" ;;
  *) ARCHS="" ;;
esac
# shellcheck disable=SC2086
swift build -c release --package-path recorder $ARCHS
# shellcheck disable=SC2086
BIN_DIR=$(swift build -c release --package-path recorder $ARCHS --show-bin-path)
mkdir -p src-tauri/binaries
cp "$BIN_DIR/capturita-recorder" "src-tauri/binaries/capturita-recorder-$TRIPLE"
