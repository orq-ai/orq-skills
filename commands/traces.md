---
description: Query and summarize traces with filters — debugging entry point before analyze-trace-failures
argument-hint: [--deployment <name>] [--status <status>] [--last <duration>] [--limit <n>]
allowed-tools: Bash, AskUserQuestion, orq*
---

# Traces

Query production traces from the orq.ai platform and display a summary. Use this as a debugging entry point — once you spot a problem, hand off to the `analyze-trace-failures` skill for deep analysis.

## Instructions

### 1. Validate environment

Check that `$ORQ_API_KEY` is set:

```bash
if [ -z "$ORQ_API_KEY" ]; then echo "ERROR: ORQ_API_KEY is not set"; exit 1; fi
```

If missing, tell the user to set it and stop.

### 2. Parse arguments

Extract filters from `$ARGUMENTS`. All are optional:

- `--deployment <name>` — filter by deployment name or key
- `--status <status>` — filter by trace status (e.g., `error`, `success`)
- `--last <duration>` — time window: `1h`, `6h`, `24h`, `7d`, `30d` (default: `24h`)
- `--limit <n>` — max traces to return (default: `20`)

If `$ARGUMENTS` is empty, use defaults (last 24h, limit 20, no filters).

If the user provides plain text instead of flags (e.g., `/orq:traces errors from today`), interpret the intent and map to the appropriate filters.

### 3. Convert time window

Convert the `--last` duration to an ISO 8601 timestamp for the API query:

```bash
date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ"  # macOS: 24 hours ago
```

Adjust the offset based on the duration provided.

### 4. Fetch traces

Try MCP tools first, fall back to `curl` if unavailable.

**curl fallback:**
```bash
curl -s -H "Authorization: Bearer $ORQ_API_KEY" \
  "https://api.orq.ai/v2/traces?limit=LIMIT&start_date=START_DATE"
```

Add query parameters based on parsed filters (deployment, status, date range).

### 5. Display the summary

Present traces in a scannable format, not raw JSON.

**Overview line:**
```
Traces (last 24h): 47 total — 41 success, 4 error, 2 timeout
```

**Then list traces, grouped by status (errors first):**
```
Errors (4)
  1. 2026-03-13 14:22  deployer/summarizer  "Input too long"      trace_abc123
  2. 2026-03-13 13:01  agent/support-bot    "Tool call failed"    trace_def456
  ...

Success (showing 10 of 41)
  1. 2026-03-13 15:30  agent/support-bot    1.2s  230 tokens       trace_ghi789
  2. 2026-03-13 15:28  deployer/classifier  0.8s  150 tokens       trace_jkl012
  ...
```

Adapt fields based on what the API returns. Prioritize: timestamp, entity, error message or latency/tokens, trace ID.

- Show errors and failures first — they're why the user is here.
- Cap each group at 10 items. If there are more, show the count.
- Include the trace ID so the user can reference it in follow-up.

### 6. Suggest next steps

After displaying traces, if there are errors, suggest:

> "To analyze these failures in depth, use the `analyze-trace-failures` skill."

### 7. Error handling

- **401/403** — "Authentication failed. Check that your `ORQ_API_KEY` is valid."
- **No traces found** — "No traces found matching your filters. Try broadening the time window or removing filters."
- **Network error** — "Could not reach the orq.ai API. Check your internet connection."
