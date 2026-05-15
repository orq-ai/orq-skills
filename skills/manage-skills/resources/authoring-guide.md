# Authoring Guide: Display Name, Description, Tags, Project Scope, Path

How to author an orq.ai Skill so it's discoverable, scoped correctly, and picked up by the right agents.

---

## `display_name`

The Skill's `display_name` is the primary handle agents and humans use to refer to the Skill. It should be unambiguous on its own.

**Platform constraints:** the API allows mixed case and underscores up to 255 characters (the canonical regex used by the platform is roughly `^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*$`).

**This repo's recommended convention** (a stricter subset that keeps lists scannable):
- **kebab-case**, lowercase, ASCII only — e.g., `extract-receipt-fields`
- **≤50 characters** — long names get truncated in agent configs and UI tables
- **Verb-noun preferred** — `summarize-ticket`, `classify-intent`, `extract-pii`
- **Avoid generic verbs alone** — `handle-thing`, `do-task`, `process` say nothing
- **No version suffixes in the name** — `summarize-ticket-v2` is an anti-pattern; the platform stamps `version` on the Skill itself
- **Unique within scope** — names must be unique within a project (and across the workspace for workspace-wide Skills); use `POST /v2/skills:checkDisplayNameAvailability` before create

These are recommendations, not enforced by the API — diverge if a stronger convention already exists in the workspace, but stay consistent.

**Good (recommended convention):**
- `extract-invoice-line-items`
- `redact-pii-from-transcript`
- `format-currency-eur`

**Bad:**
- `helper` (too vague)
- `the-skill-that-handles-customer-support-emails-with-tone-checking` (too long)
- `summarize-ticket-v2` (version belongs on the Skill, not in the name)

---

## `description`

The `description` is what the **model** reads when deciding whether to apply the Skill. Optimize for retrieval, not for human marketing copy.

**Rules:**
- **Lead with the trigger condition** — start with "Use when…" or "Apply when…"
- **Name the input and the output** — e.g., "Use when given a raw email body. Returns a JSON object with sender, subject, and intent."
- **One sentence.** Skills with paragraph descriptions get truncated in agent prompts.
- **Avoid implementation detail.** The model doesn't need to know which library you use.
- **Avoid "always" / "never" / "must"** — those are constraints, not triggers. Put hard rules in tool gates, not Skill descriptions.

**Good:**
> Use when the user provides a receipt image or PDF. Extracts merchant, total, tax, and line items into structured JSON.

**Bad:**
> This skill is a powerful tool that helps you handle receipts in many different formats using OCR.
> *(no trigger, marketing voice, implementation leak)*

---

## `tags`

Tags are how Skills get grouped in the UI and how callers narrow `list_skills` output **client-side** (`GET /v2/skills` does not accept a `tags` filter — paginate, then filter in memory). Good tagging makes a workspace navigable; bad tagging makes Skills invisible.

**Rules:**
- **At least one tag.** Untagged Skills are easy to lose in long lists.
- **Reuse existing tags.** Paginate `list_skills` and see which tags are already in use before inventing a new one. Tag sprawl is the silent killer of Skill discoverability.
- **Two axes of tagging are usually enough:**
  - **Functional** — what the Skill *does*: `extraction`, `summarization`, `classification`, `formatting`, `tone`, `policy`
  - **Domain** — where it applies: `finance`, `cs` (customer support), `legal`, `internal`
- **Avoid agent-specific tags.** A tag like `used-by-checkout-agent` becomes wrong the moment a second agent adopts the Skill — use `agent.skills[]` for that wiring instead.
- **Lowercase, kebab-case** for consistency.

**Recommended tag count:** 1–4 tags per Skill. More than 5 tags usually means the Skill is doing too many things.

---

## `project_id` (project scoping)

Every Skill is either **project-scoped** (`project_id` set to a project's id) or **workspace-wide** (`project_id` omitted). Workspace-wide Skills are visible to every agent across the workspace.

**Default to project-scoped.** Workspace-wide Skills are shared infrastructure — every workspace member can see them, every agent can pull them in, and a bad edit affects everyone.

**When project-scoped is right:**
- The Skill encodes project-specific business logic (e.g., a refund policy that only applies to the EU project)
- The Skill is still being iterated on and shouldn't be discoverable across teams yet
- Different projects need different versions of the same idea (e.g., `extract-receipt-fields` per region)

**When workspace-wide is right:**
- The Skill is genuinely reusable across teams and projects (e.g., `redact-pii`, `format-currency`)
- The Skill has stabilized — at least one minor version, used by ≥2 agents, no recent breaking changes
- Ownership is clear (named owner in the description or `owner:` tag)

**How to choose:**

1. Start project-scoped (set `project_id`).
2. After the Skill has been stable for ≥2 weeks and used by ≥2 agents in the same project, ask: "would another project benefit from this?"
3. If yes, **create a copy** with `project_id` omitted (workspace-wide). Don't move — agents in the original project still reference the project-scoped `skill_id`. Sunset the original after agents are re-wired.

> **Resolving project keys → ids:** if the user gives you a project key/name, run `search_directories` to convert it to the `project_id` value the API expects.

---

## `path`

`path` is the finder-style location of the Skill inside its project (e.g., `Default/Skills`, `cs/policies`, `finance/extraction`). It controls where the Skill appears in the UI's folder tree.

**Rules:**
- **Default to the project's standard Skill folder** (often `Default/Skills`) unless the team has an explicit folder convention.
- **Mirror existing folders.** Paginate `list_skills` and reuse paths already in the target project — divergent paths fragment the UI.
- **Use slashes, not backslashes**, and keep segment names short and descriptive.
- **Group by purpose, not by owner.** Folder-by-team becomes wrong the moment a Skill moves teams; folder-by-purpose ages better.

---

## `instructions` (the Skill body)

`instructions` is the actual content the agent reads (and what `{{skill.<key>}}` inlines into prompts). Keep it:
- **Focused on one capability.** If you find yourself writing "and also…", split into two Skills.
- **Specific.** Include 1–2 input/output examples.
- **Free of hard constraints expressed as prose.** Don't write "NEVER do X" or "you MUST refuse Y" — those are soft hints, not enforcement. See [known-caveats.md](known-caveats.md#anti-pattern-never-prose-constraints-in-instructions).
- **Sanity-checked before save.** Reuse `optimize-prompt`'s clarity heuristics, but apply judgment — Skill `instructions` are typically shorter and more capability-scoped than a system prompt.
