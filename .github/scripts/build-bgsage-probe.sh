#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SAGE_VENDOR="expo-bgsage/vendor/bgsage"
node expo-bgsage/patches/apply.mjs
SAGE_SOURCES=()
for source in board moves strategy pubeval game benchmark encoding neural_net training multipy rollout cube cube_eval bearoff cuda_nn_stub; do
  SAGE_SOURCES+=("$SAGE_VENDOR/cpp/src/$source.cpp")
done
SAGE_FLAGS=(-O3)
case "$(uname -m)" in x86_64) SAGE_FLAGS+=(-mavx2 -mfma);; esac
c++ -std=c++17 "${SAGE_FLAGS[@]}" -pthread \
  -DSAGE_MODEL_ROOT="\"$(pwd)/expo-bgsage/assets/\"" \
  -I "$SAGE_VENDOR/cpp/include" -I expo-bgsage/ios \
  "${SAGE_SOURCES[@]}" expo-bgsage/ios/BgsageAnalysis.cpp expo-bgsage/ios/BgsageMatchEquity.cpp expo-bgsage/wasm/shim.cpp expo-bgsage/wasm/native-probe.cpp \
  -o "${1:-/tmp/bgsage-context-probe}"
