# Governance Guide: Wiring Skills to Agents, Ownership, Lifecycle

How Skills get attached to agents, who owns them, and how they retire.

---

## Two ways a Skill gets used

A platform Skill can reach the model in two ways. Pick (or combine) deliberately:

1. **`agent.skills[]` — runtime selection.** The Skill is attached to an agent. The model sees its `description` (and a stub) and decides at runtime whether to apply it. Good for capability-shaped Skills the agent might or might not need on a given turn.
2. **`{{skill.<key>}}` — static template inlining.** Anywhere a prompt template is rendered (deployments, agent system prompts, snippets), `{{skill.<key>}}` expands to the Skill's `instructions` at render time. Good for shared instruction blocks that should always be present in a particular prompt.

The same Skill can be consumed both ways — they don't conflict.

---

## Wiring Skills to Agents (`agent.skills[]`)

Skills don't fire on their own (in the runtime-selection mode) — an agent has to reference them. The reference lives on the agent in the `skills[]` array.

### Adding a Skill to an agent

1. `get_agent(key=<agent-key>)` — capture the current `skills[]` list and inspect its entry shape.
2. Append the new Skill's reference to the list, **mirroring the existing entry shape** (entries may be plain `skill_id` strings or objects with `id`/`key` fields depending on the agent schema version — pattern-match what `get_agent` returned).
3. `update_agent(key=<agent-key>, skills=<new-list>)`.
4. Verify with `get_agent` that the new entry is present.

> **Schema note:** The exact shape of `skills[]` entries varies by agent schema version. Always read first, mirror the shape on write. Hard-coding `{ id: ... }` or a bare string can silently corrupt the agent config in workspaces using the other shape.

### Removing a Skill from an agent

Same pattern, but filter out the unwanted Skill before `update_agent`. **This is also the workaround for the orphan-reference behavior** when a Skill is deleted — see [known-caveats.md](known-caveats.md).

### Bulk wiring

If a Skill needs to attach to many agents at once, list candidates first with `search_entities(type: "agent")`, ask the user to confirm the list, then iterate. Never blanket-attach without explicit confirmation — Skills change agent behavior in ways that are hard to roll back without trace analysis.

---

## Inlining Skills in prompts (`{{skill.<key>}}`)

For a Skill that should always be present in a particular prompt — a brand voice block, a refund policy snippet, a formatting rule — reference it by key inside the prompt template:

```text
You are a customer-support assistant.

{{skill.brand-voice}}

{{skill.refund-policy-eu}}

User: {{message}}
```

At render time, the placeholder is replaced with the Skill's `instructions`. Updating the Skill updates every prompt that inlines it — useful for shared infrastructure, dangerous if you forget which prompts depend on it.

**Audit pattern:** when editing a workspace-wide Skill's `instructions`, search prompts/deployments for `{{skill.<key>}}` to find the blast radius before saving.

---

## How agents select Skills at runtime

When a Skill is wired via `agent.skills[]`, the model picks Skills based on the Skill **description** — *not* the name or tags. This is why authoring guidance pushes "Use when…" descriptions: they're the retrieval surface.

Implications:
- A great `instructions` body with a vague description will rarely fire.
- Two Skills with similar descriptions cause the model to pick non-deterministically.
- Wiring 20+ Skills to a single agent dilutes the model's selection accuracy — keep `skills[]` lean.

**Rule of thumb:** ≤8 Skills per agent. If you need more, the agent is probably doing too many things — split it.

---

## Ownership

There is no first-class "owner" field on a Skill today. Establish ownership conventions in `tags` and `description`:

- **Tag** — add an `owner:<team-or-handle>` tag (e.g., `owner:cs-team`) to workspace-wide Skills.
- **Description** — for project-scoped Skills, ownership is implicit in the project. For workspace-wide, mention the owning team in the description's trailing context if it matters for incident response.

Audit unowned workspace-wide Skills periodically (paginate `list_skills`, filter `project_id is None` client-side, then look for missing `owner:` tags) — anything without one is a candidate for review.

---

## Lifecycle: Create → Iterate → Stabilize → Retire

### Create
Always start project-scoped (set `project_id`). Describe the trigger precisely. Wire to one agent first and verify in traces.

### Iterate
- Iterate on `instructions` and `description`, not `display_name`. Name changes break references in prompts and in any user docs.
- Sanity-check `instructions` rewrites (clarity, structure, no prose-negation anti-patterns) — see `optimize-prompt` for prose heuristics, but apply judgment: Skill `instructions` are usually shorter and more capability-scoped than a system prompt.
- After each meaningful change, run `run-experiment` against the agent that uses the Skill to confirm the change improves (or at least doesn't regress) behavior.

### Stabilize
A Skill is stable when:
- It hasn't had an `instructions` change in ≥2 weeks
- It's referenced by ≥2 agents (or 1 production agent), or inlined in ≥2 prompts
- No open incidents tag the Skill as a contributor

At that point, consider promoting to workspace-wide if it's broadly reusable. See [authoring-guide.md](authoring-guide.md#project-scoping).

### Retire
Retire a Skill when:
- The agent(s) using it are decommissioned, OR
- A replacement Skill covers the same capability better

**Retirement workflow:**

1. Identify all referencing agents (`search_entities(type: "agent")` + per-agent `get_agent` fanout) AND all prompts inlining `{{skill.<key>}}`.
2. For each consumer, decide: replace (swap in the new Skill) or remove (no replacement needed).
3. Wire replacements before deleting the old Skill, not after — atomicity matters.
4. Run `delete_skill`.
5. Run the orphan-cleanup pass on every referencing agent (see SKILL.md Phase 5).
6. Note retirement in the workspace changelog if your team keeps one.

---

## Audit checklist

Periodic Skills audit (suggested quarterly):

- [ ] Any workspace-wide Skill with no `owner:` tag? — assign or move to project-scoped
- [ ] Any Skill not referenced by any agent and not inlined in any prompt? — candidate for deletion (or future intent — confirm with owner)
- [ ] Any agent with a `skill_id` in `skills[]` that no longer resolves? — orphan from a past delete, prune via `update_agent`
- [ ] Any agent with >8 entries in `skills[]`? — agent overload, consider splitting
- [ ] Any two Skills with near-duplicate descriptions? — selection ambiguity, consolidate
- [ ] Any Skill `instructions` containing `NEVER`, `MUST NOT`, or "you must refuse"? — prose-negation anti-pattern, replace with MCP tool gate (see [known-caveats.md](known-caveats.md#anti-pattern-never-prose-constraints-in-instructions))
