#!/usr/bin/env bash
# Publish the PR's test APK under a stable per-PR name, so a phone can install
# it from one link: no GitHub login, no zip. Each push replaces the asset.
# Then post (or update) one PR comment with the link. A publishing failure
# leaves the workflow artifact as the fallback.
set -euo pipefail

APK="${1:?apk path required}"
PR="${PR_NUMBER:-}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
TAG="${APK_RELEASE_TAG:-pr-test-builds}"
SHA="${HEAD_SHA:-${GITHUB_SHA:-}}"

if [[ -z "$PR" ]]; then
  echo "Not a pull request: skipping the per-PR APK link."
  exit 0
fi
if [[ ! -f "$APK" ]]; then
  echo "::warning::No APK at $APK: nothing to publish."
  exit 0
fi
if [[ -z "${GITHUB_TOKEN:-}" ]] || ! command -v gh >/dev/null 2>&1; then
  echo "::warning::GitHub publishing unavailable: the APK stays in the test-apk artifact."
  exit 0
fi
export GH_TOKEN="$GITHUB_TOKEN"

ASSET="pr-${PR}-preview.apk"
STAGING_DIR=$(mktemp -d)
trap 'rm -rf "$STAGING_DIR"' EXIT
cp "$APK" "$STAGING_DIR/$ASSET"

if ! gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  gh release create "$TAG" --repo "$REPO" \
    --title "PR test builds (rolling)" \
    --notes "Installable Android preview APKs, one per pull request, replaced on every push." \
    --prerelease --target "${GITHUB_SHA:-HEAD}" >/dev/null \
    || gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1 \
    || { echo "::warning::Could not create the $TAG release."; exit 0; }
fi
if ! gh release upload "$TAG" "$STAGING_DIR/$ASSET" --repo "$REPO" --clobber; then
  echo "::warning::Could not upload $ASSET: the APK stays in the test-apk artifact."
  exit 0
fi
URL=$(gh release view "$TAG" --repo "$REPO" --json assets \
  --jq ".assets[] | select(.name == \"${ASSET}\") | .url") || URL=""
if [[ -z "$URL" ]]; then
  echo "::warning::Uploaded $ASSET but could not read its URL."
  exit 0
fi
echo "APK: $URL"

MARKER='<!-- pr-android-apk -->'
BODY="${MARKER}
📱 **Install on Android:** [${ASSET}](${URL}) (preview app, built from \`${SHA:0:8}\`)

Open the link on the phone and allow installing from your browser. It installs next to the Play Store app, and this link always points at the newest build of this PR."
COMMENT_ID=$(gh api "repos/${REPO}/issues/${PR}/comments" --paginate \
  --jq ".[] | select(.body | startswith(\"${MARKER}\")) | .id" | head -1) || COMMENT_ID=""
if [[ -n "$COMMENT_ID" ]]; then
  gh api -X PATCH "repos/${REPO}/issues/comments/${COMMENT_ID}" -f body="$BODY" >/dev/null \
    || echo "::warning::Could not update the APK comment."
else
  gh api -X POST "repos/${REPO}/issues/${PR}/comments" -f body="$BODY" >/dev/null \
    || echo "::warning::Could not post the APK comment."
fi
