---
name: curate-dataset
description: Clean, deduplicate, balance, and augment existing evaluation datasets for higher quality experiments
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Curate Dataset

Clean, deduplicate, balance, and augment existing evaluation datasets — improving experiment reliability through higher quality data.

**Companion skills:**
- `generate-synthetic-dataset` — generate new datapoints to fill coverage gaps
- `run-experiment` — re-run experiments with curated datasets

## When to use

- User wants to improve dataset quality for more reliable experiments
- Experiments show noisy or inconsistent results
- Dataset has grown organically and needs cleanup
- User notices duplicate or contradictory datapoints
- User wants to balance a skewed dataset
- User asks about dataset quality or maintenance

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Datasets overview:** https://docs.orq.ai/docs/datasets/overview
- **Creating datasets:** https://docs.orq.ai/docs/datasets/creating
- **Dataset API:** https://docs.orq.ai/docs/datasets/api
- **Experiments:** https://docs.orq.ai/docs/experiments/creating

### orq.ai Dataset Capabilities
- Datasets contain typed datapoints with input, expected output, metadata, and tags
- Datapoints support bulk operations: create, update, delete
- Datasets can be versioned and tagged
- Experiments run evaluators against dataset datapoints

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `search_entities` | Find datasets (`type: "datasets"`) |
| `create_datapoints` | Add new datapoints to a dataset |
| `update_datapoint` | Modify existing datapoints |
| `delete_datapoints` | Remove datapoints from a dataset |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# List datasets
curl -s https://my.orq.ai/v2/datasets \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Get dataset details
curl -s https://my.orq.ai/v2/datasets/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# List datapoints
curl -s https://my.orq.ai/v2/datasets/<ID>/datapoints \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Delete datapoints (bulk)
curl -s -X DELETE https://my.orq.ai/v2/datasets/<ID>/datapoints \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["dp_1", "dp_2"]}' | jq
```

## Core Principles

### 1. Never Delete Without Confirmation
Always show the user what will be removed before deleting. Deletions are irreversible.

### 2. Balance Matters
Skewed datasets produce misleading eval scores. If 95% of datapoints are easy cases, a 95% pass rate means nothing.

### 3. Coverage Gaps > Quantity
50 well-distributed datapoints beat 200 clustered ones. Focus on covering diverse scenarios, not maximizing count.

### 4. Keep a Changelog
Document every dataset modification: what was changed, why, and when. This enables reproducibility and debugging.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Deleting datapoints from a dataset
- Bulk operations (deduplication, rebalancing) that modify multiple datapoints
- Modifying datapoint content (expected outputs, metadata)

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Fetch and Inventory the Dataset

1. **Find the target dataset:**
   - Use `search_entities` with `type: "datasets"` to find datasets
   - Use HTTP API to get full dataset details and datapoints

2. **Build an inventory:**
   ```
   | Metric | Value |
   |--------|-------|
   | Total datapoints | [N] |
   | Unique inputs | [N] |
   | Duplicate inputs | [N] |
   | With expected output | [N] |
   | Without expected output | [N] |
   | Tags/categories | [list] |
   | Date range | [earliest] - [latest] |
   ```

### Phase 2: Quality Analysis

3. **Duplicate detection:**
   - Exact duplicates: identical input text
   - Near-duplicates: inputs that differ only in whitespace, capitalization, or trivial phrasing
   - Report duplicate groups with counts

4. **Class balance analysis:**
   - Group datapoints by category/tag/difficulty
   - Compute distribution:
     ```
     | Category | Count | Percentage | Assessment |
     |----------|-------|-----------|------------|
     | Easy queries | 150 | 60% | Over-represented |
     | Medium queries | 70 | 28% | Balanced |
     | Hard queries | 20 | 8% | Under-represented |
     | Edge cases | 10 | 4% | Under-represented |
     ```
   - Flag any category below 15% or above 40% as imbalanced

5. **Coverage gap identification:**
   - Map datapoints against expected input dimensions (topic, difficulty, length, edge cases)
   - Identify dimensions with zero or low coverage
   - Compare against real production traffic patterns (if available from `monitor-production`)

6. **Contradictory datapoint detection:**
   - Find datapoints with similar inputs but different expected outputs
   - These indicate labeling errors or ambiguous criteria

7. **Quality scoring per datapoint:**
   - Is the input realistic? (not synthetic-looking noise)
   - Is the expected output correct and complete?
   - Does the metadata/tags accurately describe the datapoint?

### Phase 3: Quality Report

8. **Produce the quality report:**

   ```markdown
   # Dataset Quality Report
   **Dataset:** [name]
   **Total datapoints:** [N]
   **Date:** [date]

   ## Issues Found

   ### Duplicates: [N] duplicate groups ([M] datapoints)
   [List top 5 duplicate groups with example inputs]

   ### Balance Issues
   [Distribution table with flagged categories]

   ### Coverage Gaps
   [List dimensions with missing coverage]

   ### Contradictions: [N] pairs
   [List contradictory datapoint pairs]

   ### Low-Quality Datapoints: [N]
   [List with reasons]

   ## Recommended Actions
   1. Remove [N] exact duplicates
   2. Remove [N] low-quality datapoints
   3. Add [N] datapoints for [underrepresented category]
   4. Resolve [N] contradictions
   ```

### Phase 4: Execute Improvements

9. **Deduplicate** (with user confirmation):
   - Keep the most complete version of each duplicate group
   - Use `delete_datapoints` to remove duplicates
   - Report: "[N] duplicates removed, [M] datapoints remaining"

10. **Remove low-quality datapoints** (with user confirmation):
    - Show each datapoint marked for removal with reason
    - Use `delete_datapoints` after confirmation

11. **Resolve contradictions** (with user input):
    - Present each contradiction pair to the user
    - Ask which expected output is correct
    - Use `update_datapoint` to fix or `delete_datapoints` to remove

12. **Rebalance** (with user confirmation):
    - For over-represented categories: optionally remove excess datapoints
    - For under-represented categories: flag for augmentation in Phase 5

### Phase 5: Fill Coverage Gaps

13. **Generate targeted new datapoints** for gaps:
    - Reference `generate-synthetic-dataset` for methodology
    - Focus on: under-represented categories, missing edge cases, missing difficulty levels
    - Use `create_datapoints` to add new datapoints

14. **Validate new datapoints:**
    - Review generated datapoints for quality
    - Ensure they don't duplicate existing ones
    - Verify expected outputs are correct

### Phase 6: Validate Improvements

15. **Re-run quality analysis:**
    - Repeat Phase 2 on the updated dataset
    - Confirm: duplicates removed, balance improved, coverage gaps filled

16. **Document changes:**
    ```markdown
    ## Dataset Curation Changelog
    **Date:** [date]
    **Before:** [N] datapoints
    **After:** [M] datapoints

    ### Changes
    - Removed [X] exact duplicates
    - Removed [Y] low-quality datapoints
    - Resolved [Z] contradictions
    - Added [W] new datapoints for [categories]
    ```

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Deleting without showing what will be removed | User loses data they may want to keep | Always show and confirm before deleting |
| Only adding more data | Quantity without quality increases noise | Clean existing data first, then add targeted data |
| Ignoring class balance | Skewed data produces misleading eval scores | Analyze and fix distribution before running experiments |
| Automated deduplication without review | Near-duplicates may test different aspects | Show duplicate groups, let user decide |
| No changelog | Can't reproduce or debug dataset state | Document every modification |
| Filling gaps with random synthetic data | Low-quality synthetic data is worse than no data | Use structured generation (dimensions → tuples → natural language) |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View datasets:** `https://my.orq.ai/datasets` — review the curated dataset and its datapoints
- **Run experiments:** `https://my.orq.ai/experiments` — re-run experiments with the improved dataset
