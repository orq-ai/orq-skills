# Python SDK Integration Patterns

Reference patterns for integrating orq.ai resources using the Python SDK (`orq-ai-sdk`).

---

## Installation

```bash
pip install orq-ai-sdk
```

---

## Client Initialization

```python
import os
from orq_ai_sdk import OrqAI

client = OrqAI(
    api_key=os.environ["ORQ_API_KEY"],
)
```

**Never hardcode API keys.** Always use environment variables.

---

## Agent Invocation

### Single-turn

```python
response = client.agents.invoke(
    key="my-agent",
    message="What is the refund policy for damaged items?",
)

print(response.output)
```

### Multi-turn Conversation

```python
# First turn
response = client.agents.invoke(
    key="my-agent",
    message="I need help with my order",
)
task_id = response.task_id

# Subsequent turns — reuse task_id for conversation continuity
response = client.agents.invoke(
    key="my-agent",
    message="The order number is #12345",
    task_id=task_id,
)
```

### Streaming

```python
stream = client.agents.invoke_with_stream(
    key="my-agent",
    message="Explain the return process step by step",
)

for chunk in stream:
    print(chunk.output, end="", flush=True)
```

---

## Deployment Invocation

### Basic Call

```python
response = client.deployments.invoke(
    key="my-deployment",
    messages=[
        {"role": "user", "content": "Summarize this document"},
    ],
)

print(response.choices[0].message.content)
```

### With Parameters

```python
response = client.deployments.invoke(
    key="my-deployment",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"},
    ],
    parameters={
        "temperature": 0.3,
        "max_tokens": 500,
    },
)
```

### Streaming

```python
stream = client.deployments.invoke_with_stream(
    key="my-deployment",
    messages=[
        {"role": "user", "content": "Write a long-form analysis"},
    ],
)

for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

---

## Feedback Collection

```python
# After getting a response, submit feedback linked to the trace
client.feedback.create(
    trace_id=response.trace_id,
    rating="positive",  # or "negative"
)

# With correction
client.feedback.create(
    trace_id=response.trace_id,
    rating="negative",
    correction="The correct refund period is 30 days, not 60.",
    comment="Incorrect policy information",
)
```

---

## Error Handling

```python
from orq_ai_sdk.exceptions import OrqAIError, RateLimitError, APIError
import time

def invoke_with_retry(client, key, message, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.agents.invoke(key=key, message=message)
        except RateLimitError:
            if attempt < max_retries - 1:
                wait = 2 ** attempt  # exponential backoff
                time.sleep(wait)
                continue
            raise
        except APIError as e:
            # Log the error for debugging
            print(f"API error: {e.status_code} - {e.message}")
            raise
        except OrqAIError as e:
            print(f"Unexpected error: {e}")
            raise
```

---

## Async Usage

```python
import asyncio
from orq_ai_sdk import AsyncOrqAI

async def main():
    client = AsyncOrqAI(api_key=os.environ["ORQ_API_KEY"])

    response = await client.agents.invoke(
        key="my-agent",
        message="Hello!",
    )
    print(response.output)

asyncio.run(main())
```

---

## FastAPI Integration Example

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from orq_ai_sdk import OrqAI
from orq_ai_sdk.exceptions import OrqAIError
import os

app = FastAPI()
client = OrqAI(api_key=os.environ["ORQ_API_KEY"])

class ChatRequest(BaseModel):
    message: str
    task_id: str | None = None

class ChatResponse(BaseModel):
    output: str
    task_id: str

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = client.agents.invoke(
            key="my-agent",
            message=request.message,
            task_id=request.task_id,
        )
        return ChatResponse(
            output=response.output,
            task_id=response.task_id,
        )
    except OrqAIError as e:
        raise HTTPException(status_code=500, detail=str(e))
```
