---
name: manage-deployment
description: Configure, version, and manage orq.ai deployments — model selection, prompt linking, fallbacks, caching, and guardrails
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Manage Deployment

Configure, version, and manage orq.ai deployments — select models, link prompts, set up fallback chains, enable caching, and attach evaluator guardrails.

**Companion skills:**
- `list-models` — compare models for optimal selection
- `build-evaluator` — create evaluators to use as guardrails
- `optimize-prompt` — improve prompts linked to deployments

## When to use

- User needs to create or update a deployment on orq.ai
- User wants to configure model fallbacks for reliability
- User wants to enable response caching for cost savings
- User wants to attach evaluator guardrails to a deployment
- User asks about deployment configuration or best practices
- User needs to link a prompt version to a deployment

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Deployments overview:** https://docs.orq.ai/docs/deployments/overview
- **Creating deployments:** https://docs.orq.ai/docs/deployments/creating
- **Deployment variants:** https://docs.orq.ai/docs/deployments/variants
- **Fallbacks:** https://docs.orq.ai/docs/deployments/fallbacks
- **Caching:** https://docs.orq.ai/docs/deployments/caching
- **Guardrails:** https://docs.orq.ai/docs/deployments/guardrails
- **Model Garden:** https://docs.orq.ai/docs/models/model-garden
- **Prompts:** https://docs.orq.ai/docs/prompts/overview

### orq.ai Deployment Capabilities
- Deployments are the primary interface for serving LLM responses
- Each deployment links to a prompt configuration with a specific model
- Fallback chains: if model A fails, automatically try model B
- Response caching reduces cost and latency for repeated queries
- Guardrails: attach evaluators as pre/post filters with pass/fail thresholds
- Deployments support versioning — create variants for A/B testing

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `search_entities` | Find deployments (`type: "deployment"`), prompts, evaluators |
| `list_models` | List available models for deployment configuration |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# List deployments
curl -s https://my.orq.ai/v2/deployments \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Get deployment details
curl -s https://my.orq.ai/v2/deployments/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Invoke a deployment (for testing)
curl -s https://api.orq.ai/v2/deployments/invoke \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "<KEY>", "messages": [{"role": "user", "content": "Hello"}]}' | jq
```

## Core Principles

### 1. Always Configure Fallbacks
Production deployments MUST have at least one fallback model. Provider outages happen — a fallback chain keeps your application running.

### 2. Attach Guardrails for Production
Production-facing deployments should have evaluator guardrails. These catch bad responses before they reach users.

### 3. Test Before Promoting
Never push a deployment configuration to production without testing. Use the invoke API to verify behavior with representative inputs.

### 4. Version Everything
Never modify a live deployment in-place. Create a new variant, test it, then promote. The old configuration remains as rollback.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Modifying a production deployment's model, prompt, or parameters
- Removing or changing fallback configurations
- Removing or modifying guardrails on a live deployment
- Deleting a deployment

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Assess Current State

1. **List existing deployments:**
   - Use `search_entities` with `type: "deployment"` to discover deployments
   - Use HTTP API to get full deployment details
   - Document: deployment key, linked prompt, model, parameters, fallbacks, guardrails

2. **Understand the context:**
   - Is this a new deployment or modifying an existing one?
   - What is the deployment's purpose? (production, staging, testing)
   - What are the requirements? (latency, cost, quality)

### Phase 2: Configure the Deployment

3. **Select the model:**
   - Use `list_models` to see available models
   - Match model capabilities to requirements:

   | Requirement | Model Guidance |
   |------------|----------------|
   | Highest quality | GPT-4.1, Claude Sonnet 4.5, Gemini 2.5 Pro |
   | Speed + quality balance | GPT-4.1-mini, Claude Haiku 4.5 |
   | Cost optimization | GPT-4.1-mini, Claude Haiku 4.5, open source |
   | Reasoning tasks | Claude Sonnet 4.5, GPT-4.1, Gemini 2.5 Pro |

4. **Link the prompt:**
   - Select the prompt and version to use
   - Verify prompt template variables match the deployment's input schema
   - If no prompt exists, guide the user to create one (reference `optimize-prompt`)

5. **Configure parameters:**
   - `temperature`: 0.0-0.3 for factual/deterministic, 0.5-0.8 for creative
   - `max_tokens`: Set based on expected output length + buffer
   - `top_p`: Usually leave at 1.0 unless specific needs

### Phase 3: Set Up Fallbacks

6. **Configure fallback chain:**
   - Primary model: best quality/speed match for the use case
   - Fallback 1: same-tier alternative provider (e.g., GPT-4.1 → Claude Sonnet 4.5)
   - Fallback 2 (optional): cheaper model that can handle most cases

7. **Test fallback behavior:**
   - Verify fallback triggers on: provider errors, rate limits, timeouts
   - Confirm output quality is acceptable from fallback models

### Phase 4: Attach Guardrails

8. **Select evaluators for guardrails:**
   - Use `search_entities` to find existing evaluators
   - Choose evaluators that catch critical failures (safety, compliance, format)
   - If no suitable evaluators exist, reference `build-evaluator`

9. **Configure guardrail thresholds:**
   - Pre-generation guardrails: filter inputs before LLM call (safety, topic)
   - Post-generation guardrails: filter outputs before returning to user (quality, compliance)
   - Set pass/fail thresholds based on evaluator validation data (TPR/TNR)

### Phase 5: Enable Caching (Optional)

10. **Configure response caching:**
    - Enable for deployments with repeated or similar queries
    - Set TTL (time-to-live) based on content freshness requirements
    - Configure cache key: typically based on input hash
    - Estimate cost savings: cache hit rate * cost per request

### Phase 6: Test and Deploy

11. **Test the deployment:**
    - Generate test commands using the invoke API
    - Test with representative inputs covering:
      - Normal cases
      - Edge cases (long inputs, special characters, empty input)
      - Cases that should trigger guardrails
      - Cases that should trigger fallbacks

    ```bash
    # Test invocation
    curl -s https://api.orq.ai/v2/deployments/invoke \
      -X POST \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"key": "<KEY>", "messages": [{"role": "user", "content": "Your test input"}]}' | jq
    ```

12. **Document the deployment configuration:**
    ```markdown
    ## Deployment: [name]
    - **Key:** [deployment-key]
    - **Model:** [primary model]
    - **Fallbacks:** [model B] → [model C]
    - **Prompt:** [prompt name] v[version]
    - **Guardrails:** [evaluator names and thresholds]
    - **Caching:** [enabled/disabled, TTL]
    - **Parameters:** temp=[X], max_tokens=[Y]
    ```

13. **Promote to production** (with user confirmation):
    - Verify all tests pass
    - Confirm fallbacks are tested
    - Confirm guardrails are attached
    - Ask user to confirm before promoting

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| No fallback models | Single point of failure; provider outages break your app | Always configure at least one fallback |
| Modifying live deployments in-place | No rollback path, breaks running applications | Create new variant, test, then promote |
| No guardrails on production | Bad responses reach users unchecked | Attach evaluator guardrails for critical criteria |
| Skipping test invocations | Configuration errors only found in production | Test with representative inputs before promoting |
| Using the most expensive model everywhere | Unnecessary cost for simple tasks | Match model tier to task complexity |
| Caching without TTL | Stale responses served indefinitely | Set TTL based on content freshness needs |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View deployments:** `https://my.orq.ai/deployments` — review deployment configuration, fallbacks, and guardrails
- **Model Garden:** `https://my.orq.ai/model-garden` — browse and activate available models
- **View traces:** `https://my.orq.ai/traces` — monitor deployment invocations
