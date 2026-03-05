---
name: evaluate-conversation
description: Evaluate multi-turn conversation quality with session-level, turn-level, and memory/coherence checks
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Evaluate Conversation

Evaluate multi-turn conversation systems (chatbots, support agents, coaching assistants) by assessing session-level success, turn-level quality, and cross-turn coherence/memory.

**Companion skills:**
- `evaluate-agent` — if the conversation system uses tools, use evaluate-agent for tool-calling stages
- `trace-analysis` — trace-level failure analysis for conversation logs
- `generate-synthetic-dataset` — generate multi-turn test scenarios

## When to use

- User wants to evaluate a chatbot or conversational agent
- User needs to test conversation memory, coherence, or context retention
- User asks about multi-turn evaluation or conversation quality
- User has a support/sales/coaching agent that runs multi-turn interactions
- User notices quality degradation over long conversations

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Conversations:** https://docs.orq.ai/docs/conversations/overview
- **Thread management:** https://docs.orq.ai/docs/proxy/thread-management
- **Conversation threads (observability):** https://docs.orq.ai/docs/observability/threads
- **Traces:** https://docs.orq.ai/docs/observability/traces
- **Memory Stores overview:** https://docs.orq.ai/docs/memory-stores/overview
- **Memory Stores API:** https://docs.orq.ai/docs/memory-stores/using-memory-stores
- **Memory Stores in AI Studio:** https://docs.orq.ai/docs/memory-stores/using-memory-stores-in-the-ai-studio
- **Experiments:** https://docs.orq.ai/docs/experiments/creating
- **Chat History tutorial:** https://docs.orq.ai/docs/tutorials/maintaining-history-with-a-model

### orq.ai Multi-Turn Capabilities
- **Thread management** maintains conversation history across turns
- **Memory Stores** provide cross-session memory (persistent knowledge across conversations)
- **Conversation threads** in observability show full conversation flows
- Experiments support **Messages** column in datasets for multi-turn context
- LLM evaluators can access `{{log.messages}}` — the full conversation history

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `get_agent` | Get agent configuration and details |
| `list_traces` | List and filter conversation traces |
| `list_spans` | List spans within a trace |
| `get_span` | Get detailed span information |
| `create_llm_eval` | Create evaluators for coherence/memory |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# Multi-turn agent conversations
# First message — capture the task_id from the response
curl -s https://api.orq.ai/v2/agents/responses \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "Hello, I need help"}]}}' | jq

# Follow-up — pass task_id to continue the thread
curl -s https://api.orq.ai/v2/agents/responses \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "Tell me more"}]}, "task_id": "<task_id>"}' | jq

# Memory store management (cross-session memory testing)
curl -s https://my.orq.ai/v2/memory-stores \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Create a memory store
curl -s https://my.orq.ai/v2/memory-stores \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "conversation-memory", "embedding_model": "text-embedding-3-small", "embedding_provider": "openai", "top_k": 5}' | jq

# Memory document management (test cross-session recall)
curl -s https://my.orq.ai/v2/memory-stores/<STORE_ID>/documents \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "User prefers email communication", "metadata": {"source": "session_1"}}' | jq

# List memory documents
curl -s https://my.orq.ai/v2/memory-stores/<STORE_ID>/documents \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq
```

## Core Principles

### 1. Start at Session Level
Always evaluate session-level success first: "Did the conversation achieve the user's goal?" Only drill into turn-level analysis when session-level failures need debugging.

### 2. Isolate Multi-Turn vs Single-Turn Failures
Before building multi-turn test infrastructure, try reproducing failures as single-turn tests. If the single-turn version still fails, the root cause is NOT multi-turn (it's a retrieval, knowledge, or reasoning issue).

### 3. Position-Dependent Degradation Is Common
Systems often degrade after 2-3 turns — forgetting context, contradicting earlier responses, or drifting from instructions. Explicitly test for this.

### 4. Multi-Turn Evaluation Is Expensive
Don't evaluate every turn in every conversation. Be strategic about what you measure.

## Steps

### Phase 1: Define Evaluation Levels

1. **Choose what to evaluate:**

   | Level | What It Measures | When to Use | Cost |
   |-------|-----------------|-------------|------|
   | **Session level** | Did the full conversation achieve the goal? | Always — start here | Low |
   | **Turn level** | Was each individual response good? | Only when debugging specific failures | High |
   | **Coherence** | Does the system maintain consistency across turns? | When contradiction/drift is suspected | Medium |
   | **Memory** | Does the system remember earlier context? | When forgetting is suspected | Medium |
   | **Efficiency** | How many turns to resolution? | When optimizing conversation flow | Low |

2. **Define session-level success criteria:**
   - What constitutes a "successful" conversation? (e.g., ticket resolved, question answered, task completed)
   - Binary pass/fail per conversation
   - This is the most important metric

### Phase 2: Collect Multi-Turn Test Data

3. **Generate test conversations.** Three approaches:

   **Approach A — Team simulation (recommended for starting):**
   - Have 3-5 team members each simulate 10-15 realistic conversations
   - Provide scenario cards describing the user's goal and persona
   - Quickly generates 50-100+ diverse multi-turn traces
   - Use a lightweight chat interface or orq.ai directly

   **Approach B — User simulation with LLM:**
   - Use a second LLM to play the user role
   - Define the user persona, goal, and behavior constraints
   - The simulator sends messages; the agent under test responds
   - Good for scaling but can produce unrealistic interactions
   - Always have a human review a sample of simulated conversations

   **Approach C — N-1 testing (for targeted evaluation):**
   - Take real conversations from production (or simulated ones)
   - Provide the first N-1 turns as context
   - Let the agent generate turn N
   - Compare against the actual turn N (or expected behavior)
   - More grounded but requires existing conversation data

4. **Include perturbation scenarios:**

   | Perturbation | What It Tests | Example |
   |-------------|--------------|---------|
   | Goal change mid-conversation | Adaptability | "Actually, I changed my mind — I want X instead" |
   | Correction | Error handling | "No, I said the blue one, not the red one" |
   | Ambiguity injection | Clarification behavior | "Can you help with the thing we discussed?" |
   | Distraction | Focus maintenance | Unrelated question in the middle of a task |
   | Escalation request | Handoff behavior | "I want to speak to a manager" |
   | Contradiction | Consistency | Provide conflicting information across turns |
   | Long gap | Memory retention | Resume conversation after many turns of other topics |

### Phase 3: Session-Level Evaluation

5. **Evaluate each conversation for session-level success:**

   ```
   | Conversation ID | Goal | Turns | Success | Notes |
   |----------------|------|-------|---------|-------|
   | conv_001 | Refund request | 6 | Pass | Resolved correctly |
   | conv_002 | Product question | 12 | Fail | Got stuck in loop, never answered |
   | conv_003 | Complaint handling | 4 | Pass | Appropriate escalation |
   ```

6. **Build session-level evaluators:**
   - **State check grader:** Verify the end state (ticket resolved, order placed, answer provided)
   - **LLM-as-Judge grader:** "Did this conversation achieve the user's goal?" (binary)
   - **Turn count grader:** Was the conversation resolved within the expected turn limit?

### Phase 4: Turn-Level Diagnostics (for failed sessions only)

7. **For sessions that failed, find the first failing turn:**
   - Read the conversation turn by turn
   - Identify: at which turn did the conversation go off track?
   - Was it a specific response that derailed things?
   - Apply the "first upstream failure" principle

8. **Try to reproduce as a single-turn test:**
   - Take the failing turn's context + input
   - Run it as a standalone prompt
   - If it still fails → NOT a multi-turn issue (fix the prompt/model)
   - If it passes as single-turn but fails in multi-turn → genuine multi-turn issue (context management, memory, or position-dependent degradation)

9. **For genuine multi-turn failures, evaluate:**

   | Check | Method | Evaluator Type |
   |-------|--------|---------------|
   | **Context retention** | Does the response reference earlier information correctly? | LLM-as-Judge with `{{log.messages}}` |
   | **Instruction compliance** | Does the response follow rules stated earlier? | LLM-as-Judge checking specific rules |
   | **Consistency** | Does the response contradict earlier statements? | LLM-as-Judge comparing turns |
   | **Persona maintenance** | Does the character hold across turns? | LLM-as-Judge per-turn |
   | **Position degradation** | Does quality drop after N turns? | Score by turn position, look for trends |

### Phase 5: Memory and Coherence Evaluation

10. **Within-session memory tests:**
    - State a preference early in the conversation (e.g., "I prefer email communication")
    - Check if the system honors it in later turns
    - Vary the distance between stating and checking (1 turn, 5 turns, 10 turns)

11. **Cross-session memory tests (if using orq.ai Memory Stores):**
    - Establish facts in Session 1
    - Start a new Session 2
    - Check if the system remembers facts from Session 1
    - Test with: user preferences, conversation history, agreed-upon actions

12. **Coherence across long conversations:**
    - Test with conversations of increasing length: 5, 10, 20, 50 turns
    - Look for: contradictions, forgotten context, repeated questions, persona drift
    - Plot quality scores against turn position to detect degradation curves

### Phase 6: Build the Experiment

13. **Create the evaluation dataset on orq.ai:**
    - Use the **Messages** column for multi-turn context (system/user/assistant message sequences)
    - Use **Inputs** for turn-level variables
    - Use **Expected Outputs** for reference responses

14. **Attach evaluators:**
    - Session-level: task completion (state check or LLM judge)
    - Turn-level: coherence, memory, persona (LLM judges)
    - Efficiency: turn count, resolution rate
    - Use RAGAS Coherence from the evaluator library if applicable

15. **Run experiments and iterate:**
    - Use the `action-plan` skill for prioritized improvements
    - Track session success rate, average turns to resolution, degradation curves

## Metrics Summary

| Metric | Level | What It Tells You |
|--------|-------|-------------------|
| **Session success rate** | Session | % of conversations achieving the goal |
| **Turns to resolution** | Session | Efficiency of the conversation |
| **First-failure turn** | Turn | Where conversations go wrong |
| **Context retention score** | Turn | Memory quality across turns |
| **Consistency score** | Coherence | Contradiction rate across turns |
| **Position degradation curve** | Coherence | Quality trend as conversations lengthen |
| **Cross-session recall** | Memory | Retention of facts across sessions |

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Evaluating every turn in every conversation | Expensive and most turns are fine | Start at session level, drill into turns only for failures |
| Building multi-turn tests for single-turn failures | Wasted complexity | Try reproducing as single-turn first |
| Only testing short conversations (2-3 turns) | Misses position-dependent degradation | Test with 5, 10, 20+ turn conversations |
| Using one LLM to both simulate and evaluate | Biased self-assessment | Separate simulation model from judge model |
| No perturbation testing | Misses adaptability and robustness issues | Include goal changes, corrections, contradictions |
| Treating all turns equally | Most failures concentrate in a few key turns | Focus analysis on the first failing turn |
| Ignoring memory store behavior | Cross-session issues are invisible | Explicitly test cross-session recall if using memory |
