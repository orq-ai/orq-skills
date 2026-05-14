---
description: Manage orq.ai Skills — list, get, create, update, or delete Skills (the platform entity) and wire them to agents
argument-hint: [list|get|create|update|delete] [name-or-id]
allowed-tools: AskUserQuestion, orq*
---

# Manage Skills

Quick entry point into the `manage-skills` skill. Routes to the right phase based on the first argument, or asks if no argument is given.

## Instructions

### 1. Parse arguments

`$ARGUMENTS` may contain an action and optionally a Skill name/id:

- `list` — Phase 1 (list / audit)
- `get <name-or-id>` — Phase 2 (inspect a Skill)
- `create` — Phase 3 (create a new Skill)
- `update <name-or-id>` — Phase 4 (edit an existing Skill)
- `delete <name-or-id>` — Phase 5 (delete + orphan cleanup)

If `$ARGUMENTS` is empty, ask the user which action they want via `AskUserQuestion` and offer the five choices above.

If `$ARGUMENTS` contains an action that requires a name/id but none was provided (e.g., `get`, `update`, `delete`), call `list_skills` first and ask the user to pick.

### 2. Delegate to `manage-skills`

Read `skills/manage-skills/SKILL.md` and execute the matching phase. Pass the parsed name/id along.

### 3. Safety rails

- **Never** auto-execute `delete_skill` from this command — always route through Phase 5's two-step warn-then-confirm flow.
- **Never** auto-prune `agent.skills[]` after a delete — Phase 5 offers it as a separate consent.
- **Always** confirm project scope before `create_skill`.

### 4. Error handling

- **Auth errors** — "Authentication failed. Check that your `ORQ_API_KEY` is valid."
- **Skill-tool unavailable** — "The orq MCP server doesn't expose `*_skill` tools in this workspace. Falling back to REST `/v2/skills` — confirm before proceeding."
- **MCP unreachable** — "Could not reach the orq.ai MCP server. Make sure it's configured: `claude mcp add --transport http orq-workspace https://my.orq.ai/v2/mcp --header 'Authorization: Bearer ${ORQ_API_KEY}'`"
