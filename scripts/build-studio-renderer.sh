#!/usr/bin/env bash
# Prepares the motion scene renderer for bundling, like build-llama-server.sh does for llama-server:
#   src-tauri/binaries/studio-node-<target-triple>  the official Node.js binary (checksum-checked),
#                                                   bundled as a sidecar; for universal-apple-darwin
#                                                   the arm64 and x64 builds joined with lipo
#   src-tauri/studio-runtime/                       bundled as Resources/studio-renderer: render.mjs,
#                                                   the scenes prebuilt by Remotion's bundler, and a
#                                                   node_modules with only @remotion/renderer plus
#                                                   its compositor for arm64 and x64
# Chrome Headless Shell isn't bundled: the app downloads it on the first export (src-tauri/src/studio.rs).
#
#   --dev   only make sure both exist (development renders from studio-renderer/ directly)
#
# Signing: with APPLE_SIGNING_IDENTITY set (as for `tauri build`), the compositor binaries are
# signed with it, hardened runtime and a timestamp, because Tauri only signs the app, its main
# binary and sidecars, and notarization rejects any Mach-O inside the bundle signed otherwise.
set -euo pipefail

NODE_VERSION="v22.20.0"
REMOTION_VERSION="4.0.532"
REACT_VERSION="19.3.0"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Tauri's build target (universal-apple-darwin for a universal app), or this machine's.
TRIPLE="${TAURI_ENV_TARGET_TRIPLE:-$(rustc -vV | sed -n 's/^host: //p')}"
case "$TRIPLE" in
  universal-apple-darwin) NODE_ARCHS="arm64 x64" ;;
  aarch64-apple-darwin) NODE_ARCHS=arm64 ;;
  x86_64-apple-darwin) NODE_ARCHS=x64 ;;
  *) echo "The studio renderer is only packaged for macOS (host is $TRIPLE)" >&2; exit 1 ;;
esac
NODE_OUT="$ROOT/src-tauri/binaries/studio-node-$TRIPLE"
RUNTIME="$ROOT/src-tauri/studio-runtime"
CACHE="$ROOT/src-tauri/target/studio-node-$NODE_VERSION"

# ---- 1. Node ----
if [[ -x "$NODE_OUT" && "$(cat "$NODE_OUT.version" 2>/dev/null)" == "$NODE_VERSION" ]]; then
  echo "studio-node $NODE_VERSION already in place"
else
  mkdir -p "$CACHE" "$(dirname "$NODE_OUT")"
  NODES=()
  for arch in $NODE_ARCHS; do
    NAME="node-$NODE_VERSION-darwin-$arch"
    if [[ ! -f "$CACHE/$NAME.tar.gz" ]]; then
      curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/$NAME.tar.gz" -o "$CACHE/$NAME.tar.gz.part"
      curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt" -o "$CACHE/SHASUMS256.txt"
      expected="$(awk -v f="$NAME.tar.gz" '$2 == f { print $1 }' "$CACHE/SHASUMS256.txt")"
      actual="$(shasum -a 256 "$CACHE/$NAME.tar.gz.part" | cut -d' ' -f1)"
      if [[ -z "$expected" || "$expected" != "$actual" ]]; then
        rm -f "$CACHE/$NAME.tar.gz.part"
        echo "Node $NODE_VERSION download doesn't match its published checksum" >&2
        exit 1
      fi
      mv "$CACHE/$NAME.tar.gz.part" "$CACHE/$NAME.tar.gz"
    fi
    tar xzf "$CACHE/$NAME.tar.gz" -C "$CACHE" "$NAME/bin/node"
    NODES+=("$CACHE/$NAME/bin/node")
  done
  if [[ ${#NODES[@]} -gt 1 ]]; then
    # The official binaries are signed per architecture; lipo keeps each slice's signature.
    lipo -create "${NODES[@]}" -output "$NODE_OUT"
  else
    cp "${NODES[0]}" "$NODE_OUT"
  fi
  chmod +x "$NODE_OUT"
  echo "$NODE_VERSION" > "$NODE_OUT.version"
  echo "copied Node $NODE_VERSION ($NODE_ARCHS) to $NODE_OUT"
fi

if [[ "${1:-}" == "--dev" ]]; then
  # Tauri checks the resources path exists even in development.
  if [[ ! -d "$RUNTIME" ]]; then
    mkdir -p "$RUNTIME"
    echo "Filled by scripts/build-studio-renderer.sh for release builds." > "$RUNTIME/README.txt"
  fi
  exit 0
fi

# ---- 2. Runtime: render.mjs, prebuilt scenes, @remotion/renderer ----
# Rebuilt when the renderer, the scenes (and the app files the transparent timeline bundles) or a
# pinned version changes.
STAMP="$(
  {
    echo "$NODE_VERSION $REMOTION_VERSION $REACT_VERSION ${APPLE_SIGNING_IDENTITY:-}"
    cat "$ROOT/studio-renderer/render.mjs"
    find "$ROOT/studio-renderer/entry" "$ROOT/src/studio/scenes" -type f | LC_ALL=C sort | xargs cat
    cat "$ROOT/src/studio/TransparentTimeline.tsx" "$ROOT/src/studio/fxStyle.ts" "$ROOT/src/editor/model.ts"
  } | shasum -a 256 | cut -d' ' -f1
)"
if [[ -f "$RUNTIME/bundle/index.html" && "$(cat "$RUNTIME/.stamp" 2>/dev/null)" == "$STAMP" ]]; then
  echo "studio renderer runtime already built"
  exit 0
fi

STAGE="$ROOT/src-tauri/target/studio-runtime-stage"
rm -rf "$STAGE"
mkdir -p "$STAGE"

# The development renderer has @remotion/bundler; it bundles against the app's own remotion and
# react, exactly as the preview runs them.
if [[ ! -d "$ROOT/studio-renderer/node_modules/@remotion/bundler" ]]; then
  (cd "$ROOT/studio-renderer" && npm ci --no-audit --no-fund > /dev/null)
fi
node "$ROOT/studio-renderer/render.mjs" --build-bundle "$STAGE/bundle"
# Keep the source maps: renderMedia reads bundle.js.map from a local serve folder.
cp "$ROOT/studio-renderer/render.mjs" "$STAGE/render.mjs"

cat > "$STAGE/package.json" <<JSON
{
  "name": "capturita-studio-runtime",
  "private": true,
  "type": "module",
  "dependencies": {
    "@remotion/renderer": "$REMOTION_VERSION",
    "remotion": "$REMOTION_VERSION",
    "react": "$REACT_VERSION",
    "react-dom": "$REACT_VERSION"
  }
}
JSON
(cd "$STAGE" && npm install --omit=dev --no-audit --no-fund --ignore-scripts --os=darwin --cpu="${NODE_ARCHS%% *}" > /dev/null)

# Both Mac compositors, whichever this machine is, so the same runtime works on Intel and Apple silicon.
for arch in arm64 x64; do
  dir="$STAGE/node_modules/@remotion/compositor-darwin-$arch"
  if [[ ! -d "$dir" ]]; then
    tgz="$(cd "$STAGE" && npm pack "@remotion/compositor-darwin-$arch@$REMOTION_VERSION" --silent)"
    mkdir -p "$dir"
    tar xzf "$STAGE/$tgz" -C "$dir" --strip-components 1
    rm "$STAGE/$tgz"
  fi
done
# Nothing else in the bundle may point outside it.
rm -rf "$STAGE/node_modules/.bin"

# The compositor's ffmpeg tools load their dylibs by bare name ("libavcodec.dylib"), which the
# hardened runtime refuses. Point them at @loader_path (the same folder), then sign everything
# again: with a Developer ID (hardened runtime, timestamp) for notarized releases, another
# identity without the hardened runtime, or ad hoc,
# because changing load commands invalidates the shipped signatures.
IDENTITY="${APPLE_SIGNING_IDENTITY:-}"
while IFS= read -r -d '' file; do
  file -b "$file" | grep -q 'Mach-O' || continue
  otool -L "$file" | tail -n +2 | awk '{ print $1 }' | grep -v '^[/@]' | while read -r lib; do
    install_name_tool -change "$lib" "@loader_path/$lib" "$file" 2> /dev/null
  done
  case "$file" in *.dylib) install_name_tool -id "@loader_path/$(basename "$file")" "$file" 2> /dev/null ;; esac
  if [[ "$IDENTITY" == "Developer ID Application"* ]]; then
    codesign --force --options runtime --timestamp --sign "$IDENTITY" "$file" 2> /dev/null
  elif [[ -n "$IDENTITY" && "$IDENTITY" != "-" ]]; then
    # A self-signed identity has no Team ID, so the hardened runtime's library validation would
    # refuse the dylibs. Only notarization needs the hardened runtime.
    codesign --force --sign "$IDENTITY" "$file" 2> /dev/null
  else
    codesign --force --sign - "$file" 2> /dev/null
  fi
done < <(find "$STAGE/node_modules" -type f \( -path '*compositor-darwin*' -o -name '*.node' -o -name '*.dylib' \) -print0)
echo "relinked and signed the compositor binaries (${IDENTITY:-ad hoc})"

echo "$STAMP" > "$STAGE/.stamp"
rm -rf "$RUNTIME"
mv "$STAGE" "$RUNTIME"
echo "studio renderer runtime: $(du -sh "$RUNTIME" | cut -f1) (prebuilt scenes $(du -sh "$RUNTIME/bundle" | cut -f1)), Node: $(du -sh "$NODE_OUT" | cut -f1)"
