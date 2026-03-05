---
name: list-models
description: List available models and systematically compare them on cost, latency, and quality to find the optimal choice for your use case
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# List & Compare Models

Systematically compare LLM models across cost, latency, and quality dimensions using structured experiments. Includes model cascade design for optimizing cost without sacrificing quality.

**Companion skills:**
- `run-experiment` — run the comparison experiments
- `action-plan` — act on comparison results
- `build-evaluator` — design quality evaluators for the comparison

## When to use

- User asks "which model should I use?"
- User wants to compare models for cost, latency, or quality
- User wants to optimize cost without sacrificing quality
- User asks about model cascades or tiered model selection
- User is considering upgrading or downgrading their model
- User wants to benchmark a new model against their current one

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Model Garden overview:** https://docs.orq.ai/docs/model-garden/overview
- **Model Garden UI:** https://docs.orq.ai/docs/model-garden/using-ui
- **Model Garden API:** https://docs.orq.ai/docs/model-garden/api-usage
- **Supported models:** https://docs.orq.ai/docs/proxy/supported-models
- **Experiments (multi-model):** https://docs.orq.ai/docs/experiments/creating
- **LLM Providers:** https://docs.orq.ai/docs/integrations/providers/overview
- **LLM Response Caching:** https://docs.orq.ai/docs/proxy/cache
- **LLM Fallbacks:** https://docs.orq.ai/docs/proxy/fallbacks
- **LLM Load Balancing:** https://docs.orq.ai/docs/proxy/load-balancing
- **Deployment Analytics:** https://docs.orq.ai/docs/analytics/deployment-analytics
- **Reasoning Models:** https://docs.orq.ai/docs/proxy/reasoning

### orq.ai Model Comparison Capabilities
- **Experiments support multiple models** — test the same dataset across different models side-by-side
- **Compare tab** shows multi-model results with evaluator scores at the bottom
- **Metrics captured per generation:** Latency, Cost, Time to First Token
- **Model Garden** provides access to models from OpenAI, Anthropic, Google, Mistral, and many more
- **LLM Caching** reduces cost by reusing responses for identical inputs
- **Fallbacks** enable automatic failover to backup models
- **Load balancing** distributes requests across providers

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `list_models` | Discover available models (chat, embedding, by provider) |
| `create_llm_eval` | Create evaluators for quality comparison |
| `list_traces` | Inspect traces for latency/cost data |
| `get_agent` | Get agent configuration for model swapping |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# Invoke evaluator to compare model outputs
curl -s https://my.orq.ai/v2/evaluators/<ID>/invoke \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"output": "Model output to evaluate", "query": "Original question"}' | jq

# Update agent model
curl -s https://my.orq.ai/v2/agents/<ID> \
  -X PATCH \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-4.1"}' | jq
```

## Core Principles

### 1. Don't Start with Model Selection
Model selection should come AFTER error analysis and prompt optimization. Most failures are prompt issues, not model capability issues. Switching models without fixing the prompt just moves the problem.

### 2. Use the Same Eval for All Models
Compare apples to apples. Same dataset, same evaluators, same system prompt. The ONLY variable should be the model.

### 3. Measure the Three Dimensions
Every model comparison needs: **Quality** (does it get the right answer?), **Cost** (what does it cost per request?), **Latency** (how fast is it?). Optimizing one often trades off against another.

### 4. Capability Models for Design, Cheap Models for Scale
Use the most capable model to establish what "good" looks like. Then test whether cheaper models can match that quality for your specific use case.

## Steps

### Phase 1: Define the Comparison

1. **Clarify what you're optimizing for.** Ask the user:

   | Priority | Typical Scenario | Strategy |
   |----------|-----------------|----------|
   | Quality first | High-stakes outputs, customer-facing, brand-critical | Start with best model, only downgrade if budget demands |
   | Cost first | High-volume, commodity tasks, internal tools | Start with cheapest model, upgrade only where quality fails |
   | Latency first | Real-time interactions, streaming, time-sensitive | Test time-to-first-token and total latency |
   | Balanced | Most production systems | Find the "knee" of the quality-cost curve |

2. **Select candidate models.** Use `list_models` from orq MCP to see available options. Consider:

   | Tier | Examples | Typical Use |
   |------|---------|-------------|
   | **Frontier** | gpt-4.1, claude-sonnet-4-5-20250514, gemini-2.5-pro | Complex reasoning, nuanced tasks, eval judge |
   | **Mid-tier** | gpt-4.1-mini, claude-haiku-4-5-20251001, gemini-2.5-flash | General purpose, good quality/cost balance |
   | **Budget** | gpt-4.1-nano, small open-source models | Classification, simple extraction, high volume |
   | **Reasoning** | o3, o4-mini, claude-sonnet-4-5-20250514 (extended thinking) | Complex multi-step reasoning, math, code |

3. **Prepare the evaluation:**
   - Use an existing dataset or create one with `generate-synthetic-dataset`
   - Attach evaluators that measure what matters for this use case
   - Use the same system prompt for all models (unless comparing prompt adaptations)

### Phase 2: Run the Comparison Experiment

4. **Create a multi-model experiment on orq.ai:**
   - Use `create_experiment` with multiple model configurations
   - Each model runs against the same dataset
   - Attach evaluators for quality assessment
   - orq.ai captures latency, cost, and TTFT automatically

5. **Collect per-model results:**
   ```
   | Model | Avg Quality | Cost/Request | Avg Latency | TTFT | Pass Rate |
   |-------|------------|-------------|-------------|------|-----------|
   | gpt-4.1 | 9.2/10 | $0.015 | 2.3s | 0.4s | 95% |
   | gpt-4.1-mini | 8.1/10 | $0.003 | 0.8s | 0.2s | 82% |
   | claude-sonnet | 8.8/10 | $0.012 | 1.9s | 0.3s | 90% |
   ```

### Phase 3: Analyze Results

6. **Quality analysis — per-datapoint comparison:**
   ```
   | Scenario | gpt-4.1 | gpt-4.1-mini | claude-sonnet | Winner |
   |----------|---------|-------------|---------------|--------|
   | Simple Q | 10 | 9 | 10 | Tie |
   | Complex reasoning | 9 | 5 | 8 | gpt-4.1 |
   | Adversarial | 10 | 7 | 9 | gpt-4.1 |
   | Creative | 8 | 7 | 9 | claude-sonnet |
   ```

   Look for:
   - Which model wins on which categories?
   - Are cheaper models competitive on simple tasks?
   - Where do budget models fall apart?

7. **Cost-quality tradeoff analysis:**
   ```
   Quality per dollar:
   - gpt-4.1-mini: 8.1 / $0.003 = 2700 quality/$
   - claude-sonnet: 8.8 / $0.012 = 733 quality/$
   - gpt-4.1: 9.2 / $0.015 = 613 quality/$
   ```

   The cheapest model per quality point often isn't the cheapest model — it's the mid-tier.

8. **Find the quality-cost "knee":**
   - Plot quality (y-axis) vs cost (x-axis)
   - The "knee" is where paying more yields diminishing quality returns
   - Models above the knee are overpaying; models below may sacrifice too much quality

### Phase 4: Model Cascade Design (Cost Optimization)

9. **When to use a model cascade:**
   - You have high volume and cost matters
   - Cheap models handle 70-90% of requests adequately
   - Only 10-30% of requests need the expensive model
   - You can identify which requests need escalation

10. **Cascade architecture:**
    ```
    User Request
    └→ Cheap "Proxy" Model (e.g., gpt-4.1-mini)
       ├→ High confidence → Return response (70-90% of traffic)
       └→ Low confidence → Escalate to "Oracle" Model (e.g., gpt-4.1)
                           └→ Return response (10-30% of traffic)
    ```

11. **Confidence routing strategies:**

    | Strategy | How It Works | Pros | Cons |
    |----------|-------------|------|------|
    | **Log probability threshold** | Use logprobs to measure model confidence | Fast, no extra LLM call | Requires logprob access |
    | **Self-assessment** | Ask the model "how confident are you?" | Simple to implement | Unreliable for some models |
    | **Task classification** | Route by input type (simple → cheap, complex → expensive) | Deterministic, fast | Needs upfront categorization |
    | **Evaluator gate** | Run a cheap evaluator on the response; escalate if it fails | Most accurate | Adds latency + cost of evaluator |

12. **Calculate cascade economics:**
    ```
    Without cascade:
    - 1000 requests × $0.015 (frontier) = $15.00

    With cascade (80% cheap, 20% escalation):
    - 800 requests × $0.003 (cheap) = $2.40
    - 200 requests × $0.015 (frontier) = $3.00
    - Total: $5.40 (64% savings)

    Quality impact:
    - Must verify that cascaded quality ≈ all-frontier quality
    - Run the comparison experiment with cascade vs frontier-only
    ```

### Phase 5: Additional Cost Optimization

13. **Token reduction strategies:**

    | Strategy | Savings | Implementation |
    |----------|---------|---------------|
    | Concise instructions | 10-30% token reduction | Rewrite verbose prompts |
    | Pre-process long documents | 50-80% token reduction | Summarize before downstream LLM calls |
    | Compact output format | 10-20% token reduction | YAML over JSON; structured over prose |
    | Context pruning | 20-50% token reduction | Only include relevant context, not full history |

14. **Leverage caching (orq.ai supports this):**
    - Place **static instructions BEFORE dynamic content** to maximize KV cache prefix reuse
    - Keep formatting consistent across requests
    - orq.ai LLM Response Caching can reuse responses for identical inputs

15. **Use fallbacks and load balancing:**
    - Configure **LLM Fallbacks** on orq.ai for automatic failover
    - Use **Load Balancing** to distribute across providers and reduce single-provider latency
    - Both features are configurable through orq.ai deployments

### Phase 6: Make the Decision

16. **Present the recommendation:**

    ```markdown
    ## Model Recommendation

    **Primary model:** [model name]
    - Quality: [score] | Cost: $[X]/request | Latency: [Y]ms
    - Reason: [why this is the best tradeoff]

    **Cascade option (if volume > [N] requests/day):**
    - Proxy: [cheap model] (handles [X%] of traffic)
    - Oracle: [expensive model] (handles [Y%] of traffic)
    - Estimated savings: [Z%] vs all-oracle

    **Not recommended:**
    - [model]: [reason — too expensive for marginal quality gain]
    - [model]: [reason — quality too low on [category]]

    **Pin to model version:** [specific snapshot ID for production stability]
    ```

17. **Pin production models:**
    - Always pin to a specific model snapshot/version
    - Model updates can change behavior unexpectedly
    - Re-run the comparison when updating model versions

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Switching models before fixing prompts | Most failures are prompt issues, not model issues | Error analysis → prompt fixes → model comparison |
| Comparing with different prompts per model | Can't isolate model quality from prompt quality | Same prompt, same dataset, same evaluators |
| Using only aggregate scores | Hides per-category differences | Look at per-scenario breakdown |
| Ignoring latency | Cost savings mean nothing if users wait too long | Measure TTFT and total latency alongside quality |
| Choosing the cheapest model that "works" | Underestimates quality degradation on edge cases | Test adversarial and complex scenarios specifically |
| Not pinning model versions | Behavior changes silently with model updates | Pin to snapshot ID in production |
| Building cascades without measuring quality impact | May silently degrade quality for cost savings | Run cascade vs frontier comparison experiment |
| Optimizing cost before volume matters | Premature optimization; quality should come first | Only optimize cost when volume × cost is significant |
