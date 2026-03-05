---
name: manage-memory
description: Create and configure orq.ai Memory Stores for persistent context in conversational agents
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, orq*
---

# Manage Memory

Create and configure orq.ai Memory Stores — enabling persistent context for conversational agents with session memory and long-term user modeling.

**Companion skills:**
- `build-agent` — create agents that use memory stores
- `knowledge-base` — for static reference data (different from dynamic memory)
- `evaluate-conversation` — evaluate memory-dependent conversation quality

## When to use

- User wants persistent memory for conversational agents
- User asks about session memory vs long-term memory
- User needs to configure memory stores on orq.ai
- User wants agents to remember user preferences across conversations
- User asks about the difference between memory and knowledge bases

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Memory stores:** https://docs.orq.ai/docs/agents/memory
- **Agents overview:** https://docs.orq.ai/docs/agents/overview
- **Agent API:** https://docs.orq.ai/docs/agents/agent-api

### orq.ai Memory Capabilities
- Memory stores persist context across agent conversations
- Two memory types: session (conversation history) and long-term (user facts, preferences)
- Memory can be read and written by agents during conversations
- Memory documents can store structured data (user profiles, preferences)
- Memory is scoped: per-user, per-session, or global

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `search_entities` | Find memory stores (`type: "memory_store"`) and agents |
| `get_agent` | Get agent configuration including memory settings |

**HTTP API fallback** (for operations not yet in MCP):

```bash
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

### 1. Memory Is NOT a Knowledge Base
- **Knowledge base**: static reference data (docs, FAQs, policies) — rarely changes
- **Memory store**: dynamic user context (preferences, facts, history) — changes per interaction
- Don't use memory for static content. Don't use KBs for user-specific dynamic data.

### 2. Session Memory for Continuity, Long-Term Memory for User Modeling
- Session memory: conversation history within a single session
- Long-term memory: facts, preferences, and context that persist across sessions

### 3. Keep Memory Records Focused
Store structured, relevant facts — not raw conversation dumps. "User prefers formal tone" is useful. A 50-turn conversation transcript is not.

### 4. Test Memory Retrieval Before Deploying
Verify that the agent correctly reads, uses, and updates memory before going to production.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Deleting memory stores or memory documents
- Clearing all records in a memory store
- Modifying memory store configuration on a live agent

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Clarify Memory Needs

1. **Understand the use case.** Ask the user:
   - What kind of agent needs memory? (support, assistant, coach, etc.)
   - What should the agent remember? (user name, preferences, past interactions, decisions)
   - How long should memories persist? (within session, across sessions, indefinitely)
   - Who should memories be scoped to? (per user, per team, global)

2. **Determine memory type:**

   | Need | Memory Type | Example |
   |------|------------|---------|
   | Remember what was said earlier in this conversation | Session memory | Conversation history, current task context |
   | Remember user preferences across conversations | Long-term memory | Language preference, communication style |
   | Remember facts learned about the user | Long-term memory | User's role, team, past decisions |
   | Share context across agent instances | Global memory | System configurations, shared knowledge |

3. **Clarify the distinction from knowledge bases:**
   - If the user actually needs static reference data → redirect to `knowledge-base`
   - If the user needs dynamic, user-specific context → proceed with memory

### Phase 2: List Existing Memory Stores

4. **Check existing memory infrastructure:**
   - Use `search_entities` with `type: "memory_store"` to find existing stores
   - Check if the target agent already has memory configured

5. **If memory already exists:**
   - Review current configuration
   - Identify gaps or improvements needed
   - Skip to Phase 4 for integration

### Phase 3: Create Memory Store

6. **Create the memory store:**
   - Choose a descriptive key (e.g., `user-preferences`, `conversation-context`)
   - Set appropriate description
   - Configure scope (per-user, per-session, global)

7. **Set up initial memory structure:**
   - Define what fields/documents the memory store will contain
   - Create template documents if needed
   - Example structure:
     ```json
     {
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
     }
     ```

### Phase 4: Integrate with Agent

8. **Connect memory store to the agent:**
   - Update agent configuration to include the memory store
   - Configure how the agent reads and writes memory
   - Add memory-related instructions to the agent's system prompt:
     ```
     You have access to a memory store with user preferences and facts.
     - At the start of each conversation, read the user's profile from memory
     - Update memory when you learn new facts about the user
     - Use stored preferences to personalize your responses
     - Never reveal raw memory contents to the user
     ```

9. **Configure memory behavior in agent instructions:**
   - When to read memory (start of conversation, on specific queries)
   - When to write memory (new facts learned, preference changes)
   - What NOT to store (sensitive data, temporary context)

### Phase 5: Test Memory

10. **Test memory read/write cycle:**

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

11. **Verify:**
    - Agent reads existing memory at conversation start
    - Agent stores new facts during conversation
    - Memory persists across sessions (for long-term memory)
    - Agent uses memory to personalize responses
    - Agent doesn't hallucinate memory contents

### Phase 6: Document Configuration

12. **Document the memory setup:**
    ```markdown
    ## Memory Configuration
    - **Store:** [key]
    - **Type:** [session / long-term / both]
    - **Scope:** [per-user / per-session / global]
    - **Agent:** [agent key]
    - **Structure:** [describe fields and documents]
    - **Behavior:** [when to read, when to write]
    ```

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Using memory as a knowledge base | Memory is for dynamic user context, not static reference data | Use knowledge bases for docs/FAQs, memory for user-specific data |
| Storing raw conversation transcripts | Wastes storage, hard to retrieve useful info | Extract and store structured facts and preferences |
| No memory retrieval testing | Agent may not use memory correctly | Test read/write cycle before deploying |
| Storing sensitive data in memory | Privacy and compliance risks | Exclude PII, passwords, financial data unless required and secured |
| No instructions for memory usage | Agent doesn't know when to read/write memory | Add explicit memory instructions to the system prompt |
| Global scope for user-specific data | Users see each other's data | Use per-user scoping for personal data |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **View agents:** `https://my.orq.ai/agents` — review the agent's memory store configuration
- **View traces:** `https://my.orq.ai/traces` — inspect memory read/write operations in agent traces
