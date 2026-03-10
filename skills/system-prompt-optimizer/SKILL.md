---
name: system-prompt-optimizer
description: Automated prompt optimization using orq.ai's PO1 analyzer and PO2 rewriter deployments
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# System Prompt Optimizer

Automated prompt optimization using orq.ai's PO1 (analyzer) and PO2 (rewriter) deployments — get AI-powered analysis and rewriting of system prompts without manual trace analysis.

**Companion skills:**
- `optimize-prompt` — manual, trace-driven prompt optimization (use when you need fine-grained control)
- `run-experiment` — validate optimized prompts with A/B experiments
- `manage-deployment` — configure deployments with the optimized prompt

## When to use

- User wants quick, automated prompt improvement without trace analysis
- User asks "optimize my prompt" or "make my prompt better" and doesn't have trace data
- User has a prompt that needs general improvement (clarity, structure, effectiveness)
- User wants AI-powered suggestions for prompt improvements
- User wants to rewrite a prompt with specific optimization instructions

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Prompts overview:** https://docs.orq.ai/docs/prompts/overview
- **Prompt management:** https://docs.orq.ai/docs/prompts/management
- **Prompt versioning:** https://docs.orq.ai/docs/prompts/versioning
- **Deployments overview:** https://docs.orq.ai/docs/deployments/overview
- **Experiments:** https://docs.orq.ai/docs/experiments/creating

### orq.ai Prompt Optimizer Deployments

orq.ai provides two specialized deployments for automated prompt optimization:

- **PO1 (Analyzer):** Analyzes a prompt and produces structured suggestions for improvement
- **PO2 (Rewriter):** Rewrites a prompt based on optimization instructions

These are invoked via the deployment invoke HTTP API, not via MCP tools.

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `search_entities` | Find prompts (`type: "prompts"`) and deployments |

**HTTP API** (required for PO1/PO2 invocation):

```bash
# Invoke PO1 (Analyzer) — analyze a prompt and get suggestions
curl -s https://api.orq.ai/v2/deployments/invoke \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "<PO1_DEPLOYMENT_KEY>",
    "context": {
      "variables": {
        "prompt": "<SYSTEM_PROMPT_TEXT>"
      }
    }
  }' | jq

# Invoke PO2 (Rewriter) — rewrite a prompt with instructions
curl -s https://api.orq.ai/v2/deployments/invoke \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "<PO2_DEPLOYMENT_KEY>",
    "context": {
      "variables": {
        "input_instructions": "<OPTIMIZATION_INSTRUCTIONS>",
        "prompt": "<SYSTEM_PROMPT_TEXT>"
      }
    }
  }' | jq

# Get prompt details with versions
curl -s https://my.orq.ai/v2/prompts/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Create a new prompt version
curl -s -X POST https://my.orq.ai/v2/prompts/<ID>/versions \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [...], "model": "...", "parameters": {...}}' | jq
```

### PO1/PO2 Input/Output Schemas

**PO1 (Analyzer):**
- **Input:** `prompt` variable containing the full system prompt text. **Important:** Template variables in the prompt must be rendered as `{{variable_name}}` literally — do NOT substitute the variable content. Other variables should be left at their default values.
- **Tool calling:** If the prompt contains tool/function definitions, include them as-is. PO1 is aware of tool calling and will not suggest removing tools from the prompt.
- **Output:** JSON object with the following schema:
  ```json
  {
    "analysis": "A detailed analysis of the prompt's strengths and weaknesses",
    "suggestions": [
      "An array of strings with suggested improvements for the prompt",
      "Contains up to five suggestions"
    ]
  }
  ```
  Uses response format JSON schema:
  ```json
  {
    "name": "AnalysisAndSuggestions",
    "schema": {
      "type": "object",
      "properties": {
        "analysis": { "type": "string" },
        "suggestions": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["analysis", "suggestions"],
      "additionalProperties": false
    },
    "strict": true
  }
  ```

**PO2 (Rewriter):**
- **Input:** `input_instructions` (the optimization directives — e.g., selected PO1 suggestions or user-written instructions) + `prompt` (the original system prompt text, with template variables rendered as `{{variable_name}}` literally). Other variables should be left at their default values.
- **Output:** The optimized system prompt text as the assistant's message (plain text, not JSON)

> **Note:** Use `search_entities` with `type: "deployment"` to find the PO1 and PO2 deployments in the workspace. Do not hardcode deployment keys.

### Prompting Guidelines (PO1/PO2 Evaluation Framework)

PO1 and PO2 evaluate prompts against a specific set of prompting guidelines. Understanding these helps interpret suggestions and apply them correctly:

1. **Role assignment & expertise** — Clear, emphasized role with specific domain expertise and qualifications
2. **Task definition** — Clear explanation of what will be done
3. **Stress induction** — Emphasis on the importance and criticality of the task
4. **Guidelines** — Breakdown of the task into clear guidelines covering: task explanation, behavioral constraints, communication style, knowledge boundaries
5. **Output format** — Specified and stressed output format. For PO1: if tools are present, they provide their own format so no additional output format is needed
6. **Tool calling** — If tools/functions are mentioned, they are part of the task. PO1 will **never** suggest removing tools. PO2 treats tool calling more softly — it will keep tools in their original state but may suggest adjustments
7. **Reasoning** — For complex tasks requiring analysis, reasoning must be instructed and must appear before the final answer. If reasoning is instructed but the output format has no space for it, PO1/PO2 will suggest adding one (e.g., a `reasoning` key in JSON)
8. **Examples** — Few-shot examples using `<example>` XML tags to demonstrate desired behavior, with proper variable formatting inside
9. **Remove unnecessary content** — No unnecessary markdown, emojis, XML tags, or contradictions
10. **Proper variable usage** — Variables with `{{double curly brackets}}` should only appear once near the end; earlier references should use XML tags
11. **Recap** — A one-sentence recap of the task and format at the end of the prompt

When presenting PO1/PO2 suggestions to the user, reference which guideline each suggestion targets to help them understand the reasoning.

### Model Configuration

PO1 supports different model tiers for analysis speed vs quality. When invoking PO1, the user may choose:
- **Fast** (default): Uses a faster model for quicker analysis
- **Slow**: Uses a smarter model for deeper analysis
- **Custom**: User selects a specific model from their model garden

PO2 always requires a capable model to correctly apply changes — do not downgrade the PO2 model.

## Core Principles

### 1. Analyze Before Rewriting (Quick Optimize)
For Quick Optimize, always run PO1 analysis first to understand what needs improvement. Blind rewriting without analysis can lose important prompt qualities. For Advanced Optimize, the user provides their own instructions — PO1 analysis is optional but recommended.

### 2. Human in the Loop
Never apply an optimized prompt without user review. Always show a diff between original and optimized versions and get explicit approval.

### 3. Preserve Intent
The optimizer should improve how the prompt is expressed, not change what it does. Always verify the optimized prompt preserves the original intent, persona, and constraints.

### 4. Validate with Experiments
Automated optimization is a hypothesis. Always validate with an A/B experiment before promoting to production.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Creating a new prompt version with the optimized prompt
- Modifying a deployment's prompt configuration
- Promoting an optimized prompt version to production

## Steps

Follow these steps **in order**. Do NOT skip steps.

Choose the appropriate workflow based on the user's needs:
- **Quick Optimize** (default): PO1 analysis → review suggestions → PO2 rewrite → diff → apply (~20-30 seconds total)
- **Advanced Optimize**: User provides specific instructions → PO2 rewrite → diff → apply

### Quick Optimize Workflow

#### Phase 1: Fetch the Current Prompt

1. **Find and retrieve the target prompt:**
   - Use `search_entities` with `type: "prompts"` to find the target prompt
   - Use HTTP API to get full prompt details including current version text
   - Document: prompt name, current version, system message content, model, parameters

2. **Extract the system prompt text** that will be sent to PO1 for analysis.

#### Phase 2: Analyze with PO1

3. **Invoke PO1 to analyze the prompt:**
   - Send the system prompt text to the PO1 deployment
   - Parse the structured response: `analysis` and `suggestions[]`

4. **Present PO1 results to the user:**
   ```
   ## Prompt Analysis

   **Analysis:** [PO1 analysis text]

   ### Suggestions
   1. [Suggestion 1 text]
   2. [Suggestion 2 text]
   3. [Suggestion 3 text]
   4. [Suggestion 4 text]
   5. [Suggestion 5 text]
   ```

5. **Ask the user which suggestions to apply:**
   - User may accept all, select specific ones, or modify suggestions
   - The accepted suggestions will be used as `input_instructions` for PO2

#### Phase 3: Rewrite with PO2

6. **Construct PO2 input instructions** from accepted PO1 suggestions:
   - Combine selected suggestions into clear optimization directives
   - Add any additional user instructions

7. **Invoke PO2 to rewrite the prompt:**
   - Send `input_instructions` (compiled suggestions) and `prompt` (original text) to PO2
   - Receive the optimized prompt text

8. **Present a diff to the user:**
   - Show the original and optimized prompts side by side
   - Highlight key changes and which suggestions they address
   - Ask for user approval before proceeding

#### Phase 4: Apply and Validate

9. **Create a new prompt version** (with user confirmation):
   - Use HTTP API to create a new version on the existing prompt
   - Document the version number and what was optimized

10. **Recommend validation:**
    - Suggest running an A/B experiment using `run-experiment`
    - Compare original version vs optimized version on a representative dataset
    - Only promote to production after experiment confirms improvement

### Advanced Optimize Workflow

#### Phase 1: Fetch the Current Prompt

1. **Same as Quick Optimize Phase 1** — find and retrieve the target prompt.

#### Phase 2: Collect User Instructions

2. **Ask the user for specific optimization instructions:**
   - What aspects should be improved? (clarity, tone, constraints, format)
   - What should be preserved? (persona, specific rules, examples)
   - Any specific rewording requests?

#### Phase 3: Rewrite with PO2

3. **Invoke PO2 directly** with user-provided instructions:
   - Send `input_instructions` (user directives) and `prompt` (original text) to PO2
   - Receive the optimized prompt text

4. **Present a diff to the user:**
   - Show original and optimized prompts side by side
   - Verify the optimization matches user instructions
   - Ask for user approval

#### Phase 4: Apply and Validate

5. **Same as Quick Optimize Phase 4** — create version, recommend experiment.

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Applying PO2 output without review | Automated rewriting can change intent or remove important constraints | Always show a diff and get user approval |
| Skipping PO1 analysis | Rewriting without understanding the issues can make prompts worse | Run PO1 first to understand what needs improvement |
| Using optimizer instead of trace analysis | Automated optimization misses application-specific failure patterns | Use `optimize-prompt` when you have trace data showing specific failures |
| Optimizing without validation | No way to know if the "optimized" prompt is actually better | Always run an A/B experiment before promoting |
| Running PO2 repeatedly on the same prompt | Each pass can drift further from the original intent | Optimize once, validate, then iterate if needed |
| Ignoring PO1 low-priority suggestions | Some low-priority suggestions compound into significant improvements | Review all suggestions, prioritize, but don't dismiss |
| Not preserving the original version | No rollback path if the optimization regresses | Always create a new version, keep the original intact |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View/edit the prompt:** `https://my.orq.ai/prompts` — review original and optimized versions
- **View experiment results:** `https://my.orq.ai/experiments` — compare original vs optimized prompt performance
- **View deployments:** `https://my.orq.ai/deployments` — update deployment to use the optimized prompt
