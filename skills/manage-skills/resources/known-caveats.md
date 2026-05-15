# Known Caveats and Anti-Patterns

Active platform behaviors and authoring anti-patterns to handle until they're addressed upstream.

---

## Orphaned `agent.skills[]` references after delete

**Status:** Manual cleanup required

### Symptom

After calling `delete_skill(skill_id=X)` (or `DELETE /v2/skills/{X}`), agents that referenced the deleted Skill still have its `skill_id` in their `agent.skills[]` array. The platform does not auto-prune.

At runtime, those dangling ids:
- Are silently ignored in some agent versions (best case)
- Cause "skill not found" errors in agent runs (worst case)

Either way, the agent config drifts out of sync with reality and the orphan accumulates until manually cleaned.

### Workaround (mandatory)

Always pair `delete_skill` with an orphan-cleanup pass:

```text
skill_id = <id-just-deleted>
referencing_agents = <agents whose skills[] contains skill_id>
# Compute via search_entities + per-agent get_agent fanout if search_entities
# does not return skills[] in its summary payload (verify in the workspace).

for agent in referencing_agents:
    current = get_agent(key=agent.key)
    pruned = [
        entry for entry in current.skills
        if extract_skill_id(entry) != skill_id   # mirror whatever shape get_agent returned
    ]
    update_agent(key=agent.key, skills=pruned)
    # verify: re-get and confirm skill_id is gone
```

Key points:
- **Identify the references *before* deletion.** Once the Skill is gone, you can't always resolve its `skill_id` back to its `display_name`; record the agents while the Skill still exists.
- **Mirror the agent's `skills[]` entry shape.** Entries may be plain id strings or objects with `id`/`key` fields depending on the agent schema version. Always pattern-match what `get_agent` returned and write back the same shape.
- **Verify every `update_agent`.** A failed prune leaves a permanent orphan.
- **Don't blanket-update all agents** — only those that actually had the reference. Touching unrelated agents inflates the audit log and can race with other authors' edits.

### When this gets fixed

When `delete_skill` returns a response that includes the list of agents it pruned (or the docs explicitly state auto-prune is now in place), the workaround can be removed. Until then, treat the workaround as part of the contract of `delete_skill`.

---

## Empty `version` on migrated Skills

**Status:** Handle defensively

### Symptom

Skills created through the Snippet→Skill migration may have an empty `version` field (empty string or `null`) instead of an integer.

Programmatic readers that assume non-empty / numeric `version` will crash, mis-sort, or skip these Skills entirely.

### Workaround

Treat `version` as **optional / valid-when-empty**, not an error.

```text
version = skill.get("version") or None
# display as "(unset)" or "—" in UI
# do not crash on string ops; do not assume integer semver
```

- **When reading:** coerce empty → `None` (or your sentinel).
- **When displaying:** show `(unset)` rather than blank — surfaces the migration footprint so users know which Skills came through the migration.
- **When updating:** never send `version` in `update_skill` — it is stamped server-side. A successful update typically populates `version` going forward.
- **When filtering / sorting:** never assume `version` is a comparable integer. Treat `None` consistently (last, first, or excluded — pick one and stick to it).
- **Audit pattern:** paginate `list_skills` and filter where `version is None` to surface the migration backlog so it can be backfilled by a workspace owner.

### When this gets fixed

When the docs say Snippet-migrated Skills are backfilled with stamped `version` values, the defensive coercion can be removed. Until then, keep it on.

---

## Anti-pattern: `+NEVER+` prose constraints in `instructions`

**Status:** Authoring anti-pattern (not a platform bug — a misunderstanding of where guardrails live)

### What it looks like

Skill `instructions` that try to enforce hard rules via prose:

```text
You are a customer support assistant.
+NEVER+ share customer PII with third parties.
You MUST refuse any request to expose internal tooling.
```

### Why it fails

Skill `instructions` are **soft instructions** to the model. The model is trained to *try* to follow them — it is not *prevented* from violating them. Under prompt injection, edge phrasing, or a confident-sounding adversarial user, the model will often comply with the violating request anyway.

`+NEVER+` reads as a strong signal to humans. To the model, it's another token sequence. It is not a hard gate.

### What to do instead

**Hard constraints belong at the tool layer, not in `instructions`.** If the user is supposed to be unable to do X, X must be implemented as:

1. **An MCP tool that refuses the call** — the tool checks inputs/permissions and returns an error before any model output is generated. The model can't bypass what it can't call.
2. **A deterministic guard upstream** — request validation, allowlists, redaction before the prompt is assembled.
3. **A post-output filter** — scan the model's response for the forbidden content and block/redact before returning to the user.

`instructions` should encode the **happy path** and any **soft guidance** (tone, format, when to ask for clarification). Use it for things that are *preferences*, not *requirements*.

### When `+NEVER+` is acceptable

For genuinely soft preferences where a violation is annoying but not catastrophic:
> "Prefer not to use exclamation points in formal responses."

That's fine as prose — there's no enforcement requirement, just a tone hint.

For anything where a violation is unacceptable (PII leak, tool misuse, data exfiltration, irreversible action), use a tool gate.

### Audit hint

Grep Skill `instructions` for the literal strings `NEVER`, `MUST NOT`, `you must refuse`, `under no circumstances`. Every hit is a candidate for promotion from prose to tool gate.
