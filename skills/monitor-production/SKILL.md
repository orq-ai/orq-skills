---
name: monitor-production
description: Analyze production trace data for anomalies, cost trends, latency regressions, and emerging failure modes
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Monitor Production

Analyze production trace data to detect anomalies, track cost trends, identify latency regressions, and surface emerging failure modes — turning observability data into actionable insights.

**Companion skills:**
- `trace-analysis` — deep-dive into specific failure patterns discovered during monitoring
- `action-plan` — turn monitoring findings into prioritized improvement plans
- `optimize-prompt` — fix prompt issues surfaced by monitoring

## When to use

- User wants to check production health of their LLM pipeline
- User notices increased costs or latency
- User wants to detect emerging failure patterns
- User asks "how is my deployment/agent performing?"
- User wants to establish monitoring baselines
- User needs a production health report

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Traces:** https://docs.orq.ai/docs/observability/traces
- **LLM Logs:** https://docs.orq.ai/docs/observability/logs
- **Trace automations:** https://docs.orq.ai/docs/observability/trace-automation
- **Threads:** https://docs.orq.ai/docs/observability/threads
- **Feedback:** https://docs.orq.ai/docs/feedback/overview
- **Deployments:** https://docs.orq.ai/docs/deployments/overview

### orq.ai Observability Capabilities
- Traces capture full execution trees: LLM calls, tool invocations, knowledge retrievals
- Each span records: latency, token usage (input/output), cost, model, status
- Trace automations can trigger alerts or actions based on conditions
- Feedback data (thumbs up/down) is attached to traces
- Custom views and filters for recurring analysis patterns

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `list_traces` | Pull recent traces with time range and filters |
| `list_spans` | List spans within a trace |
| `get_span` | Get detailed span information (latency, tokens, cost) |
| `search_entities` | Find deployments and agents to monitor |

## Core Principles

### 1. Start Broad, Then Drill Down
Begin with aggregate metrics (error rate, p50/p95 latency, total cost). Only investigate individual traces when aggregates reveal anomalies.

### 2. Look for Distribution Changes, Not Just Averages
An average latency of 2s may hide a bimodal distribution: 90% at 1s and 10% at 11s. Track percentiles (p50, p95, p99) and look for distribution shifts.

### 3. Separate Cost From Quality
Cost spikes and quality regressions have different root causes. A model upgrade may improve quality but increase cost. Track them independently.

### 4. Always Compare Against a Baseline
"Is 5% error rate good?" depends on what it was last week. Establish baselines and measure deltas.

### 5. Automate Recurring Checks
If you run the same monitoring analysis repeatedly, recommend setting up trace automations on orq.ai to alert automatically.

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Scope the Monitoring

1. **Identify what to monitor:**
   - Which deployment(s) or agent(s)?
   - What time period? (last 24h, 7d, 30d)
   - Is this a routine health check or investigating a specific issue?

2. **Establish context:**
   - Were there recent changes? (prompt updates, model changes, traffic increases)
   - Is there an existing baseline to compare against?

### Phase 2: Pull and Aggregate Traces

3. **Fetch traces** using `list_traces`:
   - Filter by deployment/agent and time range
   - Pull a representative sample (100-500 traces depending on volume)
   - Include metadata: latency, token counts, cost, status

4. **Compute aggregate metrics:**

   ```
   | Metric | Current | Baseline | Delta |
   |--------|---------|----------|-------|
   | Total traces | [N] | [N] | [+/-] |
   | Error rate | [X%] | [X%] | [+/-] |
   | p50 latency | [Xms] | [Xms] | [+/-] |
   | p95 latency | [Xms] | [Xms] | [+/-] |
   | Avg cost/request | [$X] | [$X] | [+/-] |
   | Avg tokens (input) | [N] | [N] | [+/-] |
   | Avg tokens (output) | [N] | [N] | [+/-] |
   | Feedback: positive | [X%] | [X%] | [+/-] |
   | Feedback: negative | [X%] | [X%] | [+/-] |
   ```

5. **Compute distributions** (not just averages):
   - Latency: p50, p75, p90, p95, p99
   - Cost per request: min, median, max, total
   - Token usage: input vs output token ratio

### Phase 3: Detect Anomalies

6. **Check for these anomaly patterns:**

   | Anomaly | Signal | Likely Cause |
   |---------|--------|-------------|
   | **Latency spike** | p95 > 2x baseline | Model provider issues, prompt length increase, complex queries |
   | **Cost increase** | Cost/request > 1.5x baseline | Model change, prompt expansion, increased output length |
   | **Error rate increase** | Error rate > 2x baseline | Provider outage, rate limiting, input format changes |
   | **Token inflation** | Avg tokens > 1.3x baseline | Prompt drift, verbose outputs, unnecessary context |
   | **Feedback degradation** | Negative feedback > 1.5x baseline | Quality regression, new failure modes |
   | **Throughput drop** | Trace volume < 0.7x baseline | Client-side issues, routing changes |

7. **Flag suspicious traces** for investigation:
   - Highest cost traces (top 5%)
   - Highest latency traces (top 5%)
   - All error traces
   - Traces with negative feedback

### Phase 4: Investigate Flagged Traces

8. **For flagged traces, use `list_spans` and `get_span`** to understand:
   - Which step is slow? (retrieval, LLM call, tool execution)
   - Which step is expensive? (large context, long output)
   - What caused errors? (timeout, rate limit, malformed input)

9. **Look for patterns** across flagged traces:
   - Are failures clustered in time? (provider outage)
   - Are failures clustered by input type? (certain queries)
   - Are failures clustered by model? (specific model issues)

### Phase 5: Produce Health Report

10. **Generate the monitoring report:**

    ```markdown
    # Production Health Report
    **Pipeline:** [deployment/agent name]
    **Period:** [date range]
    **Traces analyzed:** [N]

    ## Summary
    - Overall status: [Healthy / Warning / Degraded]
    - Key finding: [one-sentence summary]

    ## Metrics
    [Aggregate metrics table from Phase 2]

    ## Anomalies Detected
    ### [Anomaly 1]
    - **Signal:** [what was detected]
    - **Impact:** [user-facing effect]
    - **Root cause:** [if identified]
    - **Example traces:** [trace IDs]

    ## Traces Worth Investigating
    | Trace ID | Issue | Latency | Cost | Recommendation |
    |----------|-------|---------|------|----------------|

    ## Recommended Actions
    1. [Highest priority action]
    2. [Second priority]
    3. [Third priority]
    ```

### Phase 6: Recommend Follow-Up

11. **Connect findings to companion skills:**
    - New failure patterns → `trace-analysis` for deep-dive
    - Cost optimization needed → `list-models` for cheaper alternatives
    - Prompt issues identified → `optimize-prompt` for systematic improvement
    - Multiple action items → `action-plan` for prioritization

12. **Recommend automation:**
    - If monitoring revealed recurring patterns, suggest trace automations on orq.ai
    - Configure alerts for: error rate thresholds, latency spikes, cost anomalies

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Only checking averages | Hides bimodal distributions and tail latencies | Track percentiles (p50, p95, p99) |
| No baseline comparison | Can't tell if metrics are normal or abnormal | Establish and maintain baselines |
| Investigating every trace | Doesn't scale, wastes time | Start with aggregates, drill into anomalies |
| Conflating cost and quality | Different root causes, different fixes | Track and analyze independently |
| One-off monitoring | Issues recur, not caught until user reports | Set up automated trace automations |
| Ignoring feedback data | Missing the most direct quality signal | Correlate feedback with trace metrics |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View traces:** `https://my.orq.ai/traces` — drill into specific traces flagged in the report
- **Trace automations:** `https://my.orq.ai/trace-automations` — set up automated alerts for anomalies
- **Deployments:** `https://my.orq.ai/deployments` — review deployment configuration if changes are needed
