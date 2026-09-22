#!/usr/bin/env bash
# Fetches the bgsage engine sources + production weights at a pinned commit
# into expo-bgsage/vendor/bgsage and expo-bgsage/assets/.
#
# The engine C++ tree is ALSO copied to expo-bgsage/ios/vendor/bgsage:
# CocoaPods resolves a podspec's source_files relative to the pod root
# (expo-bgsage/ios/), so the iOS build needs the sources underneath ios/.
# Android keeps using expo-bgsage/vendor/bgsage via CMakeLists.txt.
#
# Only the files the mobile build needs are checked out (sparse, blobless):
#   - cpp/include/bgbot/*.h and the 17 engine .cpp files
#   - the 21 unique production weight files (stage11 backgame_pair_phased)
#   - data/bearoff_1sided.db
set -euo pipefail

REF="${BGSAGE_REF:-d8325a4}"
REPO="${BGSAGE_REPO:-https://github.com/markbgsage/bgsage.git}"
VENDOR="expo-bgsage/vendor/bgsage"
ASSETS="expo-bgsage/assets"

rm -rf "$VENDOR" "$ASSETS"
mkdir -p "$ASSETS"

git clone --filter=blob:none --sparse "$REPO" "$VENDOR"
cd "$VENDOR"
# NOTE: do NOT shallow-fetch the SHA — GitHub rejects fetching arbitrary SHAs.
# A full (blobless) clone already contains the pinned commit's objects.
git sparse-checkout set --no-cone \
  cpp/include/bgbot/ \
  cpp/src/board.cpp \
  cpp/src/moves.cpp \
  cpp/src/strategy.cpp \
  cpp/src/pubeval.cpp \
  cpp/src/game.cpp \
  cpp/src/benchmark.cpp \
  cpp/src/encoding.cpp \
  cpp/src/neural_net.cpp \
  cpp/src/training.cpp \
  cpp/src/multipy.cpp \
  cpp/src/rollout.cpp \
  cpp/src/cube.cpp \
  cpp/src/cube_eval.cpp \
  cpp/src/match_equity.cpp \
  cpp/src/bearoff.cpp \
  cpp/src/cuda_nn_stub.cpp \
  cpp/src/mobile.cpp \
  models/sl_s9_purerace.weights.best \
  models/sl_s9_race_race.weights.best \
  models/sl_s9_race_att.weights.best \
  models/sl_s9_race_prim.weights.best \
  models/sl_s9_race_anch.weights.best \
  models/sl_s9_att_race.weights.best \
  models/sl_s9_att_att.weights.best \
  models/sl_s9_att_prim.weights.best \
  models/sl_s9_att_anch.weights.best \
  models/sl_s9_prim_race.weights.best \
  models/sl_s9_prim_att.weights.best \
  models/sl_s9_prim_anch.weights.best \
  models/sl_s9_anch_race.weights.best \
  models/sl_s9_anch_att.weights.best \
  models/sl_s11_bg_deep.weights.best \
  models/sl_s11_bg_middle.weights.best \
  models/sl_s11_bg_double.weights.best \
  models/sl_s11_bg_p3.weights.best \
  models/sl_s11_bg_containment.weights.best \
  models/sl_s11_bg_snake.weights.best \
  models/sl_s11_bg_massive.weights.best \
  data/bearoff_1sided.db
git checkout "$REF"
for f in models/*.weights.best data/bearoff_1sided.db; do
  cp "$f" "../../assets/$(basename "$f")"
done
cd - >/dev/null

# iOS copy of the engine C++ tree (see header comment). Only the cpp/
# subtree is needed: headers + sources. Weights stay in assets/ only.
IOS_VENDOR="expo-bgsage/ios/vendor/bgsage"
rm -rf "$IOS_VENDOR"
mkdir -p "$IOS_VENDOR"
cp -r "$VENDOR/cpp" "$IOS_VENDOR/cpp"

echo "vendor: $(find "$VENDOR" -type f | wc -l) files"
echo "assets: $(ls "$ASSETS" | wc -l) files, $(du -sh "$ASSETS" | cut -f1)"
# NOTE: strip wc's padding (BSD wc on macOS pads the count, GNU does not)
ASSET_COUNT="$(ls -1 "$ASSETS" | wc -l | tr -d '[:space:]')"
test "$ASSET_COUNT" = "22" || { echo "expected 22 asset files, found $ASSET_COUNT"; exit 1; }
