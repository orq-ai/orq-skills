---
description: Invoke an orq.ai agent or deployment and display the response
argument-hint: <name> "message"
allowed-tools: Bash, AskUserQuestion, orq*
---

# Invoke

Invoke an orq.ai agent or deployment by name and display the response.

## Instructions

### 1. Validate environment

Check that `$ORQ_API_KEY` is set:

```bash
if [ -z "$ORQ_API_KEY" ]; then echo "ERROR: ORQ_API_KEY is not set"; exit 1; fi
```

If missing, tell the user to set it and stop.

### 2. Parse arguments

Split `$ARGUMENTS` into:
- **Entity name** — the first token
- **Message** — everything after the first token (strip surrounding quotes if present)

If `$ARGUMENTS` is empty or either part is missing, use `AskUserQuestion` to prompt for the missing value(s):
- "What is the name of the agent or deployment you want to invoke?"
- "What message do you want to send?"

### 3. Find the entity

Try to locate the entity using the orq MCP tools first, falling back to `curl` if MCP is unavailable.

**MCP path:** Use `search_entities` to search for the name. Check if it matches an agent or deployment.

**curl fallback — search agents first:**

```bash
curl -s -H "Authorization: Bearer $ORQ_API_KEY" "https://api.orq.ai/v2/agents" | jq -r '.data[] | select(.display_name | test("NAME"; "i")) | {key, display_name, type: "agent"}'
```

**curl fallback — then search deployments:**

```bash
curl -s -H "Authorization: Bearer $ORQ_API_KEY" "https://api.orq.ai/v2/deployments" | jq -r '.data[] | select(.key | test("NAME"; "i")) | {key, display_name: .key, type: "deployment"}'
```

Replace `NAME` with the user-provided entity name.

- If **multiple matches** are found, present them and use `AskUserQuestion` to let the user pick.
- If **no matches** are found, report the error: "No agent or deployment found matching '<name>'. Check the name and try again."

### 4. Invoke the entity

Based on the entity type:

**Agent invocation:**

```bash
curl -s -X POST "https://api.orq.ai/v2/agents/responses" \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "<KEY>",
    "message": {
      "role": "user",
      "parts": [{"kind": "text", "text": "<MSG>"}]
    }
  }'
```

If a `task_id` from a previous invocation of the same agent exists in this conversation, include it in the request body to continue the multi-turn conversation:

```json
{
  "agent_key": "<KEY>",
  "task_id": "<PREVIOUS_TASK_ID>",
  "message": {
    "role": "user",
    "parts": [{"kind": "text", "text": "<MSG>"}]
  }
}
```

**Deployment invocation:**

```bash
curl -s -X POST "https://api.orq.ai/v2/deployments/invoke" \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "<KEY>",
    "messages": [{"role": "user", "content": "<MSG>"}]
  }'
```

### 5. Display the response

- Parse the JSON response.
- For **agents**: extract and display the assistant's response text. Note the `task_id` from the response — store it so subsequent invocations of the same agent in this conversation can continue the thread.
- For **deployments**: extract and display the generated text from the response.
- Present the output cleanly to the user, without raw JSON unless they ask for it.

### 6. Error handling

Handle these error cases gracefully:
- **401/403** — "Authentication failed. Check that your `ORQ_API_KEY` is valid and has the required permissions."
- **404** — "Entity not found. The agent or deployment may have been deleted."
- **429** — "Rate limited. Wait a moment and try again."
- **500+** — "Server error from orq.ai API. Try again shortly."
- **Network error** — "Could not reach the orq.ai API. Check your internet connection."
