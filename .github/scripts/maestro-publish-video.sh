#!/usr/bin/env bash
# Publish a stable download link for each Maestro recording. The artifact's
# index.html provides a video player; GitHub comment playback is not guaranteed.
# A publishing failure leaves the artifact fallback available.
set -euo pipefail

BUNDLE_DIR="${1:?bundle directory required}"
RECORDING="$BUNDLE_DIR/e2e-recording.mp4"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
RUN_ID="${GITHUB_RUN_ID:?GITHUB_RUN_ID required}"
URL_FILE="${MAESTRO_URL_FILE:-${GITHUB_WORKSPACE:-.}/.maestro-screenshot-urls.env}"
TAG="${MAESTRO_EVIDENCE_TAG:-e2e-evidence}"
SLUG="${MAESTRO_EVIDENCE_SLUG:-}"
ATTEMPT="${GITHUB_RUN_ATTEMPT:-1}"
ASSET="run-${RUN_ID}-attempt-${ATTEMPT}${SLUG:+-$SLUG}.mp4"

if [[ ! -f "$RECORDING" ]]; then
  echo "No recording at $RECORDING — skipping video publish."
  exit 0
fi
if [[ -z "${GITHUB_TOKEN:-}" ]] || ! command -v gh >/dev/null 2>&1; then
  echo "::warning::GitHub publishing unavailable — recording remains in the artifact."
  exit 0
fi
export GH_TOKEN="$GITHUB_TOKEN"

# gh's file#label syntax does not rename the uploaded file. Stage it outside
# the bundle under its actual asset name so the artifact has only one copy.
STAGING_DIR=$(mktemp -d)
trap 'rm -rf "$STAGING_DIR"' EXIT
if ! cp "$RECORDING" "$STAGING_DIR/$ASSET"; then
  echo "::warning::Could not stage recording — it remains in the artifact."
  exit 0
fi

echo "::group::Publish Maestro recording to release ${TAG}"
if ! gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  if ! gh release create "$TAG" --repo "$REPO" \
    --title "E2E evidence (rolling)" \
    --notes "Maestro recordings, named by run and attempt." \
    --prerelease --target "${GITHUB_SHA:-HEAD}" >/dev/null; then
    # Another run may have created the release at the same time.
    if ! gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
      echo "::endgroup::"
      echo "::warning::Could not create evidence release — recording remains in the artifact."
      exit 0
    fi
  fi
fi
if ! gh release upload "$TAG" "$STAGING_DIR/$ASSET" --repo "$REPO" --clobber; then
  echo "::endgroup::"
  echo "::warning::Could not upload recording — it remains in the artifact."
  exit 0
fi

# Use GitHub's returned asset URL rather than predicting a successful upload.
DOWNLOAD_URL=$(gh release view "$TAG" --repo "$REPO" --json assets \
  --jq ".assets[] | select(.name == \"${ASSET}\") | .url") || DOWNLOAD_URL=""
echo "::endgroup::"
if [[ -z "$DOWNLOAD_URL" ]]; then
  echo "::warning::Uploaded recording URL unavailable — use the artifact."
  exit 0
fi
printf 'MAESTRO_EVIDENCE_TAG=%s\nMAESTRO_VIDEO_URL=%s\n' "$TAG" "$DOWNLOAD_URL" >>"$URL_FILE"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'MAESTRO_VIDEO_URL=%s\n' "$DOWNLOAD_URL" >>"$GITHUB_ENV"
fi
echo "Published ${ASSET}."
