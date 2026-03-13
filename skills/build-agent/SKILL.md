---
name: build-agent
description: Design, create, and configure an orq.ai Agent with tools, instructions, knowledge bases, and memory — includes model selection, KB management, and memory store setup
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, orq*
---

# Build Agent

Design, create, and configure production-grade AI agents on the orq.ai platform — from defining purpose and selecting models to configuring tools, knowledge bases, and memory stores. This skill includes full knowledge base management, memory store setup, and model selection guidance.

**Companion skills:**
- `build-evaluator` — design quality evaluators for agent outputs
- `analyze-trace-failures` — diagnose agent failures from trace data
- `run-experiment` — run end-to-end evaluations and model comparisons
- `generate-synthetic-dataset` — create test datasets for agent evaluation
- `optimize-prompt` — improve agent system instructions and prompt quality

## When to use

- User wants to create a new agent on orq.ai
- User needs to configure tools for an existing agent
- User wants to attach knowledge bases or memory stores to an agent
- User asks how to build an AI agent
- User needs help writing agent system instructions
- User wants to define and register custom tools
- User asks "which model should I use?" or wants to compare models
- User wants to create or manage a Knowledge Base on orq.ai
- User needs to upload documents and chunk them for RAG
- User wants to search a Knowledge Base with metadata filters
- User needs to configure chunking strategies (token, sentence, recursive, semantic, agentic)
- User wants to add, list, or delete datasources and chunks
- User asks about RAG setup or knowledge base configuration
- User wants persistent memory for conversational agents
- User asks about session memory vs long-term memory
- User needs to configure memory stores on orq.ai
- User wants agents to remember user preferences across conversations
- User asks about the difference between memory and knowledge bases

## When NOT to use

- **Need to evaluate agent performance?** → use `run-experiment`
- **Need to optimize a prompt?** → use `optimize-prompt`
- **Need to generate test data?** → use `generate-synthetic-dataset`
- **Need to build an evaluator?** → use `build-evaluator`
- **Need to debug failing traces?** → use `analyze-trace-failures`

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Agents overview:** https://docs.orq.ai/docs/agents/overview
- **Agent Studio:** https://docs.orq.ai/docs/agents/agent-studio
- **Agents API:** https://docs.orq.ai/docs/agents/agent-api
- **Tools overview:** https://docs.orq.ai/docs/tools/overview
- **Creating tools:** https://docs.orq.ai/docs/tools/creating
- **Tool calling:** https://docs.orq.ai/docs/proxy/tool-calling
- **Knowledge Base overview:** https://docs.orq.ai/docs/knowledge/overview
- **Creating Knowledge Bases:** https://docs.orq.ai/docs/knowledge/creating
- **Knowledge Base in Prompts:** https://docs.orq.ai/docs/knowledge/using-in-prompt
- **Knowledge Base API:** https://docs.orq.ai/docs/knowledge/api
- **Memory stores:** https://docs.orq.ai/docs/agents/memory
- **Model Garden overview:** https://docs.orq.ai/docs/model-garden/overview
- **Model Garden UI:** https://docs.orq.ai/docs/model-garden/using-ui
- **Model Garden API:** https://docs.orq.ai/docs/model-garden/api-usage
- **Supported models:** https://docs.orq.ai/docs/proxy/supported-models
- **Reasoning Models:** https://docs.orq.ai/docs/proxy/reasoning
- **LLM Fallbacks:** https://docs.orq.ai/docs/proxy/fallbacks
- **LLM Load Balancing:** https://docs.orq.ai/docs/proxy/load-balancing
- **LLM Response Caching:** https://docs.orq.ai/docs/proxy/cache

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
| `create_llm_eval` | Create evaluators for quality comparison |
| `list_traces` | Inspect traces for latency/cost data |

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

# Update agent model
curl -s https://my.orq.ai/v2/agents/<ID> \
  -X PATCH \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-4.1"}' | jq

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

# Invoke evaluator to compare model outputs
curl -s https://my.orq.ai/v2/evaluators/<ID>/invoke \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"output": "Model output to evaluate", "query": "Original question"}' | jq

# List Knowledge Bases
curl -s https://my.orq.ai/v2/knowledge \
  -H "Authorization: Bearer $ORQ_API_KEY" | jq .

# Get a specific Knowledge Base
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" | jq .

# Create a Knowledge Base
curl -s https://my.orq.ai/v2/knowledge \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "support-docs",
    "type": "internal",
    "embedding_model": "cohere/embed-english-v3.0",
    "path": "my-project/knowledge"
  }' | jq .

# Upload a file
curl -s https://my.orq.ai/v2/files \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -F "file=@./document.pdf" | jq .

# Create a datasource from an uploaded file
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Support Documentation",
    "file_id": "<FILE_ID>"
  }' | jq .

# Create chunks in a datasource
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources/<DATASOURCE_ID>/chunks \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[{"text": "Chunk content", "metadata": {"source": "docs", "topic": "billing"}}]' | jq .

# Search a Knowledge Base
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/search \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "search query"}' | jq .

# Update a Knowledge Base
curl -s -X PATCH https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "updated-key"}' | jq .

# Delete a Knowledge Base
curl -s -X DELETE https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
  -H "Authorization: Bearer $ORQ_API_KEY"

# Delete a datasource
curl -s -X DELETE https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources/<DATASOURCE_ID> \
  -H "Authorization: Bearer $ORQ_API_KEY"

# List memory stores
curl -s https://my.orq.ai/v2/memory-stores \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Create a memory store
curl -s https://my.orq.ai/v2/memory-stores \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "user-preferences",
    "description": "Stores user preferences and facts across sessions"
  }' | jq

# Get memory store details
curl -s https://my.orq.ai/v2/memory-stores/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# List memory documents
curl -s https://my.orq.ai/v2/memory-stores/<ID>/documents \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Create a memory document
curl -s https://my.orq.ai/v2/memory-stores/<ID>/documents \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "user_12345",
    "content": {"name": "John", "preferences": {"language": "en", "tone": "casual"}}
  }' | jq

# Delete a memory store
curl -s -X DELETE https://my.orq.ai/v2/memory-stores/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY"
```

## Core Principles

### 1. Tool Descriptions Are as Important as System Instructions
Agents decide which tool to use based on the tool's description. Vague or ambiguous descriptions cause tool selection errors — the #1 source of agent failures. See `resources/tool-description-guide.md`.

### 2. Start Capable, Optimize Later
Begin with the most capable model (GPT-4.1, Claude Sonnet 4.5). Once the agent works correctly, test cheaper models. Premature cost optimization causes debugging nightmares.

### 3. Don't Start with Model Selection
Model selection should come AFTER error analysis and prompt optimization. Most failures are prompt issues, not model capability issues. Switching models without fixing the prompt just moves the problem.

### 4. Fewer Tools = More Reliable Selection
Each additional tool increases the decision space. Start with 3-5 essential tools. Only add more when the agent demonstrably needs them.

### 5. Test Edge Cases Early
Agents fail on: ambiguous requests, multi-step reasoning, tool errors, unexpected inputs. Test these before deploying, not after.

### 6. Separate Concerns
Don't overload one agent with too many responsibilities. If an agent handles customer support AND billing AND technical issues, consider splitting into specialized sub-agents.

### 7. Chunk Small, Search Precisely
Smaller chunks with metadata filters outperform large chunks with no filtering. Match chunking to content type — use sentence chunking for prose, recursive for structured docs, semantic for mixed content.

### 8. Memory Is NOT a Knowledge Base
- **Knowledge base**: static reference data (docs, FAQs, policies) — rarely changes
- **Memory store**: dynamic user context (preferences, facts, history) — changes per interaction
- Don't use memory for static content. Don't use KBs for user-specific dynamic data.

### 9. Keep Memory Records Focused
Store structured, relevant facts — not raw conversation dumps. "User prefers formal tone" is useful. A 50-turn conversation transcript is not.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Overwriting an existing agent's instructions or configuration
- Removing tools, knowledge bases, or memory stores from an agent
- Deleting an agent
- Deleting knowledge bases, datasources, or chunks
- Deleting memory stores or memory documents
- Clearing all records in a memory store
- Modifying memory store configuration on a live agent

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

4. **Choose the model** using `list_models` from orq MCP. Consider model tiers:

   | Tier | Examples | Typical Use |
   |------|---------|-------------|
   | **Frontier** | gpt-4.1, claude-sonnet-4-5-20250514, gemini-2.5-pro | Complex reasoning, nuanced tasks, eval judge |
   | **Mid-tier** | gpt-4.1-mini, claude-haiku-4-5-20251001, gemini-2.5-flash | General purpose, good quality/cost balance |
   | **Budget** | gpt-4.1-nano, small open-source models | Classification, simple extraction, high volume |
   | **Reasoning** | o3, o4-mini, claude-sonnet-4-5-20250514 (extended thinking) | Complex multi-step reasoning, math, code |

5. **Start with the most capable model.** Optimize cost only after the agent works correctly. Use the most capable model to establish what "good" looks like, then test whether cheaper models can match that quality for your specific use case.

6. **Cost-quality tradeoff guidance:**

   | Priority | Typical Scenario | Strategy |
   |----------|-----------------|----------|
   | Quality first | High-stakes outputs, customer-facing, brand-critical | Start with best model, only downgrade if budget demands |
   | Cost first | High-volume, commodity tasks, internal tools | Start with cheapest model, upgrade only where quality fails |
   | Latency first | Real-time interactions, streaming, time-sensitive | Test time-to-first-token and total latency |
   | Balanced | Most production systems | Find the "knee" of the quality-cost curve |

7. **Model cascade architecture** (for cost optimization at scale):

   When you have high volume and cost matters, and cheap models handle 70-90% of requests adequately:

   ```
   User Request
   └→ Cheap "Proxy" Model (e.g., gpt-4.1-mini)
      ├→ High confidence → Return response (70-90% of traffic)
      └→ Low confidence → Escalate to "Oracle" Model (e.g., gpt-4.1)
                          └→ Return response (10-30% of traffic)
   ```

   Confidence routing strategies:

   | Strategy | How It Works | Pros | Cons |
   |----------|-------------|------|------|
   | **Log probability threshold** | Use logprobs to measure model confidence | Fast, no extra LLM call | Requires logprob access |
   | **Self-assessment** | Ask the model "how confident are you?" | Simple to implement | Unreliable for some models |
   | **Task classification** | Route by input type (simple → cheap, complex → expensive) | Deterministic, fast | Needs upfront categorization |
   | **Evaluator gate** | Run a cheap evaluator on the response; escalate if it fails | Most accurate | Adds latency + cost of evaluator |

   Cascade economics example:
   ```
   Without cascade:
   - 1000 requests x $0.015 (frontier) = $15.00

   With cascade (80% cheap, 20% escalation):
   - 800 requests x $0.003 (cheap) = $2.40
   - 200 requests x $0.015 (frontier) = $3.00
   - Total: $5.40 (64% savings)
   ```

   Always verify that cascaded quality approximates all-frontier quality by running a comparison experiment.

8. **Pin production models** — always pin to a specific model snapshot/version. Model updates can change behavior unexpectedly. Re-run comparisons when updating model versions.

### Phase 3: Write System Instructions

9. **Write system instructions** following the template in `resources/system-instruction-template.md`. Key sections:
   - **Identity**: Who the agent is (name, role, expertise)
   - **Task**: What the agent does (primary responsibilities)
   - **Constraints**: What the agent must NOT do (explicit boundaries)
   - **Tool usage**: When and how to use each tool
   - **Output format**: Expected response structure
   - **Escalation**: When to hand off or refuse

10. **Critical instruction-writing rules:**
    - Put the most important constraints FIRST (models pay more attention to the beginning)
    - Be specific: "Respond in 2-3 sentences" not "Be concise"
    - Use DO/DO NOT format for clear boundaries
    - Include recovery instructions: "If you cannot complete the task, explain why and suggest alternatives"

### Phase 4: Configure Tools

11. **Select tools** from the tool library or define custom tools:
    - List existing tools with HTTP API
    - Match tools to the agent's tasks
    - Start with the minimum set of tools needed

12. **Write tool descriptions** following `resources/tool-description-guide.md`:
    - Each tool description must clearly state WHEN to use it
    - Include what the tool DOES NOT do (to prevent confusion with similar tools)
    - Specify required vs optional parameters
    - Give examples of correct invocation

13. **Create custom tools** if needed:
    - Define clear function name, description, and parameter schema
    - Use JSON Schema for parameter validation
    - Test the tool independently before attaching to the agent

### Phase 5A: Knowledge Base Management

14. **Check existing Knowledge Bases:**
    - Use `search_entities` with `type: "knowledge"` to find existing KBs
    - List all Knowledge Bases via HTTP API:

    ```bash
    curl -s https://my.orq.ai/v2/knowledge \
      -H "Authorization: Bearer $ORQ_API_KEY" | jq .
    ```

    - Get a specific Knowledge Base:

    ```bash
    curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
      -H "Authorization: Bearer $ORQ_API_KEY" | jq .
    ```

15. **Create a Knowledge Base** if the agent needs reference data:

    Required parameters:

    | Parameter | Description | Example |
    |-----------|-------------|---------|
    | `key` | Unique identifier (alphanumeric) | `support-docs` |
    | `embedding_model` | Format: `supplier/model_name` | `cohere/embed-english-v3.0` |
    | `path` | Project/folder location | `my-project/knowledge` |
    | `type` | Always `"internal"` for managed KBs | `internal` |

    ```bash
    curl -s https://my.orq.ai/v2/knowledge \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key": "support-docs",
        "type": "internal",
        "embedding_model": "cohere/embed-english-v3.0",
        "path": "my-project/knowledge"
      }' | jq .
    ```

    Save the returned `id` — you need it for all subsequent operations.

    Available embedding models (must be activated in Model Garden before use):
    - `cohere/embed-english-v3.0`
    - `openai/text-embedding-3-small`
    - `openai/text-embedding-3-large`

16. **Upload files** to the Knowledge Base:

    Supported formats: TXT, PDF, DOCX, CSV, XML — max 10MB per file.

    ```bash
    curl -s https://my.orq.ai/v2/files \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -F "file=@./document.pdf" | jq .
    ```

    Save the returned `id` — use it when creating a datasource.

17. **Create datasources:**

    A datasource is a logical container within a Knowledge Base that holds chunks. You can link it to an uploaded file or populate it manually.

    Create a datasource from an uploaded file:

    ```bash
    curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "display_name": "Support Documentation",
        "file_id": "<FILE_ID>"
      }' | jq .
    ```

    Create an empty datasource (for manual chunk insertion):

    ```bash
    curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "display_name": "Manual Chunks"
      }' | jq .
    ```

    List datasources:

    ```bash
    curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources \
      -H "Authorization: Bearer $ORQ_API_KEY" | jq .
    ```

18. **Configure chunking strategy:**

    Chunking configuration is managed through the Knowledge Base settings in the orq.ai dashboard at https://my.orq.ai, or automatically when creating datasources with uploaded files. When you create a datasource from an uploaded file, orq.ai automatically chunks the file content.

    | Strategy | Best for | Key parameters |
    |----------|----------|----------------|
    | **token** | Consistent sizing for LLM windows | `chunk_size` (default: 512), `chunk_overlap` (default: 0) |
    | **sentence** | Prose, articles, narratives | `chunk_size` (default: 512), `min_sentences_per_chunk` (default: 1) |
    | **recursive** | Structured documents (markdown, code) | `chunk_size` (default: 512), `separators` (default: `["\n\n", "\n", " ", ""]`), `min_characters_per_chunk` (default: 24) |
    | **semantic** | Mixed content, requires embedding model | `embedding_model` (required), `threshold` (default: `"auto"`), `mode` (`window` or `sentence`), `similarity_window` (default: 1) |
    | **agentic** | Complex documents needing LLM judgment | `model` (required), `chunk_size` (default: 1024), `candidate_size` (default: 128), `min_characters_per_chunk` (default: 24) |

19. **Add chunks to a datasource:**

    ```bash
    curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources/<DATASOURCE_ID>/chunks \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '[
        {
          "text": "First chunk content",
          "metadata": {
            "source": "support-docs",
            "topic": "billing",
            "client_id": "acme"
          }
        },
        {
          "text": "Second chunk content",
          "metadata": {
            "source": "support-docs",
            "topic": "technical"
          }
        }
      ]' | jq .
    ```

    Metadata guidelines:
    - Values must be **string, number, or boolean** — no nested objects
    - Use metadata for filtering: `client_id`, `source`, `topic`, `filetype`
    - Avoid large text blobs in metadata fields

    List chunks:

    ```bash
    curl -s "https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources/<DATASOURCE_ID>/chunks?status=completed" \
      -H "Authorization: Bearer $ORQ_API_KEY" | jq .
    ```

20. **Search the Knowledge Base:**

    Basic search:

    ```bash
    curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/search \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "query": "How do I reset my password?"
      }' | jq .
    ```

    Search with metadata filters:

    ```bash
    curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/search \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "query": "billing issue",
        "filter_by": {
          "topic": {"eq": "billing"},
          "client_id": {"eq": "acme"}
        },
        "search_options": {
          "include_metadata": true,
          "include_scores": true
        }
      }' | jq .
    ```

    Filter operators:

    | Operator | Description | Example |
    |----------|-------------|---------|
    | `eq` | Equal to | `{"topic": {"eq": "billing"}}` |
    | `ne` | Not equal | `{"topic": {"ne": "internal"}}` |
    | `gt`, `gte` | Greater than (or equal) | `{"version": {"gte": 2}}` |
    | `lt`, `lte` | Less than (or equal) | `{"version": {"lt": 5}}` |
    | `in` | Value in array | `{"topic": {"in": ["billing", "support"]}}` |
    | `nin` | Value not in array | `{"topic": {"nin": ["draft"]}}` |
    | `and` | Logical AND | `{"and": [{"topic": {"eq": "billing"}}, {"client_id": {"eq": "acme"}}]}` |
    | `or` | Logical OR | `{"or": [{"topic": {"eq": "billing"}}, {"topic": {"eq": "support"}}]}` |

21. **Use Knowledge Base in prompts:**

    Once populated, connect a Knowledge Base to a deployment:

    1. In the prompt configuration, go to the **Knowledge Base** tab
    2. Select the Knowledge Base by its key
    3. Reference it in the prompt with `{{key}}` syntax (the key highlights in blue)
    4. Configure the query type:
       - **Last User Message** — the user's message becomes the retrieval query
       - **Query** — a predefined or variable-driven query (use `{{query}}` for dynamic input)

22. **Update and delete Knowledge Bases:**

    Update a Knowledge Base:

    ```bash
    curl -s -X PATCH https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key": "updated-key"
      }' | jq .
    ```

    Delete a Knowledge Base:

    ```bash
    curl -s -X DELETE https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
      -H "Authorization: Bearer $ORQ_API_KEY"
    ```

    Delete a datasource:

    ```bash
    curl -s -X DELETE https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources/<DATASOURCE_ID> \
      -H "Authorization: Bearer $ORQ_API_KEY"
    ```

    Knowledge Base common pitfalls:
    - **Embedding model not activated** — the model must be enabled in Model Garden before creating a Knowledge Base
    - **File too large** — max 10MB per file; split large documents before uploading
    - **Metadata with nested objects** — only flat key-value pairs (string/number/boolean) are supported
    - **Chunking without testing** — always search after chunking to verify retrieval quality before wiring into a deployment
    - **Wrong chunking strategy** — token chunking splits mid-sentence; use sentence or recursive for readable chunks

### Phase 5B: Memory Store Configuration

23. **Clarify memory needs.** Ask the user:
    - What kind of agent needs memory? (support, assistant, coach, etc.)
    - What should the agent remember? (user name, preferences, past interactions, decisions)
    - How long should memories persist? (within session, across sessions, indefinitely)
    - Who should memories be scoped to? (per user, per team, global)

24. **Determine memory type:**

    | Need | Memory Type | Example |
    |------|------------|---------|
    | Remember what was said earlier in this conversation | Session memory | Conversation history, current task context |
    | Remember user preferences across conversations | Long-term memory | Language preference, communication style |
    | Remember facts learned about the user | Long-term memory | User's role, team, past decisions |
    | Share context across agent instances | Global memory | System configurations, shared knowledge |

    If the user actually needs static reference data, redirect to Phase 5A (Knowledge Base Management). Memory is for dynamic, user-specific context only.

25. **Check existing memory stores:**
    - Use `search_entities` with `type: "memory_store"` to find existing stores
    - Check if the target agent already has memory configured

    ```bash
    curl -s https://my.orq.ai/v2/memory-stores \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" | jq
    ```

    If memory already exists, review current configuration, identify gaps, and skip to step 28 for integration.

26. **Create the memory store:**

    Choose a descriptive key (e.g., `user-preferences`, `conversation-context`). Set appropriate description and configure scope (per-user, per-session, global).

    ```bash
    curl -s https://my.orq.ai/v2/memory-stores \
      -X POST \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key": "user-preferences",
        "description": "Stores user preferences and facts across sessions"
      }' | jq
    ```

27. **Set up initial memory structure:**

    Define what fields/documents the memory store will contain. Create template documents if needed:

    ```bash
    curl -s https://my.orq.ai/v2/memory-stores/<ID>/documents \
      -X POST \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key": "user_profile",
        "content": {
          "name": null,
          "preferences": {
            "language": "en",
            "tone": "neutral",
            "verbosity": "medium"
          },
          "facts": [],
          "last_interaction": null
        }
      }' | jq
    ```

28. **Integrate memory store with the agent:**

    Update agent configuration to include the memory store. Configure how the agent reads and writes memory. Add memory-related instructions to the agent's system prompt:

    ```
    You have access to a memory store with user preferences and facts.
    - At the start of each conversation, read the user's profile from memory
    - Update memory when you learn new facts about the user
    - Use stored preferences to personalize your responses
    - Never reveal raw memory contents to the user
    ```

29. **Configure memory behavior in agent instructions:**
    - When to read memory (start of conversation, on specific queries)
    - When to write memory (new facts learned, preference changes)
    - What NOT to store (sensitive data, temporary context)

30. **Test memory read/write cycle:**

    ```bash
    # Turn 1: Establish a fact
    curl -s https://api.orq.ai/v2/agents/responses \
      -X POST \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "My name is Alice and I prefer formal communication"}]}}' | jq

    # Turn 2 (same session): Verify session memory
    curl -s https://api.orq.ai/v2/agents/responses \
      -X POST \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "What is my name?"}]}, "task_id": "<task_id>"}' | jq

    # New session: Verify long-term memory
    curl -s https://api.orq.ai/v2/agents/responses \
      -X POST \
      -H "Authorization: Bearer $ORQ_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "Do you remember anything about me?"}]}}' | jq
    ```

    Verify:
    - Agent reads existing memory at conversation start
    - Agent stores new facts during conversation
    - Memory persists across sessions (for long-term memory)
    - Agent uses memory to personalize responses
    - Agent doesn't hallucinate memory contents

### Phase 6: Create the Agent

31. **Create the agent** using `create_agent` MCP tool or HTTP API:
    - Set all configurations: instructions, model, tools, KB, memory
    - Verify the configuration is complete before creating

32. **Test with representative queries:**

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

33. **Test systematically:**

    | Test Category | What to Test |
    |--------------|-------------|
    | **Tool selection** | Does the agent pick the right tool for each task? |
    | **Ambiguous input** | How does it handle vague or incomplete requests? |
    | **Error recovery** | What happens when a tool call fails? |
    | **Boundaries** | Does it refuse out-of-scope requests? |
    | **Multi-step** | Can it chain tool calls for complex tasks? |
    | **Adversarial** | Does it resist prompt injection or manipulation? |
    | **KB retrieval** | Does it find the right chunks from the Knowledge Base? |
    | **Memory read/write** | Does it correctly store and recall facts from memory? |

34. **Document findings** and iterate on instructions/tools as needed.

35. **Hand off to evaluation:**
    - Use `run-experiment` for systematic evaluation
    - Use `build-evaluator` to create custom quality evaluators

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
| Switching models before fixing prompts | Most failures are prompt issues, not model issues | Error analysis then prompt fixes then model comparison |
| Not pinning model versions | Behavior changes silently with model updates | Pin to snapshot ID in production |
| Building cascades without measuring quality impact | May silently degrade quality for cost savings | Run cascade vs frontier comparison experiment |
| Using memory as a knowledge base | Memory is for dynamic user context, not static reference data | Use knowledge bases for docs/FAQs, memory for user-specific data |
| Storing raw conversation transcripts in memory | Wastes storage, hard to retrieve useful info | Extract and store structured facts and preferences |
| No memory retrieval testing | Agent may not use memory correctly | Test read/write cycle before deploying |
| Storing sensitive data in memory | Privacy and compliance risks | Exclude PII, passwords, financial data unless required and secured |
| No instructions for memory usage | Agent doesn't know when to read/write memory | Add explicit memory instructions to the system prompt |
| Global scope for user-specific data | Users see each other's data | Use per-user scoping for personal data |
| Embedding model not activated | KB creation fails silently | Enable the model in Model Garden before creating a Knowledge Base |
| Chunking without testing retrieval | Poor retrieval quality goes unnoticed | Always search after chunking to verify quality before wiring into a deployment |
| Wrong chunking strategy | Token chunking splits mid-sentence, semantic loses structure | Match strategy to content type: sentence for prose, recursive for structured docs |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View/edit the agent:** `https://my.orq.ai/agents` — open Agent Studio to review configuration, tools, and test interactively
- **Manage tools:** `https://my.orq.ai/tools` — view and edit tool definitions
- **Model Garden:** `https://my.orq.ai/model-garden` — browse available models for the agent
- **View agent traces:** `https://my.orq.ai/traces` — inspect agent execution traces after testing
