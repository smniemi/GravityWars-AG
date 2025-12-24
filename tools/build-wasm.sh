#!/usr/bin/env bash
# Helper script to compile the legacy GravityWars C code into WebAssembly.
# Requires a working Emscripten SDK (https://emscripten.org).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAMECODE_DIR="${GAMECODE_DIR:-"$ROOT_DIR/GameCode"}"
PUBLIC_DIR="${PUBLIC_DIR:-"$ROOT_DIR/web/public/native"}"
BUILD_DIR="${BUILD_DIR:-"$ROOT_DIR/.wasm-build"}"
EXPORTS_FILE="${EXPORTS_FILE:-"$ROOT_DIR/native/exports.json"}"

EMCC_BIN="${EMCC:-emcc}"
EMAR_BIN="${EMAR:-emar}"

mkdir -p "$PUBLIC_DIR" "$BUILD_DIR"

if [[ ! -d "$GAMECODE_DIR" ]]; then
  echo "[wasm] GameCode folder not found at $GAMECODE_DIR" >&2
  exit 1
fi

if ! command -v "$EMCC_BIN" >/dev/null 2>&1; then
  echo "[wasm] emcc not found. Did you source emsdk_env.sh?" >&2
  exit 1
fi

if [[ ! -f "$EXPORTS_FILE" ]]; then
  cat <<'EOF' >"$EXPORTS_FILE"
[
  "_main_init",
  "_main_end",
  "_control",
  "_animate"
]
EOF
  echo "[wasm] Created placeholder exports file at $EXPORTS_FILE"
fi

EXPORTS=$(tr -d '\n' <"$EXPORTS_FILE")

SOURCE_FILES=(
  animate.c
  blocks.c
  control.c
  GravityWars101.c
  hole.c
  init.c
  memory.c
  moveship.c
  score.c
  water.c
  wasm_shim.c
)

INCLUDE_FLAGS=(
  "-I$GAMECODE_DIR"
  "-I$ROOT_DIR/Classes"
  "-I$ROOT_DIR/AudioSupport"
)

echo "[wasm] Building static archive from GameCode sources..."
(
  cd "$GAMECODE_DIR"
  # Compile selected C files to bitcode
  for src in "${SOURCE_FILES[@]}"; do
    if [[ ! -f "$src" ]]; then
      echo "[wasm] Missing source file: $src" >&2
      exit 1
    fi
    "$EMCC_BIN" \
      -O2 \
      -sSTRICT=1 \
      "${INCLUDE_FLAGS[@]}" \
      -c "$src"
  done

  "$EMAR_BIN" crs "$BUILD_DIR/gravitywars.bc.a" ./*.o
  rm -f ./*.o
)

echo "[wasm] Linking WebAssembly module..."
"$EMCC_BIN" \
  "$BUILD_DIR/gravitywars.bc.a" \
  -O2 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS="$EXPORTS" \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","getValue","setValue","HEAPU8","HEAP32"]' \
  -s ASSERTIONS=1 \
  --preload-file "$ROOT_DIR/GameCode/data@/res/data" \
  --preload-file "$ROOT_DIR/GameCode/levels@/res/levels" \
  -o "$PUBLIC_DIR/gravitywars.js"

echo "[wasm] Writing manifest..."
cat >"$PUBLIC_DIR/gravitywars.json" <<JSON
{
  "exports": $EXPORTS,
  "generatedAt": "$(date -Iseconds)"
}
JSON

echo "[wasm] Done. Files available in $PUBLIC_DIR"

