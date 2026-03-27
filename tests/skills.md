# Skill Smoke Tests

Conversational tests for each skill. Trigger each with a simple scenario and verify the first phase responds correctly. **No pre-existing resources are modified.**

Requires `setup.md` to have run first (seed data for `run-experiment` test).

---

## `build-agent`

- Ask: "Build a simple FAQ agent for a pizza restaurant"
- Verify: asks clarifying questions about purpose, users, success criteria
- Verify: calls `list_models` when selecting model

## `build-evaluator`

- Ask: "Build an evaluator that checks if output is valid JSON"
- Verify: recommends code-based evaluator (`create_python_eval`), not LLM judge
- Ask: "Build an evaluator for tone and helpfulness"
- Verify: suggests splitting into separate evaluators (one per criterion)

## `generate-synthetic-dataset`

- Ask: "Generate 5 test cases for a customer support chatbot"
- Verify: proposes dimensions of variation OR generates diverse cases
- Verify: calls `create_dataset` + `create_datapoints` with `orq-skills-test-` prefix

## `optimize-prompt`

- Provide a simple prompt inline: "You are a helpful assistant. Answer questions."
- Verify: analyzes against the 11-dimension framework
- Verify: produces concrete suggestions

## `analyze-trace-failures`

- Ask: "Analyze recent trace failures"
- Verify: calls `list_traces`, attempts to read spans
- Verify: describes sampling strategy

## `run-experiment`

- Ask: "Run an experiment using orq-skills-test-dataset with orq-skills-test-eval-length"
- Verify: calls `create_experiment` with correct references

## `compare-agents`

### Scenario 1: orq.ai vs external agent (Python)

- Ask: "Compare my orq.ai agent orq-skills-test-echo against a simple Python function that reverses the input"
- Verify Phase 1: identifies two agents — orq.ai (uses `search_entities` to find `orq-skills-test-echo`) and generic Python
- Verify Phase 1: asks or confirms language preference (Python)
- Verify Phase 2: delegates to `generate-synthetic-dataset` or creates dataset via `create_dataset` + `create_datapoints` with `orq-skills-test-` prefix
- Verify Phase 3: delegates to `build-evaluator` or creates evaluator via `create_llm_eval`
- Verify Phase 4: generates a Python script with:
  - `from evaluatorq import evaluatorq, job, DataPoint, EvaluationResult`
  - One `@job("OrqAgent")` using `orq.agents.responses.create()` (NOT `agents.invoke()`)
  - One `@job("ReverseAgent")` wrapping the Python function
  - An evaluator scorer invoking the orq.ai judge by ID
  - A `evaluatorq()` call wiring jobs + data + evaluators
- Verify: script uses A2A message format `{"role": "user", "parts": [{"kind": "text", "text": ...}]}` (NOT OpenAI-style)
- Verify: does NOT hardcode datapoints inline if a dataset was created on the platform

### Scenario 2: orq.ai vs orq.ai

- Ask: "Compare two versions of my agent — orq-skills-test-echo with model gpt-4o-mini vs the same agent"
- Verify: generates two orq.ai job patterns with different job names (e.g., `OrqAgent-A`, `OrqAgent-B`)
- Verify: uses the same `agent_key` for both (since it's the same agent)
- Verify: warns about same-model comparison if both use the same model

### Scenario 3: TypeScript preference

- Ask: "I want to benchmark a LangGraph agent against my orq.ai agent, using TypeScript"
- Verify Phase 4: generates TypeScript, not Python
- Verify: imports from `@orq-ai/evaluatorq`
- Verify: uses `wrapLangGraphAgent` from `@orq-ai/evaluatorq/langchain` for the LangGraph job
- Verify: uses `job()` function (not `@job` decorator)

### Scenario 4: Skill boundary — redirects

- Ask: "Create a dataset for testing my agents"
- Verify: redirects to `generate-synthetic-dataset` (does NOT handle dataset creation itself)
- Ask: "Run an experiment with my orq.ai deployment"
- Verify: redirects to `run-experiment` (no external agents involved)

### Scenario 5: Dataset bias prevention

- Provide: two agents — one with a mock weather tool returning "Sunny, 22C", one with a real API
- Ask: "Compare these agents on weather queries"
- Verify: does NOT write expected outputs matching the mock data
- Verify: expected outputs describe correctness criteria (e.g., "should include current temperature from a real source")

---

## Critical Files

- `skills/build-agent/SKILL.md`
- `skills/build-evaluator/SKILL.md`
- `skills/generate-synthetic-dataset/SKILL.md`
- `skills/optimize-prompt/SKILL.md`
- `skills/analyze-trace-failures/SKILL.md`
- `skills/run-experiment/SKILL.md`
- `skills/compare-agents/SKILL.md`
- `skills/compare-agents/resources/job-patterns.md`
- `skills/compare-agents/resources/evaluatorq-api.md`
- `skills/compare-agents/resources/gotchas.md`
