#!/usr/bin/env bash
# Build the preview app with its embedded bundle and no development runtime.
set -euo pipefail
WORKSPACE="${1:?workspace root required}"
cd "$WORKSPACE/android"
chmod +x ./gradlew
./gradlew assembleRelease --no-daemon --build-cache --stacktrace
cp app/build/outputs/apk/release/app-release.apk "$WORKSPACE/android-test.apk"
