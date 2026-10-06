#!/usr/bin/env bash
# Build the preview app with its embedded bundle and no development runtime.
set -euo pipefail
WORKSPACE="${1:?workspace root required}"
cd "$WORKSPACE/android"
chmod +x ./gradlew
# Avoid a second Kotlin JVM inheriting the old 512 MiB metaspace ceiling.
./gradlew assembleRelease --no-daemon --build-cache --stacktrace --max-workers=2 \
  -Pkotlin.compiler.execution.strategy=in-process \
  '-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseParallelGC -Dfile.encoding=UTF-8' 
cp app/build/outputs/apk/release/app-release.apk "$WORKSPACE/android-test.apk"
