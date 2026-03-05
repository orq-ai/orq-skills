---
name: knowledge-base
description: Manage orq.ai Knowledge Bases — create, configure, upload files, chunk content, search, and maintain RAG data sources via API
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, orq*
---

# Knowledge Base

Manage orq.ai Knowledge Bases programmatically — create, list, update, delete, upload files, chunk content, add datasources, and search.

## When to use

- User wants to create or manage a Knowledge Base on orq.ai
- User needs to upload documents and chunk them for RAG
- User wants to search a Knowledge Base with metadata filters
- User needs to configure chunking strategies (token, sentence, recursive, semantic, agentic) via the dashboard
- User wants to add, list, or delete datasources and chunks
- User asks about RAG setup or knowledge base configuration

## Companion skills

- `evaluate-rag` — evaluate retrieval quality and generation faithfulness after setting up a Knowledge Base
- `run-experiment` — run end-to-end evaluations against a RAG pipeline

## orq.ai Documentation

- **Knowledge Base overview:** https://docs.orq.ai/docs/knowledge/overview
- **Creating Knowledge Bases:** https://docs.orq.ai/docs/knowledge/creating
- **Knowledge Base in Prompts:** https://docs.orq.ai/docs/knowledge/using-in-prompt
- **Knowledge Base API:** https://docs.orq.ai/docs/knowledge/api

## orq MCP Tools

The orq MCP server does not yet have dedicated Knowledge Base CRUD tools. Use `search_entities` with `type: "knowledge"` to discover existing Knowledge Bases via MCP:

| MCP Tool | Use |
|----------|-----|
| `search_entities` | Find existing Knowledge Bases (`type: "knowledge"`) |
| `list_models` | List available embedding models for KB creation |

For all other Knowledge Base operations (create, upload, chunk, search, delete), use the HTTP API with `curl` as shown below.

## Authentication

All HTTP API calls require:

```bash
Authorization: Bearer $ORQ_API_KEY
```

## Core principles

1. **Chunk small, search precisely** — smaller chunks with metadata filters outperform large chunks with no filtering
2. **Match chunking to content type** — use sentence chunking for prose, recursive for structured docs, semantic for mixed content
3. **Metadata enables multi-tenancy** — use metadata fields (client_id, source, topic) for filtered retrieval
4. **Validate retrieval before generation** — test search results before wiring a Knowledge Base into a deployment

---

## Phase 1: List and inspect existing Knowledge Bases

Check what already exists before creating anything.

### List all Knowledge Bases

```bash
curl -s https://my.orq.ai/v2/knowledge \
  -H "Authorization: Bearer $ORQ_API_KEY" | jq .
```

### Get a specific Knowledge Base

```bash
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" | jq .
```

---

## Phase 2: Create a Knowledge Base

### Required parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `key` | Unique identifier (alphanumeric) | `support-docs` |
| `embedding_model` | Format: `supplier/model_name` | `cohere/embed-english-v3.0` |
| `path` | Project/folder location | `my-project/knowledge` |
| `type` | Always `"internal"` for managed KBs | `internal` |

### Create

```bash
curl -s https://my.orq.ai/v2/knowledge \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "support-docs",
    "type": "internal",
    "embedding_model": "cohere/embed-english-v3.0",
    "path": "my-project/knowledge"
  }' | jq .
```

Save the returned `id` — you need it for all subsequent operations.

### Available embedding models

The embedding model must be activated in the Model Garden before use. Common options:
- `cohere/embed-english-v3.0`
- `openai/text-embedding-3-small`
- `openai/text-embedding-3-large`

---

## Phase 3: Upload files

### Supported formats

TXT, PDF, DOCX, CSV, XML — max 10MB per file.

### Upload a file

```bash
curl -s https://my.orq.ai/v2/files \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -F "file=@./document.pdf" | jq .
```

Save the returned `id` — use it when creating a datasource.

---

## Phase 4: Create datasources

A datasource is a logical container within a Knowledge Base that holds chunks. You can link it to an uploaded file or populate it manually.

### Create a datasource from an uploaded file

```bash
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Support Documentation",
    "file_id": "<FILE_ID>"
  }' | jq .
```

### Create an empty datasource (for manual chunk insertion)

```bash
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Manual Chunks"
  }' | jq .
```

### List datasources

```bash
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources \
  -H "Authorization: Bearer $ORQ_API_KEY" | jq .
```

---

## Phase 5: Chunking

Chunking configuration is managed through the Knowledge Base settings in the orq.ai dashboard at https://my.orq.ai, or automatically when creating datasources with uploaded files. There is no standalone `/v2/chunking` API endpoint.

When you create a datasource from an uploaded file (see Phase 4), orq.ai automatically chunks the file content. To control chunking behavior, configure the chunking strategy and parameters through the dashboard or by specifying chunking options in the datasource creation request.

### Chunking strategies

| Strategy | Best for | Key parameters |
|----------|----------|----------------|
| **token** | Consistent sizing for LLM windows | `chunk_size` (default: 512), `chunk_overlap` (default: 0) |
| **sentence** | Prose, articles, narratives | `chunk_size` (default: 512), `min_sentences_per_chunk` (default: 1) |
| **recursive** | Structured documents (markdown, code) | `chunk_size` (default: 512), `separators` (default: `["\n\n", "\n", " ", ""]`), `min_characters_per_chunk` (default: 24) |
| **semantic** | Mixed content, requires embedding model | `embedding_model` (required), `threshold` (default: `"auto"`), `mode` (`window` or `sentence`), `similarity_window` (default: 1) |
| **agentic** | Complex documents needing LLM judgment | `model` (required), `chunk_size` (default: 1024), `candidate_size` (default: 128), `min_characters_per_chunk` (default: 24) |

For manual chunk insertion, skip automatic chunking and add chunks directly to a datasource (see Phase 6).

---

## Phase 6: Add chunks to a datasource

After chunking, insert the chunks into a datasource.

### Create chunks

```bash
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources/<DATASOURCE_ID>/chunks \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "text": "First chunk content",
      "metadata": {
        "source": "support-docs",
        "topic": "billing",
        "client_id": "acme"
      }
    },
    {
      "text": "Second chunk content",
      "metadata": {
        "source": "support-docs",
        "topic": "technical"
      }
    }
  ]' | jq .
```

### Metadata guidelines

- Values must be **string, number, or boolean** — no nested objects
- Use metadata for filtering: `client_id`, `source`, `topic`, `filetype`
- Avoid large text blobs in metadata fields

### List chunks

```bash
curl -s "https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources/<DATASOURCE_ID>/chunks?status=completed" \
  -H "Authorization: Bearer $ORQ_API_KEY" | jq .
```

---

## Phase 7: Search

### Basic search

```bash
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/search \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I reset my password?"
  }' | jq .
```

### Search with metadata filters

```bash
curl -s https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/search \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "billing issue",
    "filter_by": {
      "topic": {"eq": "billing"},
      "client_id": {"eq": "acme"}
    },
    "search_options": {
      "include_metadata": true,
      "include_scores": true
    }
  }' | jq .
```

### Filter operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal to | `{"topic": {"eq": "billing"}}` |
| `ne` | Not equal | `{"topic": {"ne": "internal"}}` |
| `gt`, `gte` | Greater than (or equal) | `{"version": {"gte": 2}}` |
| `lt`, `lte` | Less than (or equal) | `{"version": {"lt": 5}}` |
| `in` | Value in array | `{"topic": {"in": ["billing", "support"]}}` |
| `nin` | Value not in array | `{"topic": {"nin": ["draft"]}}` |
| `and` | Logical AND | `{"and": [{"topic": {"eq": "billing"}}, {"client_id": {"eq": "acme"}}]}` |
| `or` | Logical OR | `{"or": [{"topic": {"eq": "billing"}}, {"topic": {"eq": "support"}}]}` |

---

## Phase 8: Update and delete

### Update a Knowledge Base

```bash
curl -s -X PATCH https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "updated-key"
  }' | jq .
```

### Delete a Knowledge Base

```bash
curl -s -X DELETE https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID> \
  -H "Authorization: Bearer $ORQ_API_KEY"
```

### Delete a datasource

```bash
curl -s -X DELETE https://my.orq.ai/v2/knowledge/<KNOWLEDGE_ID>/datasources/<DATASOURCE_ID> \
  -H "Authorization: Bearer $ORQ_API_KEY"
```

---

## Using a Knowledge Base in prompts

Once populated, connect a Knowledge Base to a deployment:

1. In the prompt configuration, go to the **Knowledge Base** tab
2. Select the Knowledge Base by its key
3. Reference it in the prompt with `{{key}}` syntax (the key highlights in blue)
4. Configure the query type:
   - **Last User Message** — the user's message becomes the retrieval query
   - **Query** — a predefined or variable-driven query (use `{{query}}` for dynamic input)

## Common pitfalls

- **Embedding model not activated** — the model must be enabled in Model Garden before creating a Knowledge Base
- **File too large** — max 10MB per file; split large documents before uploading
- **Metadata with nested objects** — only flat key-value pairs (string/number/boolean) are supported
- **Chunking without testing** — always search after chunking to verify retrieval quality before wiring into a deployment
- **Wrong chunking strategy** — token chunking splits mid-sentence; use sentence or recursive for readable chunks
