#!/usr/bin/env bash
# Build the preview app with its embedded bundle and no development runtime.
set -euo pipefail
WORKSPACE="${1:?workspace root required}"
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
# Maven Central occasionally 429s cold CI runners resolving the Kotlin plugin.
gradle_args=(
  assembleRelease --no-daemon --build-cache --stacktrace --max-workers=2
  -Pkotlin.compiler.execution.strategy=in-process
  '-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseParallelGC -Dfile.encoding=UTF-8'
)
log="$(mktemp)"
status=1
for attempt in 1 2 3; do
  set +e
  ./gradlew "${gradle_args[@]}" >"$log" 2>&1
  status=$?
  set -e
  cat "$log"
  if [[ "$status" -eq 0 ]]; then
    break
  fi
  if [[ "$attempt" -eq 3 ]] || ! grep -Eqi '429|Too Many Requests|Could not (GET|HEAD|get resource)' "$log"; then
    rm -f "$log"
    exit "$status"
  fi
  echo "::warning::Gradle assemble attempt ${attempt} hit a Maven rate limit; retrying..."
  sleep $((attempt * 20))
done
rm -f "$log"
if [[ "$status" -ne 0 ]]; then
  exit "$status"
fi
cp app/build/outputs/apk/release/app-release.apk "$WORKSPACE/android-test.apk"
