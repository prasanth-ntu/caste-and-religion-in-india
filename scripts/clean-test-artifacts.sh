#!/usr/bin/env bash
# clean-test-artifacts.sh — voluntary cleanup of transient agent/Playwright artifacts.
#
# Run from repo root: ./scripts/clean-test-artifacts.sh
#
# Idempotent. Lists what it removes. Safe to run anytime.

set -euo pipefail

cd "$(dirname "$0")/.."

removed=0
remove_glob() {
  local pat="$1"
  # shellcheck disable=SC2086
  for f in $pat; do
    if [ -e "$f" ]; then
      echo "  removed: $f"
      rm -rf "$f"
      removed=$((removed + 1))
    fi
  done
}

shopt -s nullglob

echo "Cleaning transient test artifacts..."

remove_glob "verify-*.png"
remove_glob "verify-*.jpg"
remove_glob "verify-*.jpeg"
remove_glob "*-screenshot.png"
remove_glob "bug*-*.png"
remove_glob "test-*.png"
remove_glob "scratch-*"
remove_glob "tmp-*"
remove_glob ".playwright-mcp"

if [ "$removed" -eq 0 ]; then
  echo "  (nothing to clean)"
else
  echo "Done. Removed $removed item(s)."
fi
