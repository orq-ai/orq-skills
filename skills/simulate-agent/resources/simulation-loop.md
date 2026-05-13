# Simulation Loop

Full loop pattern in Python and TypeScript. Drop into an evaluatorq job.

## Python

```python
import asyncio
from evaluatorq import job, DataPoint, evaluatorq
from orq_ai_sdk import Orq
from openai import AsyncOpenAI

AGENT_KEY = "<AGENT_KEY>"
SIMULATOR_MODEL = "gpt-4o-mini"
MAX_TURNS = 6
STOP_TOKENS = ("GOAL_COMPLETED", "ESCALATED")

orq = Orq(api_key=os.environ["ORQ_API_KEY"])
sim_client = AsyncOpenAI()


def extract_text(resp) -> str:
    text = ""
    for msg in resp.output or []:
        for part in msg.parts:
            if hasattr(part, "text"):
                text += part.text
    return text


def should_stop(simulator_reply: str) -> str | None:
    for token in STOP_TOKENS:
        if token in simulator_reply:
            return token
    return None


async def simulate_user(persona_prompt: str, history: list[dict]) -> str:
    messages = [{"role": "system", "content": persona_prompt}]
    for turn in history:
        # From the simulator's POV: it sent "user", agent replied as "assistant"
        messages.append({"role": "user", "content": turn["user"]})
        messages.append({"role": "assistant", "content": turn["agent"]})
    resp = await sim_client.chat.completions.create(
        model=SIMULATOR_MODEL,
        messages=messages,
    )
    return resp.choices[0].message.content


@job("simulate-agent")
async def sim_job(data: DataPoint, row: int):
    persona_prompt = data.inputs["persona_prompt"]
    persona_name = data.inputs["persona_name"]
    thread_id = f"sim-{persona_name}-{row}"
    history: list[dict] = []
    last_user = data.inputs["opening_message"]
    stopped_by = "max_turns"

    for turn in range(MAX_TURNS):
        resp = orq.agents.responses.create(
            agent_key=AGENT_KEY,
            background=False,
            thread={"id": thread_id},
            message={"role": "user", "parts": [{"kind": "text", "text": last_user}]},
        )
        agent_reply = extract_text(resp)
        history.append({"user": last_user, "agent": agent_reply})

        # Generate the next user message
        next_user = await simulate_user(persona_prompt, history)
        stop = should_stop(next_user)
        if stop:
            stopped_by = stop
            break
        last_user = next_user

    return {
        "persona": persona_name,
        "thread_id": thread_id,
        "turns": len(history),
        "transcript": history,
        "stopped_by": stopped_by,
    }


async def main():
    await evaluatorq(
        "agent-simulation",
        data=[
            DataPoint(inputs={
                "persona_name": "skeptical-founder",
                "persona_prompt": open("personas/skeptical-founder.txt").read(),
                "opening_message": "hi, can you actually process a refund for a digital download?",
            }),
            # ...more personas
        ],
        jobs=[sim_job],
        evaluators=[],  # add a conversation-level judge here, see build-evaluator
    )


asyncio.run(main())
```

## TypeScript

```typescript
import { job, evaluatorq } from "@orq-ai/evaluatorq";
import { Orq } from "@orq-ai/node";
import OpenAI from "openai";

const AGENT_KEY = "<AGENT_KEY>";
const SIMULATOR_MODEL = "gpt-4o-mini";
const MAX_TURNS = 6;
const STOP_TOKENS = ["GOAL_COMPLETED", "ESCALATED"] as const;

const orq = new Orq({ apiKey: process.env.ORQ_API_KEY });
const sim = new OpenAI();

function extractText(resp: any): string {
  let text = "";
  for (const msg of resp.output ?? []) {
    for (const part of msg.parts) if ("text" in part) text += part.text;
  }
  return text;
}

function shouldStop(reply: string): string | null {
  return STOP_TOKENS.find((t) => reply.includes(t)) ?? null;
}

async function simulateUser(personaPrompt: string, history: { user: string; agent: string }[]) {
  const messages: any[] = [{ role: "system", content: personaPrompt }];
  for (const turn of history) {
    messages.push({ role: "user", content: turn.user });
    messages.push({ role: "assistant", content: turn.agent });
  }
  const resp = await sim.chat.completions.create({ model: SIMULATOR_MODEL, messages });
  return resp.choices[0].message.content ?? "";
}

const simJob = job("simulate-agent", async (data, row) => {
  const threadId = `sim-${data.inputs.persona_name}-${row}`;
  const history: { user: string; agent: string }[] = [];
  let lastUser = data.inputs.opening_message;
  let stoppedBy = "max_turns";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const resp = await orq.agents.responses.create({
      agentKey: AGENT_KEY,
      background: false,
      thread: { id: threadId },
      message: { role: "user", parts: [{ kind: "text", text: lastUser }] },
    });
    const agentReply = extractText(resp);
    history.push({ user: lastUser, agent: agentReply });

    const nextUser = await simulateUser(data.inputs.persona_prompt, history);
    const stop = shouldStop(nextUser);
    if (stop) { stoppedBy = stop; break; }
    lastUser = nextUser;
  }

  return {
    persona: data.inputs.persona_name,
    thread_id: threadId,
    turns: history.length,
    transcript: history,
    stopped_by: stoppedBy,
  };
});
```

## Stop-condition variants

| Variant | When to use | Implementation |
|---------|------------|----------------|
| **Token match** (default) | Persona can self-declare success | Scan simulator output for `GOAL_COMPLETED` / `ESCALATED` |
| **JSON flag** | Need structured success criteria | Have simulator return `{"message": "...", "done": true}`, parse |
| **LLM judge per turn** | Goal is not self-evident to the persona | Run a cheap judge over `history` each turn; stop when it returns `true` |
| **Agent escalation marker** | Agent itself signals handoff | Watch the agent reply for a known string (e.g. `"HANDOFF_TO_HUMAN"`) |

Combine with `max_turns` as a hard ceiling — never rely on a stop
condition alone.

## Where outputs land

- **Per-turn traces** appear in orq.ai under the `thread.id` you pass. One thread = one full conversation.
- **evaluatorq run file**: `~/.evaluatorq/runs/agent-simulation_<timestamp>.json` contains all transcripts and any scorer results.
- **orq.ai Experiment** (if `ORQ_API_KEY` set): evaluatorq uploads the run automatically; the URL is printed to stdout.

The `thread_id` you return from the job is the most useful artifact —
it is what links the saved transcript back to live traces in orq.ai.
