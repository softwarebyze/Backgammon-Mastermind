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

adb shell screenrecord --time-limit 300 /sdcard/e2e-recording.mp4 &
RECORD_PID=$!

MAESTRO_EXIT=0
maestro test "${WORKSPACE}/.maestro/app/backgammon-smoke.yaml" \
  -e "APP_ID=${APP_ID}" \
  --format junit \
  --output "${WORKSPACE}/report.xml" \
  --test-output-dir "$MAESTRO_OUT" \
  --debug-output "$MAESTRO_OUT" \
  --flatten-debug-output \
  || MAESTRO_EXIT=$?

adb shell pkill -2 screenrecord 2>/dev/null || true
sleep 2
adb pull /sdcard/e2e-recording.mp4 "${WORKSPACE}/e2e-recording.mp4" 2>/dev/null || true

exit "$MAESTRO_EXIT"
