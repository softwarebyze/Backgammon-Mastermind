#!/usr/bin/env bash
# Cold-start the app RUNS times on the CI emulator and record, per launch:
#   firstFrameMs — `am start -W` TotalTime (native splash's first frame)
#   readyMs      — ActivityTaskManager START → JS startup marker in logcat
#                  (src/lib/perf/startup-marker.ts; logged when the splash hides)
#   pssKb        — `dumpsys meminfo` TOTAL PSS a moment after ready
# Output: $WORKSPACE/.perf-output/startup-runs.jsonl (one JSON object per run).
#
# Invoked as one script line from reactivecircus/android-emulator-runner.
set -eu

WORKSPACE="${1:?workspace root required}"
APP_ID="${2:?application id required}"
RUNS="${3:-10}"
APK="${WORKSPACE}/android-test.apk"
OUT="${WORKSPACE}/.perf-output"
RUNS_FILE="${OUT}/startup-runs.jsonl"
# Keep in sync with STARTUP_READY_MARKER in src/lib/perf/startup-marker.ts.
STARTUP_MARKER='BGM_PERF startup-ready'
READY_TIMEOUT_S=45

mkdir -p "$OUT"
: > "$RUNS_FILE"

adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done
adb install -r "$APK"

ACTIVITY="$(adb shell cmd package resolve-activity --brief "$APP_ID" | tr -d '\r' | tail -n 1)"
echo "Launch activity: $ACTIVITY"

json_or_null() {
  if [ -n "${1:-}" ]; then printf '%s' "$1"; else printf 'null'; fi
}

# Cold launch once; prints "firstFrameMs|readyMs|pssKb" (blank fields if missing).
cold_launch() {
  adb shell am force-stop "$APP_ID"
  # Let the process fully die and the system settle so runs are comparable.
  sleep 2
  adb logcat -c
  local am_out first_frame log start_ts ready_ts ready_ms pss waited
  am_out="$(adb shell am start -W -n "$ACTIVITY" | tr -d '\r')"
  first_frame="$(printf '%s\n' "$am_out" | sed -n 's/^TotalTime: *\([0-9]*\).*/\1/p' | head -n 1)"

  log=""
  waited=0
  while [ "$waited" -lt $((READY_TIMEOUT_S * 4)) ]; do
    log="$(adb logcat -d -v epoch | tr -d '\r')"
    if printf '%s\n' "$log" | grep -qF "$STARTUP_MARKER"; then break; fi
    sleep 0.25
    waited=$((waited + 1))
  done

  start_ts="$(printf '%s\n' "$log" | grep 'ActivityTaskManager: START u0' | grep -F "$APP_ID" | head -n 1 | awk '{print $1}')"
  ready_ts="$(printf '%s\n' "$log" | grep -F "$STARTUP_MARKER" | head -n 1 | awk '{print $1}')"
  ready_ms=""
  if [ -n "$start_ts" ] && [ -n "$ready_ts" ]; then
    ready_ms="$(awk -v a="$start_ts" -v b="$ready_ts" 'BEGIN { printf "%d", (b - a) * 1000 }')"
  else
    echo "::warning::startup marker not seen within ${READY_TIMEOUT_S}s (start=${start_ts:-none})" >&2
  fi

  pss=""
  if [ -n "$ready_ms" ]; then
    sleep 3
    pss="$(adb shell dumpsys meminfo "$APP_ID" | tr -d '\r' | sed -n 's/.*TOTAL PSS: *\([0-9][0-9]*\).*/\1/p' | head -n 1)"
  fi
  echo "${first_frame:-}|${ready_ms:-}|${pss:-}"
}

# Warm-up: the first launch after install pays one-off costs (dexopt, first
# MMKV/storage init, font cache) that real users only see once. Discard it.
echo "Warm-up launch (discarded): $(cold_launch)"

for run in $(seq 1 "$RUNS"); do
  IFS='|' read -r first_frame ready_ms pss <<EOF
$(cold_launch)
EOF
  echo "Run ${run}: firstFrame=${first_frame:-?}ms ready=${ready_ms:-?}ms pss=${pss:-?}KB"
  printf '{"run":%s,"firstFrameMs":%s,"readyMs":%s,"pssKb":%s}\n' \
    "$run" "$(json_or_null "${first_frame:-}")" "$(json_or_null "${ready_ms:-}")" "$(json_or_null "${pss:-}")" >> "$RUNS_FILE"
done

adb shell am force-stop "$APP_ID"
