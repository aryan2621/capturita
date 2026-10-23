#!/usr/bin/env bash
# Builds llama.cpp's server as one self-contained binary (static, Metal shaders embedded) and
# puts it where Tauri bundles sidecars: src-tauri/binaries/llama-server-<target-triple>.
# Capturita runs it in the background for AI editing; nothing has to be installed separately.
# The triple is Tauri's build target (TAURI_ENV_TARGET_TRIPLE); for universal-apple-darwin both
# architectures are built separately and joined with lipo.
set -euo pipefail

VERSION="v0.5.0"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRIPLE="${TAURI_ENV_TARGET_TRIPLE:-$(rustc -vV | sed -n 's/^host: //p')}"
OUT="$ROOT/src-tauri/binaries/llama-server-$TRIPLE"
CACHE="$ROOT/src-tauri/target/llama.cpp-$VERSION"
# Tauri's universal build compiles each architecture and checks its sidecar by that triple too; the fat binary serves both.
per_arch() {
  if [[ "$TRIPLE" == universal-apple-darwin ]]; then
    for t in aarch64 x86_64; do cp "$OUT" "${OUT%universal-apple-darwin}$t-apple-darwin"; cp "$OUT.version" "${OUT%universal-apple-darwin}$t-apple-darwin.version"; done
  fi
}

if [[ -x "$OUT" && "$(cat "$OUT.version" 2>/dev/null)" == "$VERSION" ]]; then
  echo "llama-server $VERSION already built"
  per_arch
  exit 0
fi

# Check for the sources themselves, not just the folder: CI's Rust cache restores target/ with
# files it doesn't know about pruned, leaving an empty llama.cpp folder behind.
if [[ ! -f "$CACHE/CMakeLists.txt" ]]; then
  rm -rf "$CACHE"
  mkdir -p "$CACHE"
  curl -fsSL "https://github.com/ggml-org/llama.cpp/archive/refs/tags/$VERSION.tar.gz" | tar xz -C "$CACHE" --strip-components 1
fi

case "$TRIPLE" in
  universal-apple-darwin) ARCHS="arm64 x86_64" ;;
  x86_64-apple-darwin) ARCHS="x86_64" ;;
  *) ARCHS="arm64" ;;
esac
BINS=()
for arch in $ARCHS; do
  cmake -S "$CACHE" -B "$CACHE/build-$arch" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_OSX_ARCHITECTURES="$arch" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET=15.0 \
    -DBUILD_SHARED_LIBS=OFF \
    -DGGML_METAL=ON \
    -DGGML_METAL_EMBED_LIBRARY=ON \
    -DGGML_NATIVE=OFF \
    -DLLAMA_CURL=OFF \
    -DLLAMA_OPENSSL=OFF \
    -DGGML_BLAS=OFF \
    -DLLAMA_BUILD_TESTS=OFF \
    -DLLAMA_BUILD_EXAMPLES=OFF \
    -DLLAMA_BUILD_SERVER=ON > /dev/null
  cmake --build "$CACHE/build-$arch" --config Release --target llama-server -j "$(sysctl -n hw.ncpu)" > /dev/null
  BINS+=("$CACHE/build-$arch/bin/llama-server")
done

mkdir -p "$(dirname "$OUT")"
lipo -create "${BINS[@]}" -output "$OUT"
echo "$VERSION" > "$OUT.version"
per_arch
echo "built $OUT"
