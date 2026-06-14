#!/usr/bin/env bash
# Push Maestro screenshots to the maestro-screenshots branch for raw.githubusercontent.com URLs.
# GitHub job summaries and PR comments cannot use data: URIs — external HTTPS URLs are required.

set -euo pipefail

# Avoid macOS osxkeychain prompts ("x-access-token keychain not found") when using embedded tokens.
export GIT_TERMINAL_PROMPT=0

BUNDLE_DIR="${1:?bundle directory required}"
BRANCH="maestro-screenshots"
RUN_ID="${GITHUB_RUN_ID:?GITHUB_RUN_ID required}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN required}"
PR_NUMBER="${GITHUB_PR_NUMBER:-}"
URL_FILE="${MAESTRO_URL_FILE:-${GITHUB_WORKSPACE:-.}/.maestro-screenshot-urls.env}"

mapfile -t screenshots < <(
  find "$BUNDLE_DIR" -maxdepth 2 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) 2>/dev/null | sort
)

if ((${#screenshots[@]} == 0)); then
  echo "No screenshots to publish."
  exit 0
fi

write_urls() {
  local raw_base="https://raw.githubusercontent.com/${REPO}/${BRANCH}/runs/${RUN_ID}"
  {
    echo "MAESTRO_SCREENSHOT_BASE_URL=${raw_base}"
    if [[ -n "$PR_NUMBER" ]]; then
      echo "MAESTRO_PR_SCREENSHOT_BASE_URL=https://raw.githubusercontent.com/${REPO}/${BRANCH}/pr-${PR_NUMBER}"
    fi
  } >"$URL_FILE"
  if [[ -n "${GITHUB_ENV:-}" ]]; then
    cat "$URL_FILE" >>"$GITHUB_ENV"
  fi
}

push_once() {
  local workdir="$1"
  local auth_url="https://x-access-token:${TOKEN}@github.com/${REPO}.git"
  cd "$workdir"
  git init -q
  # Never use osxkeychain / store credentials — token is passed per-request below.
  git config credential.helper ""
  git config --local core.askPass ""
  git remote add origin "https://github.com/${REPO}.git"

  if git -c credential.helper= fetch "$auth_url" "refs/heads/${BRANCH}:refs/heads/${BRANCH}" 2>/dev/null; then
    git checkout "$BRANCH"
  else
    git checkout -B "$BRANCH"
  fi

  local run_dest="runs/${RUN_ID}"
  mkdir -p "$run_dest"
  for img in "${screenshots[@]}"; do
    cp -f "$img" "${run_dest}/$(basename "$img")"
  done

  if [[ -n "$PR_NUMBER" ]]; then
    local pr_dest="pr-${PR_NUMBER}"
    mkdir -p "$pr_dest"
    for img in "${screenshots[@]}"; do
      cp -f "$img" "${pr_dest}/$(basename "$img")"
    done
    git add "$run_dest" "$pr_dest"
  else
    git add "$run_dest"
  fi

  if git diff --staged --quiet; then
    echo "Screenshot files unchanged — skipping commit."
  else
    git -c user.name="github-actions[bot]" \
      -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit -m "Maestro screenshots run ${RUN_ID}"
  fi

  git -c credential.helper= push "$auth_url" "HEAD:refs/heads/${BRANCH}"
}

for attempt in 1 2 3; do
  workdir="$(mktemp -d)"
  if push_once "$workdir"; then
    rm -rf "$workdir"
    write_urls
    echo "Published ${#screenshots[@]} screenshot(s) to ${BRANCH} (run ${RUN_ID})."
    exit 0
  fi
  rm -rf "$workdir"
  echo "Push attempt ${attempt} failed — retrying..."
  sleep "$attempt"
done

echo "::warning::Could not push Maestro screenshots to ${BRANCH} — inline images will be omitted."
exit 0
