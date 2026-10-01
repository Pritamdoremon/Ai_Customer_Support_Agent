

An AI-powered customer support agent built for **AmazonHelp** using historical customer-support conversations from the Kaggle **Customer Support on Twitter** dataset.

The system is designed to:

1. classify a new customer message into a small AmazonHelp-specific intent taxonomy,
2. retrieve similar historical support cases,
3. generate a grounded support reply,
4. decide whether the case should be **AUTO-HANDLED** or **ESCALATED**.

The project also includes a reproducible evaluation pipeline with a trivial baseline, keyword baseline, AI classifier evaluation, and additional evaluation work for escalation and reply quality.

---

## 1. Problem Framing

The selected brand is **AmazonHelp**.

A good support agent for this task should:

- correctly understand the customer's problem,
- use historical support conversations as evidence,
- produce replies consistent with historical resolutions,
- avoid unsupported refunds, discounts, guarantees, timelines, policies, or actions,
- escalate cases when evidence is weak, ambiguous, contradictory, sensitive, or requires manual intervention.

### What I chose not to build

To keep the solution focused on the assignment, this project does not attempt to build:

- authentication and role management,
- a full ticket-management product,
- CRM integrations,
- payment processing,
- real customer-account integrations,
- complex admin dashboards,
- microservices infrastructure,
- Kubernetes/Kafka/Redis-style infrastructure.

---

# 2. Dataset

The project uses the Kaggle dataset:

**Customer Support on Twitter**  
`thoughtvector/customer-support-on-twitter`

The raw dataset contains noisy, multi-turn customer-support conversations between customers and brands.

### Selected brand

**AmazonHelp**

The tweet-level data is filtered and reconstructed into support cases containing customer messages and historical brand replies.

A conversation-level split is used to reduce leakage between development and evaluation data.

### Data flow

```text
Raw Kaggle tweets
        |
        v
AmazonHelp filtering
        |
        v
Conversation reconstruction
        |
        v
Train / Development / Evaluation split
        |
        +----------------------+
        |                      |
        v                      v
Intent work              Retrieval data
        |                      |
        v                      v
Taxonomy + labels        Embeddings + pgvector
```

---

# 3. Intent Taxonomy

The project uses 8 AmazonHelp-specific intents:

| Intent | Description |
|---|---|
| `delivery_issue` | Shipment delays, missing deliveries, incorrect delivery status, delivery timing, or delivery problems |
| `order_issue` | Order status, order cancellation, pre-orders, order availability, and other order-related problems |
| `refund_return` | Refunds, returns, replacements, and return-related problems |
| `payment_billing` | Payment failures, charges, billing, promotions, and payment-related issues |
| `account_prime` | Account access and Amazon Prime-related issues |
| `digital_technical` | Alexa, apps, digital services, devices, and technical problems |
| `product_seller_issue` | Product quality, damaged/duplicate products, seller problems, and seller-related complaints |
| `other_unclear` | Ambiguous, incomplete, unrelated, or insufficiently specified messages |

The taxonomy is stored in:

```text
data/processed/intent-taxonomy.json
```

Each intent includes:

- description,
- inclusion criteria,
- exclusion criteria,
- examples.

---

# 4. System Architecture

```text
                    Customer Message
                           |
                           v
                  +-------------------+
                  | Intent Classifier |
                  |     (Gemini)      |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Intent +          |
                  | Confidence        |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Similar Case      |
                  | Retrieval         |
                  | PostgreSQL+pgvector|
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Historical        |
                  | Support Evidence  |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Grounded Reply    |
                  | Generation        |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Escalation        |
                  | Decision           |
                  +---------+---------+
                       |           |
                       v           v
                 AUTO-HANDLE   ESCALATE
```

---

# 5. Technology Stack

### Backend

- TypeScript
- Node.js
- Express
- REST API

### Frontend

- React
- Vite

### Database

- PostgreSQL
- pgvector

### LLM

- Gemini API

### Local Infrastructure

- Docker
- PostgreSQL + pgvector container

---

# 6. Why PostgreSQL + pgvector?

The support agent needs to retrieve **semantically similar historical conversations**.

For example:

```text
"My Amazon package is two days late."
```

should be able to retrieve a historical case such as:

```text
"My delivery has been delayed again."
```

even when the wording is different.

pgvector allows embeddings to be stored and searched inside PostgreSQL.

This keeps the architecture simple:

```text
PostgreSQL
   +
pgvector
```

instead of introducing a separate vector database.

---

# 7. How the Agent Works

## 7.1 Intent Classification

The Gemini classifier reads the taxonomy and classifies the customer message into one of the 8 allowed intents.

Example:

```json
{
  "intent": "delivery_issue",
  "confidence": 0.98,
  "reason": "The customer is reporting a delayed delivery."
}
```

The confidence value is a **model score**, not a calibrated probability.

---

## 7.2 Historical Retrieval

The system searches historical AmazonHelp support cases using semantic similarity.

The retrieval pipeline is:

```text
Customer message
       |
       v
Embedding
       |
       v
pgvector similarity search
       |
       v
Top similar historical cases
```

The historical cases are then provided as evidence for response generation.

---

## 7.3 Grounded Reply

The response generator uses the customer message and retrieved historical cases.

The reply should remain consistent with the evidence and must not invent:

- refunds,
- discounts,
- unsupported timelines,
- guarantees,
- account information,
- unsupported actions,
- policies not present in the evidence.

Weak or contradictory evidence should lead to escalation rather than a fabricated answer.

---

## 7.4 Escalation

The system produces:

```text
AUTO-HANDLE
```

or:

```text
ESCALATE
```

Escalation is appropriate for cases such as:

- weak retrieval evidence,
- ambiguous messages,
- low-confidence classification,
- contradictory historical resolutions,
- sensitive account/payment issues,
- cases requiring manual action,
- unusual or unsupported scenarios.

---

# 8. API

## POST `/api/support/analyze`

Example request:

```json
{
  "message": "Where is my Amazon order? It was supposed to arrive yesterday."
}
```

The response contains:

- predicted intent,
- confidence,
- retrieved cases,
- similarity scores,
- grounded reply,
- AUTO-HANDLE / ESCALATE decision,
- escalation reason.

---

# 9. Repository Structure

The repository follows the structure currently used in the project:

```text
AI-customer-support-agent/
|
├── data/
│   ├── golden/
│   │   ├── ANNOTATION_GUIDE.md
│   │   └── keyword-evaluation-set.json
│   │
│   ├── processed/
│   │   ├── amazon-help-cases.jsonl
│   │   ├── amazon-help-support-cases.jsonl
│   │   ├── intent-taxonomy.json
│   │   ├── summary.json
│   │   └── support-cases-summary.json
│   │
│   └── raw/
│
├── experiments/
│
├── frontend/
│
├── scripts/
│   ├── build-support-cases.ts
│   ├── create-keyword-evaluation-set.ts
│   ├── evaluate-keyword-baseline.ts
│   ├── evaluate-llm-classifier.ts
│   ├── inspect-amazon-help.ts
│   ├── inspect-dataset.ts
│   ├── load-support-cases.ts
│   ├── preprocess.ts
│   ├── test-escalation.ts
│   ├── test-grounded-reply.ts
│   ├── test-intent-classifier.ts
│   ├── test-llm-classifier.ts
│   ├── test-retrieval.ts
│   ├── verify-database.ts
│   └── verify-support-cases.ts
│
├── sql/
│   └── schema.sql
│
├── src/
│   ├── agent/
│   ├── config/
│   ├── intent/
│   │   ├── keyword-classifier.ts
│   │   └── llm-classifier.ts
│   ├── retrieval/
│   └── server.ts
│
├── .env
├── .env.example
├── .gitignore
├── Hiver SDE Intern Take-Home — ...
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

> The `.env` file is used locally and must not be committed to GitHub.

---

# 10. Local Setup

## Requirements

- Node.js
- npm
- Docker
- PostgreSQL + pgvector
- Gemini API key

## Install dependencies

```bash
npm install
```

## Environment variables

Create `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hiver_agent
GEMINI_API_KEY=YOUR_REAL_GEMINI_API_KEY
LLM_MODEL=gemini-3.6-flash
PORT=3000
```

Never commit the real Gemini API key.

---

# 11. PostgreSQL + pgvector

The local database is run using Docker.

```bash
docker run --name hiver-pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hiver_agent \
  -p 5433:5432 \
  -v hiver_pgdata:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg17
```

Enable the vector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The database stores the project's structured support data and vector-search information.

---

# 12. Useful Development Commands

### Keyword baseline

```bash
npm run evaluate-keyword-baseline
```

### AI classifier evaluation

```bash
npx tsx scripts/evaluate-llm-classifier.ts
```

### Dataset inspection

```bash
npx tsx scripts/inspect-dataset.ts
```

### AmazonHelp inspection

```bash
npx tsx scripts/inspect-amazon-help.ts
```

### Support-case verification

```bash
npx tsx scripts/verify-support-cases.ts
```

### Database verification

```bash
npx tsx scripts/verify-database.ts
```

The exact application start commands remain those defined in `package.json`.

---

# 13. Evaluation Strategy

The evaluation focuses on whether the AI system is actually better than simple approaches and whether its outputs can be trusted.

The project compares:

1. a trivial/majority-class baseline,
2. a simple keyword baseline,
3. the AI classifier.

Additional evaluation covers:

- escalation quality,
- reply quality,
- LLM-judge quality,
- human-vs-judge agreement,
- failure analysis.

---

# 14. Golden Evaluation Set

The evaluation set is:

```text
data/golden/keyword-evaluation-set.json
```

It contains:

```text
200 examples
```

from the AmazonHelp evaluation split.

The same fixed examples are used when comparing the baseline and AI classifier.

The labels use the 8-intent taxonomy.

Before final submission, the labels should be independently reviewed before being described as final human-validated gold labels.

---

# 15. Keyword Baseline Evaluation

A simple rule-based keyword classifier was evaluated on 200 AmazonHelp customer messages.

### Results

| Metric | Score |
|---|---:|
| Examples Evaluated | 200 |
| Accuracy | 48.00% |
| Macro-F1 | 44.51% |
| Incorrect Predictions | 104 |

Run:

```bash
npm run evaluate-keyword-baseline
```

Generated files:

```text
experiments/keyword-baseline-results.json
experiments/keyword-baseline-report.md
```

This baseline provides a simple comparison point for the AI classifier.

---

# 16. Trivial Baseline

A trivial baseline should always predict the majority class.

Final measured results:

```text
Accuracy: TBD
Macro-F1: TBD
```

These values should be calculated from the actual evaluation set rather than estimated.

---

# 17. AI Classifier Evaluation

The AI classifier is evaluated using the same 200-example evaluation set.

Run:

```bash
npx tsx scripts/evaluate-llm-classifier.ts
```

The script calculates:

- Accuracy
- Macro-F1
- Precision
- Recall
- Per-intent F1
- Confusion matrix
- Misclassified examples

### Current status

The Gemini classifier and evaluation script are working. The full evaluation run is currently limited by the Gemini free-tier request quota.

Final AI results should be added only after a complete run finishes.

```text
Accuracy: TBD
Macro-F1: TBD
Precision: TBD
Recall: TBD
```

---

# 18. Results Comparison

The final report should contain:

| System | Accuracy | Macro-F1 |
|---|---:|---:|
| Majority baseline | TBD | TBD |
| Keyword baseline | 48.00% | 44.51% |
| AI classifier | TBD | TBD |

This comparison shows whether the AI classifier provides meaningful improvement over both a trivial and a simple rule-based approach.

---

# 19. Escalation Evaluation

The escalation system should be evaluated separately from intent classification.

The final evaluation should report:

- Precision
- Recall
- F1
- False-auto-handle rate

Final measured values:

```text
Precision: TBD
Recall: TBD
F1: TBD
False-auto-handle rate: TBD
```

Existing development/test support scripts include:

```text
scripts/test-escalation.ts
```

---

# 20. Reply Quality Evaluation

Reply quality should be measured with an LLM-as-judge rubric.

### 10-point rubric

| Criterion | Score |
|---|---:|
| Correctness | 0–2 |
| Groundedness | 0–2 |
| Relevance | 0–2 |
| No unsupported claims | 0–2 |
| Tone | 0–1 |
| Usefulness | 0–1 |

Maximum score:

```text
10
```

Final results:

```text
Average reply score: TBD
```

---

# 21. Human vs LLM Judge Validation

A human-reviewed sample should be compared with the LLM judge.

The final report should include:

- number of human-reviewed examples,
- human score,
- LLM-judge score,
- agreement,
- important disagreements.

Final result:

```text
Human-reviewed examples: TBD
Agreement: TBD
```

---

# 22. Failure Analysis

The assignment requires the top 5 failure modes with real examples.

Each example should document:

```text
Customer message
Expected result
Actual result
Why it failed
Hypothesis
Potential improvement
```

### Failure 1

```text
TBD — add a real evaluated failure.
```

### Failure 2

```text
TBD — add a real evaluated failure.
```

### Failure 3

```text
TBD — add a real evaluated failure.
```

### Failure 4

```text
TBD — add a real evaluated failure.
```

### Failure 5

```text
TBD — add a real evaluated failure.
```

Only actual project/evaluation failures should be used.

---

# 23. What Is Misleading About My Headline Number?

A single accuracy or Macro-F1 score does not fully describe the quality of this support agent.

### Classification is only one part of the system

A correct intent prediction does not guarantee that retrieval or the generated reply is correct.

### Class distribution matters

Accuracy can be influenced by the frequency of different intents. Macro-F1 is useful because each intent receives equal weight.

### Messages can be ambiguous

Twitter support messages can be short, sarcastic, multilingual, incomplete, or dependent on missing context.

### Historical evidence has limitations

A historical reply is evidence, not a guarantee that the same resolution is always valid today.

### Evaluation labels have limitations

The current evaluation labels should be independently human-reviewed before they are described as final gold labels.

### Offline metrics do not equal production trust

A model can score well on classification and still produce an unsafe or unsupported support reply.

For this reason, the headline classification metric should be treated as one signal rather than the complete system-quality metric.

---

# 24. Decision Log

Important engineering decisions include:

1. **Selected AmazonHelp** because it provides a large support corpus with recurring customer-support patterns.
2. **Used one brand** to keep the intent taxonomy and retrieval problem focused.
3. **Reconstructed conversations** instead of treating every tweet as an independent case.
4. **Used conversation-level splitting** to reduce evaluation leakage.
5. **Used 8 intents** to balance coverage with a manageable taxonomy.
6. **Added `other_unclear`** so ambiguous messages are not forced into unrelated categories.
7. **Added a keyword baseline** to provide a non-LLM reference.
8. **Added a majority baseline** to establish a trivial lower bar.
9. **Used semantic retrieval** because support cases with different wording can describe the same problem.
10. **Used PostgreSQL + pgvector** to keep structured storage and vector retrieval in one database.
11. **Grounded replies in historical cases** to reduce unsupported claims.
12. **Escalated weak/contradictory cases** rather than forcing an answer.
13. **Used structured JSON** for predictable classifier output.
14. **Treated model confidence as a score**, not a calibrated probability.
15. **Planned human validation of the LLM judge** because automated evaluation can also fail.

---

# 25. Limitations

- The dataset contains noisy social-media language.
- Some messages depend on missing conversational context.
- Historical resolutions may be incomplete or outdated.
- Model confidence is not calibrated.
- Free-tier Gemini request limits can interrupt large evaluation runs.
- The 200-example labels require independent human review before final reporting.
- Offline evaluation cannot fully measure actual customer satisfaction.
- Retrieval can find semantically similar but operationally different cases.

---

# 26. What I Would Do With One More Week

With another week, I would:

- complete independent human review of the golden set,
- finish the full AI classifier evaluation,
- tune retrieval on the development set,
- calibrate escalation thresholds,
- finish LLM-judge and human-agreement evaluation,
- add regression tests for major failure cases,
- improve handling of multilingual and ambiguous messages,
- improve documentation and reproducibility.

---

# 27. Reproducibility

The project uses a fixed 200-example evaluation file to make baseline and AI comparisons consistent.

The intended reproduction flow is:

```text
1. Clone repository
2. Install dependencies
3. Configure .env
4. Start PostgreSQL + pgvector
5. Initialize database/schema
6. Load required support cases
7. Run evaluation scripts
8. Inspect generated result files
```

The repository should keep this process simple enough for the reviewer to reproduce the headline metrics within the assignment's target time.

---

# 28. Security

Do not commit:

```text
.env
```

Recommended `.gitignore` entries:

```gitignore
.env
node_modules/
dist/
```

The Gemini API key must be stored in environment variables only.

---

# 29. Final Submission Checklist

Before submitting the repository:

- [ ] Repository is public or Hiver has access
- [ ] README is present in repository root
- [ ] `.env` is not committed
- [ ] `.env.example` is present
- [ ] Dataset processing is documented
- [ ] AmazonHelp selection is documented
- [ ] 8-intent taxonomy is documented
- [ ] Golden set is present
- [ ] Majority baseline is measured
- [ ] Keyword baseline is measured
- [ ] AI classifier evaluation is complete
- [ ] Escalation evaluation is complete
- [ ] Reply evaluation is complete
- [ ] Human-vs-judge agreement is measured
- [ ] 5 real failure modes are documented
- [ ] Headline-number limitation section is complete
- [ ] 10–15 decision log items are documented
- [ ] Final measured results are included
- [ ] Setup and reproduction steps work
- [ ] No secrets are committed

---

# 30. Current Status

### Core application

**Working**

- AmazonHelp data processing
- Conversation reconstruction
- 8-intent taxonomy
- PostgreSQL + pgvector
- Retrieval
- Gemini intent classification
- Grounded reply pipeline
- Escalation logic
- Backend API
- React frontend

### Evaluation

**Partially complete**

- Keyword baseline: completed
- AI classifier evaluation script: working
- AI full 200-example run: pending Gemini quota availability
- Majority baseline: pending measured result
- Escalation evaluation: pending
- Reply-quality evaluation: pending
- Human-vs-judge validation: pending
- Failure analysis: pending final real examples
- Final documentation: this README provides the structure; measured TBD values must be replaced before submission
