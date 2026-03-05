---
name: evaluate-agent
description: Evaluate agentic and tool-calling LLM pipelines with stage-specific graders and transition failure matrices
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Evaluate Agent

Evaluate agentic and tool-calling LLM pipelines using stage-specific grading, end-to-end task success measurement, and transition failure matrices for systematic debugging.

**Companion skills:**
- `trace-analysis` — build failure taxonomies from agent traces
- `build-evaluator` — design judges for subjective agent behaviors
- `generate-synthetic-dataset` — generate diverse agent task scenarios

## When to use

- User wants to evaluate an AI agent (tool-calling, multi-step, autonomous)
- User needs to test tool selection, argument generation, or output interpretation
- User wants to debug a multi-step pipeline with cascading failures
- User asks about evaluating agentic workflows or agent reliability
- User has an orq.ai Agent and wants to assess its performance

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Agents overview:** https://docs.orq.ai/docs/agents/overview
- **Agent Studio:** https://docs.orq.ai/docs/agents/agent-studio
- **Agents API:** https://docs.orq.ai/docs/agents/agent-api
- **Tools overview:** https://docs.orq.ai/docs/tools/overview
- **Creating tools:** https://docs.orq.ai/docs/tools/creating
- **Tool calling:** https://docs.orq.ai/docs/proxy/tool-calling
- **Experiments (agent tasks):** https://docs.orq.ai/docs/experiments/creating
- **Traces (agent debugging):** https://docs.orq.ai/docs/observability/traces

### orq.ai Agent Evaluation Capabilities
- Experiments support **agent configurations** that load built-in instructions automatically
- Agents can have **executable tools** in experiments — fetching data, HTTP requests, Python code
- Traces show **step-by-step tool interactions**: tool names, args, payloads, and responses
- Tool call history in experiments shows correct tool selection and response handling
- Agent traces are accessible from Agent pages with automatic filtering

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `get_agent` | Get agent configuration and details |
| `create_agent` | Create a new agent |
| `list_traces` | List and filter agent traces |
| `list_spans` | List spans within a trace for step-by-step debugging |
| `get_span` | Get detailed span information |
| `create_llm_eval` | Create evaluators for agent stages |
| `list_models` | List available models for agent configuration |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# List agents
curl -s https://my.orq.ai/v2/agents \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Invoke an agent for testing
curl -s https://api.orq.ai/v2/agents/responses \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "Test task"}]}}' | jq

# Multi-turn agent testing (reuse task_id)
curl -s https://api.orq.ai/v2/agents/responses \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_key": "<KEY>", "message": {"role": "user", "parts": [{"kind": "text", "text": "Step 2"}]}, "task_id": "<task_id>"}' | jq

# Tool management
curl -s https://my.orq.ai/v2/tools \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Get tool details
curl -s https://my.orq.ai/v2/tools/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Create a tool
curl -s https://my.orq.ai/v2/tools \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "get-weather", "description": "Get weather", "type": "function", "function": {"name": "get_weather", "parameters": {"type": "object", "properties": {"city": {"type": "string"}}}}}' | jq
```

## Core Principles

### 1. Define Agency Level First
Before you can evaluate, you must define what level of agency is expected:

| Agency Level | Expected Behavior | Failure Looks Like |
|-------------|-------------------|-------------------|
| **High agency** | Acts autonomously, makes decisions, retries on failure | Stopping to ask when it should have proceeded |
| **Low agency** | Conservative, asks for clarification when uncertain | Acting autonomously when it should have asked |
| **Mixed** | Autonomous for routine tasks, asks on novel/risky ones | Misclassifying task as routine vs novel |

Without this definition, you cannot distinguish errors from intended behavior.

### 2. Grade Outcomes, Not Paths
Agents regularly find valid approaches that eval designers didn't anticipate. Checking exact tool call sequences is too rigid and produces brittle tests. Instead, verify that the **end state** is correct.

### 3. Evaluate Stages Independently
Failures cascade in agent pipelines. A wrong tool selection causes wrong arguments, which cause wrong execution, which causes wrong output interpretation. Evaluate each stage independently to find the root cause.

### 4. Use Isolated Graders Per Dimension
Don't build one all-encompassing grader. Evaluate tool selection, argument quality, execution success, and output interpretation as separate assessments.

## Steps

### Phase 1: Define the Agent Under Test

1. **Characterize the agent.** Document:
   - What tools are available? (names, descriptions, parameter schemas)
   - What is the system prompt / persona / task?
   - What is the expected agency level? (high/low/mixed)
   - What does "task success" look like? (end-state verification)

2. **Define evaluation levels:**

   **Level 1 — End-to-End Task Success (start here):**
   - Treat the agent as a black box
   - Did it achieve the user's goal? (binary: yes/no)
   - This is the most important metric

   **Level 2 — Step-Level Diagnostics (when Level 1 reveals failures):**
   - Which specific step failed?
   - Use the 4-stage tool calling framework (below)
   - Build the transition failure matrix

### Phase 2: Design End-to-End Task Evaluation

3. **Create task definitions** with unambiguous success criteria:

   ```yaml
   task:
     id: "refund-processing-1"
     description: "Customer requests refund for order #12345"
     input: "I want a refund for my last order, it arrived damaged"
     success_criteria:
       - Agent verifies customer identity
       - Agent looks up order details
       - Agent processes refund (or escalates if policy doesn't allow)
       - Agent confirms resolution to customer
     graders:
       - type: state_check     # Did the end state match?
       - type: llm_rubric      # Was the interaction quality good?
       - type: tool_calls      # Were required tools used?
   ```

4. **Write unambiguous tasks.** A good task is one where two domain experts would independently reach the same pass/fail verdict.
   - Create a **reference solution** proving the task is solvable
   - If pass@100 is 0%, the task is likely broken, not the agent
   - Include both tasks the agent SHOULD handle and tasks it SHOULD refuse/escalate

5. **Account for non-determinism.** Agent behavior varies between runs:

   | Metric | Formula | When to Use |
   |--------|---------|-------------|
   | **pass@k** | P(at least 1 success in k trials) | When one success suffices (research, exploration) |
   | **pass^k** | (per-trial success)^k | When consistent reliability matters (customer-facing) |

   Run 3-5 trials per task to capture variability.

### Phase 3: 4-Stage Tool Calling Evaluation

6. **Evaluate each stage of tool calling independently:**

   **Stage 1 — Tool Selection:**
   - Did the agent pick the RIGHT tool?
   - Common failures: wrong tool, hallucinated nonexistent tool, failed to call any tool when needed, tool confusion from ambiguous descriptions
   - Grader: compare selected tool(s) against expected tool(s) for the task

   **Stage 2 — Argument Generation:**
   - Are the arguments structurally valid AND semantically correct?
   - Common failures: schema/type violations, missing required args, wrong formats, injection vulnerabilities
   - Grader: schema validation (Pydantic/JSON schema) + semantic checks

   **Stage 3 — Execution Success:**
   - Did the tool call complete and return expected results?
   - Common failures: valid args but nonexistent entity (empty result), runtime errors, timeouts
   - Grader: check for errors, empty results, timeouts in the trace

   **Stage 4 — Output Interpretation:**
   - Did the agent correctly interpret and use the tool's response?
   - Common failures: misinterpreted data points, ignored important details, failed to integrate output logically
   - Grader: LLM-as-Judge comparing agent's interpretation against tool response

7. **For each stage, record:**
   ```
   | Task | Tool Selection | Arg Generation | Execution | Interpretation | End-to-End |
   |------|---------------|----------------|-----------|----------------|------------|
   | T1   | Pass          | Pass           | Pass      | Fail           | Fail       |
   | T2   | Fail          | N/A            | N/A       | N/A            | Fail       |
   | T3   | Pass          | Pass           | Pass      | Pass           | Pass       |
   ```

### Phase 4: Build the Transition Failure Matrix

8. **Define pipeline states.** Map the agent's workflow to discrete stages:
   ```
   ParseRequest → DecideTool → GenerateArgs → ExecuteTool → InterpretResult → FormulateResponse
   ```
   Include internal reasoning steps as states if they're visible in traces (e.g., `UpdatePlan`, `ReflectOnResult`).

9. **For each failed trace, identify the FIRST state where something went wrong.**

10. **Build the matrix:**
    ```
    First Failure In →  Parse  Decide  GenArgs  Execute  Interpret  Respond
    Last Success ↓
    (start)               2      0        0        0         0         0
    Parse                 -      5        0        0         0         0
    Decide                0      -        3        0         0         0
    GenArgs               0      0        -        8         0         0
    Execute               0      0        0        -         4         1
    Interpret             0      0        0        0         -         2
    ```

11. **Analyze the matrix:**
    - Sum columns → most error-prone stages overall
    - Inspect specific hot cells → targeted debugging
    - Track the matrix over time → fixes should make it sparser

### Phase 5: Design Graders

12. **Prefer deterministic graders when possible:**

    | Grader Type | Use For | Example |
    |-------------|---------|---------|
    | **State check** | End-state verification | `order.status == "refunded"` |
    | **Schema validation** | Argument correctness | Pydantic model validation |
    | **Tool call verification** | Required tools were used | Check trace for `verify_identity` call |
    | **Output parsing** | Structured output correctness | JSON schema validation |

13. **Use LLM-as-Judge graders for:**
    - Interaction quality / tone
    - Whether the agent's reasoning was sound
    - Whether the agent appropriately escalated vs handled
    - Open-ended task completion assessment

14. **Build partial credit** for multi-component tasks:
    ```
    Task: Process customer complaint
    Components:
    - Identified customer: Pass (1/1)
    - Looked up order: Pass (1/1)
    - Applied correct policy: Fail (0/1)
    - Communicated resolution: N/A (blocked by above)
    Score: 2/3 completed steps (67%)
    ```

### Phase 6: Run and Iterate

15. **Create experiment on orq.ai:**
    - Use agent configuration in the experiment
    - Attach executable tools
    - Add evaluators for each grading dimension
    - Run with 3-5 trials per task to capture non-determinism

16. **Analyze with companion skills:**
    - Use `trace-analysis` for systematic trace reading
    - Use `action-plan` for prioritized improvements
    - Use `build-evaluator` for new evaluator needs

17. **Monitor capability eval saturation:**
    - When pass rate approaches 100%, the eval is too easy
    - Graduate saturated evals to regression suite
    - Create harder tasks to continue measuring improvement
    - Track pass@k and pass^k trends separately

## Agent-Type-Specific Guidance

### Coding Agents
- Use **deterministic test execution** as primary grader (tests pass/fail)
- Add code quality checks: linting, type checking, static analysis
- Verify tool usage patterns (read file before edit, run tests after change)

### Conversational Agents
- Evaluate **task completion AND interaction quality** separately
- Use a second LLM to simulate the user persona for multi-turn testing
- Measure turn efficiency (did the agent resolve in reasonable turns?)
- Test with user simulation tools or N-1 trace methodology

### Research Agents
- Check **groundedness** (claims supported by sources)
- Check **coverage** (key facts included)
- Check **source quality** (authoritative sources, not just first-retrieved)
- Calibrate LLM rubrics frequently against expert human judgment

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Checking exact tool call sequences | Agents find valid alternative paths | Grade outcomes, not paths |
| One grader for everything | Ambiguous, can't isolate failures | Isolated grader per dimension |
| No agency level definition | Can't distinguish errors from intended behavior | Define expected agency level first |
| Only evaluating end-to-end | Can't tell which stage failed | Evaluate 4 tool-calling stages independently |
| Single trial per task | Agent behavior is non-deterministic | Run 3-5 trials, use pass@k / pass^k |
| Testing only happy paths | Agents must handle errors, ambiguity, and refusal | Include adversarial, edge case, and escalation tasks |
| Over-relying on final outcome | Masks intermediate reasoning failures | Inspect transition failure matrix |
| Shared state between trials | Leftover files/data cause correlated failures | Isolate each trial in a clean environment |
