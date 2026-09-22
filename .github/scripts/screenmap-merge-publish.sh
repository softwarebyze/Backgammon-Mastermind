#!/usr/bin/env bash
# Fold per-platform Screenmap bundles and publish/comment once.
# Env: SCREENMAP_MODE=pr|baseline, GITHUB_REPOSITORY, GH_TOKEN,
#      PR_NUMBER + HEAD_SHA (pr), GITHUB_SHA (baseline), RUN_URL, VIEWER_URL
set -euo pipefail

MODE="${SCREENMAP_MODE:-pr}"
REPO="${GITHUB_REPOSITORY:?}"
VIEWER="${VIEWER_URL:-https://app.screenmap.dev}"
BRANCH="${SCREENMAPS_BRANCH:-screenmaps}"
RUN_URL="${RUN_URL:-}"
BUNDLES_DIR="${BUNDLES_DIR:-bundles}"
OUT="${OUT:-combined.scrmap}"

pick_bundle() {
  local dir="$1"
  find "$dir" -maxdepth 10 \( -name '*.diff.scrmap' -o -name '*.scrmap' \) 2>/dev/null \
    | head -1 || true
}

ios_bundle="$(pick_bundle "$BUNDLES_DIR/screenmap-ios")"
android_bundle="$(pick_bundle "$BUNDLES_DIR/screenmap-android")"

inputs=""
if [ -n "$ios_bundle" ]; then
  inputs="ios=$ios_bundle"
fi
if [ -n "$android_bundle" ]; then
  if [ -n "$inputs" ]; then
    inputs="$inputs,android=$android_bundle"
  else
    inputs="android=$android_bundle"
  fi
fi

if [ -z "$inputs" ]; then
  echo "No platform bundles to merge (capture skipped or failed)."
  if [ "$MODE" = "pr" ] && [ -n "${PR_NUMBER:-}" ]; then
    # PR capture jobs succeed with an empty bundle when there is no map on the
    # screenmaps branch yet (auto_baseline cannot dispatch until
    # screenmap-baseline.yml is on the default branch). Do not stamp "failed"
    # over that no-baseline comment.
    screenmap-ci status --state no-baseline --post \
      --repo "$REPO" --pr "$PR_NUMBER" \
      --repo-url "https://github.com/${REPO}" \
      --branch "$BRANCH" \
      ${RUN_URL:+--run-url "$RUN_URL"} || true
  fi
  exit 0
fi

echo "Merging --inputs $inputs"
screenmap-ci merge --inputs "$inputs" --out "$OUT"

if [ ! -f "$OUT" ]; then
  echo "merge produced no $OUT" >&2
  exit 1
fi

if [ "$MODE" = "pr" ]; then
  dest="pr-${PR_NUMBER}/${HEAD_SHA}.scrmap"
  files="$OUT=$dest"
  message="pr #${PR_NUMBER} @ ${HEAD_SHA} (ios+android merge)"
else
  sha="${GITHUB_SHA:?}"
  files="$OUT=main/${sha:0:7}.scrmap,$OUT=main/latest.scrmap"
  message="baseline @ $sha (ios+android merge)"
fi

echo "Publishing $files"
pub_json="$(screenmap-ci publish --repo "$REPO" --branch "$BRANCH" --files "$files" --message "$message")"
echo "$pub_json"

if [ "$MODE" != "pr" ]; then
  map_url="$(python3 -c "import json,sys; print(json.load(sys.stdin)['urls']['main/latest.scrmap'])" <<<"$pub_json")"
  echo "Baseline viewer: ${VIEWER}/?map=${map_url}"
  exit 0
fi

dest_key="pr-${PR_NUMBER}/${HEAD_SHA}.scrmap"
map_url="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d['urls'].get('$dest_key') or list(d['urls'].values())[0])" <<<"$pub_json")"
artifact_url="${RUN_URL}#artifacts"

summary=""
for candidate in \
  "$BUNDLES_DIR/screenmap-android/summary.json" \
  "$BUNDLES_DIR/screenmap-ios/summary.json" \
  .screenmap-ci/summary.json
do
  if [ -f "$candidate" ]; then
    summary="$candidate"
    break
  fi
done

if [ -n "$summary" ]; then
  screenmap-ci comment --summary "$summary" --post \
    --repo "$REPO" --pr "$PR_NUMBER" \
    --viewer "$VIEWER" \
    --artifact-url "$artifact_url" \
    --map-url "$map_url" || true
else
  echo "No summary.json — posting viewer link"
  python3 - "$REPO" "$PR_NUMBER" "$VIEWER" "$map_url" "$artifact_url" <<'PY'
import json, os, subprocess, sys, tempfile
repo, number, viewer, map_url, artifact_url = sys.argv[1:6]
body = (
    "<!-- screenmap-ci -->\n"
    "### 🗺️ screenmap · iOS + Android map\n\n"
    "Merged platform captures for this PR.\n\n"
    f"[Open screenmap viewer]({viewer}/?map={map_url})\n\n"
    f"<sub>[Download artifacts]({artifact_url})</sub>\n"
)
comments = json.loads(subprocess.check_output(
    ["gh", "api", f"repos/{repo}/issues/{number}/comments", "--paginate"],
    text=True,
))
mine = next((c for c in comments if isinstance(c.get("body"), str) and "screenmap-ci" in c["body"]), None)
with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as fh:
    json.dump({"body": body}, fh)
    path = fh.name
if mine:
    subprocess.check_call(["gh", "api", "-X", "PATCH", f"repos/{repo}/issues/comments/{mine['id']}", "--input", path])
else:
    subprocess.check_call(["gh", "api", "-X", "POST", f"repos/{repo}/issues/{number}/comments", "--input", path])
os.remove(path)
PY
fi

echo "Published merged map: $map_url"