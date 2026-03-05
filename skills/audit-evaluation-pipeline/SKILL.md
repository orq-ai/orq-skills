---
name: audit-evaluation-pipeline
description: Audit an existing LLM eval pipeline and produce a prioritized diagnostic report with concrete next steps
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Audit Evaluation Pipeline

Inspect an existing LLM evaluation pipeline and produce a prioritized diagnostic report with concrete next steps.

**Companion skills:**
- `trace-analysis` — deep-dive trace reading when audit reveals missing error analysis
- `build-evaluator` — fix evaluator design issues found by the audit
- `run-experiment` — re-run experiments after fixing audit findings

## When to use

- User asks "is my eval setup any good?" or "what's wrong with my evaluation?"
- User has some eval infrastructure and wants to know what's missing
- User inherits an existing eval pipeline and needs to understand its state
- User wants a health check before scaling up evaluation
- Before starting a new eval cycle — audit first to avoid repeating past mistakes
- User asks "where should I start?" when they already have traces, evaluators, or experiments

## orq.ai Documentation

Consult these docs when auditing on the orq.ai platform:
- **Evaluators overview:** https://docs.orq.ai/docs/evaluators/overview
- **Evaluator library:** https://docs.orq.ai/docs/evaluators/library
- **Experiments overview:** https://docs.orq.ai/docs/experiments/overview
- **Traces:** https://docs.orq.ai/docs/observability/traces
- **Datasets overview:** https://docs.orq.ai/docs/datasets/overview
- **Human review:** https://docs.orq.ai/docs/evaluators/human-review
- **Annotation queues:** https://docs.orq.ai/docs/administer/annotation-queue
- **Feedback:** https://docs.orq.ai/docs/feedback/overview

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `search_entities` | Search for evaluators, datasets, experiments, agents |
| `list_traces` | Check if traces exist and are being collected |
| `list_spans` | Inspect trace structure and completeness |
| `list_experiment_runs` | Check experiment history |
| `get_experiment_run` | Inspect experiment run details and scores |
| `get_agent` | Check agent configuration |
| `list_models` | Verify model availability |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# List evaluators to audit their design
curl -s https://my.orq.ai/v2/evaluators \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Get evaluator details (check prompt, model, output type)
curl -s https://my.orq.ai/v2/evaluators/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq
```

## What This Skill Audits

The audit checks 6 diagnostic areas, ordered by foundational importance:

| # | Area | Key Question |
|---|------|-------------|
| 1 | Error Analysis | Has systematic error analysis been done? |
| 2 | Evaluator Design | Are evaluators binary, scoped, and application-specific? |
| 3 | Judge Validation | Are LLM judges validated with TPR/TNR on held-out data? |
| 4 | Human Review Process | Who reviews traces? Are domain experts involved? |
| 5 | Labeled Data | Is there enough labeled data (~100 traces, balanced Pass/Fail)? |
| 6 | Pipeline Hygiene | Is error analysis re-run after changes? Are experiments compared? |

## Steps

### Phase 1: Inventory What Exists

1. **Discover existing evaluation infrastructure.** Use MCP tools and HTTP API to inventory:

   **Traces:**
   - Use `list_traces` — are traces being collected? How many? How recent?
   - Check trace completeness: do they include inputs, outputs, intermediate steps, metadata?

   **Evaluators:**
   - Use HTTP API to list evaluators — how many exist? What types (LLM, Python, JSON, RAGAS)?
   - For each evaluator: what does the prompt look like? Is it binary or numeric? Does it target one criterion or many?

   **Datasets:**
   - Use `search_entities` to find datasets — do any exist? How many datapoints?
   - Check diversity: are there adversarial cases? Multiple dimensions?

   **Experiments:**
   - Use `list_experiment_runs` — have experiments been run? How many? When was the last one?
   - Check if results are being compared across runs

   **Agents:**
   - Use `get_agent` for the target agent — what model? What tools? What system prompt?

2. **Ask the user to fill gaps.** For anything not discoverable via the platform:
   - Has anyone done manual trace reading? How many traces? Who did it?
   - Is there a documented failure taxonomy?
   - Are there labeled examples with human Pass/Fail judgments?
   - Who are the domain experts? Are they involved in labeling?

### Phase 2: Run the 6-Area Diagnostic

3. **Area 1 — Error Analysis:**

   | Check | How to Verify | Status |
   |-------|--------------|--------|
   | Traces have been read manually | Ask user; check for documented failure modes | |
   | Failure modes are documented | Ask for taxonomy; check if evaluators map to specific modes | |
   | Open coding was done (not pre-defined categories) | Ask if categories came from trace reading or were assumed | |
   | At least 50-100 traces analyzed | Ask user; compare against trace count | |
   | Analysis is recent (after last major change) | Compare analysis date to last deployment/prompt change | |

   **If missing:** Recommend `trace-analysis` skill. This blocks everything else — you cannot build good evaluators without understanding what fails.

4. **Area 2 — Evaluator Design:**

   | Check | How to Verify | Status |
   |-------|--------------|--------|
   | Evaluators use binary Pass/Fail (not 1-5 or 1-10 scales) | Read evaluator prompts via HTTP API | |
   | Each evaluator targets ONE failure mode | Read evaluator prompts — check for bundled criteria | |
   | Evaluators are application-specific (not generic "helpfulness") | Check criterion names and prompt content | |
   | Code-based checks used where possible (before LLM judges) | Check for Python/JSON evaluators alongside LLM ones | |
   | Evaluator prompts include few-shot examples | Read the prompt content | |
   | Structured output (reasoning before verdict) | Check prompt output format | |

   **Common problems found:**
   - Generic evaluators ("rate helpfulness 1-10") → Replace with application-specific binary judges
   - Bundled criteria ("evaluate tone, accuracy, and completeness") → Split into separate evaluators
   - No few-shot examples → Add examples from labeled training data
   - Numeric scales without clear rubric → Convert to binary Pass/Fail

5. **Area 3 — Judge Validation:**

   | Check | How to Verify | Status |
   |-------|--------------|--------|
   | TPR and TNR have been measured | Ask user; check for validation documentation | |
   | Validation used held-out test set (not dev set) | Ask about data split methodology | |
   | TPR > 90% and TNR > 90% | Check documented numbers | |
   | Prevalence correction applied for production estimates | Ask user | |
   | Validation re-run after judge prompt changes | Compare validation date to last prompt edit | |

   **If missing:** Recommend `build-evaluator` skill (Phase 5 covers judge validation with TPR/TNR). Unvalidated judges give an illusion of measurement without actual reliability.

6. **Area 4 — Human Review Process:**

   | Check | How to Verify | Status |
   |-------|--------------|--------|
   | Domain experts do the labeling (not outsourced/crowdsourced) | Ask who labels traces | |
   | Reviewers see full traces (not just input/output) | Ask about review interface/process | |
   | Labels are binary Pass/Fail per criterion | Ask about labeling schema | |
   | Inter-annotator agreement measured (if multiple labelers) | Ask if multiple people label the same traces | |
   | orq.ai Annotation Queues or Human Review used | Check platform setup | |

   **If missing:** Guide setup of orq.ai Annotation Queues for structured human review. Domain expert involvement is non-negotiable.

7. **Area 5 — Labeled Data:**

   | Check | How to Verify | Status |
   |-------|--------------|--------|
   | At least 100 labeled traces exist | Ask user; check dataset sizes | |
   | Labels are balanced (~50 Pass, ~50 Fail) | Check label distribution | |
   | Data split into train/dev/test | Ask about split methodology | |
   | Test set is truly held out (never used during prompt dev) | Ask about data hygiene | |
   | Labels cover diverse scenarios (not just easy cases) | Check for adversarial/edge cases in dataset | |

   **If insufficient:** Recommend `generate-synthetic-dataset` for generating diverse test cases, and human labeling workflow for collecting ground truth.

8. **Area 6 — Pipeline Hygiene:**

   | Check | How to Verify | Status |
   |-------|--------------|--------|
   | Error analysis re-run after significant changes | Compare dates | |
   | Experiments compared across runs (not just latest) | Check `list_experiment_runs` for multiple runs | |
   | Dataset updated when new failure modes discovered | Ask user about dataset evolution | |
   | Evaluators updated/re-validated after pipeline changes | Ask about maintenance cadence | |
   | Results log maintained (run ID, date, scores, changes) | Ask for results history | |

### Phase 3: Produce the Audit Report

9. **Generate the findings report** with this structure:

   ```markdown
   # Eval Pipeline Audit Report
   **Target:** [agent/pipeline name]
   **Date:** [date]
   **Audited by:** Claude Code audit-evaluation-pipeline skill

   ## Executive Summary
   [1-3 sentences: overall health, most critical gap, recommended first action]

   ## Findings (ordered by impact)

   ### Finding 1: [Title]
   - **Area:** [Error Analysis / Evaluator Design / Judge Validation / Human Review / Labeled Data / Pipeline Hygiene]
   - **Status:** [Problem / OK / Cannot Determine]
   - **Impact:** [High / Medium / Low]
   - **Evidence:** [What was found]
   - **Recommendation:** [Specific action + which skill to use]

   ### Finding 2: [Title]
   ...

   ## What's Working Well
   - [Positive finding 1]
   - [Positive finding 2]

   ## Recommended Action Sequence
   1. [First thing to do] → use `[skill name]`
   2. [Second thing to do] → use `[skill name]`
   3. [Third thing to do] → use `[skill name]`

   ## Re-audit Criteria
   - [ ] [Condition 1 that should trigger re-audit]
   - [ ] [Condition 2]
   ```

10. **Order findings by dependency and impact:**
    - Error analysis findings first (blocks everything)
    - Evaluator design second (affects all measurements)
    - Judge validation third (affects trust in scores)
    - Data and hygiene last (improvements, not blockers)

### Phase 4: Handle Edge Cases

11. **If no eval infrastructure exists at all:**
    - Don't produce a findings report — there's nothing to audit
    - Instead, guide the user to start with `trace-analysis`
    - Provide a starter roadmap:
      1. Collect/generate traces → `trace-analysis`
      2. Build failure taxonomy → `trace-analysis`
      3. Create dataset → `generate-synthetic-dataset`
      4. Design evaluators → `build-evaluator`
      5. Validate judges → `build-evaluator` (Phase 5)
      6. Run experiments → `run-experiment`

12. **If the user has evaluators but no error analysis:**
    - This is the most common anti-pattern
    - Flag it as the #1 finding
    - The evaluators were likely built from assumptions, not observed failures
    - Recommend doing error analysis and then re-evaluating whether existing evaluators match real failure modes

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Auditing without checking traces first | Can't assess quality without seeing what the system actually does | Always start by sampling traces |
| Accepting "we have evals" at face value | Having evaluators ≠ having good evaluators | Inspect evaluator prompts, check for validation |
| Skipping the human review check | Ungrounded evaluators are unreliable | Verify domain experts are involved in labeling |
| Recommending fixes without prioritizing | Overwhelms the team, nothing gets done | Order by dependency and impact |
| Auditing once and never again | Eval pipelines drift as the system evolves | Re-audit after significant changes |
| Treating the audit as a checklist | Some areas matter more than others depending on context | Weigh findings by actual impact on this specific pipeline |
