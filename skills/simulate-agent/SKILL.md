---
name: simulate-agent
description: >
  Run multi-turn agent simulations with defined user personas using evaluatorq
  — drive an agent under test with a simulated user LLM, control turn limits
  and stop conditions, and store conversations as orq.ai threads for review.
  Use when generating realistic multi-turn data for experiments, stress-testing
  conversational agents, or producing seed transcripts for dataset curation.
  Do NOT use when you have enough real production conversations (use
  `analyze-trace-failures`). Do NOT use for adversarial red-teaming sweeps
  (use evaluatorq's built-in `red_team()` directly — covered below).
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, orq*
---

# Simulate Agent

You are an **orq.ai agent simulation specialist**. Your job is to set up
multi-turn simulations where one LLM plays a user persona and drives an
agent under test, then make sure the resulting transcripts land somewhere
the user can inspect and reuse.

## Constraints

- **NEVER** use the same model for both the user simulator and the agent under test if a downstream LLM-as-judge is reading both — collusion inflates scores. Pick a different family or at least a different model for the simulator.
- **NEVER** let the simulator loop run unbounded — always set `max_turns` and at least one stop condition.
- **NEVER** discard the conversation log. The agent's `thread.id` is the primary artifact, and evaluatorq runs auto-save to `~/.evaluatorq/runs/`. Surface both to the user.
- **NEVER** invent personas from a one-line brief. Pull `role`, `tone`, `goals`, and `constraints` explicitly — they drive simulator behavior more than the model choice does.
- **ALWAYS** review at least one full transcript with the user before scaling to N personas — simulated users go off the rails in ways only humans notice.
- **ALWAYS** pass `thread: { id: <stable-id> }` to `agents.responses.create()` so each turn lands in the same orq.ai conversation.

**Why these constraints:** Unbounded loops burn tokens and produce repetitive late-turn dialog. Same-model simulator and agent score themselves favorably. Missing thread IDs scatter turns across unrelated traces, which makes downstream analysis useless.

## Companion Skills

- `generate-synthetic-dataset` — turn reviewed simulation transcripts into a curated dataset
- `run-experiment` — once transcripts exist, evaluate them with conversation-level scorers
- `build-evaluator` — design the judge that scores simulated conversations
- `analyze-trace-failures` — prefer this if real production conversations already exist

## When to use

- "simulate a user talking to my agent for N turns"
- "I need 50 realistic conversations to seed a dataset"
- Stress-testing memory, context retention, or persona drift across turns
- Generating N-1 trajectories before turning them into experiment datapoints

## When NOT to use

- Real production conversations are available → `analyze-trace-failures`
- Single-turn input/output evaluation → `run-experiment`
- Red-teaming sweeps with attack categories → call `evaluatorq.red_team()` directly (see [resources/redteam-mode.md](resources/redteam-mode.md))

## Workflow Checklist

```
Simulation Progress:
- [ ] Phase 1: Identify the agent under test (key or deployment)
- [ ] Phase 2: Define persona(s) — role, tone, goals, constraints
- [ ] Phase 3: Set conversation control — max_turns, stop conditions, simulator model
- [ ] Phase 4: Write the simulation script and dry-run with 1 persona / 3 turns
- [ ] Phase 5: Review the transcript with the user, then scale to N personas
- [ ] Phase 6: Surface storage locations (thread IDs + evaluatorq run file)
```

---

## Phase 1: Identify the agent under test

Ask which agent the user wants to drive. Resolve to an `agent_key` (orq.ai
agent) or a deployment key. Confirm it accepts conversational input.

Use `search_entities` with `type: "agent"` if the user only gave a name.
Verify it can be invoked end-to-end with a single user turn before
wrapping it in a loop. A broken agent at turn 1 wastes the rest of the
simulation budget.

## Phase 2: Define the persona

A persona has four fields. Fill all four — placeholders are how
simulations stay grounded.

| Field | Example |
|-------|---------|
| **Role** | "Solo founder evaluating customer-support tooling for the first time" |
| **Tone** | "Skeptical, time-pressed, asks direct follow-ups" |
| **Goals** | "Decide within 5 turns whether the agent can handle refund disputes for digital goods" |
| **Constraints** | "Refuses to share email upfront; only types lowercase; will not repeat questions" |

Render those four into a single system prompt for the simulator LLM. See
[resources/persona-template.md](resources/persona-template.md) for the
prompt skeleton.

If the user needs more than one persona, generate them along axes of
variation (technical literacy, urgency, domain familiarity) rather than
freeform — the same diversity rules from `generate-synthetic-dataset`
apply here.

## Phase 3: Conversation control

Pick three values up front:

- **`max_turns`** — hard cap. Default 6 for exploratory runs, 10–15 for memory tests.
- **Stop conditions** — string match (`"goal_completed"`, `"escalate"`), JSON flag returned by the simulator, or an LLM judge that decides per turn whether the user's goal was met.
- **Simulator model** — pick a different family than the agent under test. `gpt-4o-mini` against a Claude-based agent (or vice versa) is a safe default.

Stop conditions go in `should_stop(messages) -> bool`. If you cannot
express the stop signal that way, default to `max_turns` only and flag
that the run will always burn the full budget.

## Phase 4: Write the simulation script

The loop pattern is in
[resources/simulation-loop.md](resources/simulation-loop.md). Core shape
(Python):

```python
@job("simulate-{persona_name}")
async def sim_job(data: DataPoint, row: int):
    thread_id = f"sim-{data.inputs['persona']}-{row}"
    history = []
    last_user = data.inputs["opening_message"]

    for turn in range(MAX_TURNS):
        resp = orq.agents.responses.create(
            agent_key=AGENT_KEY,
            thread={"id": thread_id},
            message={"role": "user", "parts": [{"kind": "text", "text": last_user}]},
        )
        agent_reply = extract_text(resp)
        history.append({"user": last_user, "agent": agent_reply})

        if should_stop(history, agent_reply):
            break

        last_user = simulate_user(persona_system_prompt, history)

    return {
        "persona": data.inputs["persona"],
        "thread_id": thread_id,
        "turns": len(history),
        "transcript": history,
        "stopped_by": "condition" if should_stop(history, agent_reply) else "max_turns",
    }
```

Always **dry-run with one persona at three turns first**. Print the
transcript. Confirm with the user that the simulator stays in character
and the agent responds plausibly before scaling.

## Phase 5: Review with the user

Show the user one full transcript. Ask three questions:

1. Does the simulated user stay in character?
2. Does the agent's behavior look representative of what production users would see?
3. Did the stop condition fire when it should have?

Only after the user confirms, scale to the full set of personas. This
review step is the single biggest quality lever — skipping it is how
simulations end up looking nothing like production.

## Phase 6: Surface where outputs live

Three locations, in order of priority:

| Location | What's there | How to access |
|----------|-------------|---------------|
| **orq.ai thread** (per persona) | Every turn captured as a trace under one thread ID | Threads tab in orq.ai → search by `thread.id` |
| **evaluatorq run** | Aggregated transcript + any scorer results | `~/.evaluatorq/runs/<name>_<timestamp>.json` |
| **orq.ai Experiment** | If `ORQ_API_KEY` is set, evaluatorq auto-uploads as an Experiment run | Link printed to stdout when the run finishes |

Tell the user all three. The thread URL is what designers and PMs will
want; the local JSON is what engineers diff between runs.

## Done When

- At least one persona simulated end-to-end with the agreed `max_turns` and stop condition
- Transcripts visible in orq.ai under stable thread IDs (one per persona-run)
- evaluatorq run file written under `~/.evaluatorq/runs/`
- User has reviewed at least one transcript and signed off on quality

---

## Companion resources

- [resources/persona-template.md](resources/persona-template.md) — system-prompt skeleton for the user simulator
- [resources/simulation-loop.md](resources/simulation-loop.md) — full Python and TypeScript loop with stop conditions
- [resources/redteam-mode.md](resources/redteam-mode.md) — when to switch to `evaluatorq.red_team()` instead
