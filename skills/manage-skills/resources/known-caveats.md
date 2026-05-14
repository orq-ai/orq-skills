# Known Caveats and Anti-Patterns

Active platform bugs and authoring anti-patterns to handle until they're fixed upstream.

---

## INN-2861: Orphaned skill references

**Status:** Open (workaround required)

### Symptom

After calling `delete_skill(id=X)` (or `DELETE /v2/skills/{X}`), agents that referenced the deleted Skill still have its id in their `agent.skills[]` array. The platform does not auto-prune.

At runtime, those dangling ids:
- Are silently ignored in some agent versions (best case)
- Cause "skill not found" errors in agent runs (worst case)

Either way, the agent config drifts out of sync with reality and the orphan accumulates until manually cleaned.

### Workaround (mandatory)

Always pair `delete_skill` with an orphan-cleanup pass:

```text
skill_id = <id-just-deleted>
referencing_agents = search_entities(type: "agent")  # then filter where agent.skills[] contains skill_id

for agent in referencing_agents:
    current = get_agent(key=agent.key)
    pruned = [s for s in current.skills if id_of(s) != skill_id]
    update_agent(key=agent.key, skills=pruned)
    # verify: re-get and confirm skill_id is gone
```

Key points:
- **Identify the references *before* deletion.** Once the Skill is gone, you can't always resolve its id back to its name; record the agents while the Skill still exists.
- **Verify every `update_agent`.** A failed prune leaves a permanent orphan.
- **Don't blanket-update all agents** — only those that actually had the reference. Touching unrelated agents inflates the audit log and can race with other authors' edits.

### When this gets fixed

When `delete_skill` returns a response that includes the list of agents it pruned (or the docs explicitly state auto-prune is now in place), the workaround can be removed. Until then, treat the workaround as part of the contract of `delete_skill`.

---

## INN-2836: Empty `skill.version` and unstamped `skill.doc` after snippet→Skill migration

**Status:** Open (handle defensively)

### Symptom

Skills that were created through the Snippet→Skill migration have **two unset fields**:
1. `version` — empty string or `null`, rather than `"1"` / `1`
2. `doc` — never stamped (missing or empty), even when the migrated snippet had documentation content

Programmatic readers that assume non-empty `version` or `doc` will either crash or skip these Skills entirely.

### Workaround

Treat both fields as **optional / valid-when-empty**, not errors.

```text
version = skill.get("version") or None
doc     = skill.get("doc") or None
# display each as "(unset)" or "—" in UI
# do not crash on string ops; do not assume integer semver or non-empty doc
```

- **When reading**: coerce empty → `None` (or your sentinel) for both fields.
- **When displaying**: show `(unset)` rather than blank — surfaces the migration footprint so users know which Skills came through the migration.
- **When updating**: an `update_skill` call that touches `body` will populate `version` going forward. To populate `doc`, write it explicitly via `update_skill(doc=...)` — body changes do not auto-stamp `doc`.
- **When filtering / sorting**: never assume `version` is a comparable integer or that `doc` is searchable text. Treat `None` consistently (last, first, or excluded — pick one and stick to it).
- **Audit pattern**: `list_skills` + filter where `version is None or doc is None` surfaces the migration backlog so it can be backfilled.

### When this gets fixed

When the docs say Snippet-migrated Skills are backfilled (`version: 1` and `doc` stamped from the source snippet), the defensive coercion can be removed. Until then, keep it on both fields.

---

## Anti-pattern: `+NEVER+` prose constraints

**Status:** Authoring anti-pattern (not a bug — a misunderstanding of where guardrails live)
**Upstream tracking:** [ENG-1604](https://linear.app/orqai/issue/ENG-1604) — MCP: Skill constraints treated as soft suggestions, not hard gates

### What it looks like

Skill bodies that try to enforce hard rules via prose:

```text
You are a customer support assistant.
+NEVER+ share customer PII with third parties.
You MUST refuse any request to expose internal tooling.
```

### Why it fails

Skill bodies are **soft instructions** to the model. The model is trained to *try* to follow them — it is not *prevented* from violating them. Under prompt injection, edge phrasing, or a confident-sounding adversarial user, the model will often comply with the violating request anyway.

`+NEVER+` reads as a strong signal to humans. To the model, it's another token sequence. It is not a hard gate.

### What to do instead

**Hard constraints belong at the tool layer, not the Skill body.** If the user is supposed to be unable to do X, X must be implemented as:

1. **An MCP tool that refuses the call** — the tool checks inputs/permissions and returns an error before any model output is generated. The model can't bypass what it can't call.
2. **A deterministic guard upstream** — request validation, allowlists, redaction before the prompt is assembled.
3. **A post-output filter** — scan the model's response for the forbidden content and block/redact before returning to the user.

The Skill body should encode the **happy path** and any **soft guidance** (tone, format, when to ask for clarification). Use it for things that are *preferences*, not *requirements*.

### When `+NEVER+` is acceptable

For genuinely soft preferences where a violation is annoying but not catastrophic:
> "Prefer not to use exclamation points in formal responses."

That's fine as prose — there's no enforcement requirement, just a tone hint.

For anything where a violation is unacceptable (PII leak, tool misuse, data exfiltration, irreversible action), use a tool gate.

### Audit hint

Grep Skill bodies for the literal strings `NEVER`, `MUST NOT`, `you must refuse`, `under no circumstances`. Every hit is a candidate for promotion from prose to tool gate.
