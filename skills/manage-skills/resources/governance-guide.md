# Governance Guide: Wiring Skills to Agents, Ownership, Lifecycle

How Skills get attached to agents, who owns them, and how they retire.

---

## Wiring Skills to Agents

Skills don't fire on their own — an agent has to reference them. The reference lives on the agent in the `skills[]` array.

### Adding a Skill to an agent

1. `get_agent(key=<agent-key>)` — capture the current `skills[]` list.
2. Append the new Skill's id (or key, depending on the agent schema) to the list.
3. `update_agent(key=<agent-key>, skills=<new-list>)`.
4. Verify with `get_agent` that the new entry is present.

**Example (pseudo):**
```
agent = get_agent(key="customer-support")
agent.skills.append({ id: "skl_abc123" })   # or { key: "refund-policy" }
update_agent(key="customer-support", skills=agent.skills)
```

> **Schema note:** the `skills[]` entry shape (id vs key vs object) depends on the agent API version. Always pattern-match what `get_agent` returned and write back the same shape.

### Removing a Skill from an agent

Same pattern, but filter out the unwanted Skill before `update_agent`. **This is the workaround for INN-2861** when a Skill is deleted — see [known-caveats.md](known-caveats.md).

### Bulk wiring

If a Skill needs to attach to many agents at once, list candidates first with `search_entities(type: "agent")`, ask the user to confirm the list, then iterate. Never blanket-attach without explicit confirmation — Skills change agent behavior in ways that are hard to roll back without trace analysis.

---

## How agents select Skills at runtime

The model picks Skills from the `skills[]` list based on the Skill **description** — *not* the name or tags. This is why authoring guidance pushes "Use when…" descriptions: they're the retrieval surface.

Implications:
- A great Skill body with a vague description will rarely fire.
- Two Skills with similar descriptions cause the model to pick non-deterministically.
- Wiring 20+ Skills to a single agent dilutes the model's selection accuracy — keep `skills[]` lean.

**Rule of thumb:** ≤8 Skills per agent. If you need more, the agent is probably doing too many things — split it.

---

## Ownership

There is no first-class "owner" field on a Skill today. Establish ownership conventions in tags and description:

- **Tag** — add an `owner:<team-or-handle>` tag (e.g., `owner:cs-team`) to workspace-wide Skills.
- **Description** — for project-scoped Skills, ownership is implicit in the project. For workspace-wide, mention the owning team in the description's trailing context if it matters for incident response.

Audit unowned workspace-wide Skills periodically with `list_skills` filtered to workspace scope — anything without an `owner:` tag is a candidate for review.

---

## Lifecycle: Create → Iterate → Stabilize → Retire

### Create
Always start project-scoped. Describe the trigger precisely. Wire to one agent first and verify in traces.

### Iterate
- Iterate on body and description, not name. Name changes break references.
- Route every body change through `optimize-prompt`.
- After each meaningful change, run `run-experiment` against the agent that uses the Skill to confirm the change improves (or at least doesn't regress) behavior.

### Stabilize
A Skill is stable when:
- It hasn't had a body change in ≥2 weeks
- It's referenced by ≥2 agents (or 1 production agent)
- No open incidents tag the Skill as a contributor

At that point, consider promoting to workspace-wide if it's broadly reusable. See [authoring-guide.md](authoring-guide.md#project-scoping).

### Retire
Retire a Skill when:
- The agent(s) using it are decommissioned, OR
- A replacement Skill covers the same capability better

**Retirement workflow:**

1. Identify all referencing agents (`search_entities(type: "agent")` + filter).
2. For each agent, decide: replace (swap in the new Skill) or remove (no replacement needed).
3. Wire replacements before deleting the old Skill, not after — atomicity matters.
4. Run `delete_skill`.
5. Run the orphan-cleanup pass on every agent (INN-2861 workaround) — see SKILL.md Phase 4.
6. Note retirement in the workspace changelog if your team keeps one.

---

## Audit checklist

Periodic Skills audit (suggested quarterly):

- [ ] Any workspace-wide Skill with no `owner:` tag? — assign or move to project-scoped
- [ ] Any Skill not referenced by any agent? — candidate for deletion (or future intent — confirm with owner)
- [ ] Any Skill referenced by 0 agents but flagged in traces? — INN-2861 orphan, prune via `update_agent`
- [ ] Any agent with >8 entries in `skills[]`? — agent overload, consider splitting
- [ ] Any two Skills with near-duplicate descriptions? — selection ambiguity, consolidate
- [ ] Any Skill body containing `+NEVER+` or "you MUST refuse"? — soft constraint anti-pattern, replace with MCP tool gate (see [known-caveats.md](known-caveats.md#anti-pattern-never-prose-constraints))
