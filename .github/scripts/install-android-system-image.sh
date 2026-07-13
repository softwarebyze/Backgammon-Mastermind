#!/usr/bin/env bash
# Pre-install the emulator system image with retries.
# Transient "Error on ZipFile unknown archive" from sdkmanager is a corrupt download;
# clearing SDK download caches between attempts avoids reusing the bad zip.
set -euo pipefail

API_LEVEL="${1:-34}"
TARGET="${2:-google_apis}"
ARCH="${3:-x86_64}"
PKG="system-images;android-${API_LEVEL};${TARGET};${ARCH}"

SDKROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$SDKROOT" ]]; then
  echo "ANDROID_HOME / ANDROID_SDK_ROOT is not set" >&2
  exit 1
fi

SDKMANAGER="$(find "$SDKROOT/cmdline-tools" -name sdkmanager -type f 2>/dev/null | head -n1 || true)"
if [[ -z "$SDKMANAGER" && -x "$SDKROOT/tools/bin/sdkmanager" ]]; then
  SDKMANAGER="$SDKROOT/tools/bin/sdkmanager"
fi
if [[ -z "$SDKMANAGER" ]]; then
  echo "sdkmanager not found under $SDKROOT" >&2
  exit 1
fi

clear_sdk_download_cache() {
  rm -rf \
    "$SDKROOT/.temp" \
    "$SDKROOT/temp" \
    "$SDKROOT/downloadIntermediates" \
    "$SDKROOT/.downloadIntermediates" \
    || true
}

for attempt in 1 2 3; do
  echo "Installing $PKG (attempt $attempt/3)..."
  clear_sdk_download_cache
  yes | "$SDKMANAGER" --licenses >/dev/null || true
  if "$SDKMANAGER" --install "$PKG"; then
    echo "System image ready: $PKG"
    exit 0
  fi
  echo "Install failed; clearing download cache and retrying..."
  sleep $((attempt * 10))
done

echo "Failed to install $PKG after 3 attempts" >&2
exit 1
