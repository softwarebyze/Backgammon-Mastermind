#!/usr/bin/env bash
# Patches android/gradle.properties after expo prebuild for GitHub Actions E2E.
# - Fixes missing trailing newline (prebuild can glue the next append onto inlineModules)
# - Builds only x86_64 (GitHub emulator ABI; ~4x faster than all ABIs)
# - Adds Gradle JVM/parallel settings for CI

set -euo pipefail

GRADLE_PROPS="${1:-android/gradle.properties}"

if [[ ! -f "$GRADLE_PROPS" ]]; then
  echo "Missing $GRADLE_PROPS — run expo prebuild first"
  exit 1
fi

# Ensure the file ends with a newline (expo prebuild often omits it on the last line).
if [[ -s "$GRADLE_PROPS" ]] && [[ -n "$(tail -c1 "$GRADLE_PROPS" | tr -d '\n')" ]]; then
  printf '\n' >>"$GRADLE_PROPS"
fi

# Repair a prior bad append: expo.inlineModules...[]org.gradle.jvmargs=...
if grep -q 'expo.inlineModules.watchedDirectories=\[\]org\.gradle' "$GRADLE_PROPS"; then
  sed -i 's/expo\.inlineModules\.watchedDirectories=\[\]org\.gradle/expo.inlineModules.watchedDirectories=[]\norg.gradle/' "$GRADLE_PROPS"
fi

if grep -q '^reactNativeArchitectures=' "$GRADLE_PROPS"; then
  sed -i 's/^reactNativeArchitectures=.*/reactNativeArchitectures=x86_64/' "$GRADLE_PROPS"
else
  printf '\nreactNativeArchitectures=x86_64\n' >>"$GRADLE_PROPS"
fi

append_if_missing() {
  local key="$1"
  local value="$2"
  if ! grep -q "^${key}=" "$GRADLE_PROPS"; then
    echo "${key}=${value}" >>"$GRADLE_PROPS"
  fi
}

if grep -q '^org.gradle.jvmargs=' "$GRADLE_PROPS"; then
  sed -i 's/^org.gradle.jvmargs=.*/org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC -Dfile.encoding=UTF-8/' "$GRADLE_PROPS"
else
  echo 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+UseParallelGC -Dfile.encoding=UTF-8' >>"$GRADLE_PROPS"
fi

append_if_missing org.gradle.daemon 'false'
append_if_missing org.gradle.parallel 'true'
append_if_missing org.gradle.caching 'true'

echo "CI Gradle properties:"
tail -8 "$GRADLE_PROPS"
