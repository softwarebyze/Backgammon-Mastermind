#!/usr/bin/env bash
# android-emulator-runner runs each workflow script *line* in a fresh /bin/sh —
# use this file (one script line in the workflow) for multi-step Maestro smoke.
set -eu

WORKSPACE="${1:?workspace root required}"
APP_ID="${2:-com.backgammonmastermind.preview}"
MAESTRO_OUT="${WORKSPACE}/.maestro-ci-output"

mkdir -p "$MAESTRO_OUT"

adb wait-for-device
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb install -r "${WORKSPACE}/android-test.apk"

python3 "${WORKSPACE}/.github/scripts/held-drag-input-bridge.test.py"

RECORD_STOP="$MAESTRO_OUT/recording.stop"
rm -f "$RECORD_STOP"
bash "${WORKSPACE}/.github/scripts/record-android-screen.sh" "$MAESTRO_OUT" "$RECORD_STOP" &
RECORD_PID=$!

# Fixed-input localhost bridge is used only by the held-drag flow. No app hook.
python3 "${WORKSPACE}/.github/scripts/held-drag-input-bridge.py" > "$MAESTRO_OUT/held-drag-input-bridge.log" 2>&1 &
BRIDGE_PID=$!
trap 'touch "$RECORD_STOP"; kill "$BRIDGE_PID" 2>/dev/null || true' EXIT
BRIDGE_READY=0
for attempt in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:8099/ready > /dev/null; then
    BRIDGE_READY=1
    break
  fi
  sleep 1
done
if [[ "$BRIDGE_READY" != 1 ]]; then
  echo "::error::Held-drag input bridge did not start"
  touch "$RECORD_STOP"
  wait "$RECORD_PID" || true
  exit 1
fi

MAESTRO_EXIT=0
# Preserve every release regression flow.
maestro test \
  "${WORKSPACE}/.maestro/app/confirm-move.yaml" \
  "${WORKSPACE}/.maestro/app/backgammon-smoke.yaml" \
  "${WORKSPACE}/.maestro/app/android-back-closes-settings.yaml" \
  "${WORKSPACE}/.maestro/app/language-rtl-restart.yaml" \
  "${WORKSPACE}/.maestro/app/undo-redo.yaml" \
  "${WORKSPACE}/.maestro/app/settings-no-fast-mode.yaml" \
  "${WORKSPACE}/.maestro/app/fixed-pace-gameplay.yaml" \
  "${WORKSPACE}/.maestro/app/held-drag-auto-move.yaml" \
  "${WORKSPACE}/.maestro/app/game-settings-gear.yaml" \
  "${WORKSPACE}/.maestro/app/horseshoe-on-board.yaml" \
  "${WORKSPACE}/.maestro/app/auto-move-bear-off-bar.yaml" \
  "${WORKSPACE}/.maestro/app/auto-move-bear-off.yaml" \
  "${WORKSPACE}/.maestro/app/reduced-motion.yaml" \
  "${WORKSPACE}/.maestro/app/hebrew-undo-redo.yaml" \
  -e "APP_ID=${APP_ID}" \
  --format junit \
  --output "${WORKSPACE}/report.xml" \
  --test-output-dir "$MAESTRO_OUT" \
  --debug-output "$MAESTRO_OUT" \
  --flatten-debug-output \
  || MAESTRO_EXIT=$?

touch "$RECORD_STOP"
adb shell pkill -2 screenrecord 2>/dev/null || true
wait "$RECORD_PID" || echo "::warning::Recording segment collection failed"
# Each Android screenrecord ends after 300 seconds. Join all captured segments,
# retaining the individual files in the artifact if joining fails.
if [[ -s "$MAESTRO_OUT/recordings/concat.txt" ]]; then
  ffmpeg -y -f concat -safe 0 -i "$MAESTRO_OUT/recordings/concat.txt" \
    -c copy "${WORKSPACE}/e2e-recording.mp4" \
    || echo "::warning::Recording join failed; inspect recordings/ in the artifact"
fi

exit "$MAESTRO_EXIT"
