#!/usr/bin/env bash
# Build an embedded Release APK by default, or a Metro Debug APK for Screenmap.
set -euo pipefail
WORKSPACE="${1:?workspace root required}"
VARIANT="${2:-release}"
case "$VARIANT" in
  release) TASK=assembleRelease ;;
  debug) TASK=assembleDebug ;;
  *) echo "Unsupported APK variant: $VARIANT" >&2; exit 1 ;;
esac
cd "$WORKSPACE/android"
chmod +x ./gradlew
# PostHog source-map and native-symbol uploads fail closed on an empty
# POSTHOG_CLI_API_KEY, and CI has none for this throwaway test APK. Drop the
# upload wiring from this build only; EAS store builds are untouched.
posthog_key="${POSTHOG_CLI_API_KEY:-}"
if [[ -z "$posthog_key" && -f "$WORKSPACE/.env" ]]; then
  posthog_key="$(sed -n 's/^[[:space:]]*POSTHOG_CLI_API_KEY[[:space:]]*=//p' "$WORKSPACE/.env" | tail -n 1 | tr -d "\"' \r")"
fi
if [[ -z "$posthog_key" && -f app/build.gradle ]]; then
  echo "No POSTHOG_CLI_API_KEY: skipping PostHog uploads for this test APK"
  # `-i.bak` works on both GNU and BSD sed; plain `-i -e` reads "-e" as the
  # backup suffix on macOS and fails.
  sed -i.bak -e '/posthog\.gradle/d' -e 's/uploadNativeSymbols = true/uploadNativeSymbols = false/' app/build.gradle
  rm -f app/build.gradle.bak
fi
# Avoid a second Kotlin JVM inheriting the old 512 MiB metaspace ceiling.
./gradlew "$TASK" --no-daemon --build-cache --stacktrace --max-workers=2 \
  -Pkotlin.compiler.execution.strategy=in-process \
  '-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseParallelGC -Dfile.encoding=UTF-8' 
cp "app/build/outputs/apk/$VARIANT/app-$VARIANT.apk" "$WORKSPACE/android-test.apk"
