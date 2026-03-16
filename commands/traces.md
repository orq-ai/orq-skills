---
description: Query and summarize traces with filters — debugging entry point before analyze-trace-failures
argument-hint: [--deployment <name>] [--status <status>] [--last <duration>] [--limit <n>]
allowed-tools: AskUserQuestion, orq*
---

# Traces

Query production traces from the orq.ai platform and display a summary. Use this as a debugging entry point — once you spot a problem, hand off to the `analyze-trace-failures` skill for deep analysis.

## Instructions

### 1. Parse arguments

Extract filters from `$ARGUMENTS`. All are optional:

- `--deployment <name>` — filter by deployment name or key
- `--status <status>` — filter by trace status (e.g., `error`, `success`)
- `--last <duration>` — time window: `1h`, `6h`, `24h`, `7d`, `30d` (default: `24h`)
- `--limit <n>` — max traces to return (default: `20`)

If `$ARGUMENTS` is empty, use defaults (last 24h, limit 20, no filters).

If the user provides plain text instead of flags (e.g., `/orq:traces errors from today`), interpret the intent and map to the appropriate filters.

### 2. Build filter string

The `list_traces` MCP tool uses Typesense filter syntax. Build the `filter` parameter from parsed arguments:

- **Status filter:** `status:=ERROR` or `status:=OK`
- **Model filter:** `attr_kv:=gen_ai.request.model=<model>`
- **Combined:** join with ` && `

Use `list_registry_keys` and `list_registry_values` to discover available filter keys if needed.

### 3. Fetch traces

Use the `list_traces` MCP tool with the constructed filter, limit, and sort parameters.

- `limit`: from `--limit` or default 25
- `filter`: from step 2 (omit if no filters)
- `sort_by`: `"timestamp:desc"` (default)

### 4. Display the summary

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

### 5. Suggest next steps

After displaying traces, if there are errors, suggest:

> "To analyze these failures in depth, use the `analyze-trace-failures` skill."

### 6. Error handling

- **Auth errors** — "Authentication failed. Check that your `ORQ_API_KEY` is valid."
- **No traces found** — "No traces found matching your filters. Try broadening the time window or removing filters."
- **MCP errors** — "Could not reach the orq.ai MCP server. Make sure it's configured: `claude mcp add --transport http orq-workspace https://my.orq.ai/v2/mcp --header 'Authorization: Bearer ${ORQ_API_KEY}'`"
