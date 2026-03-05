---
name: build-agent
description: Design, create, and configure an orq.ai Agent with tools, instructions, knowledge bases, and memory
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Build Agent

Design, create, and configure production-grade AI agents on the orq.ai platform — from defining purpose and selecting models to configuring tools, knowledge bases, and memory stores.

**Companion skills:**
- `evaluate-agent` — evaluate agent performance with stage-specific graders
- `knowledge-base` — create and configure knowledge bases for agent RAG
- `manage-memory` — set up persistent memory for conversational agents
- `scaffold-integration` — generate SDK code to integrate the agent into your app

## When to use

- User wants to create a new agent on orq.ai
- User needs to configure tools for an existing agent
- User wants to attach knowledge bases or memory stores to an agent
- User asks how to build an AI agent
- User needs help writing agent system instructions
- User wants to define and register custom tools

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Agents overview:** https://docs.orq.ai/docs/agents/overview
- **Agent Studio:** https://docs.orq.ai/docs/agents/agent-studio
- **Agents API:** https://docs.orq.ai/docs/agents/agent-api
- **Tools overview:** https://docs.orq.ai/docs/tools/overview
- **Creating tools:** https://docs.orq.ai/docs/tools/creating
- **Tool calling:** https://docs.orq.ai/docs/proxy/tool-calling
- **Knowledge Base overview:** https://docs.orq.ai/docs/knowledge/overview
- **Memory stores:** https://docs.orq.ai/docs/agents/memory

### orq.ai Agent Capabilities
- Agents combine: system instructions + model + tools + knowledge bases + memory
- Agent Studio provides a visual builder for agent configuration
- Agents support multi-turn conversations with automatic session management
- Tools can be: built-in platform tools, custom function definitions, or HTTP webhooks
- Knowledge bases provide RAG retrieval during agent execution
- Memory stores persist context across conversations (user facts, preferences)

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `create_agent` | Create a new agent with configuration |
| `get_agent` | Get agent details and configuration |
| `search_entities` | Find agents, knowledge bases (`type: "knowledge"`), memory stores (`type: "memory_store"`) |
| `list_models` | List available models for agent configuration |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# List agents
curl -s https://my.orq.ai/v2/agents \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Get agent details
curl -s https://my.orq.ai/v2/agents/<KEY> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Update agent configuration
curl -s -X PATCH https://my.orq.ai/v2/agents/<KEY> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"instructions": "Updated instructions..."}' | jq

# List available tools
curl -s https://my.orq.ai/v2/tools \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Create a custom tool
curl -s https://my.orq.ai/v2/tools \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "tool-key", "description": "Tool description", "type": "function", "function": {"name": "tool_name", "parameters": {"type": "object", "properties": {...}}}}' | jq

# Invoke agent for testing
curl -s https://api.orq.ai/v2/agents/responses \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "Test query"}]}}' | jq
```

## Core Principles

### 1. Tool Descriptions Are as Important as System Instructions
Agents decide which tool to use based on the tool's description. Vague or ambiguous descriptions cause tool selection errors — the #1 source of agent failures. See `resources/tool-description-guide.md`.

### 2. Start Capable, Optimize Later
Begin with the most capable model (GPT-4.1, Claude Sonnet 4.5). Once the agent works correctly, test cheaper models. Premature cost optimization causes debugging nightmares.

### 3. Fewer Tools = More Reliable Selection
Each additional tool increases the decision space. Start with 3-5 essential tools. Only add more when the agent demonstrably needs them.

### 4. Test Edge Cases Early
Agents fail on: ambiguous requests, multi-step reasoning, tool errors, unexpected inputs. Test these before deploying, not after.

### 5. Separate Concerns
Don't overload one agent with too many responsibilities. If an agent handles customer support AND billing AND technical issues, consider splitting into specialized sub-agents.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Overwriting an existing agent's instructions or configuration
- Removing tools, knowledge bases, or memory stores from an agent
- Deleting an agent

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Define Agent Purpose

1. **Clarify the agent's mission.** Ask the user:
   - What is this agent's primary purpose?
   - Who are the target users?
   - What does success look like? (concrete examples)
   - What should the agent NEVER do? (explicit boundaries)

2. **Define the agency level:**

   | Level | Behavior | Use When |
   |-------|----------|----------|
   | **High agency** | Acts autonomously, retries on failure, makes decisions | Internal tools, low-risk actions |
   | **Low agency** | Conservative, asks for clarification when uncertain | Customer-facing, high-stakes actions |
   | **Mixed** | Autonomous for routine, asks on novel/risky | Most production agents |

3. **Document success criteria:**
   - 3-5 representative tasks the agent should handle well
   - 2-3 edge cases or adversarial inputs it should handle gracefully
   - 1-2 scenarios where it should refuse or escalate

### Phase 2: Select Model

4. **Choose the model** using `list_models`:

   | Need | Recommended Models |
   |------|-------------------|
   | Complex reasoning, tool orchestration | GPT-4.1, Claude Sonnet 4.5, Gemini 2.5 Pro |
   | Fast responses, simpler tasks | GPT-4.1-mini, Claude Haiku 4.5 |
   | Cost-sensitive, high volume | GPT-4.1-mini, open source models |

5. **Start with the most capable model.** Optimize cost only after the agent works correctly.

### Phase 3: Write System Instructions

6. **Write system instructions** following the template in `resources/system-instruction-template.md`. Key sections:
   - **Identity**: Who the agent is (name, role, expertise)
   - **Task**: What the agent does (primary responsibilities)
   - **Constraints**: What the agent must NOT do (explicit boundaries)
   - **Tool usage**: When and how to use each tool
   - **Output format**: Expected response structure
   - **Escalation**: When to hand off or refuse

7. **Critical instruction-writing rules:**
   - Put the most important constraints FIRST (models pay more attention to the beginning)
   - Be specific: "Respond in 2-3 sentences" not "Be concise"
   - Use DO/DO NOT format for clear boundaries
   - Include recovery instructions: "If you cannot complete the task, explain why and suggest alternatives"

### Phase 4: Configure Tools

8. **Select tools** from the tool library or define custom tools:
   - List existing tools with HTTP API
   - Match tools to the agent's tasks
   - Start with the minimum set of tools needed

9. **Write tool descriptions** following `resources/tool-description-guide.md`:
   - Each tool description must clearly state WHEN to use it
   - Include what the tool DOES NOT do (to prevent confusion with similar tools)
   - Specify required vs optional parameters
   - Give examples of correct invocation

10. **Create custom tools** if needed:
    - Define clear function name, description, and parameter schema
    - Use JSON Schema for parameter validation
    - Test the tool independently before attaching to the agent

### Phase 5: Attach Knowledge and Memory

11. **Attach knowledge bases** if the agent needs reference data:
    - Use `search_entities` with `type: "knowledge"` to find existing KBs
    - If no KB exists, reference the `knowledge-base` skill to create one
    - Configure retrieval: number of chunks, similarity threshold

12. **Configure memory store** if the agent needs persistence:
    - Use `search_entities` with `type: "memory_store"` to find existing stores
    - If no store exists, reference the `manage-memory` skill
    - Decide: session memory (conversation history) vs long-term memory (user facts)

### Phase 6: Create the Agent

13. **Create the agent** using `create_agent` MCP tool or HTTP API:
    - Set all configurations: instructions, model, tools, KB, memory
    - Verify the configuration is complete before creating

14. **Test with representative queries:**

    ```bash
    # Basic functionality
    curl -s https://api.orq.ai/v2/agents/responses \
      -X POST \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "Representative task query"}]}}' | jq

    # Multi-turn conversation
    curl -s https://api.orq.ai/v2/agents/responses \
      -X POST \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "Follow-up question"}]}, "task_id": "<task_id>"}' | jq
    ```

### Phase 7: Test Edge Cases

15. **Test systematically:**

    | Test Category | What to Test |
    |--------------|-------------|
    | **Tool selection** | Does the agent pick the right tool for each task? |
    | **Ambiguous input** | How does it handle vague or incomplete requests? |
    | **Error recovery** | What happens when a tool call fails? |
    | **Boundaries** | Does it refuse out-of-scope requests? |
    | **Multi-step** | Can it chain tool calls for complex tasks? |
    | **Adversarial** | Does it resist prompt injection or manipulation? |

16. **Document findings** and iterate on instructions/tools as needed.

17. **Hand off to evaluation:**
    - Use `evaluate-agent` for systematic evaluation
    - Use `scaffold-integration` to generate SDK code for the user's app

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Vague tool descriptions | Agent can't distinguish between tools, makes selection errors | Write precise descriptions with when-to-use and when-NOT-to-use |
| Too many tools (>8) | Increased decision space, more selection errors | Start with 3-5 essential tools, add only when needed |
| Starting with cheapest model | Debugging unclear if failures are model limitations or config issues | Start capable, optimize cost after it works |
| No explicit boundaries | Agent handles anything, including things it shouldn't | Define DO NOT rules and escalation criteria |
| Monolithic mega-agent | One agent doing everything is unreliable | Split into specialized sub-agents |
| No edge case testing | Failures discovered by users in production | Test tool errors, ambiguous input, adversarial cases |
| Hardcoding business logic in instructions | Becomes stale, hard to maintain | Use knowledge bases for reference data, tools for business logic |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View/edit the agent:** `https://my.orq.ai/agents` — open Agent Studio to review configuration, tools, and test interactively
- **Manage tools:** `https://my.orq.ai/tools` — view and edit tool definitions
- **Model Garden:** `https://my.orq.ai/model-garden` — browse available models for the agent
- **View agent traces:** `https://my.orq.ai/traces` — inspect agent execution traces after testing
