#!/usr/bin/env bash
# Wire POSTHOG_CLI_* into EAS (all envs) + GitHub Actions + local .env
#
# Usage:
#   ./scripts/posthog-set-cli-secrets.sh              # paste phx_… when prompted
#   ./scripts/posthog-set-cli-secrets.sh 'phx_…'      # non-interactive
#   ./scripts/posthog-set-cli-secrets.sh --from-eas   # finish GH + .env from EAS
#
# Docs: docs/posthog.md
# UI guide: docs/posthog/create-personal-api-key-source-map-upload.png
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${POSTHOG_CLI_PROJECT_ID:-507969}"
CLI_HOST="${POSTHOG_CLI_HOST:-https://us.posthog.com}"
# One call can attach a var to every EAS environment (avoids the 6× slow loop).
EAS_ENVS=(--environment production --environment preview --environment development)

set_github() {
  local key="$1"
  if command -v gh >/dev/null 2>&1; then
    echo "→ GitHub Actions secret POSTHOG_CLI_API_KEY"
    printf '%s' "$key" | gh secret set POSTHOG_CLI_API_KEY
  else
    echo "gh not found — set Actions secret POSTHOG_CLI_API_KEY manually."
  fi
}

eas_q() {
  # Strip upgrade nags; keep real success/error lines. Preserve eas exit code.
  local out ec=0
  out="$(eas "$@" 2>&1)" || ec=$?
  printf '%s\n' "$out" | grep -vE 'eas-cli@|To upgrade|Proceeding with outdated|npm install -g eas-cli' || true
  return "$ec"
}

write_dotenv() {
  local key="$1"
  python3 - "$ROOT/.env" "$key" "$PROJECT_ID" "$CLI_HOST" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
key, project_id, host = sys.argv[2], sys.argv[3], sys.argv[4]
text = path.read_text() if path.exists() else ""
pairs = {
    "POSTHOG_CLI_API_KEY": key,
    "POSTHOG_CLI_PROJECT_ID": project_id,
    "POSTHOG_CLI_HOST": host,
}
for name, value in pairs.items():
    line = f"{name}={value}"
    if re.search(rf"^{re.escape(name)}=", text, flags=re.M):
        text = re.sub(rf"^{re.escape(name)}=.*$", line, text, flags=re.M)
    else:
        if text and not text.endswith("\n"):
            text += "\n"
        text += line + "\n"
path.write_text(text)
print(f"→ Wrote CLI vars to {path} (gitignored)")
PY
}

read_key_from_eas() {
  # Prefer production; fall back to preview/development.
  local env name
  for env in production preview development; do
    name="$(eas env:get "$env" --variable-name POSTHOG_CLI_API_KEY --format short --non-interactive 2>/dev/null \
      | sed -n 's/^POSTHOG_CLI_API_KEY=//p' | tr -d '\r')"
    if [[ "$name" == phx_* ]]; then
      printf '%s' "$name"
      return 0
    fi
  done
  return 1
}

FROM_EAS=0
KEY=""
case "${1:-}" in
  --from-eas) FROM_EAS=1 ;;
  "") ;;
  *) KEY="$1" ;;
esac

if [[ "$FROM_EAS" -eq 1 ]]; then
  echo "→ Reading POSTHOG_CLI_API_KEY from EAS (sensitive)…"
  KEY="$(read_key_from_eas)" || {
    echo "No POSTHOG_CLI_API_KEY on EAS yet. Create a personal key and re-run without --from-eas." >&2
    exit 1
  }
  set_github "$KEY"
  write_dotenv "$KEY"
  echo
  echo "Done (synced GH + .env from EAS). Native rebuild still required for plugin/symbols."
  exit 0
fi

if [[ -z "$KEY" ]]; then
  cat <<EOF
Paste the PostHog personal API key (phx_…), then Enter.
Create it at: https://us.posthog.com/settings/user-api-keys
UI: docs/posthog/create-personal-api-key-source-map-upload.png
  • Label: "<App> source maps"
  • Scopes preset: Source map upload
  • Then scroll the resource list and set Read/Write (or Read) for:
      feature_flag, query, annotation  (needed for Expo PostHog workflow recipes)
EOF
  # -s hides echo; Ctrl-C is clean with set -e
  IFS= read -r -s KEY || true
  echo
fi

if [[ ! "$KEY" =~ ^phx_ ]]; then
  echo "Expected a personal API key starting with phx_. Got: ${KEY:0:6}…" >&2
  exit 1
fi

echo "→ EAS: POSTHOG_CLI_API_KEY (sensitive) → production+preview+development [1/3]"
eas_q env:create \
  --name POSTHOG_CLI_API_KEY \
  --value "$KEY" \
  --visibility sensitive \
  --force \
  --non-interactive \
  "${EAS_ENVS[@]}"
echo "   ok"

echo "→ EAS: POSTHOG_CLI_PROJECT_ID=$PROJECT_ID [2/3]"
eas_q env:create \
  --name POSTHOG_CLI_PROJECT_ID \
  --value "$PROJECT_ID" \
  --visibility plaintext \
  --force \
  --non-interactive \
  "${EAS_ENVS[@]}"
echo "   ok"

echo "→ EAS: POSTHOG_CLI_HOST=$CLI_HOST [3/3]"
eas_q env:create \
  --name POSTHOG_CLI_HOST \
  --value "$CLI_HOST" \
  --visibility plaintext \
  --force \
  --non-interactive \
  "${EAS_ENVS[@]}"
echo "   ok"

set_github "$KEY"
write_dotenv "$KEY"

echo
echo "Done. Next:"
echo "  1. Rebuild a native binary (plugin + symbol upload hooks):"
echo "       pnpm build:development:ios   # or :android / preview / production"
echo "  2. After a build, check symbol sets:"
echo "       https://us.posthog.com/project/${PROJECT_ID}/error_tracking"
echo "  3. Never commit .env or paste phx_ keys into chat/PRs"
echo "  4. If this script was interrupted mid-way: ./scripts/posthog-set-cli-secrets.sh --from-eas"
