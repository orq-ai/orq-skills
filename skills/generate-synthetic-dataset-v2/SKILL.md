---
name: generate-synthetic-dataset-v2
description: Deployment-based synthetic data generation — create datasets from descriptions or expand existing datasets with few-shot examples
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Generate Synthetic Dataset V2

Deployment-based synthetic data generation with two modes: create datasets from scratch via description, or expand existing datasets using few-shot examples. Uses an orq.ai deployment to automate generation.

**Companion skills:**
- `generate-synthetic-dataset` — manual methodology guide (use when you need full control over dimensions and tuples)
- `curate-dataset` — clean, deduplicate, and validate generated datasets
- `run-experiment` — run experiments against the generated dataset

## When to use

- User wants quick dataset generation from a description
- User wants to expand a small existing dataset with more diverse examples
- User asks "generate me a dataset" or "I need more test data"
- User has a few examples and wants to scale up
- For full manual control over dimensions and tuples, use `generate-synthetic-dataset` instead

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Datasets overview:** https://docs.orq.ai/docs/datasets/overview
- **Creating datasets:** https://docs.orq.ai/docs/datasets/creating
- **Datasets API:** https://docs.orq.ai/docs/datasets/api-usage
- **Deployments overview:** https://docs.orq.ai/docs/deployments/overview

### orq.ai Dataset Structure
- Datasets contain three optional components: **Inputs** (prompt variables), **Messages** (system/user/assistant), and **Expected Outputs** (references for evaluator comparison)
- You don't need all three — use what you need for your eval type
- Datasets are project-scoped and reusable across experiments

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `create_dataset` | Create a new evaluation dataset |
| `create_datapoints` | Add generated datapoints to a dataset |
| `list_models` | List available models for generation |
| `search_entities` | Find existing datasets and deployments |

**HTTP API** (required for deployment invocation and dataset operations):

```bash
# Mode 1: Create from scratch — invoke generation deployment
curl -s https://api.orq.ai/v2/deployments/invoke \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "<GENERATION_DEPLOYMENT_KEY>",
    "context": {
      "variables": {
        "description": "<DATASET_DESCRIPTION>",
        "expected_output": false,
        "no_of_points": 10
      }
    }
  }' | jq

# Mode 2: Expand existing — same deployment with appended messages
# Uses the same main prompt as Mode 1, with variables left empty
# and assistant+user messages appended for few-shot context
curl -s https://api.orq.ai/v2/deployments/invoke \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "<GENERATION_DEPLOYMENT_KEY>",
    "context": {
      "variables": {
        "description": "",
        "expected_output": "",
        "no_of_points": ""
      }
    },
    "messages": [
      {"role": "assistant", "content": "<JSON_STRING_OF_EXISTING_DATAPOINTS>"},
      {"role": "user", "content": "Generate <K> additional points based on the previous datapoints. Important: Be creative and ensure variety across all new points. Generate new points based on the distribution of the data previously made: if all previous datapoints share a common theme or category, generate variations of that exact theme or category. Return only the new points, no explanations."}
    ]
  }' | jq

# List datapoints in an existing dataset
curl -s "https://my.orq.ai/v2/datasets/<DATASET_ID>/datapoints" \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# List datasets
curl -s https://my.orq.ai/v2/datasets \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq
```

### Generation Deployment Configuration

Use `search_entities` with `type: "deployment"` to find the synthetic data generation deployment in the workspace. Do not hardcode deployment keys.

**Mode 1 — Create from scratch:**

Input variables:
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `description` | string | — | Description of the dataset. Should be contextual and clear. Include real-world data for grounding. If the dataset is for testing an LLM, include the actual system prompt — the deployment uses it as context. Explicitly name the variable names you want in the output `inputs` object. |
| `expected_output` | bool | `false` | Whether to generate expected outputs for each datapoint |
| `no_of_points` | int | `10` | Number of datapoints to generate |

Output: JSON array of datapoint objects:
```json
[
  {
    "inputs": {
      "category": "[concise description of the edge case or scenario being tested]",
      "variable_name_1": "[content]",
      "variable_name_2": "[content]"
    },
    "expected_output": "[fitting expected output string if expected_output is true, otherwise null]"
  }
]
```

**Output format rules:**
- `category` must be the **first key** in the `inputs` object. It describes the specific edge case or scenario the datapoint tests (e.g., "Testing extremely long input", "Refund Request", "Medical advice"). Multiple datapoints can share a category but each must be distinct.
- Variable names must be **descriptive and consistent** across all datapoints.
- The deployment maximizes diversity by varying input length — longer, more challenging inputs are preferred.
- Output is valid JSON only — no preamble or explanations.

**Mode 2 — Expand existing dataset:**

Uses the **same deployment and main prompt** as Mode 1, with variables left empty and additional messages appended for few-shot context:
- **Assistant message:** JSON string of up to 15 existing datapoints (selected by user or randomly chosen), in the same format as the output above. Randomize order to improve variety. Check total token length against context window (~2500 tokens / ~10,000 chars for examples).
- **User message:** `"Generate <K> additional points based on the previous datapoints. Important: Be creative and ensure variety across all new points. Generate new points based on the distribution of the data previously made: if all previous datapoints share a common theme or category, generate variations of that exact theme or category. Return only the new points, no explanations."`
- **Output:** Same JSON array format as Mode 1, containing only the new points.

**Important considerations:**
- Datapoints can be very long — always check total example token length against context window limits before invoking
- If a single datapoint exceeds half the context window, generation may fail
- If `finish_reason` is `"length"`, the generation was truncated — retry with fewer `no_of_points` or use the generated points as new few-shot examples for a continuation call
- Messages (system/user/assistant conversation format) are not generated — only inputs and expected outputs

## Core Principles

### 1. Deployment Automates, You Validate
The deployment generates data quickly, but every generated datapoint must be reviewed for quality. Automated generation trades manual effort for review effort — never skip the review.

### 2. Description Quality Drives Output Quality
The generation deployment relies on the description you provide. A vague description produces generic, clustered data. A detailed description with real-world context, the actual LLM prompt being tested, explicit variable names, and diversity guidance produces much better results. The deployment will vary input lengths and create challenging scenarios automatically, but only if the description gives it enough context to do so meaningfully.

### 3. Few-Shot Quality Over Quantity
When expanding datasets, the quality of few-shot examples determines the quality of generated data. Choose representative, diverse examples — not just the easiest ones.

### 4. Validate Category Coverage
After generation, check that the generated data covers a diverse range of categories and edge cases. Automated generation can be biased toward common patterns.

## Steps

Follow these steps **in order**. Do NOT skip steps.

Choose the appropriate mode based on the user's needs:
- **Mode 1 — Create from scratch:** No existing dataset, generate from a description
- **Mode 2 — Expand existing:** Has a small dataset, wants to scale up

### Mode 1: Create from Scratch

#### Phase 1: Define the Dataset

1. **Understand the target use case.** Ask the user:
   - What LLM pipeline/agent/deployment is this dataset for?
   - What is the system prompt / persona / task?
   - What does a good input/output pair look like?
   - How many datapoints are needed?
   - Do they need expected outputs generated?

#### Phase 2: Craft the Description

2. **Write a high-quality description** for the generation deployment. The description is the primary input — its quality directly determines output quality:
   - Be contextual and clear about what kind of data is needed
   - **Include the actual system prompt** if the dataset is for testing an LLM — the deployment uses it as context to generate relevant scenarios
   - **Include real-world data examples** for grounding — the deployment incorporates these to make generated data more realistic
   - **Explicitly name the variable names** you want in the output `inputs` object — the deployment adheres to these
   - Describe the types of inputs and their expected variation

   Present the draft description to the user for validation before invoking.

3. **Decide on expected outputs:**
   - Does the user need expected outputs (reference answers) for evaluator comparison?
   - Set `expected_output` to `true` or `false` accordingly

#### Phase 3: Generate via Deployment

4. **Invoke the generation deployment:**
   - Send `description`, `expected_output`, and `no_of_points` to the deployment
   - Use batches if generating more than 20 datapoints (invoke multiple times with `no_of_points` = 10-20)
   - Parse the JSON array response

5. **Review generated datapoints:**
   - Check for quality: are inputs realistic? Are expected outputs correct?
   - Check for diversity: do categories cover a range of scenarios and edge cases?
   - Check for duplicates or near-duplicates
   - Remove or regenerate low-quality datapoints

   ```
   | Metric | Value |
   |--------|-------|
   | Generated | [N] |
   | Accepted | [N] |
   | Rejected (quality) | [N] |
   | Rejected (duplicate) | [N] |
   | Categories covered | [list] |
   ```

6. **Fill gaps if needed:**
   - If important scenarios or edge cases are missing, invoke again with an updated description targeting those gaps
   - The deployment generates diverse, challenging data — but it may miss domain-specific edge cases only the user would know about

#### Phase 4: Create on orq.ai

7. **Create the dataset:**
   - Use `create_dataset` with a descriptive name and description
   - Use `create_datapoints` to add all validated datapoints

8. **Verify the dataset:**
   - Confirm all datapoints were created successfully
   - Review a sample for final quality check

   ```
   Dataset: [name]
   Datapoints: [N]
   Categories: [list of distinct categories]
   Expected outputs: [yes/no]
   ```

### Mode 2: Expand Existing Dataset

#### Phase 1: Load and Analyze Existing Dataset

1. **Find the existing dataset:**
   - Use `search_entities` to find the target dataset
   - Use HTTP API to list all datapoints in the dataset
   - **Edge case:** If the dataset is empty (no datapoints), fall back to Mode 1 (create from scratch) instead

2. **Analyze the current data:**
   - How many datapoints exist?
   - What categories are represented?
   - Where are the gaps?
   - What's the quality level of existing data?

   ```
   Current dataset: [name]
   Datapoints: [N]
   Categories: [list with counts]
   Gaps: [underrepresented scenarios or missing edge cases]
   ```

#### Phase 2: Identify Expansion Strategy

3. **Determine what to generate:**
   - **Fill gaps:** Generate datapoints for underrepresented categories
   - **Add diversity:** Generate variations of existing patterns
   - **Scale up:** Proportionally expand across categories

4. **Select few-shot examples** from the existing dataset:
   - If the user has selected specific datapoints, use those (randomize order for variety)
   - If no selection, randomly sample up to **15** existing datapoints
   - Check total token length of examples (~2500 tokens / ~10,000 chars max)
   - Trim if needed — prioritize diverse, high-quality examples

#### Phase 3: Generate and Validate

5. **Invoke the generation deployment with message history:**
   - Format selected datapoints as a JSON string in the **assistant message**
   - Add a **user message** requesting K new points (default K=5)
   - The deployment generates new points based on the distribution of the provided examples
   - Generate in batches for intermediate review

6. **Validate generated datapoints against existing data:**
   - Check for duplicates or near-duplicates with existing datapoints
   - Verify style consistency with existing data
   - Check that new datapoints maintain the same quality standard
   - Ensure new data actually fills the identified gaps

7. **Review after expansion:**
   ```
   | Category | Before | After | Change |
   |----------|--------|-------|--------|
   | [cat 1]  | [N]    | [N]   | +[N]   |
   | [cat 2]  | [N]    | [N]   | +[N]   |
   | Total    | [N]    | [N]   | +[N]   |
   ```

#### Phase 4: Add to Dataset

8. **Add validated datapoints to the existing dataset:**
   - Use `create_datapoints` to add new datapoints
   - Do NOT create a new dataset — expand the existing one

9. **Final verification:**
   - Confirm all datapoints were added
   - Review the expanded dataset
   - Ensure no duplicates were introduced

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Writing a vague description | Produces repetitive, clustered data | Write detailed descriptions with real-world context, the actual LLM prompt, and explicit variable names |
| Skipping quality review of generated data | Automated generation can produce low-quality outputs that poison your eval | Review every datapoint before adding to the dataset |
| Using too few few-shot examples for expansion | Too few examples bias the generation toward those specific patterns | Use up to 15 diverse, high-quality examples (randomized order) for best results |
| Generating all datapoints in one batch | No opportunity for intermediate review or course correction | Generate in batches of 10-20, review between batches |
| Not checking for duplicates with existing data | Inflates dataset size without adding diversity | Always deduplicate against existing datapoints |
| Ignoring category coverage after generation | Generated data may cluster on common patterns | Review categories and fill gaps with targeted follow-up generations |
| Using V2 when manual methodology is needed | Deployment-based generation trades control for speed | Use `generate-synthetic-dataset` when you need full control over each tuple |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View datasets:** `https://my.orq.ai/datasets` — review the generated or expanded dataset
- **Run experiments:** `https://my.orq.ai/experiments` — test your pipeline against the new dataset
- **View deployments:** `https://my.orq.ai/deployments` — check the generation deployment configuration
