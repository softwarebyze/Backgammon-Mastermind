#!/usr/bin/env bash
# Restore a prebuilt iOS simulator .app for Screenmap CI.
# Preference order:
#   1) GitHub Release tag `screenmap-ios-devclient`
#   2) Latest successful `screenmap-ios-app.yml` artifact named `screenmap-ios-app`
# Writes have_app / app_path to $GITHUB_OUTPUT. Never fails the job when missing.
set -u

DEST="${RUNNER_TEMP:-/tmp}/screenmap-ios-app"
EXTRACT="$DEST/extracted"
mkdir -p "$DEST" "$EXTRACT"

out() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "$1" >> "$GITHUB_OUTPUT"
  fi
  echo "$1"
}

repo="${GITHUB_REPOSITORY:-}"
if [ -z "$repo" ]; then
  echo "GITHUB_REPOSITORY unset — skipping prebuilt iOS app"
  out "have_app=false"
  out "app_path="
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not available — skipping prebuilt iOS app"
  out "have_app=false"
  out "app_path="
  exit 0
fi

echo "Looking for release tag screenmap-ios-devclient…"
if gh release view screenmap-ios-devclient --repo "$repo" >/dev/null 2>&1; then
  gh release download screenmap-ios-devclient --repo "$repo" --dir "$DEST" --clobber \
    && echo "Downloaded release screenmap-ios-devclient" \
    || echo "Release download failed; trying workflow artifact"
else
  echo "No release screenmap-ios-devclient"
fi

if ! find "$DEST" -maxdepth 3 \( -iname '*.zip' -o -iname '*.tar.gz' -o -iname '*.tgz' -o -name '*.app' \) | grep -q .; then
  echo "Looking for workflow artifact screenmap-ios-app…"
  run_id="$(gh run list --repo "$repo" --workflow screenmap-ios-app.yml --status success --limit 1 --json databaseId --jq '.[0].databaseId // empty' 2>/dev/null || true)"
  if [ -n "$run_id" ]; then
    gh run download "$run_id" --repo "$repo" --name screenmap-ios-app --dir "$DEST" \
      && echo "Downloaded artifact from run $run_id" \
      || echo "Artifact download failed"
  else
    echo "No successful screenmap-ios-app workflow run"
  fi
fi

# Unpack archives (EAS --local often yields tar.gz; Zack zips the .app).
find "$DEST" -type f \( -iname '*.zip' \) -print0 2>/dev/null \
  | while IFS= read -r -d '' z; do
      unzip -o "$z" -d "$EXTRACT" >/dev/null 2>&1 || true
    done
find "$DEST" -type f \( -iname '*.tar.gz' -o -iname '*.tgz' \) -print0 2>/dev/null \
  | while IFS= read -r -d '' t; do
      tar -xzf "$t" -C "$EXTRACT" >/dev/null 2>&1 || true
    done

app="$(find "$DEST" "$EXTRACT" -type d -name '*.app' 2>/dev/null | head -1 || true)"

if [ -n "$app" ] && [ -d "$app" ]; then
  echo "Using prebuilt simulator app: $app"
  out "have_app=true"
  out "app_path=$app"
  exit 0
fi

echo "No prebuilt iOS .app found — Screenmap will fall back to EAS (development-simulator)."
out "have_app=false"
out "app_path="
exit 0
