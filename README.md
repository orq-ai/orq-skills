# orq.ai Agent Skills

Agent Skills for building, evaluating, and improving LLM pipelines on the [orq.ai](https://orq.ai) platform.

These 6 skills encode best practices into repeatable workflows covering the full Build → Evaluate lifecycle — from creating agents and prompts, through trace analysis and experimentation, to prompt optimization.

## Available Skills

<!-- BEGIN_SKILLS_TABLE -->
| Skill | What It Does | Documentation |
|-------|-------------|---------------|
| **build-agent** | Design, create, and configure an orq.ai Agent with tools, instructions, knowledge bases, and memory | [SKILL.md](skills/build-agent/SKILL.md) |
| **build-evaluator** | Create validated LLM-as-a-Judge evaluators following evaluation best practices | [SKILL.md](skills/build-evaluator/SKILL.md) |
| **analyze-trace-failures** | Read production traces, identify what's failing, build failure taxonomies, and categorize issues | [SKILL.md](skills/analyze-trace-failures/SKILL.md) |
| **run-experiment** | Create and run orq.ai experiments — compare configurations with specialized agent, conversation, and RAG evaluation | [SKILL.md](skills/run-experiment/SKILL.md) |
| **generate-synthetic-dataset** | Generate and curate evaluation datasets — structured generation, quick from description, expansion, and dataset maintenance | [SKILL.md](skills/generate-synthetic-dataset/SKILL.md) |
| **optimize-prompt** | Analyze and optimize system prompts using a structured prompting guidelines framework | [SKILL.md](skills/optimize-prompt/SKILL.md) |
<!-- END_SKILLS_TABLE -->

## The Lifecycle

```
BUILD                 ANALYZE → MEASURE → IMPROVE
─────                 ─────────────────────────────
build-agent -------> analyze-trace-failures --> run-experiment
build-evaluator           "what's failing?"      "measure & decide"
                               |                      |
                               |             generate-synthetic-dataset
                               |                (data for evals)
                               |                      |
                               |                optimize-prompt
                               |                 (improve prompts)
                               |                      |
                               <──────────────────────┘
                                (continuous improvement loop)
```

**Primary flow:** build-agent → build-evaluator → analyze-trace-failures → run-experiment → optimize-prompt → run-experiment (iterate)

## How Skills Connect

Skills hand off to each other automatically — each SKILL.md lists its companion skills.

**The eval cycle:** **analyze-trace-failures** → **build-evaluator** → **run-experiment** → **optimize-prompt** → repeat

**Build flow:** **build-agent** (includes KB + memory setup) → **run-experiment**

**Data quality:** **generate-synthetic-dataset** (includes dataset curation) → **run-experiment**

## Quick Start Examples

### 1. Evaluate an existing agent

```
You: "My support agent is giving bad answers, help me figure out why"
→ Skills used: analyze-trace-failures → build-evaluator → run-experiment
```

### 2. Build an eval dataset from scratch

```
You: "I need to create test cases for my product recommendation agent"
→ Skills used: generate-synthetic-dataset
```

### 3. Evaluate a RAG pipeline

```
You: "My knowledge base answers are sometimes wrong, evaluate the pipeline"
→ Skills used: run-experiment (RAG evaluation methodology)
```

### 4. Build a new agent

```
You: "I need a customer support agent with access to our order database"
→ Skills used: build-agent
```

### 5. Improve a prompt

```
You: "My prompt keeps breaking character, help me fix it"
→ Skills used: optimize-prompt
```

### 6. Clean up a messy dataset

```
You: "My eval dataset has duplicates and is unbalanced"
→ Skills used: generate-synthetic-dataset (Mode 4: Curate)
```

## Key Best Practices Encoded

These skills enforce evaluation best practices throughout the workflow:

- **Binary Pass/Fail** over Likert scales — less noise, more actionable
- **One evaluator per failure mode** — never bundle criteria
- **Trace analysis before automation** — read 50-100 traces before building evaluators
- **Fix prompts before switching models** — most failures are specification issues
- **Validate evaluators with TPR/TNR** — unvalidated evaluators are unreliable
- **Structured synthetic data** — dimensions → tuples → natural language for 5-10x diversity
- **Separate retrieval from generation** in RAG evals — know what to fix
- **Grade outcomes, not paths** in agent evals — agents find valid alternative approaches
- **Session-level before turn-level** in conversation evals — don't over-invest in per-turn analysis
- **Always A/B test prompt changes** — never "vibes check", always experiment
- **Version everything** — prompts, deployments, baselines, never modify in-place

## orq.ai Platform Integration

All skills integrate with the orq.ai platform through:

| Interface | Best For | When to Use |
|-----------|----------|-------------|
| **orq MCP tools** | Integrated workflows within your coding agent (datasets, experiments, evaluators, traces, agents, models) | Primary interface — use for all supported operations |
| **HTTP API** | Operations not yet available via MCP (agent invoke, evaluator invoke, knowledge, memory, tools) | Fallback — use `curl` with `Authorization: Bearer $ORQ_API_KEY` |

## File Structure

```
skills/
├── analyze-trace-failures/
│   └── SKILL.md
├── build-agent/
│   ├── SKILL.md
│   └── resources/
│       ├── tool-description-guide.md
│       └── system-instruction-template.md
├── build-evaluator/
│   ├── SKILL.md
│   └── resources/
│       ├── judge-prompt-template.md
│       ├── validation-checklist.md
│       └── data-split-guide.md
├── generate-synthetic-dataset/
│   └── SKILL.md
├── optimize-prompt/
│   └── SKILL.md
└── run-experiment/
    └── SKILL.md
```

## License

MIT
