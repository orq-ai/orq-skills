# Video Script: Building & Evaluating an AI Agent on orq.ai with Claude Code

---

## INTRO (30s)

> In this walkthrough, we'll go from zero to a fully evaluated AI agent on orq.ai — using Claude Code as our co-pilot. We'll build a travel concierge agent, test it, analyze its traces, generate an evaluation dataset, create evaluators, and run an experiment — all from the terminal.

---

## SCENE 1: Workspace Orientation (30s)

> First, let's see what we're working with. We check the available models and agents in our orq.ai workspace.

```
> what models do we have available in the workspace?
→ openai/gpt-4o, openai/gpt-4o-mini

> what agents do we have?
→ No agents found.
```

> Clean slate. Let's build something.

---

## SCENE 2: Building the Agent (1m)

> We use the `/orq:build-agent` skill to create a travel concierge agent. We give Claude Code clear requirements: model, tools, and detailed instruction guidelines.

```
> /orq:build-agent
> Create a travel concierge agent called "travel-concierge" in the Demos project.
> Use openai/gpt-4o-mini, give it google_search and web_scraper tools.
> Instructions should require day-by-day itineraries, budget estimates,
> practical tips, clarifying questions for vague requests, travel insurance
> for international trips, and honest safety info.
```

> Claude Code writes the full system instructions and creates the agent via the orq.ai MCP server — model, tools, and all. One shot.

---

## SCENE 3: Testing the Agent (1m)

> Now we test it live. We ask for a 3-day Lisbon trip.

```
> Plan a 3-day trip to Lisbon for a couple on a mid-range budget.
> We love food and history.
```

> The agent responds with a structured day-by-day itinerary, specific restaurant names, prices, a budget summary table, and tips. It works — but is it *good*?

---

## SCENE 4: Trace Analysis (1m 30s)

> This is where it gets interesting. We run `/orq:trace-analysis` to systematically read the traces and identify failure modes.

> Claude Code pulls the traces from orq.ai, reads the full span data — input, output, tool usage, latency, cost — and annotates each trace.

> It finds 5 issues in that single Lisbon response:
> 1. **No tools used** — the agent had google_search but answered from memory
> 2. **Geographic error** — breakfast in Belém, then Alfama, then back to Belém on Day 3
> 3. **Budget math doesn't add up** — summary totals don't match itemized costs
> 4. **Missing safety info** — no scams, no travel advisories
> 5. **Didn't ask for dates** — instructions say to clarify, but it skipped it

> With only 2 traces we can't build a full taxonomy, but we have clear signals for what to test.

---

## SCENE 5: Generating the Evaluation Dataset (1m 30s)

> Next, `/orq:generate-synthetic-dataset`. Instead of asking an LLM to "generate 20 test cases" — which produces repetitive, clustered data — we use the structured method:

> **Step 1: Define dimensions** — trip complexity, budget level, traveler type, request specificity, and adversarial edge cases.

> **Step 2: Generate tuples** — specific combinations targeting the failure modes we found. Vague requests to test clarification. Multi-city trips to test logistics. Tight budgets to test math. Plus adversarial inputs: off-topic questions, booking requests, persona-breaking, prompt injection.

> **Step 3: Convert to natural language** — each tuple becomes a realistic user message with a reference output describing expected behavior.

> 20 datapoints created on orq.ai. 15 normal scenarios, 5 adversarial.

---

## SCENE 6: Building Evaluators (1m 30s)

> Now `/orq:build-evaluator`. We build 6 evaluators — each targeting ONE failure mode:

> **Two Python evaluators** for things code can check:
> - **Budget Consistency** — do the itemized costs match the summary table?
> - **Travel Insurance Mention** — is insurance recommended for international trips?

> **Four LLM-as-Judge evaluators** (using gpt-4o) for subjective criteria:
> - **Clarification Behavior** — does it ask questions when the request is vague?
> - **Safety & Advisory Info** — does it include safety tips and travel advisories?
> - **Boundary Handling** — does it refuse off-topic and adversarial requests?
> - **Itinerary Logistics** — are activities grouped by neighborhood, not zigzagging?

> Each LLM evaluator follows best practices: binary Pass/Fail, one criterion per evaluator, chain-of-thought reasoning, and few-shot examples with clear Pass and Fail cases.

---

## SCENE 7: Running the Experiment (1m)

> Finally, we run the experiment. Dataset, model, and all 6 evaluators — wired together and auto-run on orq.ai.

> 20 datapoints complete in about 80 seconds. Total cost: less than a penny.

> The results:

```
Budget Consistency        95%  ✅
Boundary Handling         95%  ✅
Clarification Behavior    85%  ⚠️
Itinerary Logistics       85%  ⚠️
Travel Insurance Mention  75%  ⚠️
Safety & Advisory Info    60%  ❌
```

> The agent handles budgets and boundaries well, but consistently forgets safety information and travel insurance. Now we know *exactly* what to fix in the prompt.

---

## OUTRO (30s)

> In about 10 minutes, we went from an empty workspace to:
> - A configured agent with tools and instructions
> - A live test with trace analysis
> - A structured 20-datapoint evaluation dataset
> - 6 targeted evaluators (2 code-based, 4 LLM-as-Judge)
> - A scored experiment with clear, prioritized action items
>
> That's the Analyze → Measure → Improve loop. Fix the prompt, re-run the experiment, compare the scores. Rinse and repeat.

---

**Total runtime:** ~8 minutes
**Total cost:** < $0.01
**Tools used:** orq.ai MCP server, Claude Code skills (build-agent, trace-analysis, generate-synthetic-dataset, build-evaluator, run-experiment)
