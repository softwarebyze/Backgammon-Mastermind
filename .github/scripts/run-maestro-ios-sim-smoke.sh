#!/usr/bin/env bash
# Runs the backgammon smoke flow (same flow as Android) on an iPhone and an
# iPad simulator and collects the takeScreenshot output per device.
#
# usage: run-maestro-ios-sim-smoke.sh <workspace> <path/to/App.app> [bundle id]
set -euo pipefail

WORKSPACE="${1:?workspace root required}"
APP_PATH="${2:?simulator .app path required}"
APP_ID="${3:-com.backgammonmastermind.preview}"
OUT_ROOT="${WORKSPACE}/maestro-ios-output"
FLOWS=("${WORKSPACE}/.maestro/app/backgammon-smoke.yaml")
# Optional explicit feature flow, run on both devices in the same report/video.
if (( $# > 3 )); then
  FLOWS+=("${@:4}")
fi

# Cold iOS CI simulators can take longer than Maestro's 120-second default
# to start XCTest. Keep this separate from app assertion timeouts.
export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-300000}"

mkdir -p "$OUT_ROOT"

# Newest available simulator whose name contains $1 ("iPhone" / "iPad").
pick_device() {
  xcrun simctl list devices available --json | python3 -c "
import json, re, sys
kind = sys.argv[1]
d = json.load(sys.stdin)['devices']
def ver(rt):
    return [int(x) for x in re.findall(r'\d+', rt.rsplit('iOS', 1)[-1])]
for rt in sorted((r for r in d if 'iOS' in r), key=ver, reverse=True):
    for dev in d[rt]:
        if dev['name'].startswith(kind):
            print(dev['udid'] + '\t' + dev['name'])
            sys.exit(0)
sys.exit('no available ' + kind + ' simulator')
" "$1"
}

STATUS=0
for kind in iPhone iPad; do
  line=$(pick_device "$kind")
  udid=${line%%$'\t'*}
  name=${line#*$'\t'}
  slug=$(echo "$kind" | tr '[:upper:]' '[:lower:]')
  out="$OUT_ROOT/$slug"
  mkdir -p "$out"
  echo "::group::Maestro smoke on $name ($udid)"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b
  xcrun simctl install "$udid" "$APP_PATH"

  # Keep startup failures reviewable even when the first assertion never passes.
  xcrun simctl spawn "$udid" log stream --level debug --style compact \
    --predicate 'process == "BackgammonMastermind"' > "$out/app.log" 2>&1 &
  log_pid=$!
  xcrun simctl io "$udid" recordVideo "$out/e2e-recording.mp4" > "$out/recording.log" 2>&1 &
  record_pid=$!
  # Coordinates are specific to the selected portrait phone/tablet layout.
  # Feature recordings must verify the actual fixture checker counts.
  if [[ "$kind" == "iPhone" ]]; then
    point8="32%,66%"; point6="59%,66%"; point5="66%,66%"
  else
    point8="44%,65%"; point6="58%,65%"; point5="64%,65%"
  fi
  rc=0
  maestro --device "$udid" test "${FLOWS[@]}" \
    -e "APP_ID=${APP_ID}" \
    -e "POINT_8=$point8" -e "POINT_6=$point6" -e "POINT_5=$point5" \
    --format junit \
    --output "$out/report.xml" \
    --test-output-dir "$out" \
    --debug-output "$out" \
    --flatten-debug-output \
    || rc=$?

  kill -INT "$record_pid" 2>/dev/null || true
  wait "$record_pid" 2>/dev/null || true
  kill "$log_pid" 2>/dev/null || true
  wait "$log_pid" 2>/dev/null || true

  # Fallback screenshot so a failed flow still shows where the app was.
  [ "$rc" -eq 0 ] || xcrun simctl io "$udid" screenshot "$out/failure-final-state.png" || true
  echo "$name" > "$out/device.txt"
  xcrun simctl shutdown "$udid" || true
  echo "::endgroup::"
  if [ "$rc" -ne 0 ]; then
    echo "::error::Maestro smoke failed on $name (exit $rc)"
    STATUS=1
  fi
done

echo "Screenshots:"
find "$OUT_ROOT" -name '*.png' | sort
exit "$STATUS"
