---
name: scaffold-integration
description: Generate SDK integration code (Python or Node) for orq.ai agents, deployments, and knowledge bases in the user's codebase
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Scaffold Integration

Generate production-ready SDK integration code for orq.ai agents, deployments, and knowledge bases — with streaming, error handling, retries, and observability.

**Companion skills:**
- `build-agent` — create agents before integrating them
- `manage-deployment` — configure deployments before integrating them
- `knowledge-base` — set up knowledge bases before integrating search

## When to use

- User wants to integrate orq.ai into their application
- User needs SDK code for calling agents, deployments, or KBs
- User asks how to use the orq.ai SDK (Python or Node/TypeScript)
- User wants to collect feedback from end users via SDK
- User needs streaming integration for real-time responses

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Python SDK:** https://docs.orq.ai/docs/sdks/python
- **Node SDK:** https://docs.orq.ai/docs/sdks/node
- **Agents API:** https://docs.orq.ai/docs/agents/agent-api
- **Deployments API:** https://docs.orq.ai/docs/deployments/api
- **Knowledge Base API:** https://docs.orq.ai/docs/knowledge/api
- **Feedback API:** https://docs.orq.ai/docs/feedback/overview
- **Streaming:** https://docs.orq.ai/docs/proxy/streaming
- **Observability:** https://docs.orq.ai/docs/observability/traces

### orq.ai SDK Capabilities
- Python and Node/TypeScript SDKs with full API coverage
- Streaming support for real-time response delivery
- Built-in retry logic and error handling
- Automatic trace generation for observability
- Feedback collection API for thumbs up/down, corrections, free-text

### orq MCP Tools

Use the orq MCP server to fetch resource configurations before generating code.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `get_agent` | Get agent configuration for integration code |
| `search_entities` | Find agents, deployments, knowledge bases |

## Core Principles

### 1. Always Detect the User's Language
Read the codebase to determine Python vs Node/TypeScript. Never assume.

### 2. Environment Variables for Secrets
NEVER hardcode API keys. Always use environment variables (`ORQ_API_KEY`).

### 3. Include Error Handling and Retries
Generated code must handle: network errors, rate limits, API errors, timeouts. Production code without error handling is incomplete.

### 4. Generate Runnable Test Scripts
Don't just generate library code. Include a test/example script that verifies the integration works end-to-end.

### 5. Follow Existing Code Patterns
Match the user's code style: framework conventions, import patterns, error handling style, logging approach.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Writing new files into the user's codebase
- Modifying existing files in the user's codebase
- Installing new dependencies (npm install, pip install)

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Detect Language and Framework

1. **Identify the user's technology stack:**
   - Check for `package.json` (Node/TypeScript), `requirements.txt` / `pyproject.toml` / `Pipfile` (Python)
   - Detect framework: Express, FastAPI, Flask, Next.js, Django, etc.
   - Check for TypeScript: `tsconfig.json`
   - Check for existing orq.ai SDK: `@orq-ai/node` in package.json or `orq-ai-sdk` in requirements

2. **If ambiguous, ask the user** which language/framework they prefer.

### Phase 2: Determine Integration Scope

3. **Ask what to integrate** (if not already clear):
   - Agent invocation (single-turn or multi-turn)
   - Deployment calls (prompt-based completion)
   - Knowledge base search
   - Feedback collection (thumbs up/down, corrections)
   - Combination of the above

4. **Fetch resource configuration** from orq.ai:
   - Use `get_agent` or `search_entities` to get the target resource details
   - Note: agent key, deployment key, KB key, available tools, expected input format

### Phase 3: Generate Integration Code

5. **Generate code** following the patterns in `resources/python-patterns.md` or `resources/node-patterns.md`:

   **Every integration MUST include:**
   - Client initialization with API key from environment
   - Resource invocation (agent, deployment, or KB)
   - Streaming support (if applicable)
   - Error handling with retries
   - Structured logging or observability hooks
   - Type definitions (TypeScript) or type hints (Python)

6. **For agent integrations, include:**
   - Single-turn invocation
   - Multi-turn conversation management (task_id tracking)
   - Tool result handling (if agent has client-side tools)
   - Streaming response handling

7. **For deployment integrations, include:**
   - Message formatting
   - Streaming response handling
   - Parameter configuration (temperature, max_tokens)

8. **For feedback integrations, include:**
   - Thumbs up/down collection linked to trace IDs
   - Optional: correction text, free-text feedback
   - Feedback submission to orq.ai API

### Phase 4: Write Code into Codebase

9. **Ask user confirmation** before writing any files.

10. **Write integration code:**
    - Place in appropriate location matching the project structure
    - Add necessary imports
    - Include inline comments explaining key decisions
    - Follow existing code style (indentation, naming conventions, etc.)

11. **Add dependencies** if not already installed:
    - Python: `orq-ai-sdk`
    - Node: `@orq-ai/node`
    - Ask user confirmation before adding to dependency files

### Phase 5: Generate Test Script

12. **Create a test/example script** that:
    - Initializes the client
    - Makes a test call to the resource
    - Prints the response
    - Verifies basic functionality
    - Can be run standalone: `python test_orq.py` or `npx ts-node test_orq.ts`

13. **Document the integration:**
    ```markdown
    ## orq.ai Integration
    - **Resource:** [agent/deployment/KB name]
    - **SDK:** [Python/Node]
    - **Files:** [list of created/modified files]
    - **Environment:** Set `ORQ_API_KEY` in your environment
    - **Test:** Run `[test command]` to verify
    ```

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Hardcoded API keys | Security vulnerability, breaks in CI/CD | Use environment variables |
| No error handling | Silent failures in production | Handle network errors, rate limits, API errors |
| No streaming support | Poor UX for long responses | Use streaming for real-time delivery |
| Assuming language/framework | Generates unusable code | Detect from codebase, ask if ambiguous |
| Library code without test script | User can't verify integration works | Always generate a runnable test |
| Ignoring existing code patterns | Generated code looks foreign in the codebase | Match framework conventions and style |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page based on what was integrated:

- **Agents:** `https://my.orq.ai/agents` — view agent configuration and test interactively
- **Deployments:** `https://my.orq.ai/deployments` — review deployment settings
- **Knowledge Bases:** `https://my.orq.ai/knowledge` — verify KB configuration and search
- **API Keys:** `https://my.orq.ai/settings/api-keys` — manage API keys for the integration
