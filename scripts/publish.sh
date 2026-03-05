#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GENERATED_FILES=(
  "agents/AGENTS.md"
  "README.md"
  ".cursor-plugin/plugin.json"
  ".cursor-plugin/marketplace.json"
  ".mcp.json"
)

file_sig() {
  local path="$1"
  if [[ -f "$path" ]]; then
    shasum -a 256 "$path" 2>/dev/null | awk '{print $1}' || sha256sum "$path" | awk '{print $1}'
  else
    echo "__MISSING__"
  fi
}

run_generate() {
  uv run scripts/generate_agents.py
  uv run scripts/generate_cursor_plugin.py
}

run_check() {
  local before_sigs=""
  local changed=()

  for path in "${GENERATED_FILES[@]}"; do
    before_sigs="${before_sigs}${path}=$(file_sig "$path")"$'\n'
  done

  run_generate

  for path in "${GENERATED_FILES[@]}"; do
    local before_sig
    before_sig=$(echo "$before_sigs" | grep "^${path}=" | cut -d= -f2)
    local after_sig
    after_sig=$(file_sig "$path")
    if [[ "$before_sig" != "$after_sig" ]]; then
      changed+=("$path")
    fi
  done

  if [[ ${#changed[@]} -gt 0 ]]; then
    echo "Generated artifacts are outdated."
    echo "Run: ./scripts/publish.sh"
    echo
    echo "Changed files:"
    for path in "${changed[@]}"; do
      echo "  $path"
    done
    exit 1
  fi

  # Extra explicit check for cursor-only artifacts
  uv run scripts/generate_cursor_plugin.py --check

  echo "All generated artifacts are up to date."
}

case "${1:-}" in
  "")
    run_generate
    echo "Publish artifacts generated successfully."
    ;;
  "--check")
    run_check
    ;;
  "-h"|"--help")
    cat <<'EOF'
Usage:
  ./scripts/publish.sh         Generate all publish artifacts
  ./scripts/publish.sh --check Verify generated artifacts are up to date

This script regenerates:
  - agents/AGENTS.md
  - README.md (skills table section)
  - .cursor-plugin/plugin.json
  - .cursor-plugin/marketplace.json
  - .mcp.json
EOF
    ;;
  *)
    echo "Unknown option: $1" >&2
    echo "Use --help for usage." >&2
    exit 2
    ;;
esac
