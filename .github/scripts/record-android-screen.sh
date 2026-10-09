#!/usr/bin/env bash
# Rotate Android's limited-length recordings until the caller signals completion.
set -eu
OUTPUT="${1:?output directory required}/recordings"
STOP="${2:?stop signal path required}"
mkdir -p "$OUTPUT"
: > "$OUTPUT/concat.txt"
segment=0
failures=0
while [[ ! -f "$STOP" ]]; do
  segment=$((segment + 1))
  name=$(printf 'segment-%04d.mp4' "$segment")
  remote="/sdcard/$name"
  # A SIGINT at suite completion finishes the MP4 even if adb reports failure.
  adb shell screenrecord --time-limit 300 "$remote" || true
  collected=0
  for attempt in 1 2 3; do
    if adb pull "$remote" "$OUTPUT/$name" && [[ -s "$OUTPUT/$name" ]]; then
      collected=1
      break
    fi
    sleep "$attempt"
  done
  if [[ "$collected" -eq 1 ]]; then
    failures=0
    printf "file '%s'\n" "$name" >> "$OUTPUT/concat.txt"
    adb shell rm -f "$remote" || true
  else
    failures=$((failures + 1))
    rm -f "$OUTPUT/$name"
    echo "::warning::Could not collect recording $name after 3 attempts"
    # Keep recording later segments unless the device is gone or pulls keep failing.
    if ! adb get-state >/dev/null 2>&1 || [[ "$failures" -ge 3 ]]; then
      echo "::warning::Stopping recording collection after $name"
      break
    fi
  fi
done
