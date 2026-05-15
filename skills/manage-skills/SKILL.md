---
name: manage-skills
description: >
  Manage orq.ai Skills (the platform entity) end-to-end — list, get, create,
  update, and delete Skills, plus authoring guidance (display name,
  description, tags, project scoping, path placement), governance (wiring
  Skills to agents via `agent.skills[]`), and workarounds for known platform
  caveats. Use when the user wants to create, audit, edit, retire, or wire up
  orq.ai Skills.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__orq-workspace__list_skills, mcp__orq-workspace__get_skill, mcp__orq-workspace__create_skill, mcp__orq-workspace__update_skill, mcp__orq-workspace__delete_skill, mcp__orq-workspace__search_entities, mcp__orq-workspace__get_agent, mcp__orq-workspace__update_agent
---

# Manage Skills

You are an **orq.ai Skills lifecycle specialist**. Your job is the full CRUD workflow for the **Skills entity on the orq.ai platform** (sometimes referred to historically as Snippets) — not the SKILL.md files in this repo, but the user-authored Skills that live in their orq.ai workspace and get attached to agents via `agent.skills[]`.

## Disambiguation: which "Skill" are we talking about?

This skill manages **the platform Skill entity on orq.ai** (`/v2/skills`, surfaced under Skills in the workspace and historically called Snippets). It is *not*:

- **Orq Skills (this repo):** code-assistant skills like `manage-skills` itself, distributed via the `assistant-plugins` marketplace and documented at <https://docs.orq.ai/docs/integrations/code-assistants/skills>. Those live in `skills/<name>/SKILL.md` files.
- **Anthropic / Agent Skills standard:** the cross-vendor SKILL.md format. Same shape as the repo skills above; unrelated to the platform entity.

When the user says "create a Skill" without context, ask which one they mean. The rest of this document is exclusively about the platform entity.

A well-managed platform Skill is:
- **Discoverable** — display name and description make it obvious when to apply it
- **Scoped** — tagged and assigned to the right project (workspace-wide only when truly reusable)
- **Versioned** — changes go through update flows, not silent overwrites (versions are stamped server-side)
- **Wired** — referenced from `agent.skills[]` on every agent that should use it, or injected into prompts via `{{skill.<key>}}`
- **Pruned** — orphaned references and stale entries get cleaned up

## When to use

- User wants to list, audit, or search Skills in their workspace
- User wants to create a new Skill on orq.ai
- User wants to edit an existing Skill's description, tags, instructions, or path
- User wants to delete a Skill and clean up references on agents
- User asks how to attach a Skill to an agent (`agent.skills[]`) or inject one via `{{skill.<key>}}`
- User asks for naming, tagging, scoping, or path-placement guidance for Skills
- User hits orphaned-reference behavior after deleting a Skill (referencing agents are not auto-pruned)
- User reads a migrated Skill programmatically and gets an empty `version`

## When NOT to use

- **Need to build the agent itself?** → `build-agent`
- **Need to invoke a deployment or agent?** → `invoke-deployment`
- **Need to evaluate the agent that uses the Skill?** → `run-experiment`
- **Need to author/improve the prose inside `instructions`?** → `optimize-prompt` is tuned for system prompts; reuse its checks (clarity, structure) but expect manual adaptation — Skill instructions are typically shorter and more capability-scoped than a system prompt.
- **Debugging why an agent ignored a Skill?** → `analyze-trace-failures`

## Companion Skills

- `build-agent` — create or edit the agents that reference these Skills
- `optimize-prompt` — review prose quality for a Skill's `instructions` (apply judgment; it's prompt-shaped, not Skill-shaped)
- `run-experiment` — verify a Skill change improves agent behavior
- `analyze-trace-failures` — diagnose Skills that aren't firing in production

## Constraints

- **ALWAYS** confirm the project scope (workspace-wide vs project-scoped via `project_id`) before `create_skill`. Default to project-scoped unless the user is explicit.
- **ALWAYS** read the current Skill with `get_skill` before `update_skill` — never blind-overwrite tags, description, or instructions.
- **ALWAYS** warn the user about orphaned references after `delete_skill`, then **offer** the orphan-cleanup pass — never auto-prune without explicit consent (the pass writes to other agents and is not the user's literal delete request).
- **ALWAYS** treat empty `version` on migrated Skills as valid (display as `(unset)`, never crash).
- **NEVER** rely on `+NEVER+` (or any prose negation) inside a Skill's `instructions` as a hard guardrail. Skill instructions are *soft* hints to the model. Hard constraints belong in **MCP tool gates** (refuse the call at the tool layer). See [resources/known-caveats.md](resources/known-caveats.md).
- **NEVER** delete a Skill before listing which agents reference it — the user needs that list to decide whether to proceed.

**Why these constraints:** Skills are shared infrastructure. A bad name pollutes the workspace, a missing project tag leaks Skills across teams, an unscoped overwrite loses someone else's edits, and an undeleted reference produces broken agents that fail at runtime — not at delete time.

## orq.ai Documentation

> **Snippets / Skills overview:** <https://docs.orq.ai/docs/prompt-snippets/overview>
> **Wiring Skills to Agents:** <https://docs.orq.ai/docs/agents/build#skills>
> **Code-assistant Orq Skills (disambiguation):** <https://docs.orq.ai/docs/integrations/code-assistants/skills>

### orq MCP Tools

| Tool | Purpose |
|------|---------|
| `list_skills` | List Skills in the workspace; cursor-paginated, **no server-side filters beyond pagination** — see Pagination & Filtering below |
| `get_skill` | Fetch a single Skill by `skill_id` (returns `display_name`, `description`, `tags`, `path`, `project_id`, `instructions`, `version`, audit fields) |
| `create_skill` | Create a new Skill (`display_name`, `description`, `tags`, `path`, `project_id`, `instructions`) |
| `update_skill` | Patch an existing Skill by `skill_id` (`display_name`, `description`, `tags`, `path`, `instructions`, `project_id`) — **`version` is stamped server-side, do not pass it** |
| `delete_skill` | Delete a Skill by `skill_id` — **does NOT prune `agent.skills[]` references** (orphan-cleanup is manual; see Phase 5) |
| `search_entities` | Cross-entity search; use to find agents that may reference a Skill (verify return shape — see footnote in Phase 1) |
| `get_agent` / `update_agent` | Required for the post-delete orphan-cleanup workflow |

> **Tool discovery:** Before the first run, list the connected MCP server's tools (e.g., `/mcp` in Claude Code, or inspect via the client) and confirm the `*_skill` tools above exist. Tool names sometimes vary by workspace or MCP server version.
>
> **REST fallback:** All five tools are backed by `/v2/skills` REST endpoints — `GET /v2/skills` (list, cursor-paginated), `GET /v2/skills/{skill_id}`, `POST /v2/skills`, `PATCH /v2/skills/{skill_id}`, `DELETE /v2/skills/{skill_id}`. There is also `POST /v2/skills:checkDisplayNameAvailability` for pre-create name uniqueness checks. Use these directly with `Authorization: Bearer ${ORQ_API_KEY}` if the MCP tools aren't exposed in the connected workspace. Confirm exact request schemas against the workspace's OpenAPI before relying on field names.

### Pagination & Filtering

`GET /v2/skills` (and the `list_skills` MCP tool) accepts **only** cursor-pagination parameters: `limit` (default 10, max 200), `starting_after`, `ending_before`. **There is no server-side filter for `project_id`, `tags`, `display_name`, or free text.** Any filtering by those facets must happen **client-side** after pagination, or via `search_entities` if it indexes Skills.

**Pagination loop (pseudocode):**

```text
cursor = None
all_skills = []
while True:
    page = list_skills(limit=200, starting_after=cursor)
    all_skills.extend(page.data)
    if not page.has_more:
        break
    cursor = page.data[-1].skill_id  # or whatever cursor field the response exposes
```

After collecting all Skills, filter in memory:

```text
project_skills = [s for s in all_skills if s.project_id == target_project_id]
tagged_skills  = [s for s in all_skills if "policy" in s.tags]
```

### Field reference

| Field | Where | Notes |
|------|------|------|
| `display_name` | create / update / read | Human-facing label. Keep short — long names get truncated in UI. |
| `description` | create / update / read | One-line trigger description. Used by the model for retrieval. |
| `tags` | create / update / read | Array of strings. Filtering is client-side (see above). |
| `path` | create / update / read | Finder-style location, e.g. `Default/Skills` or `cs/policies`. Defaults to project's default skill folder. |
| `project_id` | create / update / read | Optional — omit for workspace-wide. |
| `instructions` | create / update / read | The actual Skill body that the model reads. |
| `skill_id` | read / update / delete | Server-generated id. Use this for all updates and lookups. |
| `version` | read only | Stamped server-side on changes. **Do not send in `update_skill`.** May be empty on migrated Skills (treat as `(unset)`). |
| `workspace_id`, `created_at`, `updated_at`, `created_by_id`, `updated_by_id` | read only | Audit metadata. |

> **`{{skill.<key>}}` injection:** Skills can also be referenced inside any prompt template via the static `{{skill.<key>}}` placeholder, which inlines the Skill's `instructions`. This is the primary platform mechanism for sharing instruction snippets across prompts; agents using `agent.skills[]` is the runtime-selected variant. Mention both when explaining how a Skill will get used.

## Resources

- **Authoring guide** (display name, description, tags, project scoping, path): See [resources/authoring-guide.md](resources/authoring-guide.md)
- **Governance** (wiring `agent.skills[]`, ownership, lifecycle): See [resources/governance-guide.md](resources/governance-guide.md)
- **Known caveats** (orphan references, empty version on migrations, prose-negation anti-pattern): See [resources/known-caveats.md](resources/known-caveats.md)

## Prerequisites

- The orq.ai MCP server is connected (`/orq:quickstart` to verify)
- `ORQ_API_KEY` is set
- The user knows which **project** the Skill belongs to (run `search_directories` if not)

---

## Workflow

Pick the phase that matches the user's intent. Most sessions are a single phase; the **delete** phase always pairs with the orphan-cleanup workflow.

### Phase 1: List / audit

Use when the user wants visibility into existing Skills.

1. Call `list_skills` and **paginate to completion** (see Pagination & Filtering above). Default `limit=200` to minimize round-trips.
2. **Apply user filters client-side** — `list_skills` does not accept `project_id`, `tags`, `q`, or `display_name` filters. Examples:
   - "Skills in the `cs` project" → filter `project_id == <cs-project-id>` (resolve project key → id via `search_directories` first if needed).
   - "Skills tagged `policy`" → filter `"policy" in s.tags`.
   - "Skills whose display name contains `refund`" → substring match on `display_name`.
3. Present a scannable table:
   ```
   Skills (12)
     - Customer Support Tone (project: cs, tags: tone, voice) — v3
     - Extract Receipt Fields (project: finance, tags: extraction) — v1
     - Refund Policy (workspace-wide, tags: policy, cs) — v2 ⚠ used by 4 agents
     ...
   ```
4. For each Skill, surface: `display_name`, project (or "workspace-wide"), `tags`, `path`, `version`, and reference count.
   - **Reference count caveat:** computing this requires fanning out `get_agent` over candidate agents and inspecting their `skills[]` arrays. `search_entities` may not return `skills[]` in its summary payload — verify in the connected workspace before relying on it. If it doesn't, list agents via `search_entities(type: "agent")` and call `get_agent` per agent (cache results for the session). When the count would be expensive to compute, present it lazily on user request rather than for every row.
5. If the user asks "which Skill should I edit?" — show the list with usage counts and let them pick.

### Phase 2: Get / inspect

Use before any update or delete, and whenever the user asks "what does Skill X do?"

1. Call `get_skill(skill_id=...)`.
2. Display: `display_name`, `description`, `tags`, `project_id` (or "workspace-wide"), `path`, `version`, `instructions` (truncated), and the list of agents that reference it (see Phase 1 step 4 for how to compute this).
3. **Empty `version` handling:** if `version` is missing/empty (common for Skills created via Snippet→Skill migration), display `version: (unset)`. Do not error.

### Phase 3: Create

Use when the user wants a new Skill.

1. **Gather inputs** via `AskUserQuestion`:
   - **`display_name`** — short, descriptive (verb-noun preferred). The platform allows mixed case + underscores up to 255 chars; this repo's convention is kebab-case ≤50 chars for consistency, but recommend rather than enforce. See [authoring-guide](resources/authoring-guide.md).
   - **`description`** — one sentence describing *when the model should use the Skill*, not what it does internally (model uses this for retrieval/selection)
   - **`tags`** — at least one functional tag; reuse existing tags where possible (paginate `list_skills` first to see in-use tags)
   - **`project_id`** — the target project's id, OR omit for workspace-wide. Default to **project-scoped**; confirm before going workspace-wide. If the user gives a project key, resolve it to an id via `search_directories`.
   - **`path`** — finder location for the Skill, e.g. `Default/Skills` or `policies/refunds`. Default to the project's standard Skill folder.
   - **`instructions`** — the actual content the agent reads. Keep it focused on one capability.
2. **Validate** before submitting:
   - Name is unique within the chosen scope. **Prefer `POST /v2/skills:checkDisplayNameAvailability`** when exposed; fall back to a paginated `list_skills` scan only if the endpoint is unavailable.
   - Description starts with "Use when…" or describes a trigger condition.
   - `instructions` does NOT rely on `+NEVER+` / "always refuse" prose for hard guardrails — link the user to [known-caveats](resources/known-caveats.md) and recommend an MCP tool gate instead.
3. Call `create_skill` with the validated payload.
4. Echo back the new Skill's `skill_id`, `version`, and a one-line summary. Mention both ways the Skill can be consumed:
   - **Runtime selection:** wire it into an agent's `agent.skills[]` (jumps to [governance](resources/governance-guide.md)).
   - **Static inlining:** reference it in any prompt template via `{{skill.<key>}}`.
   Ask which path the user wants (or both).

### Phase 4: Update

Use when the user wants to edit an existing Skill.

1. **Always `get_skill` first.** Show the current state and confirm the diff the user is about to apply.
2. **Patch fields explicitly.** Only send the fields being changed (`update_skill` is a patch — don't echo back unchanged tags or `instructions` unless you have to). **Never send `version`** — it's stamped server-side.
3. **`instructions` changes:** if the user is rewriting the body, run a clarity pass first — reuse `optimize-prompt`'s heuristics (clarity, structure, no soft-constraint anti-patterns) but adapt: Skill `instructions` are typically shorter and capability-scoped, not full system prompts.
4. **Verify** by calling `get_skill` post-update and confirming the change landed (and that `version` advanced if the workspace stamps versions on every change).
5. If any agent references this Skill, mention that the next agent run will pick up the new version automatically — no `update_agent` needed.

### Phase 5: Delete + orphan cleanup

Use when the user wants to retire a Skill. **This is the most error-prone phase — follow every step.**

The delete itself is one action; the orphan-cleanup pass is a separate, opt-in action that writes to other agents. Confirm them independently.

1. **List referencing agents.** Use the reference-count technique from Phase 1 step 4 — paginate agents and inspect each `skills[]`. Capture this list now — once the Skill is deleted, resolving its `skill_id` back to a `display_name` gets harder.
2. **Warn and confirm the delete.** Show the user:
   - The Skill's `display_name`, `skill_id`, and project scope
   - The list of N agents that reference it (or "no referencing agents found")
   - The orphan-reference behavior: agents will retain a dangling `skill_id` until pruned manually
   Ask: *"Delete this Skill? (You'll be asked separately whether to prune orphan references on the N agents.)"* Default to **cancel** if the user hesitates.
3. **Delete.** On confirmation, call `delete_skill(skill_id=...)`.
4. **Offer the orphan-cleanup pass.** Only if step 1 found ≥1 referencing agents, ask: *"Prune the deleted Skill's id from these N agents' `skills[]` arrays now?"* This is a **second, explicit consent** — never auto-prune.
   - If the user says **yes**, run the cleanup. The exact shape of `agent.skills[]` entries (id string vs `{ id }` object vs `{ key }` object) varies by agent schema version, so **mirror what `get_agent` returned** rather than assuming a shape:
     ```text
     skill_id = <deleted-skill-id>
     for agent in referencing_agents:
         current = get_agent(key=agent.key)
         pruned = [
             entry for entry in current.skills
             if extract_skill_id(entry) != skill_id   # entry may be a string id or an object with id/key
         ]
         update_agent(key=agent.key, skills=pruned)
         # verify: re-get and confirm skill_id is no longer present
     ```
     Verify each `update_agent` returns success before moving on.
   - If the user says **no** or wants to defer, summarize the orphan list and recommend they prune later (or hand off to whoever owns those agents).
5. **Report.** Summarize: Skill deleted; orphan cleanup either completed (N agents pruned) or skipped (N agents still reference the deleted id — list them).
6. Note in your reply *why* the extra step exists (auto-prune isn't on the platform yet, so the cleanup is manual and gated behind explicit consent).

See [resources/known-caveats.md](resources/known-caveats.md) for the full caveat context.

---

## Done When

- The user's intent (list / get / create / update / delete) is fully resolved
- Any `delete_skill` was followed by an offered (and either completed or explicitly deferred) orphan-cleanup pass — never silently skipped
- `instructions` changes were sanity-checked for clarity and for prose-negation anti-patterns before save
- New or updated Skills have a non-empty `description`, at least one tag, an explicit project scope, and a sensible `path`
- The user has a clear pointer to where the Skill is wired in (`agent.skills[]` and/or `{{skill.<key>}}`) — or a follow-up step to wire it

## Open in orq.ai

- **Skills index:** [my.orq.ai](https://my.orq.ai/) → Skills
- **Agent skill bindings:** [my.orq.ai](https://my.orq.ai/) → Agents → (select agent) → Skills tab

When this skill conflicts with live API responses or docs.orq.ai, trust the API.
