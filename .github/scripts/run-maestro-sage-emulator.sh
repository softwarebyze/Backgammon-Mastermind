#!/usr/bin/env bash
# Runs the Sage engine Maestro flow on the emulator (mirrors
# run-maestro-e2e-emulator.sh but targets .maestro/app/sage-engine.yaml).
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

# Clear logcat so the dump below covers only this run. The Sage Lab screen
# logs [SageLab] markers (run pressed / result / error) to ReactNativeJS.
adb logcat -c

adb shell screenrecord --time-limit 300 /sdcard/sage-recording.mp4 &
RECORD_PID=$!

MAESTRO_EXIT=0
maestro test "${WORKSPACE}/.maestro/app/sage-engine.yaml" \
  -e "APP_ID=${APP_ID}" \
  --format junit \
  --output "${WORKSPACE}/report.xml" \
  --test-output-dir "$MAESTRO_OUT" \
  --debug-output "$MAESTRO_OUT" \
  --flatten-debug-output \
  || MAESTRO_EXIT=$?

adb shell pkill -2 screenrecord 2>/dev/null || true
sleep 2
adb pull /sdcard/sage-recording.mp4 "${WORKSPACE}/e2e-recording.mp4" 2>/dev/null || true
adb logcat -d -v brief > "${MAESTRO_OUT}/logcat.txt" 2>/dev/null || true

exit "$MAESTRO_EXIT"
