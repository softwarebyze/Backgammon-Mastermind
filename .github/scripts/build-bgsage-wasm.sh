#!/usr/bin/env bash
# Requires Emscripten 6.0.13 (emcc) and the source/assets fetched by preinstall.
# Build only when deliberately replacing the pinned web artifacts.
set -euo pipefail
cd "$(dirname "$0")/../.."
SAGE_VENDOR="expo-bgsage/vendor/bgsage"
node expo-bgsage/patches/apply.mjs
SAGE_SOURCES=()
for source in board moves strategy pubeval game benchmark encoding neural_net training multipy rollout cube cube_eval bearoff cuda_nn_stub; do
  SAGE_SOURCES+=("$SAGE_VENDOR/cpp/src/$source.cpp")
done
em++ -std=c++17 -O3 -g2 -msimd128 -fexceptions \
  -I "$SAGE_VENDOR/cpp/include" -I expo-bgsage/ios \
  "${SAGE_SOURCES[@]}" expo-bgsage/ios/BgsageAnalysis.cpp expo-bgsage/ios/BgsageMatchEquity.cpp expo-bgsage/wasm/shim.cpp \
  -sMODULARIZE=1 -sEXPORT_NAME=SageModule -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=67108864 -sENVIRONMENT=web,node \
  -sEXPORTED_FUNCTIONS='["_sage_create","_sage_analyze","_sage_checkers","_sage_cube","_sage_last_error","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["UTF8ToString","HEAP32"]' \
  --preload-file expo-bgsage/assets@/models \
  -o public/bgsage/bgsage.js

# Normalize the generator's final blank lines for clean, repeatable diffs.
node -e 'const fs=require("node:fs"); const p="public/bgsage/bgsage.js"; fs.writeFileSync(p,fs.readFileSync(p,"utf8").trimEnd()+"\n")'

chmod 644 public/bgsage/bgsage.js public/bgsage/bgsage.wasm public/bgsage/bgsage.data
