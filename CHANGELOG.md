# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-14

### Added
- `manage-skills` skill — CRUD workflow for the orq.ai Skills entity (list, get, create, update, delete) plus authoring guidance (`display_name`, `description`, `tags`, `project_id`, `path`), governance (wiring Skills to agents via `agent.skills[]` and inlining via `{{skill.<key>}}`), and platform-caveat workarounds. Disambiguates the platform Skill entity from this repo's code-assistant Orq Skills.
- `manage-skills`: warn-then-offer flow for the post-delete orphan-reference cleanup pass — never auto-prunes `agent.skills[]`, always asks for separate explicit consent before writing to referencing agents (mirrors the existing entry shape returned by `get_agent`).
- `manage-skills`: defensive handling for empty/missing `version` on Skills created via the Snippet→Skill migration (surfaced as `(unset)` rather than crashing).
- `manage-skills`: anti-pattern guidance against `+NEVER+` / "you MUST refuse" prose constraints in `instructions` — recommends MCP tool gates for hard guardrails.
- `manage-skills`: documents `GET /v2/skills` cursor pagination and the lack of server-side filters; pushes filtering to the client and uses `POST /v2/skills:checkDisplayNameAvailability` for pre-create uniqueness checks.
- `/manage-skills` slash command — routes to list/get/create/update/delete phases.

## [0.0.2] - 2026-04-21

### Added
- `invoke-deployment`: document three deployment invocation patterns — variable substitution (`inputs`), message appending (`messages`), and mixed — with Python and curl templates for each.
- `invoke-deployment`: Phase 1 Step 3 now fetches `GET /v2/deployments/<key>/config` to discover `{{variable}}` placeholders before invoking.
- `invoke-deployment`: anti-pattern entry for passing `inputs` to a deployment with no matching `{{variable}}` placeholders (silently ignored).

### Changed
- `invoke-deployment`: Phase 1 marked as one-time setup — discovery steps do not belong in production invocation flows.
- `invoke-deployment`: clarify `inputs` only substitute when matching `{{variable}}` placeholder exists in the prompt template.

### Fixed
- `invoke-deployment`: replace insecure `curl -sk` with `curl -s` in deployment config fetch example (no TLS bypass).

## [0.0.1] - 2026-04-21

### Added
- `invoke-deployment` skill — invoke orq.ai deployments, agents, and models via Python SDK, Node.js SDK, or curl. Covers prompt variable substitution, multi-turn agent conversations via `task_id`, AI Router calls with `provider/model` format, and streaming.
- `setup-observability` skill — instrument LLM applications with orq.ai tracing. AI Router mode, OpenTelemetry/OpenInference mode, and the `@traced` decorator for custom spans.
- `compare-agents` skill — cross-framework agent comparisons using `evaluatorq` from orqkit. Compare orq.ai, LangGraph, CrewAI, OpenAI Agents SDK, and Vercel AI SDK head-to-head.
- Codex and Cursor plugin manifests (`.codex-plugin/`, `.cursor-plugin/`) plus Codex marketplace entry.
- `tests/scripts/validate-plugin-manifests.sh` — validates plugin JSON, field values, and symlink integrity.
- Smoke test scenarios in `tests/skills.md` for every skill.

### Changed
- README install instructions expanded to cover 5 tools: Claude Code, Cursor, Codex, npx skills CLI, and manual clone.
- Python code templates now use `os.environ["ORQ_API_KEY"]` instead of `os.environ.get()` / `os.getenv()` to fail fast on missing key.
- Renamed `instrument-app` skill to `setup-observability`.
- AI Router base URL standardized to `https://api.orq.ai/v2/router` across all skills.
