---
name: setup-ci-eval
description: Set up continuous evaluation in CI/CD pipelines that runs regression tests on every prompt or agent change
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Setup CI Eval

Set up continuous evaluation in CI/CD pipelines — automatically run regression tests on every prompt or agent change, post results on PRs, and block merges on quality regressions.

**Companion skills:**
- `regression-test` — the test methodology this CI pipeline automates
- `run-experiment` — the experiment execution that CI triggers
- `build-evaluator` — create evaluators used in CI checks

## When to use

- User wants automated evaluation in their CI/CD pipeline
- User asks about regression testing for prompts or agents
- User wants eval gates on pull requests
- User wants to prevent quality regressions from reaching production
- User asks about continuous evaluation or eval automation

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Experiments API:** https://docs.orq.ai/docs/experiments/creating
- **Experiment runs:** https://docs.orq.ai/docs/experiments/runs
- **Evaluators API:** https://docs.orq.ai/docs/evaluators/api-usage
- **Datasets:** https://docs.orq.ai/docs/datasets/overview

### orq MCP Tools

Use the orq MCP server for experiment operations.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `create_experiment` | Create and run experiments in CI |
| `list_experiment_runs` | Check experiment run progress |
| `get_experiment_run` | Get experiment results for comparison |
| `search_entities` | Find datasets and evaluators |

## Core Principles

### 1. Keep CI Eval Fast
Use a small golden dataset (50-100 datapoints) and focused evaluators. CI should complete in minutes, not hours.

### 2. Threshold From Measured Baseline
Set pass/fail thresholds based on actual measured baseline performance, not arbitrary numbers. "95% pass rate" is meaningless without knowing the baseline.

### 3. Post Results for Visibility
Always post experiment results as a PR comment. Reviewers need to see eval scores alongside code changes.

### 4. Fail Loud
Regressions should block merge, not just warn. A warning that nobody reads provides no value.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Writing CI configuration files into the user's repository
- Modifying existing CI/CD pipeline configurations
- Creating or modifying helper scripts in the repository

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Detect CI/CD System

1. **Identify the CI/CD system** from the codebase:
   - `.github/workflows/` → GitHub Actions
   - `.gitlab-ci.yml` → GitLab CI
   - `Jenkinsfile` → Jenkins
   - `.circleci/config.yml` → CircleCI
   - `bitbucket-pipelines.yml` → Bitbucket Pipelines

2. **If no CI exists**, recommend GitHub Actions as default and confirm with user.

3. **Check for existing eval infrastructure:**
   - Are there existing test workflows?
   - Where are prompt/agent configs stored? (repo files, orq.ai platform, both)
   - How are changes deployed? (manual, CI/CD, platform UI)

### Phase 2: Identify Golden Dataset and Evaluators

4. **Find the golden dataset:**
   - Use `search_entities` with `type: "datasets"` to list datasets
   - If no golden dataset exists, guide user to create one:
     - Reference `generate-synthetic-dataset` for creation
     - Target: 50-100 diverse, representative datapoints
     - Must cover: normal cases, edge cases, known failure modes

5. **Find evaluators:**
   - Use `search_entities` to list existing evaluators
   - If no evaluators exist, reference `build-evaluator`
   - Select evaluators that cover the most critical quality dimensions

### Phase 3: Establish Baseline

6. **Run baseline experiment:**
   - Use `create_experiment` with current prompt/agent configuration
   - Use the golden dataset and selected evaluators
   - Record baseline scores per evaluator

7. **Set thresholds:**
   - Default: baseline score minus 2% margin (e.g., baseline 92% → threshold 90%)
   - Tighter for critical evaluators (safety, compliance): baseline minus 1%
   - Save thresholds to a config file in the repo

   ```json
   {
     "baseline": {
       "date": "2025-01-15",
       "experiment_run_id": "run_abc123",
       "scores": {
         "policy-faithfulness": 0.94,
         "persona-consistency": 0.91,
         "format-compliance": 0.98
       }
     },
     "thresholds": {
       "policy-faithfulness": 0.92,
       "persona-consistency": 0.89,
       "format-compliance": 0.96
     }
   }
   ```

### Phase 4: Generate CI Configuration

8. **Generate CI workflow** based on the detected system. See `resources/github-actions-template.yml` for GitHub Actions.

   The workflow must:
   - Trigger on PRs that modify prompt/agent configuration files
   - Run the golden dataset experiment via orq.ai API
   - Compare scores against thresholds
   - Post results as a PR comment
   - Fail the check on regression

9. **Generate helper scripts:**

   **Experiment runner** (`scripts/run-eval.sh` or `scripts/run_eval.py`):
   ```bash
   #!/bin/bash
   # Run evaluation experiment and compare against baseline
   set -euo pipefail

   EXPERIMENT_ID="${EXPERIMENT_ID:?Set EXPERIMENT_ID}"
   BASELINE_FILE="${BASELINE_FILE:-eval-baseline.json}"

   # Create experiment run
   RUN_ID=$(curl -s https://my.orq.ai/v2/experiments/$EXPERIMENT_ID/runs \
     -H "Authorization: Bearer $ORQ_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{}' | jq -r '.id')

   echo "Started experiment run: $RUN_ID"

   # Poll for completion
   while true; do
     STATUS=$(curl -s https://my.orq.ai/v2/experiments/$EXPERIMENT_ID/runs/$RUN_ID \
       -H "Authorization: Bearer $ORQ_API_KEY" | jq -r '.status')
     if [ "$STATUS" = "completed" ]; then break; fi
     if [ "$STATUS" = "failed" ]; then echo "Run failed"; exit 1; fi
     sleep 10
   done

   # Get results and compare against baseline
   # ... (comparison logic)
   ```

   **Baseline manager** (`scripts/update-baseline.sh`):
   - Updates baseline config from latest successful experiment run
   - See `resources/baseline-config.md` for details

### Phase 5: Write Files

10. **Ask user confirmation** before writing any files.

11. **Write files into the repository:**
    - CI workflow configuration
    - Helper scripts
    - Baseline configuration file
    - `.env.example` with required environment variables

12. **Document required CI secrets:**
    - `ORQ_API_KEY` — orq.ai API key for experiment execution
    - Any other secrets needed for the pipeline

### Phase 6: First Run

13. **Walk through the first manual run:**
    - Run the experiment script locally to verify it works
    - Confirm baseline scores are saved
    - Verify threshold comparison logic

14. **Create a test PR** (optional):
    - Make a minor prompt change
    - Push and verify CI triggers
    - Confirm results are posted as PR comment
    - Confirm pass/fail verdict is correct

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Large golden dataset in CI | Slow, expensive, blocks PRs | Use 50-100 focused datapoints |
| Arbitrary thresholds ("95% sounds good") | Not grounded in measured performance | Set thresholds from actual baseline minus margin |
| Warnings instead of failures | Nobody reads warnings, regressions ship | Fail the build on regression |
| No PR comment | Reviewers don't see eval results | Always post results as PR comment |
| Running eval on every commit | Expensive and slow for non-relevant changes | Trigger only on prompt/agent config changes |
| No baseline update process | Baseline becomes stale after improvements | Provide a script to update baseline after intentional changes |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View experiments:** `https://my.orq.ai/experiments` — monitor CI-triggered experiment runs
- **View datasets:** `https://my.orq.ai/datasets` — review the golden dataset used in CI
- **View evaluators:** `https://my.orq.ai/evaluators` — check evaluator configuration used in CI checks
