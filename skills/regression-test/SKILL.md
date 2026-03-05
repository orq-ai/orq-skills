---
name: regression-test
description: Run a quick regression check against a golden dataset to verify recent changes haven't degraded quality
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Regression Test

Run a quick regression check against a golden dataset — verify that recent prompt or agent changes haven't degraded quality before deploying.

**Companion skills:**
- `run-experiment` — full experiment workflow (regression-test is the fast version)
- `setup-ci-eval` — automate regression tests in CI/CD
- `build-evaluator` — create evaluators used in regression checks

## When to use

- User just changed a prompt or agent and wants a quick quality check
- Before deploying changes to production
- As part of a code review workflow
- User asks "did my changes break anything?"
- User wants to compare before/after a specific change

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Experiments:** https://docs.orq.ai/docs/experiments/creating
- **Experiment runs:** https://docs.orq.ai/docs/experiments/runs
- **Datasets:** https://docs.orq.ai/docs/datasets/overview
- **Evaluators:** https://docs.orq.ai/docs/evaluators/overview

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `create_experiment` | Create and run regression experiment |
| `list_experiment_runs` | Check experiment progress |
| `get_experiment_run` | Get experiment results |
| `search_entities` | Find datasets, evaluators, deployments |

## Core Principles

### 1. Keep It Fast
This is the unit test of LLM evaluation. 50-100 datapoints, targeted evaluators, results in minutes. For comprehensive evaluation, use `run-experiment`.

### 2. Binary Pass/Fail Verdict
No ambiguous "looks about the same." Either the change passes regression (all scores above threshold) or it fails (any score below threshold).

### 3. Store Baselines as Version-Controlled JSON
Baselines should live in the repo alongside prompt/agent configs. When you promote a change, update the baseline.

### 4. This Is the Unit Test; run-experiment Is the Integration Test
Regression test catches obvious regressions fast. Full experiments catch subtle quality shifts. Both are needed.

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Identify Target and Golden Dataset

1. **Identify what changed:**
   - Which deployment, agent, or prompt was modified?
   - What specifically changed? (instructions, model, tools, parameters)
   - Use `search_entities` to find the target resource

2. **Find the golden dataset:**
   - Use `search_entities` with `type: "datasets"` to find the regression dataset
   - If no golden dataset exists:
     - Recommend creating one (reference `generate-synthetic-dataset`)
     - Target: 50-100 diverse, representative datapoints
     - Must include known failure modes and edge cases
     - **Do not proceed without a golden dataset**

3. **Find evaluators:**
   - Use `search_entities` to find evaluators associated with the target resource
   - If no evaluators exist, reference `build-evaluator`
   - Select evaluators that cover the most critical quality dimensions

### Phase 2: Run Regression Experiment

4. **Create and run the experiment:**
   - Use `create_experiment` with the golden dataset and evaluators
   - Configure for the current (changed) version of the prompt/agent

5. **Wait for results:**
   - Use `list_experiment_runs` to monitor progress
   - Use `get_experiment_run` to fetch results when complete

### Phase 3: Compare Against Baseline

6. **Load baseline scores:**
   - Check for a baseline file in the repo (e.g., `eval-baseline.json`)
   - If no baseline exists, this run becomes the baseline:
     - Save current scores as the first baseline
     - Report: "No baseline found. Establishing baseline from this run."
     - **There is no pass/fail verdict without a baseline**

7. **Compare scores:**

   ```
   | Evaluator | Baseline | Current | Delta | Verdict |
   |-----------|----------|---------|-------|---------|
   | Policy faithfulness | 94% | 96% | +2% | PASS |
   | Persona consistency | 91% | 88% | -3% | FAIL |
   | Format compliance | 98% | 97% | -1% | PASS |
   ```

   **Verdict logic:**
   - PASS: current score >= threshold (baseline minus margin)
   - FAIL: current score < threshold
   - Default margin: 2% below baseline

### Phase 4: Produce Verdict

8. **Generate the regression report:**

   ```markdown
   # Regression Test Results
   **Target:** [deployment/agent name]
   **Change:** [what was modified]
   **Dataset:** [golden dataset name] ([N] datapoints)
   **Date:** [date]

   ## Verdict: [PASS / FAIL]

   ## Scores
   | Evaluator | Baseline | Current | Delta | Status |
   |-----------|----------|---------|-------|--------|
   | ... | ... | ... | ... | ... |

   ## Regressions (if any)
   - **[Evaluator name]**: dropped from [X%] to [Y%] (-[Z]%)
     - Example failing datapoints: [IDs]

   ## Recommendation
   [Promote / Investigate regressions / Revert]
   ```

9. **If PASS:**
   - Report confidence: "All evaluators above threshold. Safe to deploy."
   - Offer to update baseline with new scores (if improvement detected)

10. **If FAIL:**
    - Report which evaluators regressed and by how much
    - Show example failing datapoints from the regression
    - Recommend: investigate the specific regression, or revert the change
    - Reference `trace-analysis` for deeper investigation

### Phase 5: Update Baseline (Optional)

11. **If the user promotes the change**, offer to update the baseline:
    - Save new scores to the baseline file
    - Version-control the update alongside the prompt/agent change
    - Format:
      ```json
      {
        "date": "2025-01-15",
        "experiment_run_id": "run_xyz789",
        "scores": {
          "policy-faithfulness": 0.96,
          "persona-consistency": 0.88,
          "format-compliance": 0.97
        }
      }
      ```

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Large dataset in regression test | Too slow for quick checks | Use 50-100 focused datapoints |
| No baseline | Can't tell if scores are good or bad | Establish baseline before making changes |
| Soft failures ("looks about the same") | Ambiguous verdicts don't drive action | Binary PASS/FAIL with clear thresholds |
| Running all evaluators | Slows down the check, most aren't relevant | Use only evaluators relevant to the change |
| Never updating baseline | Baseline becomes stale after improvements | Update baseline when promoting intentional improvements |
| Skipping regression after "small" changes | Small changes can cause big regressions | Always run regression before deploying |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View experiment results:** `https://my.orq.ai/experiments` — review the regression test run and compare against baseline
- **View datasets:** `https://my.orq.ai/datasets` — inspect the golden dataset used for regression testing
