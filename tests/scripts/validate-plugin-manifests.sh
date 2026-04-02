#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but was not found on PATH."
  exit 1
fi

json_files=(
  ".codex-plugin/plugin.json"
  ".cursor-plugin/plugin.json"
  ".claude-plugin/plugin.json"
  "mcp.json"
  ".agents/plugins/marketplace.json"
  "plugins/orq/.codex-plugin/plugin.json"
  "plugins/orq/mcp.json"
)

for file in "${json_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file"
    exit 1
  fi
  jq -e . "$file" >/dev/null
done

# Codex manifest should explicitly bundle skills + MCP.
jq -e '.name == "orq"' .codex-plugin/plugin.json >/dev/null
jq -e '.skills == "./skills/"' .codex-plugin/plugin.json >/dev/null
jq -e '.mcpServers == "./mcp.json"' .codex-plugin/plugin.json >/dev/null

# Cursor and Claude manifests should at least identify the plugin.
jq -e '.name == "orq"' .cursor-plugin/plugin.json >/dev/null
jq -e '.name == "orq"' .claude-plugin/plugin.json >/dev/null

# Ensure MCP config contains the expected server.
jq -e '.mcpServers["orq-workspace"].type == "http"' mcp.json >/dev/null
jq -e '.mcpServers["orq-workspace"].url == "https://my.orq.ai/v2/mcp"' mcp.json >/dev/null

# Ensure repository marketplace exposes this plugin for Codex.
jq -e '.name == "orq-marketplace"' .agents/plugins/marketplace.json >/dev/null
jq -e 'any(.plugins[]; .name == "orq" and .source.source == "local" and .source.path == "./plugins/orq" and .policy.installation == "AVAILABLE" and .policy.authentication == "ON_INSTALL" and .category == "Productivity")' .agents/plugins/marketplace.json >/dev/null

# Ensure the Codex marketplace plugin folder is self-contained.
jq -e '.name == "orq"' plugins/orq/.codex-plugin/plugin.json >/dev/null
jq -e '.skills == "./skills/"' plugins/orq/.codex-plugin/plugin.json >/dev/null
jq -e '.mcpServers == "./mcp.json"' plugins/orq/.codex-plugin/plugin.json >/dev/null
jq -e '.mcpServers["orq-workspace"].url == "https://my.orq.ai/v2/mcp"' plugins/orq/mcp.json >/dev/null
[[ -d "plugins/orq/skills" ]]
[[ -f "plugins/orq/skills/build-agent/SKILL.md" ]]

echo "Plugin manifest validation passed."
