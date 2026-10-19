#!/usr/bin/env bash
# After expo prebuild (and after pod install when Pods exist). PostHog's
# Hermes source-map and dSYM uploads fail closed on an empty
# POSTHOG_CLI_API_KEY, and this CI simulator job has none. Soften those
# scripts so they exit after RN bundling / skip dSYM upload when the key
# is empty. EAS store builds inject the key and never run this script.
set -euo pipefail
WORKSPACE="${1:?workspace root required}"
cd "$WORKSPACE"

posthog_key="${POSTHOG_CLI_API_KEY:-}"
if [[ -z "$posthog_key" && -f .env ]]; then
  posthog_key="$(sed -n 's/^[[:space:]]*POSTHOG_CLI_API_KEY[[:space:]]*=//p' .env | tail -n 1 | tr -d "\"' \r")"
fi
if [[ -n "$posthog_key" ]]; then
  echo "POSTHOG_CLI_API_KEY is set — leaving PostHog upload wiring alone"
  exit 0
fi

MARKER='POSTHOG_CLI_API_KEY empty; skipping posthog-cli upload calls'
GUARD=$'if [[ -z "${POSTHOG_CLI_API_KEY:-}" ]]; then\n  echo "'"$MARKER"'.\"\n  exit 0\nfi\n'

patch_posthog_xcode() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  if grep -qF "$MARKER" "$file"; then
    return 0
  fi
  # Insert after the SKIP_BUNDLING early-exit block so RN bundling still
  # runs, then we leave before hermes clone.
  python3 - "$file" "$MARKER" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
marker = sys.argv[2]
text = path.read_text()
needle = 'SKIP_BUNDLING enabled; skipping posthog-cli upload calls.'
idx = text.find(needle)
if idx < 0:
    raise SystemExit(f'{path}: SKIP_BUNDLING block not found')
# End of that if-block: the first "fi" after the needle.
fi = text.find('\nfi', idx)
if fi < 0:
    raise SystemExit(f'{path}: closing fi not found')
insert_at = fi + len('\nfi')
guard = (
    '\n\n'
    'if [[ -z "${POSTHOG_CLI_API_KEY:-}" ]]; then\n'
    f'  echo "{marker}."\n'
    '  exit 0\n'
    'fi'
)
path.write_text(text[:insert_at] + guard + text[insert_at:])
print(f'Patched {path} to skip uploads when POSTHOG_CLI_API_KEY is empty')
PY
}

patch_upload_symbols() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  if grep -qF "$MARKER" "$file"; then
    return 0
  fi
  python3 - "$file" "$MARKER" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
marker = sys.argv[2]
text = path.read_text()
guard = (
    '#!/bin/bash\n'
    'if [[ -z "${POSTHOG_CLI_API_KEY:-}" ]]; then\n'
    f'  echo "{marker}."\n'
    '  exit 0\n'
    'fi\n'
)
body = text
if body.startswith('#!'):
    body = body.split('\n', 1)[1] if '\n' in body else ''
path.write_text(guard + body)
print(f'Patched {path} to skip uploads when POSTHOG_CLI_API_KEY is empty')
PY
}

echo "No POSTHOG_CLI_API_KEY: skipping PostHog uploads for this simulator build"
patch_posthog_xcode node_modules/posthog-react-native/tooling/posthog-xcode.sh
patch_upload_symbols ios/Pods/PostHog/build-tools/upload-symbols.sh
while IFS= read -r -d '' f; do
  patch_upload_symbols "$f"
done < <(find ios -path '*/posthog-ios/build-tools/upload-symbols.sh' -print0 2>/dev/null || true)
