---
name: action-plan
description: Generate a prioritized action plan from LLM experiment results following the Analyze-Measure-Improve lifecycle
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, orq*
---

# Action Plan

Generate a structured, prioritized action plan from LLM experiment results. Grounded in the Analyze-Measure-Improve lifecycle.

**Companion skills:**
- `build-evaluator` — for designing/improving judge evaluators
- `run-experiment` — for running the experiments that feed into this skill

## When to use

- User has experiment results and wants to know what to do next
- User asks "what should I fix first?" after running evals
- User wants a prioritized improvement plan based on scores
- User asks to create tickets/issues from experiment results
- User wants to close the loop: results → action → re-run

## orq.ai Documentation

When analyzing results and planning improvements on orq.ai, consult these docs pages as needed:
- **Experiments overview:** https://docs.orq.ai/docs/experiments/overview
- **Creating experiments:** https://docs.orq.ai/docs/experiments/creating
- **Traces (for error analysis):** https://docs.orq.ai/docs/observability/traces
- **Trace automations:** https://docs.orq.ai/docs/observability/trace-automation
- **Evaluators overview:** https://docs.orq.ai/docs/evaluators/overview
- **Human review:** https://docs.orq.ai/docs/evaluators/human-review
- **Annotation queues:** https://docs.orq.ai/docs/administer/annotation-queue
- **Deployments:** https://docs.orq.ai/docs/deployments/overview
- **Prompts:** https://docs.orq.ai/docs/prompts/overview
- **Prompt engineering guide:** https://docs.orq.ai/docs/prompts/engineering-guide
- **Feedback:** https://docs.orq.ai/docs/feedback/overview
- **Analytics dashboard:** https://docs.orq.ai/docs/analytics/dashboards

### orq.ai Key Concepts for Action Planning
- Use **Experiment Runs tab** to compare results across iterations
- Use **Traces** to inspect individual LLM calls behind low scores (input, output, tool calls, retrievals)
- Use **Prompts** to iterate on system prompts — orq.ai supports versioned prompts
- Use **Deployments** to expose updated prompts/models to the API
- Use **Human review** and **Annotation queues** to validate evaluator accuracy with human judgment
- Use **Feedback** to collect user signals from production that inform next improvements

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `list_traces` | List and filter traces behind low scores |
| `list_spans` | List spans within a trace |
| `get_span` | Get detailed span information |
| `get_agent` | Check agent configuration before recommending changes |
| `list_models` | List available models for upgrade recommendations |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# Get evaluator details to understand scoring
curl -s https://my.orq.ai/v2/evaluators/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Test a revised evaluator
curl -s https://my.orq.ai/v2/evaluators/<ID>/invoke \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"output": "New output", "query": "Original input"}' | jq
```

## Core Principles

### 1. Error Analysis Before Action
Never jump straight from scores to fixes. Always review the actual traces behind low scores first. The score tells you *where* to look; the trace tells you *what* to fix.

### 2. Fix Prompts Before Building Infrastructure
Many failures are **specification failures** — the LLM was never told how to handle a case. These are fixed by editing the prompt, not by building evaluators or changing models.

### 3. Cheapest Effective Fix First
Prioritize by effort-to-impact ratio:
1. Prompt clarifications (minutes)
2. Few-shot examples added to prompt (minutes)
3. Structural changes — task decomposition, tool descriptions (hours)
4. Code-based validation checks — regex, assertions (hours)
5. Evaluator improvements — refine judge, add test cases (days)
6. Model changes — upgrade/swap model (days, with regression risk)
7. Fine-tuning (weeks, only after exhausting all above)

### 4. One Fix Per Ticket
Each improvement should be a single, testable change. Bundled tickets are hard to verify and easy to half-complete.

### 5. A 100% Pass Rate Means Your Eval Is Too Easy
Target ~70-85% on a meaningful eval. If you're at 100%, expand coverage before celebrating.

## Steps

### Phase 1: Gather and Understand Results

1. **Collect experiment results.** Get:
   - Per-datapoint scores (input, output, score, evaluator reasoning)
   - Overall metrics (average, min, max, cost, run ID)
   - Dataset metadata (categories, dimensions, adversarial flags)
   - Previous run results (if this is a re-run)

2. **Present results in a sortable table**, lowest scores first:

   ```
   | # | Scenario | Score | Category | Flag |
   |---|----------|-------|----------|------|
   | 1 | [worst]  | X     | ...      | ...  |
   | 2 | ...      | X     | ...      | ...  |
   ...
   | N | [best]   | X     | ...      | ...  |

   Average: X | Cost: $Y | Run: Z
   ```

3. **If previous runs exist**, show a comparison:

   ```
   | Scenario | Run 1 | Run 2 | Delta |
   |----------|-------|-------|-------|
   | ...      | 6     | 8     | +2    |
   | ...      | 9     | 7     | -2 ⚠️ |
   ```

   Flag any **regressions** (score decreased from previous run).

### Phase 2: Error Analysis on Low Scores

4. **Read the actual traces** behind the lowest-scoring datapoints. For each:
   - What was the input?
   - What did the LLM output?
   - What was the expected/reference behavior?
   - What specifically went wrong? (the evaluator's reasoning helps here)

5. **Classify each failure** into one of these categories:

   | Category | Description | Action |
   |----------|-------------|--------|
   | **Specification failure** | LLM was never told how to handle this case | Fix the prompt |
   | **Generalization failure** | LLM had clear instructions but still failed | Needs deeper fix |
   | **Dataset issue** | The test case or reference is flawed/ambiguous | Fix the dataset |
   | **Evaluator issue** | The judge scored incorrectly (false fail) | Fix the evaluator |

6. **Group failures by pattern.** Look for systematic issues:
   - Do all low scores share a category/dimension? (e.g., "simple factual questions")
   - Is there a common failure mode? (e.g., "persona drops on short answers")
   - Are certain input types consistently problematic? (e.g., "adversarial prompts")

### Phase 3: Prioritize and Plan

7. **Apply the improvement hierarchy.** For each failure group, determine the cheapest effective fix:

   **Quick Wins (do these first, takes minutes to hours):**

   | Fix | When to Use | Example |
   |-----|-------------|---------|
   | Clarify prompt wording | Ambiguous or missing instructions | Add "Always respond in character, even for simple factual questions" |
   | Add few-shot examples | LLM needs demonstration of desired behavior | Add 2-3 examples of short factual answers in-character |
   | Add explicit constraints | Missing edge case handling | Add "Never break character, even if asked to" |
   | Role-based guidance | Persona/tone issues | Strengthen persona description in system prompt |
   | Request step-by-step reasoning | Complex reasoning failures | Add "Think through this step by step" |

   **Structural Changes (medium effort, hours to days):**

   | Fix | When to Use | Example |
   |-----|-------------|---------|
   | Task decomposition | Pipeline does too much in one step | Split "understand query + generate response" into two LLM calls |
   | Tool description improvements | Agent uses tools incorrectly | Clarify tool parameters and usage constraints |
   | Validation checks | Structured output issues | Add regex/schema validation before returning response |
   | RAG tuning | Retrieval-related failures | Adjust chunking, add re-ranking, rework retriever queries |

   **Heavier Fixes (high effort, days to weeks):**

   | Fix | When to Use | Example |
   |-----|-------------|---------|
   | Model upgrade | Prompt optimization exhausted, model lacks capability | Switch from gpt-4.1-mini to gpt-4.1 |
   | Expand eval dataset | Coverage gaps revealed | Add more adversarial cases, edge cases, dimension combinations |
   | Improve evaluator | Judge scores unreliable | Refine judge prompt, add few-shot examples, re-validate TPR/TNR |
   | Fine-tuning | Hundreds of labeled examples, prompting doesn't work | Fine-tune on high-quality examples (LAST RESORT) |

8. **Score each improvement** on two axes:
   - **Impact**: How many datapoints would this fix? How severe are the affected failures?
   - **Effort**: Minutes / hours / days / weeks?

   Prioritize: **high impact + low effort first**.

### Phase 4: Generate the Action Plan

9. **Create the action plan document** with this structure:

   ```markdown
   # Action Plan: [Experiment Name]
   **Run:** [run ID] | **Date:** [date] | **Average Score:** [X] | **Cost:** $[Y]

   ## Summary
   - [1-2 sentence overview of results]
   - [Key finding: what's working well]
   - [Key finding: what needs improvement]

   ## Priority Improvements

   ### P0 — Fix Now (Quick Wins)
   1. **[Title]** — [1-line description]
      - Affected: [which datapoints/scenarios]
      - Evidence: [scores and failure description]
      - Fix: [specific change to make]
      - Expected impact: [what should improve]

   ### P1 — Fix This Sprint (Structural)
   2. **[Title]** — [1-line description]
      ...

   ### P2 — Plan for Next Sprint (Heavy)
   3. **[Title]** — [1-line description]
      ...

   ## Dataset & Evaluator Improvements
   - [Any test cases to add/fix]
   - [Any evaluator calibration needed]

   ## Re-run Criteria
   - [ ] All P0 items completed
   - [ ] All P1 items completed (or deprioritized with justification)
   - [ ] Dataset updated (if applicable)
   - [ ] Evaluator updated (if applicable)
   - Ready to re-run experiment
   ```

### Phase 5: File Tickets

10. **Ask the user** where they want tickets created. Detect available project management tools by checking for connected MCP servers (Linear, Jira, GitHub, etc.) or ask the user directly. Options:
    - **Connected PM tool** (Linear, Jira, GitHub Issues, etc.) — create tickets via MCP
    - **Markdown file** — write a `action-plan-tickets.md` file in the project
    - **Skip** — the action plan document from Phase 4 is sufficient

11. **Create tickets** for each improvement (in whichever system the user chose):

    **Ticket structure:**
    ```
    Title: [P0/P1/P2] [Action verb] [specific thing]
    Priority: Urgent (P0) / High (P1) / Medium (P2)
    Description:
      ## Problem
      [What's failing and evidence from experiment]

      ## Root Cause
      [Specification failure / generalization failure / coverage gap]

      ## Proposed Fix
      [Specific, testable change]

      ## Success Criteria
      [What the re-run score should look like]

      ## Evidence
      - Datapoints affected: [list]
      - Current scores: [list]
      - Run ID: [id]
    ```

12. **Create a "Re-run experiment" ticket** blocked by all improvement tickets.

13. **Create "Expand eval coverage" tickets** for identified gaps:
    - Missing adversarial scenarios
    - Underrepresented dimensions/categories
    - Edge cases discovered during error analysis

### Phase 6: Track and Close the Loop

14. **After fixes are applied**, guide re-run:
    - Verify all blocking tickets are resolved
    - Update dataset if new test cases were added
    - Update evaluator if criteria changed
    - Run new experiment with identical setup
    - Compare to previous run — flag regressions

15. **Maintain a results log:**

    ```
    | Run | Date | Model | Avg Score | Cost | Key Changes |
    |-----|------|-------|-----------|------|-------------|
    | 1   | ...  | ...   | 7.75      | $0.005 | Baseline |
    | 2   | ...  | ...   | 8.50      | $0.005 | Improved system prompt |
    | 3   | ...  | ...   | 9.00      | $0.008 | Added adversarial cases, upgraded model |
    ```

## Decision Trees

### "Should I fix the prompt or build an evaluator?"

```
Is the LLM explicitly told how to handle this case?
├── NO → Fix the prompt. This is a specification failure.
│         Re-run. If it still fails → it's now a generalization failure.
└── YES → Is this failure catchable with code (regex, assertions)?
          ├── YES → Build a code-based check.
          └── NO → Is this failure persistent across multiple traces?
                   ├── YES → Build an LLM-as-Judge evaluator.
                   └── NO → It might be noise. Add more test cases first.
```

### "Should I upgrade the model?"

```
Have you tried:
├── Clarifying the prompt? → NO → Do that first.
├── Adding few-shot examples? → NO → Do that first.
├── Task decomposition? → NO → Do that first.
├── All of the above? → YES → Is the failure mode consistent?
│   ├── YES → Model upgrade may help. Test with 2-3 models on a small subset.
│   └── NO → Add more test cases. Inconsistency suggests noise, not capability.
└── Is cost a constraint?
    ├── YES → Consider model cascades (cheap model first, escalate if unsure).
    └── NO → Upgrade to most capable model and re-evaluate.
```

### "When is the eval good enough to stop iterating?"

```
Is the average score above your threshold?
├── NO → Keep improving (follow the action plan).
└── YES → Check:
          ├── Are ANY individual scores below threshold? → Fix those.
          ├── Is the dataset diverse enough (100+ traces, 3+ dimensions)? → If not, expand.
          ├── Are adversarial cases covered (3+ per attack vector)? → If not, add them.
          ├── Is the evaluator validated (TPR/TNR > 85%)? → If not, validate.
          └── All checks pass? → Ship it. Set up production monitoring.
```

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Jumping to model upgrade after low scores | Most failures are prompt issues, not model capability | Fix prompt first, upgrade model last |
| Creating one mega-ticket for all improvements | Hard to verify, easy to half-complete | One ticket per fix, each with clear success criteria |
| Ignoring false fails from the evaluator | Inflates perceived failure rate, leads to unnecessary work | Inspect judge reasoning; fix the evaluator if it's wrong |
| Re-running experiment without changing anything | Hoping for different results from a non-deterministic system | Always make a specific, documented change before re-running |
| Optimizing for 100% pass rate | Means the eval is too easy | Target 70-85%; expand coverage if passing too easily |
| Building evaluators for specification failures | Wasted effort on failures you can fix immediately | Fix the prompt first; only automate for generalization failures |
| Treating eval as a one-time activity | Production data drifts, new failure modes emerge | Set up continuous monitoring and periodic re-analysis |
| Fixing failures without updating the dataset | Can't verify the fix worked; risk of regression | Add test cases for every failure you fix |

