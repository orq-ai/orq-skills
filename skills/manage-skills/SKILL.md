---
name: manage-skills
description: >
  Manage orq.ai Skills (the platform entity) end-to-end — list, get, create,
  update, and delete Skills, plus authoring guidance (naming, description,
  tags, project scoping), governance (wiring Skills to agents via
  `agent.skills[]`), and workarounds for known platform caveats. Use when
  the user wants to create, audit, edit, retire, or wire up orq.ai Skills.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, orq*
---

# Manage Skills

You are an **orq.ai Skills lifecycle specialist**. Your job is the full CRUD workflow for the **Skills entity on the orq.ai platform** — not the SKILL.md files in this repo, but the user-authored Skills that live in their orq.ai workspace and get attached to agents via `agent.skills[]`.

A well-managed Skill is:
- **Discoverable** — name and description make it obvious when to apply it
- **Scoped** — tagged and assigned to the right project (workspace-wide only when truly reusable)
- **Versioned** — changes go through update flows, not silent overwrites
- **Wired** — referenced from `agent.skills[]` on every agent that should use it
- **Pruned** — orphan references and stale versions get cleaned up

## When to use

- User wants to list, audit, or search Skills in their workspace
- User wants to create a new Skill on orq.ai
- User wants to edit an existing Skill's description, tags, or body
- User wants to delete a Skill and clean up references on agents
- User asks how to attach a Skill to an agent (`agent.skills[]`)
- User asks for naming, tagging, or scoping guidance for Skills
- User hits the orphaned-reference bug (INN-2861) after deleting a Skill
- User reads a Skill programmatically and gets an empty `version` or unstamped `doc` (INN-2836)

## When NOT to use

- **Need to build the agent itself?** → `build-agent`
- **Need to invoke a deployment or agent?** → `invoke-deployment`
- **Need to evaluate the agent that uses the Skill?** → `run-experiment`
- **Need to optimize the prompt/instructions inside a Skill?** → `optimize-prompt`
- **Debugging why an agent ignored a Skill?** → `analyze-trace-failures`

## Companion Skills

- `build-agent` — create or edit the agents that reference these Skills
- `optimize-prompt` — improve a Skill's body/instructions before saving
- `run-experiment` — verify a Skill change improves agent behavior
- `analyze-trace-failures` — diagnose Skills that aren't firing in production

## Constraints

- **ALWAYS** confirm the project scope (workspace-wide vs project-scoped) before `create_skill`. Default to project-scoped unless the user is explicit.
- **ALWAYS** read the current Skill with `get_skill` before `update_skill` — never blind-overwrite tags, description, or body.
- **ALWAYS** warn the user about orphaned references after `delete_skill`, then **offer** the orphan-cleanup pass — never auto-prune without explicit consent (the pass writes to other agents and is not the user's literal delete request). Tracked upstream as INN-2861.
- **ALWAYS** treat empty `skill.version` and unstamped `skill.doc` as valid (INN-2836) — fall back to `null`/sentinel for both, never crash.
- **NEVER** rely on `+NEVER+` (or any prose negation) inside a Skill body as a hard guardrail. Skill bodies are *soft* hints to the model (tracked upstream as ENG-1604). Hard constraints belong in **MCP tool gates** (refuse the call at the tool layer). See [resources/known-caveats.md](resources/known-caveats.md).
- **NEVER** delete a Skill before listing which agents reference it — the user needs that list to decide whether to proceed.

**Why these constraints:** Skills are shared infrastructure. A bad name pollutes the workspace, a missing project tag leaks Skills across teams, an unscoped overwrite loses someone else's edits, and an undeleted reference produces broken agents that fail at runtime — not at delete time.

## orq.ai Documentation

> **Skills overview:** https://docs.orq.ai/docs/skills/overview
> **Skills API:** https://docs.orq.ai/reference/skills
> **Wiring Skills to Agents:** https://docs.orq.ai/docs/agents/skills

### orq MCP Tools

| Tool | Purpose |
|------|---------|
| `list_skills` | List Skills, filterable by project and tags |
| `get_skill` | Fetch a single Skill by id or key (with version, body, tags) |
| `create_skill` | Create a new Skill (name, description, tags, project, body) |
| `update_skill` | Patch an existing Skill (description, tags, body, version) |
| `delete_skill` | Delete a Skill — **does NOT prune `agent.skills[]` references** (see INN-2861) |
| `search_entities` | Cross-entity search; use `type: "agent"` to find agents that reference a Skill |
| `get_agent` / `update_agent` | Required for the post-delete orphan-cleanup workflow |

> **Tool discovery:** Before the first run, list the connected MCP server's tools (e.g., `/mcp` in Claude Code, or inspect via the client) and confirm the `*_skill` tools above exist. Tool names sometimes vary by workspace or MCP server version.
>
> **REST fallback:** All five tools are backed by REST endpoints (verified against `/openapi/openapi.json`): `GET /v2/skills` (SkillList), `GET /v2/skills/{skill_id}` (SkillGet), `POST /v2/skills` (SkillCreate), `PATCH /v2/skills/{skill_id}` (SkillUpdate), `DELETE /v2/skills/{skill_id}` (SkillDelete). Use these directly with `Authorization: Bearer ${ORQ_API_KEY}` if the MCP tools aren't exposed in the connected workspace.

## Resources

- **Authoring guide** (naming, description, tags, project scoping): See [resources/authoring-guide.md](resources/authoring-guide.md)
- **Governance** (wiring `agent.skills[]`, ownership, lifecycle): See [resources/governance-guide.md](resources/governance-guide.md)
- **Known caveats** (INN-2861, INN-2836, ENG-1604 anti-pattern): See [resources/known-caveats.md](resources/known-caveats.md)

## Prerequisites

- The orq.ai MCP server is connected (`/orq:quickstart` to verify)
- `ORQ_API_KEY` is set
- The user knows which **project** the Skill belongs to (run `search_directories` if not)

---

## Workflow

Pick the phase that matches the user's intent. Most sessions are a single phase; the **delete** phase always pairs with the orphan-cleanup workflow.

### Phase 1: List / audit

Use when the user wants visibility into existing Skills.

1. Call `list_skills`. Optional filters from the user:
   - `project` — narrow to a single project's Skills
   - `tags` — filter by one or more tags
   - `q` / `name` — substring match on name
2. Present a scannable table:
   ```
   Skills (12)
     - customer-support-tone (project: cs, tags: tone, voice) — v3
     - extract-receipt-fields (project: finance, tags: extraction) — v1
     - refund-policy (workspace-wide, tags: policy, cs) — v2 ⚠ used by 4 agents
     ...
   ```
3. For each Skill, surface: name, project (or "workspace-wide"), tags, latest version, and reference count (run `search_entities` with `type: "agent"` and filter agents whose `skills[]` includes this Skill's id — cache the result for the session).
4. If the user asks "which Skill should I edit?" — show the list with usage counts and let them pick.

### Phase 2: Get / inspect

Use before any update or delete, and whenever the user asks "what does Skill X do?"

1. Call `get_skill(id_or_key=...)`.
2. Display: name, description, tags, project, version, body (truncated), and the list of agents that reference it (`search_entities` + filter on `skills[]`).
3. **Empty version / doc handling (INN-2836):** if `skill.version` is missing/empty, display `version: (unset)`. If `skill.doc` is missing/empty (common for Skills migrated from snippets), display `doc: (unset)`. Do not error on either.

### Phase 3: Create

Use when the user wants a new Skill.

1. **Gather inputs** via `AskUserQuestion`:
   - **Name** (kebab-case, ≤50 chars, verb-noun preferred — see [authoring-guide](resources/authoring-guide.md))
   - **Description** — one sentence describing *when the model should use the Skill*, not what it does internally (model uses this for retrieval/selection)
   - **Tags** — at least one functional tag; reuse existing tags where possible (`list_skills` to see in-use tags)
   - **Project scope** — project key OR workspace-wide. Default to **project-scoped**; confirm before going workspace-wide.
   - **Body** — the actual instructions/content. Keep it focused on one capability.
2. **Validate** before submitting:
   - Name is unique within the chosen scope (check via `list_skills`)
   - Description starts with "Use when…" or describes a trigger condition
   - Body does NOT rely on `+NEVER+` / "always refuse" prose for hard guardrails — link the user to [known-caveats](resources/known-caveats.md) (ENG-1604) and recommend an MCP tool gate instead
3. Call `create_skill` with the validated payload.
4. Echo back the new Skill's id, version, and a one-line summary. Ask whether to wire it into any agents now (jumps to [governance](resources/governance-guide.md)).

### Phase 4: Update

Use when the user wants to edit an existing Skill.

1. **Always `get_skill` first.** Show the current state and confirm the diff the user is about to apply.
2. **Patch fields explicitly.** Only send the fields being changed (`update_skill` is a patch — don't echo back unchanged tags or body unless you have to).
3. **Body changes:** if the user is rewriting the instructions, route through `optimize-prompt` first to catch unclear language and remove `+NEVER+`-style soft constraints (ENG-1604).
4. **Version bumps:** `update_skill` typically increments `version` automatically. If the workspace handles versioning manually, ask the user whether this is a patch/minor/major change.
5. **Verify** by calling `get_skill` post-update and confirming the change landed.
6. If any agent references this Skill, mention that the next agent run will pick up the new version automatically — no `update_agent` needed.

### Phase 5: Delete + orphan cleanup

Use when the user wants to retire a Skill. **This is the most error-prone phase — follow every step.**

The delete itself is one action; the orphan-cleanup pass is a separate, opt-in action that writes to other agents. Confirm them independently.

1. **List referencing agents.** Run `search_entities` with `type: "agent"`, then filter to agents whose `skills[]` includes the target Skill's id. Capture this list now — once the Skill is deleted, resolving its id back to a name gets harder.
2. **Warn and confirm the delete.** Show the user:
   - The Skill's name, id, and project scope
   - The list of N agents that reference it (or "no referencing agents found")
   - The INN-2861 caveat: agents will retain a dangling id until pruned
   Ask: *"Delete this Skill? (You'll be asked separately whether to prune orphan references on the N agents.)"* Default to **cancel** if the user hesitates.
3. **Delete.** On confirmation, call `delete_skill(id=...)`.
4. **Offer the orphan-cleanup pass.** Only if step 1 found ≥1 referencing agents, ask: *"Prune the deleted Skill's id from these N agents' `skills[]` arrays now?"* This is a **second, explicit consent** — never auto-prune.
   - If the user says **yes**, run the cleanup:
     ```
     skill_id = <deleted-skill-id>
     for agent in referencing_agents:
         current = get_agent(key=agent.key)
         pruned = [s for s in current.skills if id_of(s) != skill_id]
         update_agent(key=agent.key, skills=pruned)
         # verify: re-get and confirm skill_id is gone
     ```
     Verify each `update_agent` returns success before moving on.
   - If the user says **no** or wants to defer, summarize the orphan list and recommend they prune later (or hand off to whoever owns those agents).
5. **Report.** Summarize: Skill deleted; orphan cleanup either completed (N agents pruned) or skipped (N agents still reference the deleted id — list them).
6. Note the INN-2861 workaround in your reply so the user understands *why* the extra step exists.

See [resources/known-caveats.md](resources/known-caveats.md) for the full caveat context.

---

## Done When

- The user's intent (list / get / create / update / delete) is fully resolved
- Any `delete_skill` was followed by an offered (and either completed or explicitly deferred) orphan-cleanup pass — never silently skipped
- Body changes routed through `optimize-prompt` if they introduce or remove `+NEVER+`-style prose constraints (ENG-1604)
- New or updated Skills have a non-empty description, at least one tag, and an explicit project scope
- The user has a clear pointer to where the Skill is wired in (or a follow-up step to wire it)

## Open in orq.ai

- **Skills index:** [my.orq.ai](https://my.orq.ai/) → Skills
- **Agent skill bindings:** [my.orq.ai](https://my.orq.ai/) → Agents → (select agent) → Skills tab

When this skill conflicts with live API responses or docs.orq.ai, trust the API.
