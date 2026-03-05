---
name: annotation-workflow
description: Set up human annotation queues for evaluator validation, labeling, and quality assurance
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task, AskUserQuestion, mcp__linear-server__*, orq*
---

# Annotation Workflow

Set up human annotation queues on orq.ai for evaluator validation, labeling training data, and quality assurance — ensuring evaluators align with human judgment.

**Companion skills:**
- `build-evaluator` — create evaluators that annotations validate
- `trace-analysis` — identify traces that need annotation

## When to use

- User needs labeled data for evaluator validation (TPR/TNR measurement)
- User wants to set up human annotation on orq.ai
- User asks about inter-annotator agreement or labeling quality
- User needs training data for new evaluators
- User wants to audit evaluator accuracy against human judgment
- User asks about annotation queues or labeling workflows

## orq.ai Documentation

Consult these docs when working with the orq.ai platform:
- **Annotation queues:** https://docs.orq.ai/docs/administer/annotation-queue
- **Human review:** https://docs.orq.ai/docs/evaluators/human-review
- **Evaluators:** https://docs.orq.ai/docs/evaluators/overview
- **Traces:** https://docs.orq.ai/docs/observability/traces

### orq.ai Annotation Capabilities
- Annotation queues provide structured labeling interfaces
- Reviewers see configurable context: input, output, retrievals, reference
- Human review can be attached directly to trace spans
- Annotations export as labeled datasets for evaluator validation
- Support for binary labels (Pass/Fail) matching evaluator format

### orq MCP Tools

Use the orq MCP server for trace access.

**Available MCP tools for this skill:**

| Tool | Purpose |
|------|---------|
| `list_traces` | Find traces to add to annotation queues |
| `list_spans` | List spans within traces for annotation |
| `get_span` | Get span details for annotation context |
| `search_entities` | Find evaluators, datasets |

**Annotation queue management:**

Annotation queues are managed through the orq.ai dashboard at https://my.orq.ai/annotation-queues. There is no public HTTP API for annotation queue operations yet. Use the dashboard to create queues, add items, assign reviewers, and export results.

## Core Principles

### 1. Binary Labels Only
Use Pass/Fail labels that match evaluator format. Likert scales (1-5) introduce noise, lower agreement, and don't align with binary evaluators.

### 2. Calibrate Before Annotating
Give annotators calibration examples BEFORE they start labeling. Without calibration, inter-annotator agreement drops significantly.

### 3. Domain Experts, Not Crowdworkers
Quality over speed. The person who knows "good output" for your application should do the labeling.

### 4. Measure Inter-Annotator Agreement
Track agreement between annotators. Target >85%. Below that, the task definition is ambiguous — refine criteria before continuing.

## Destructive Actions

The following actions require explicit user confirmation via `AskUserQuestion` before execution:
- Deleting annotation queues or annotation results
- Removing items from annotation queues
- Overwriting existing annotations

## Steps

Follow these steps **in order**. Do NOT skip steps.

### Phase 1: Determine Annotation Goal

1. **Clarify why annotations are needed:**

   | Goal | Description | Output |
   |------|-------------|--------|
   | **Evaluator validation** | Measure TPR/TNR of an existing evaluator | Labeled test set for evaluator accuracy |
   | **Training data** | Create few-shot examples for a new evaluator | Labeled training set with clear Pass/Fail |
   | **Quality audit** | Spot-check production quality with human judgment | Quality report with human agreement metrics |

2. **Define the labeling criterion:**
   - Must be a single, binary (Pass/Fail) question
   - Must be concrete and unambiguous
   - Two domain experts should agree on the same label >85% of the time
   - Example: "Does the response accurately reflect the refund policy?" (Pass/Fail)

### Phase 2: Set Up Annotation Queue

3. **Create the annotation queue** on orq.ai:
   - Name: descriptive, includes the criterion being labeled
   - Description: the exact Pass/Fail definitions

4. **Configure review context:**
   - What reviewers should see for each item:

   | Context Field | Include When |
   |--------------|-------------|
   | User input | Always |
   | LLM output | Always |
   | Retrieved documents | RAG pipelines |
   | Reference answer | If available |
   | Tool calls and results | Agent pipelines |
   | Full conversation history | Multi-turn conversations |

### Phase 3: Generate Labeling Guidelines

5. **Write labeling guidelines** from the evaluator criterion:

   ```markdown
   # Labeling Guidelines: [Criterion Name]

   ## Task
   For each trace, determine: [BINARY QUESTION]

   ## Definitions
   - **Pass**: [precise definition]
   - **Fail**: [precise definition]

   ## Calibration Examples

   ### Example 1 (Fail):
   **Input**: [example]
   **Output**: [example]
   **Label**: Fail
   **Reason**: [explanation]

   ### Example 2 (Pass):
   **Input**: [example]
   **Output**: [example]
   **Label**: Pass
   **Reason**: [explanation]

   ### Example 3 (Borderline → Fail):
   **Input**: [example]
   **Output**: [example]
   **Label**: Fail
   **Reason**: [explanation of deciding factor]

   ## Special Cases
   - If uncertain, label as "Defer" — a second reviewer will decide
   - If the trace is truncated or missing context, label as "Skip"
   ```

6. **Include 5-10 calibration examples:**
   - 3-4 clear Pass cases
   - 3-4 clear Fail cases
   - 1-2 borderline cases with detailed reasoning
   - Calibration examples should come from traces the team has discussed and agreed on

### Phase 4: Select and Add Traces

7. **Select traces for annotation:**
   - Use `list_traces` to find candidate traces
   - Sampling strategy depends on the goal:

   | Goal | Sampling Strategy | Target Size |
   |------|------------------|-------------|
   | Evaluator validation | Stratified: 50% random + 50% evaluator-disagreement | 100-200 traces |
   | Training data | Diverse: cover all input types and difficulty levels | 50-100 traces |
   | Quality audit | Random sample from production | 50-100 traces |

8. **Ensure balance:**
   - Target roughly 50/50 Pass/Fail distribution
   - If production is heavily skewed (e.g., 90% Pass), over-sample likely-Fail traces
   - Include edge cases and borderline examples

9. **Add traces to the annotation queue** via the orq.ai dashboard.

### Phase 5: Assign and Monitor

10. **Assign reviewers:**
    - Primary annotator(s): domain expert(s) who understand the criterion
    - Overlap: assign 20-30% of items to multiple annotators for agreement measurement
    - Brief annotators on the labeling guidelines and calibration examples

11. **Monitor annotation progress:**
    - Track completion rate
    - Check for annotator questions or edge cases not covered by guidelines
    - If annotators frequently disagree, refine the criterion definition

12. **Compute inter-annotator agreement** on overlap items:
    - Calculate agreement percentage on shared items
    - Target: >85% agreement
    - If <85%: criterion is ambiguous — refine definitions, add more calibration examples, discuss disagreements
    - Common agreement metrics: Cohen's kappa, percent agreement

### Phase 6: Export and Use Labels

13. **Export labeled data** from the annotation queue:
    - Fetch results from the orq.ai dashboard
    - Resolve disagreements: majority vote for 3+ annotators, discussion for 2 annotators

14. **Split for evaluator validation** (reference `build-evaluator` data split guide):
    - **Training set (10-20%)**: Source of few-shot examples — clearest cases
    - **Dev set (40-45%)**: Used during evaluator refinement
    - **Test set (40-45%)**: Held out for final TPR/TNR measurement
    - NEVER use dev/test examples as few-shot examples in the evaluator

15. **Use labels:**
    - For evaluator validation: compute TPR/TNR on test set
    - For training data: extract few-shot examples from training set
    - For quality audit: compute human pass rate, compare against evaluator pass rate

### Phase 7: Iterate

16. **Continuous annotation process:**
    - As new failure modes emerge, create new annotation queues
    - Add production traces to existing queues regularly
    - Re-validate evaluators quarterly or after significant pipeline changes
    - Retire annotation queues when evaluator TPR/TNR is stable and high

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| Likert scales (1-5) for labels | Low agreement, doesn't match binary evaluators | Binary Pass/Fail only |
| No calibration examples | Annotators interpret criteria differently | Provide 5-10 calibrated examples before labeling starts |
| Crowdsourced labeling | Low quality, no domain knowledge | Use domain experts who understand the application |
| No inter-annotator agreement measurement | Can't tell if labels are reliable | Overlap 20-30% of items, target >85% agreement |
| Using labeled data without train/dev/test split | Overfitting, unreliable TPR/TNR | Strict split, never use dev/test as few-shots |
| One-time annotation | Labels become stale, new failure modes emerge | Set up continuous annotation process |

## Open in orq.ai

After completing this skill, direct the user to the relevant platform page:

- **Annotation queues:** `https://my.orq.ai/annotation-queues` — manage queues, assign reviewers, and monitor progress
- **View traces:** `https://my.orq.ai/traces` — find traces to add to annotation queues
- **View evaluators:** `https://my.orq.ai/evaluators` — review evaluators being validated by annotations
