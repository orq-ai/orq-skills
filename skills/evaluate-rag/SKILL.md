---
name: evaluate-rag
description: Evaluate RAG pipelines by separately measuring retrieval quality and generation faithfulness
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Evaluate RAG

Evaluate Retrieval-Augmented Generation (RAG) pipelines by decomposing them into retrieval and generation stages, measuring each independently before assessing end-to-end performance.

**Companion skills:**
- `generate-synthetic-dataset` — generate QA pairs for retrieval evaluation
- `build-evaluator` — build faithfulness/relevance judges for generation quality
- `trace-analysis` — identify whether failures originate in retrieval or generation

## When to use

- User wants to evaluate a RAG system or knowledge-base-powered pipeline
- User asks "is my RAG retrieval working?" or "are my answers grounded?"
- User wants to optimize chunking strategy
- User needs to measure retrieval recall, precision, or faithfulness
- User has a pipeline using orq.ai Knowledge Bases

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Knowledge Base overview:** https://docs.orq.ai/docs/knowledge/overview
- **Creating Knowledge Bases:** https://docs.orq.ai/docs/knowledge/creating
- **Knowledge Base in Prompts:** https://docs.orq.ai/docs/knowledge/using-in-prompt
- **Knowledge Base API:** https://docs.orq.ai/docs/knowledge/api
- **Evaluator library (RAGAS):** https://docs.orq.ai/docs/evaluators/library
- **Traces (inspect retrievals):** https://docs.orq.ai/docs/observability/traces
- **Experiments:** https://docs.orq.ai/docs/experiments/overview

### orq.ai RAG Evaluation Capabilities
- **RAGAS evaluators** available in the Evaluator Library: Coherence, Conciseness, Correctness, Faithfulness, Context Precision, Context Recall, Context Entities Recall, Response Relevancy, Harmfulness, Maliciousness, Noise Sensitivity, Summarization
- LLM evaluators have access to `{{log.retrievals}}` — the knowledge base results for each generation
- Traces show retrieval spans with retrieved documents, embeddings, and chunking details

### orq MCP Tools

Use the orq MCP server (`https://my.orq.ai/v2/mcp`) as the primary interface. For operations not yet available via MCP, use the HTTP API as fallback.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `create_llm_eval` | Create evaluators for faithfulness/relevance |
| `list_traces` | List and filter retrieval traces |
| `list_spans` | List spans within a trace |
| `get_span` | Get detailed span information |
| `list_models` | List available models (including embedding models) |

**HTTP API fallback** (for operations not yet in MCP):

```bash
# Knowledge base management
curl -s https://my.orq.ai/v2/knowledge \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Get knowledge base details
curl -s https://my.orq.ai/v2/knowledge/<ID> \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" | jq

# Create a knowledge base
curl -s https://my.orq.ai/v2/knowledge \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "product-docs", "embedding_model": "openai/text-embedding-3-small", "top_k": 5, "threshold": 0.7}' | jq

# Search a knowledge base (retrieval-only evaluation)
curl -s https://my.orq.ai/v2/knowledge/<ID>/search \
  -X POST \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I reset my password?", "limit": 10, "threshold": 0.8}' | jq

# Invoke evaluator
curl -s https://my.orq.ai/v2/evaluators/<ID>/invoke \
  -H "Authorization: Bearer $ORQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"output": "Answer to evaluate", "query": "Original question"}' | jq
```

## Core Principle: Evaluate Retrieval and Generation Separately

**NEVER** rely solely on end-to-end correctness scores. A wrong answer could mean:
- The retriever didn't find the right documents (retrieval failure)
- The retriever found the right documents but the LLM ignored/misinterpreted them (generation failure)
- The query was ambiguous and the retriever parsed it incorrectly (query failure)

You **must** separate these to know what to fix.

## Steps

### Phase 1: Understand the RAG Pipeline

1. **Map the pipeline stages.** Identify:
   - **Query construction:** How is the user's input transformed into a retrieval query?
   - **Retrieval:** What index, embedding model, and search method is used?
   - **Reranking:** Is there a reranker? What model?
   - **Chunking:** What chunk size, overlap, and strategy?
   - **Generation:** What model generates the final answer? What prompt template?

2. **Collect or generate evaluation data.** Two approaches:

   **Manual curation (highest quality):**
   - Map realistic questions to exact source chunk(s) in the knowledge base
   - For each question: the question, the correct source chunk(s), and the ideal answer

   **Synthetic QA generation (scalable):**
   - For each chunk in your knowledge base:
     1. Prompt an LLM to extract a salient fact from the chunk
     2. Generate a question answerable ONLY by that fact
     3. Output format: `{"fact": "...", "question": "...", "source_chunk_id": "..."}`
   - For adversarial synthetic questions:
     1. Find similar chunks via embedding search
     2. Generate questions that reuse overlapping terminology but are only answerable by the target chunk
   - Filter for realism: use few-shot LLM prompts with manually rated examples to score and remove unrealistic questions

### Phase 2: Evaluate Retrieval Quality

3. **Run retrieval-only evaluation.** For each test question:
   - Execute the retrieval pipeline (without generation)
   - Record which chunks were retrieved and their order
   - Compare against ground truth (known correct chunks)

4. **Compute retrieval metrics:**

   | Metric | Formula | When to Use |
   |--------|---------|-------------|
   | **Recall@k** | (relevant docs in top k) / (total relevant docs) | **Primary metric.** Missing information is worse than noise — the LLM can ignore irrelevant chunks but can't compensate for missing ones. |
   | **Precision@k** | (relevant docs in top k) / k | When context window cost or noise matters. |
   | **MRR** | 1 / (rank of first relevant doc) | When only one key fact is needed. Less useful for multi-hop questions. |
   | **NDCG@k** | Normalized discounted cumulative gain | When chunks have graded relevance (not just binary). Rewards placing better items higher. Critical when context is truncated. |

   **Prioritize Recall@k.** For RAG, high recall matters more than high precision because the LLM can ignore irrelevant context but cannot invent missing information.

5. **Interpret retrieval results:**

   | Recall@k | Interpretation | Action |
   |----------|---------------|--------|
   | > 90% | Strong retrieval | Focus on generation quality |
   | 70-90% | Adequate but leaky | Improve embeddings, reranking, or query construction |
   | < 70% | Retrieval is the bottleneck | Fix chunking, embedding model, or search strategy before evaluating generation |

### Phase 3: Optimize Chunking (if retrieval is weak)

6. **Grid search over chunking parameters:**
   - **Chunk size:** 128, 256, 512, 1024 tokens
   - **Overlap:** 0%, 10%, 25%, 50%
   - Re-index the corpus for each configuration
   - Measure Recall@k and NDCG@k for each

7. **Consider content-aware chunking:**
   - Use document structure (headings, sections, paragraphs) instead of fixed token counts
   - Augment chunks with contextual metadata (document title, section heading)
   - For tables: test row-by-row vs column-by-column representations

### Phase 4: Evaluate Generation Quality

8. **Build generation evaluators.** Two key metrics:

   **Answer Faithfulness (grounding):**
   - Does the output accurately reflect the retrieved context?
   - Check for: hallucinations, omissions, misinterpretations
   - This is a binary check per response: is everything in the answer supported by the retrieved docs?

   **Answer Relevance:**
   - Does the answer actually address the user's question?
   - An answer can be faithful to context but miss the actual question
   - Binary check: does the response answer what was asked?

9. **Create evaluators on orq.ai:**

   **Option A — Use RAGAS evaluators from the library:**
   - Enable Faithfulness, Context Recall, Response Relevancy from the evaluator library
   - These use `{{log.retrievals}}` automatically

   **Option B — Build custom LLM-as-Judge evaluators:**
   - Use the `build-evaluator` skill for detailed prompt design
   - Template variables: `{{log.input}}` (question), `{{log.output}}` (answer), `{{log.retrievals}}` (retrieved chunks), `{{log.reference}}` (ideal answer)
   - One evaluator per criterion (faithfulness, relevance, completeness)

### Phase 5: End-to-End Evaluation

10. **Run a full experiment** combining retrieval + generation:
    - Use `create_experiment` with the test dataset
    - Attach both retrieval metrics and generation evaluators
    - Compare against baseline

11. **Diagnose failures by stage:**

    ```
    Question failed. Why?
    ├── Retrieved chunks contain the answer?
    │   ├── NO → Retrieval failure. Fix search/chunking/embeddings.
    │   └── YES → Generation failure. Fix prompt/model.
    │              ├── Answer contradicts retrieved context? → Hallucination
    │              ├── Answer ignores retrieved context? → Context utilization failure
    │              └── Answer is correct but misses the question? → Relevance failure
    ```

### Phase 6: Iterate

12. **Track metrics across runs:**

    ```
    | Run | Recall@5 | Faithfulness | Relevance | End-to-End Accuracy | Changes |
    |-----|----------|-------------|-----------|---------------------|---------|
    | 1   | 72%      | 85%         | 90%       | 65%                 | Baseline |
    | 2   | 88%      | 85%         | 90%       | 78%                 | New embedding model |
    | 3   | 88%      | 92%         | 93%       | 85%                 | Added grounding instruction |
    ```

13. **Common improvement actions:**

    | Problem | Metric Signal | Fix |
    |---------|--------------|-----|
    | Missing relevant docs | Low Recall@k | Better embeddings, query expansion, reranking |
    | Too much noise in context | Low Precision@k | Smaller k, reranking, chunk size reduction |
    | Answer contradicts sources | Low Faithfulness | Add "only use provided context" instruction |
    | Answer ignores the question | Low Relevance | Improve prompt to focus on the question |
    | Inconsistent with doc structure | Low on tables/lists | Improve chunking strategy, test representations |

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Only measuring end-to-end accuracy | Can't tell if retrieval or generation is at fault | Evaluate retrieval and generation separately |
| Skipping retrieval evaluation | May invest in prompt engineering when retrieval is the real bottleneck | Always measure Recall@k first |
| Using only BLEU/ROUGE for generation | Surface-level text overlap doesn't measure faithfulness or relevance | Use faithfulness + relevance evaluators |
| Fixed chunk size for all content | Tables, code, and prose have different structure | Use content-aware chunking where possible |
| Overfitting to synthetic eval dataset | Synthetic QA is often too easy or tightly coupled to source wording | Mix synthetic with manually curated questions |
| Choosing MRR when you need Recall | MRR only cares about the first relevant doc; multi-hop needs multiple docs | Use Recall@k for multi-hop, MRR for single-fact |
| Ignoring chunking as a tunable parameter | Chunk size dramatically affects retrieval quality | Grid search over chunk size and overlap |
| Feeding full documents to the LLM judge | Judge can't effectively evaluate long context | Give the judge only the relevant chunk + question + answer |
