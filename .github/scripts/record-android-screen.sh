#!/usr/bin/env bash
# Rotate Android's limited-length recordings until the caller signals completion.
set -eu
OUTPUT="${1:?output directory required}/recordings"
STOP="${2:?stop signal path required}"
mkdir -p "$OUTPUT"
: > "$OUTPUT/concat.txt"
segment=0
while [[ ! -f "$STOP" ]]; do
  segment=$((segment + 1))
  name=$(printf 'segment-%04d.mp4' "$segment")
  remote="/sdcard/$name"
  # A SIGINT at suite completion finishes the MP4 even if adb reports failure.
  adb shell screenrecord --time-limit 300 "$remote" || true
  if adb pull "$remote" "$OUTPUT/$name" && [[ -s "$OUTPUT/$name" ]]; then
    printf "file '%s'\n" "$name" >> "$OUTPUT/concat.txt"
    adb shell rm -f "$remote" || true
  else
    echo "::warning::Could not collect recording $name"
    break
  fi
done
