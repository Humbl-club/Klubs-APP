#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FUNCS_DIR="$ROOT_DIR/supabase/functions"

if [ ! -d "$FUNCS_DIR" ]; then
  echo "Functions directory not found: $FUNCS_DIR" >&2
  exit 1
fi

echo "Deploying Supabase Edge Functions from: $FUNCS_DIR"

cd "$ROOT_DIR"

DEPLOYED=()
FAILED=()

for fn in "$FUNCS_DIR"/*; do
  [ -d "$fn" ] || continue
  name="$(basename "$fn")"
  echo "\n=== Deploying: $name ==="
  if supabase functions deploy "$name"; then
    DEPLOYED+=("$name")
  else
    echo "Failed: $name" >&2
    FAILED+=("$name")
  fi
done

echo "\nDeployed: ${#DEPLOYED[@]}"
printf ' - %s\n' "${DEPLOYED[@]}"

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "\nFailed: ${#FAILED[@]}" >&2
  printf ' - %s\n' "${FAILED[@]}" >&2
  exit 2
fi

echo "\nAll functions processed."

