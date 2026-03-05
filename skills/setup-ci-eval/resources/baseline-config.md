# Baseline Configuration Guide

How to set up and maintain evaluation baselines for CI regression testing.

---

## What Is a Baseline?

A baseline is a snapshot of evaluation scores from a known-good configuration. CI compares new scores against the baseline to detect regressions.

## Baseline File Format

Store baselines as JSON in your repository (e.g., `eval-baseline.json`):

```json
{
  "date": "2025-01-15",
  "experiment_run_id": "run_abc123",
  "prompt_version": "v2.3",
  "model": "gpt-4.1",
  "scores": {
    "policy-faithfulness": 0.94,
    "persona-consistency": 0.91,
    "format-compliance": 0.98
  },
  "thresholds": {
    "policy-faithfulness": 0.92,
    "persona-consistency": 0.89,
    "format-compliance": 0.96
  }
}
```

### Fields

| Field | Description |
|-------|-------------|
| `date` | When the baseline was established |
| `experiment_run_id` | The experiment run that produced these scores |
| `prompt_version` | The prompt version at the time of baseline |
| `model` | The model used for the baseline run |
| `scores` | Evaluator pass rates from the baseline experiment |
| `thresholds` | Minimum acceptable scores (baseline minus margin) |

## Setting Thresholds

Default: **baseline score minus 2% margin**.

```
threshold = baseline_score - 0.02
```

For critical evaluators (safety, compliance), use a tighter margin:

```
threshold = baseline_score - 0.01
```

## Establishing the Initial Baseline

1. Run an experiment with the current (known-good) configuration
2. Record scores for each evaluator
3. Set thresholds as described above
4. Save to `eval-baseline.json` and commit

```bash
# Example: update-baseline.sh
#!/bin/bash
set -euo pipefail

EXPERIMENT_ID="${1:?Usage: update-baseline.sh <experiment_id> <run_id>}"
RUN_ID="${2:?Usage: update-baseline.sh <experiment_id> <run_id>}"
BASELINE_FILE="eval-baseline.json"
MARGIN=0.02

# Fetch run results
RESULTS=$(curl -s "https://my.orq.ai/v2/experiments/$EXPERIMENT_ID/runs/$RUN_ID" \
  -H "Authorization: Bearer $ORQ_API_KEY")

# Extract scores and compute thresholds
# Customize this based on your experiment output format
echo "$RESULTS" | jq --arg date "$(date -I)" --argjson margin "$MARGIN" '{
  date: $date,
  experiment_run_id: .id,
  scores: .scores,
  thresholds: (.scores | to_entries | map({
    key: .key,
    value: ((.value - $margin) | . * 100 | round / 100)
  }) | from_entries)
}' > "$BASELINE_FILE"

echo "Baseline updated: $BASELINE_FILE"
cat "$BASELINE_FILE" | jq .
```

## Updating the Baseline

Update the baseline when:
- You intentionally improve a prompt/agent and want the improvement reflected
- You add new evaluators to the golden dataset
- The current baseline is stale (>3 months old)

**Do NOT update the baseline to "fix" a failing CI check.** If CI fails, investigate the regression first.

### Update Process

1. Verify the new scores are intentional improvements (not regressions accepted lazily)
2. Run the update script
3. Commit the new baseline alongside the prompt/agent changes
4. The PR should show both the config change and the baseline update

## Version Control

- **Always commit baselines to the repository** — they should travel with the code
- **Commit baseline updates in the same PR as the prompt/agent change** — keeps changes atomic
- **Never update baselines in a separate PR** — loses the connection between change and baseline

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| CI fails on first run | No baseline file exists | Run update-baseline.sh to create initial baseline |
| Scores fluctuate between runs | Non-determinism in LLM output | Run 3-5 experiment runs and average scores for baseline |
| Threshold too tight | Small margin causes false failures | Increase margin for noisy evaluators (0.03-0.05) |
| Baseline stale after improvements | Forgot to update after promoting changes | Always update baseline when promoting intentional improvements |
