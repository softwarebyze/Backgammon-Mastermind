#!/usr/bin/env bash
# Builds a visual Maestro report for GitHub Actions job summary + PR comment.
# Expects artifacts under MAESTRO_OUTPUT_DIR (and optional e2e-recording.mp4 in workspace).

set -euo pipefail

WORKSPACE="${GITHUB_WORKSPACE:-.}"
OUTPUT_DIR="${MAESTRO_OUTPUT_DIR:-$WORKSPACE/.maestro-ci-output}"
REPORT_XML="${MAESTRO_JUNIT_REPORT:-$WORKSPACE/report.xml}"
RECORDING="$WORKSPACE/e2e-recording.mp4"
BUNDLE_DIR="$WORKSPACE/maestro-visual-bundle"
SUMMARY_FILE="${GITHUB_STEP_SUMMARY:-/dev/null}"
PR_COMMENT_FILE="$WORKSPACE/maestro-pr-comment.md"
RUN_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
SCREENSHOT_BASE_URL=""
PR_SCREENSHOT_BASE_URL=""

rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

status_emoji="✅"
status_text="passed"
if [[ -f "$REPORT_XML" ]] && grep -q 'failures="[1-9]' "$REPORT_XML" 2>/dev/null; then
  status_emoji="❌"
  status_text="failed"
elif [[ -f "$REPORT_XML" ]] && grep -q 'errors="[1-9]' "$REPORT_XML" 2>/dev/null; then
  status_emoji="❌"
  status_text="failed"
elif [[ ! -f "$REPORT_XML" ]]; then
  status_emoji="⚠️"
  status_text="unknown (no JUnit report)"
fi

copy_tree() {
  local src="$1"
  if [[ -d "$src" ]]; then
    cp -a "$src"/. "$BUNDLE_DIR/" 2>/dev/null || true
  fi
}

copy_tree "$OUTPUT_DIR"
# Fallback: default Maestro test output location on the runner
if [[ -d "$HOME/.maestro/tests" ]]; then
  find "$HOME/.maestro/tests" -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.mp4' -o -name '*.json' -o -name 'maestro.log' \) -print0 2>/dev/null \
    | while IFS= read -r -d '' file; do
      cp -a "$file" "$BUNDLE_DIR/" 2>/dev/null || true
    done
fi

[[ -f "$REPORT_XML" ]] && cp "$REPORT_XML" "$BUNDLE_DIR/report.xml"
[[ -f "$RECORDING" ]] && cp "$RECORDING" "$BUNDLE_DIR/e2e-recording.mp4"

mapfile -t screenshots < <(find "$BUNDLE_DIR" -maxdepth 2 -type f \( -iname '*.png' -o -iname '*.jpg' \) 2>/dev/null | sort)

# Publish screenshots for raw.githubusercontent.com URLs (data: URIs are blocked in summaries).
if ((${#screenshots[@]} > 0)) && [[ -n "${GITHUB_TOKEN:-}" ]]; then
  bash "$WORKSPACE/.github/scripts/maestro-publish-screenshots.sh" "$BUNDLE_DIR"
  URL_FILE="${MAESTRO_URL_FILE:-$WORKSPACE/.maestro-screenshot-urls.env}"
  if [[ -f "$URL_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$URL_FILE"
    SCREENSHOT_BASE_URL="${MAESTRO_SCREENSHOT_BASE_URL:-}"
    PR_SCREENSHOT_BASE_URL="${MAESTRO_PR_SCREENSHOT_BASE_URL:-}"
  fi
fi

# --- HTML bundle (open locally after downloading one artifact zip) ---
html_path="$BUNDLE_DIR/index.html"
{
  echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Maestro E2E</title>'
  echo '<style>body{font-family:system-ui,sans-serif;margin:1.5rem;background:#0f172a;color:#e2e8f0}'
  echo 'h1,h2{color:#f8fafc}img{max-width:min(420px,100%);border-radius:8px;margin:.5rem 0;border:1px solid #334155}'
  echo 'video{max-width:min(720px,100%);border-radius:8px}section{margin:1.5rem 0}</style></head><body>'
  echo "<h1>Maestro E2E — backgammon smoke</h1><p>Status: <strong>${status_emoji} ${status_text}</strong></p>"
  if [[ -f "$BUNDLE_DIR/e2e-recording.mp4" ]]; then
    echo '<section><h2>Screen recording</h2><video controls src="e2e-recording.mp4"></video></section>'
  fi
  if ((${#screenshots[@]} > 0)); then
    echo '<section><h2>Screenshots</h2>'
    for img in "${screenshots[@]}"; do
      base=$(basename "$img")
      echo "<figure><img src=\"${base}\" alt=\"${base}\"/><figcaption>${base}</figcaption></figure>"
    done
    echo '</section>'
  fi
  echo '</body></html>'
} >"$html_path"

# --- Job summary (inline images — no zip required) ---
{
  echo "## ${status_emoji} Maestro E2E — backgammon smoke"
  echo ""
  echo "**Result:** ${status_text}"
  echo ""
  echo "[Open full workflow run](${RUN_URL})"
  echo ""
  if [[ -f "$BUNDLE_DIR/e2e-recording.mp4" ]]; then
    echo "### Screen recording"
    echo "Download **e2e-recording.mp4** from the \`maestro-visual-report\` artifact (or watch in \`index.html\`)."
    echo ""
  fi
  if ((${#screenshots[@]} > 0)); then
    echo "### Screenshots"
    echo ""
    if [[ -z "$SCREENSHOT_BASE_URL" ]]; then
      echo "_Inline preview unavailable (screenshot publish failed). Download \`maestro-visual-report\` artifact or open \`index.html\`._"
      echo ""
    fi
    count=0
    for img in "${screenshots[@]}"; do
      ((count++)) || true
      if ((count > 8)); then
        echo "_(${#screenshots[@]} total — remaining in artifact bundle)_"
        break
      fi
      base=$(basename "$img")
      echo "<details open><summary>${base}</summary>"
      if [[ -n "$SCREENSHOT_BASE_URL" ]]; then
        echo ""
        echo "![${base}](${SCREENSHOT_BASE_URL}/${base})"
        echo ""
      fi
      echo "</details>"
      echo ""
    done
  else
    echo "_No screenshots found. Add \`takeScreenshot\` steps to the flow for step-by-step visuals._"
    echo ""
  fi
  echo "### Artifacts"
  echo "- \`maestro-visual-report\` — HTML gallery, recording, logs, JUnit"
  echo "- \`e2e_android_report\` — JUnit XML"
} >>"$SUMMARY_FILE"

# --- PR sticky comment (inline screenshots + links) ---
{
  echo "${status_emoji} **Maestro E2E (GitHub emulator)** — ${status_text}"
  echo ""
  echo "[Workflow run](${RUN_URL}) · [Summary tab](${RUN_URL}) · Artifact: \`maestro-visual-report\`"
  echo ""
  if ((${#screenshots[@]} > 0)); then
    comment_base="$PR_SCREENSHOT_BASE_URL"
    if [[ -z "$comment_base" ]]; then
      comment_base="$SCREENSHOT_BASE_URL"
    fi
    if [[ -n "$comment_base" ]]; then
      echo "### Screenshots"
      echo ""
      for img in "${screenshots[@]}"; do
        base=$(basename "$img")
        echo "**${base}**"
        echo ""
        echo "![${base}](${comment_base}/${base})"
        echo ""
      done
    else
      echo "**${#screenshots[@]} screenshot(s)** in the \`maestro-visual-report\` artifact (\`index.html\`)."
    fi
  fi
  if [[ -f "$BUNDLE_DIR/e2e-recording.mp4" ]]; then
    echo "Screen recording: \`e2e-recording.mp4\` in \`maestro-visual-report\`."
  fi
} >"$PR_COMMENT_FILE"

echo "Wrote $PR_COMMENT_FILE and updated job summary (${#screenshots[@]} screenshots)."
