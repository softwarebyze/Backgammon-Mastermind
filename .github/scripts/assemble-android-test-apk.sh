#!/usr/bin/env bash
# Build the preview app with its embedded bundle and no development runtime.
set -euo pipefail
WORKSPACE="${1:?workspace root required}"
cd "$WORKSPACE/android"
chmod +x ./gradlew
# PostHog source-map and native-symbol uploads fail closed on an empty
# POSTHOG_CLI_API_KEY, and CI has none for this throwaway test APK. Disable
# upload tasks from this build only; EAS store builds are untouched.
posthog_key="${POSTHOG_CLI_API_KEY:-}"
if [[ -z "$posthog_key" && -f "$WORKSPACE/.env" ]]; then
  posthog_key="$(sed -n 's/^[[:space:]]*POSTHOG_CLI_API_KEY[[:space:]]*=//p' "$WORKSPACE/.env" | tail -n 1 | tr -d "\"' \r")"
fi
if [[ -z "$posthog_key" && -f app/build.gradle ]]; then
  echo "No POSTHOG_CLI_API_KEY: skipping PostHog uploads for this test APK"
  # Keep the production plugin and its R8 integration in the smoke build.
  # Only network uploads need credentials. Disable them after the task graph
  # is ready, because posthog.gradle enables its Hermes task at registration.
  if ! grep -q 'CI: disable PostHog uploads' app/build.gradle; then
    cat >> app/build.gradle <<'GRADLE'

// CI: disable PostHog uploads (test APK only)
gradle.taskGraph.whenReady { graph ->
    graph.allTasks.findAll { task ->
        def name = task.name.toLowerCase()
        name.contains('posthog') && name.contains('upload')
    }.each { task -> task.enabled = false }
}
GRADLE
  fi
fi
# Avoid a second Kotlin JVM inheriting the old 512 MiB metaspace ceiling.
./gradlew assembleRelease --no-daemon --build-cache --stacktrace --max-workers=2 \
  -Pkotlin.compiler.execution.strategy=in-process \
  '-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseParallelGC -Dfile.encoding=UTF-8' 
cp app/build/outputs/apk/release/app-release.apk "$WORKSPACE/android-test.apk"
