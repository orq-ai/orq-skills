# Node SDK Integration Patterns

Reference patterns for integrating orq.ai resources using the Node/TypeScript SDK (`@orq-ai/node`).

---

## Installation

```bash
npm install @orq-ai/node
```

---

## Client Initialization

```typescript
import OrqAI from "@orq-ai/node";

const client = new OrqAI({
  apiKey: process.env.ORQ_API_KEY,
});
```

**Never hardcode API keys.** Always use environment variables.

---

## Agent Invocation

### Single-turn

```typescript
const response = await client.agents.invoke({
  key: "my-agent",
  message: "What is the refund policy for damaged items?",
});

console.log(response.output);
```

### Multi-turn Conversation

```typescript
// First turn
const response = await client.agents.invoke({
  key: "my-agent",
  message: "I need help with my order",
});

const taskId = response.taskId;

// Subsequent turns — reuse taskId for conversation continuity
const followUp = await client.agents.invoke({
  key: "my-agent",
  message: "The order number is #12345",
  taskId,
});
```

### Streaming

```typescript
const stream = await client.agents.invokeWithStream({
  key: "my-agent",
  message: "Explain the return process step by step",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.output ?? "");
}
```

---

## Deployment Invocation

### Basic Call

```typescript
const response = await client.deployments.invoke({
  key: "my-deployment",
  messages: [
    { role: "user", content: "Summarize this document" },
  ],
});

console.log(response.choices[0].message.content);
```

### With Parameters

```typescript
const response = await client.deployments.invoke({
  key: "my-deployment",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
  ],
  parameters: {
    temperature: 0.3,
    maxTokens: 500,
  },
});
```

### Streaming

```typescript
const stream = await client.deployments.invokeWithStream({
  key: "my-deployment",
  messages: [
    { role: "user", content: "Write a long-form analysis" },
  ],
});

for await (const chunk of stream) {
  const content = chunk.choices?.[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

---

## Feedback Collection

```typescript
// After getting a response, submit feedback linked to the trace
await client.feedback.create({
  traceId: response.traceId,
  rating: "positive", // or "negative"
});

// With correction
await client.feedback.create({
  traceId: response.traceId,
  rating: "negative",
  correction: "The correct refund period is 30 days, not 60.",
  comment: "Incorrect policy information",
});
```

---

## Error Handling

```typescript
import OrqAI, { OrqAIError, RateLimitError, APIError } from "@orq-ai/node";

async function invokeWithRetry(
  client: OrqAI,
  key: string,
  message: string,
  maxRetries = 3,
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.agents.invoke({ key, message });
    } catch (error) {
      if (error instanceof RateLimitError && attempt < maxRetries - 1) {
        const wait = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      if (error instanceof APIError) {
        console.error(`API error: ${error.status} - ${error.message}`);
      }
      throw error;
    }
  }
}
```

---

## Express Integration Example

```typescript
import express from "express";
import OrqAI from "@orq-ai/node";

const app = express();
app.use(express.json());

const client = new OrqAI({
  apiKey: process.env.ORQ_API_KEY,
});

interface ChatRequest {
  message: string;
  taskId?: string;
}

app.post("/chat", async (req, res) => {
  const { message, taskId }: ChatRequest = req.body;

  try {
    const response = await client.agents.invoke({
      key: "my-agent",
      message,
      taskId,
    });

    res.json({
      output: response.output,
      taskId: response.taskId,
    });
  } catch (error) {
    console.error("Agent invocation failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

---

## Next.js API Route Example

```typescript
import { NextRequest, NextResponse } from "next/server";
import OrqAI from "@orq-ai/node";

const client = new OrqAI({
  apiKey: process.env.ORQ_API_KEY!,
});

export async function POST(request: NextRequest) {
  const { message, taskId } = await request.json();

  try {
    const response = await client.agents.invoke({
      key: "my-agent",
      message,
      taskId,
    });

    return NextResponse.json({
      output: response.output,
      taskId: response.taskId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Agent invocation failed" },
      { status: 500 },
    );
  }
}
```
