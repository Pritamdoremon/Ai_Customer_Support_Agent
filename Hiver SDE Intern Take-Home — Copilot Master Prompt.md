# Hiver SDE Intern Take-Home Assignment — Full-Stack AI Support Agent

You are my coding assistant for building a complete, submission-ready solution for the Hiver SDE Intern Take-Home Assignment.

I will build this project incrementally with you.

**IMPORTANT: Do NOT build the entire project at once.**

Work phase by phase. At the end of each phase:

1. Explain what was implemented.
2. Explain why it is required.
3. Show the files changed/created.
4. Explain important code.
5. Give me exact commands to run.
6. Help me verify the result.
7. STOP and wait for my instruction before starting the next phase.

Do not invent dataset columns, brand information, intent categories, evaluation results, or historical resolutions. Inspect the actual data whenever information is required.

---

# 1. My technical background

I am primarily a TypeScript/Node.js developer.

I am comfortable with:

- TypeScript
- JavaScript
- Node.js
- Express.js
- PostgreSQL
- SQL
- REST APIs
- Tailwind css,html

I am NOT primarily a Python/ML developer.

Therefore, build the project mainly with technologies I already understand.

The final code must be simple enough that I can explain every important part during a live technical interview.

---

# 2. Required technology stack

## Frontend

Use:

- React
- TypeScript
- Vite

Build a simple professional dashboard.

Do not over-engineer the frontend.

## Backend

Use:

- Node.js
- TypeScript
- Express.js

The backend contains the AI/business logic.

## Database

Use:

- PostgreSQL
- pgvector

Use PostgreSQL for normal application data and pgvector for semantic similarity search.

Do NOT introduce another database unless absolutely necessary.

## AI

Use:

- OpenAI API or another suitable LLM API
- Embeddings
- PostgreSQL + pgvector for vector retrieval

Keep the AI implementation understandable.

## Evaluation

Implement evaluation in TypeScript.

Use:

- Accuracy
- Precision
- Recall
- Macro-F1
- Per-intent F1
- Confusion matrix
- Escalation precision/recall/F1
- False-auto-handle rate
- LLM-as-a-judge
- Human-vs-LLM judge agreement

---

# 3. Technologies NOT to use unless absolutely necessary

Do NOT introduce:

- Python
- LangChain
- LangGraph
- Kubernetes
- Kafka
- Redis
- Microservices
- Multiple databases
- Complex ML frameworks
- Complex agent frameworks
- Unnecessary cloud infrastructure

If a library or technology is genuinely necessary, explain why before introducing it.

Prefer simple TypeScript code over adding dependencies.

---

# 4. Actual assignment

The project must build an AI customer-support agent for ONE brand from:

Customer Support on Twitter

Kaggle dataset:

`thoughtvector/customer-support-on-twitter`

The dataset contains historical customer-support conversations between customers and brands on Twitter.

Our system should use the historical conversations as evidence for handling new customer messages.

The agent must perform three main tasks.

---

# 5. Task 1 — Intent classification

Given a new customer message, classify it into a small set of intents.

The intents must be discovered/defined from the selected brand's actual historical conversations.

Do NOT blindly use Banking77's 77 categories.

Aim for approximately 6–10 useful intents.

For every intent document:

- name
- description
- inclusion criteria
- exclusion criteria
- examples

Example only:

```text
payment_issue
refund_request
delivery_issue
order_issue
account_access
cancellation
technical_problem
product_information
complaint
other_unclear
```

These are examples only.

The final taxonomy must come from the actual selected brand's data.

---

# 6. Task 2 — Grounded reply generation

Given a new customer message:

1. Understand the message.
2. Find historically similar resolved customer-support conversations.
3. Give the relevant historical examples to the LLM.
4. Generate a response based on those historical resolutions.

The LLM must NOT invent:

- company policies
- refund policies
- timelines
- guarantees
- discounts
- actions
- account information

If historical evidence is weak or contradictory, the system should prefer escalation rather than hallucinating an answer.

This is a retrieval-grounded support agent.

---

# 7. Task 3 — Escalation decision

For every incoming message, decide:

```text
AUTO-HANDLE
```

or:

```text
ESCALATE
```

The system must also provide a reason.

Consider:

- intent confidence
- retrieval similarity
- availability of similar resolved cases
- ambiguity
- payment/account-specific issues
- sensitive situations
- angry/abusive customers
- requests requiring manual action
- contradictory historical evidence

Example:

```json
{
  "decision": "auto_handle",
  "reason": "The intent is clear and similar historical cases contain a consistent resolution."
}
```

Example:

```json
{
  "decision": "escalate",
  "reason": "No sufficiently similar historical resolution was found and the issue requires account-specific investigation."
}
```

Do not choose thresholds arbitrarily.

Validate important thresholds using evaluation data.

---

# 8. Overall architecture

Build this architecture:

```text
                    Historical Twitter Dataset
                              |
                              v
                       Data Processing
                              |
                              v
                       Choose ONE Brand
                              |
                              v
                    Reconstruct Conversations
                              |
                              v
                     Resolved Conversations
                              |
                    +---------+---------+
                    |                   |
                    v                   v
              Intent Taxonomy       Embeddings
                    |                   |
                    v                   v
             Intent Classifier      pgvector
                                        |
                                        v
                              Similar Historical Cases
                                        |
                                        v
                                  LLM Agent
                                  /       \
                                 /         \
                                v           v
                           Draft Reply   Escalation
                                 \         /
                                  \       /
                                   v     v
                                  Output
                                     |
                                     v
                                  API
                                     |
                                     v
                               React Dashboard
                                     |
                                     v
                                Evaluation
```

---

# 9. Full-stack user flow

The frontend should allow me to enter a new customer message.

Example:

```text
"My order hasn't arrived yet. Can you help?"
```

Frontend sends:

```http
POST /api/support/analyze
```

Backend:

```text
Customer message
      ↓
Intent classification
      ↓
Generate embedding
      ↓
pgvector search
      ↓
Retrieve top historical cases
      ↓
LLM generates grounded reply
      ↓
Escalation decision
      ↓
JSON response
```

Frontend displays:

```text
Intent
Delivery Issue

Confidence
91%

Similar Historical Cases
Case 1 — similarity 0.89
Case 2 — similarity 0.84
Case 3 — similarity 0.81

AI Draft Reply
"Sorry for the delay. Please DM us your order number
so we can check the delivery status."

Decision
AUTO-HANDLE

Reason
Strong historical evidence and a routine support issue.
```

---

# 10. Frontend requirements

Create a simple React dashboard.

Pages/components should be minimal.

Main screen:

```text
AI Customer Support Agent

Customer Message
[ textarea ]

[ Analyze Message ]

--------------------------------

Intent
Delivery Issue

Confidence
91%

--------------------------------

Historical Similar Cases

Case 1
Customer: ...
Brand Response: ...
Similarity: 0.89

Case 2
Customer: ...
Brand Response: ...
Similarity: 0.84

--------------------------------

AI Draft Reply

...

--------------------------------

Decision

AUTO-HANDLE

Reason:
...

--------------------------------
```

The frontend must:

- call the Express API
- display loading state
- display errors
- display result
- show retrieved evidence
- show intent
- show confidence
- show generated reply
- show escalation decision
- show escalation reason

Do NOT build authentication.

Do NOT build a complicated admin panel.

Do NOT build unnecessary pages.

The frontend exists mainly to demonstrate the AI system.

---

# 11. Backend API

Create:

```http
POST /api/support/analyze
```

Input:

```json
{
  "message": "My order hasn't arrived yet"
}
```

Output:

```json
{
  "intent": {
    "name": "delivery_issue",
    "confidence": 0.91
  },
  "retrieved_cases": [
    {
      "similarity": 0.89,
      "customer_message": "...",
      "historical_reply": "..."
    }
  ],
  "reply": "...",
  "escalation": {
    "decision": "auto_handle",
    "reason": "..."
  }
}
```

Use strong TypeScript types.

Validate input.

Handle errors properly.

Never expose API keys.

---

# 12. Database design

Use PostgreSQL.

Enable pgvector.

Create a simple schema.

Potential structure:

```text
brands
------
id
name

conversations
-------------
id
brand_id
conversation_id
customer_message
brand_reply
intent
resolved
embedding
created_at
```

Adjust the schema after inspecting the actual dataset.

Do NOT assume these exact fields exist in the Kaggle dataset.

The database design must reflect the actual processed data.

Create:

```text
sql/schema.sql
```

Include pgvector setup.

---

# 13. Dataset processing

Start by inspecting the actual dataset.

Do NOT process all \~3M tweets immediately.

First determine:

- file structure
- columns
- available brands
- number of tweets
- conversation/thread identifiers
- customer/support account information
- timestamps
- reply relationships
- whether conversation reconstruction is possible

Create scripts to:

1. Load data.
2. Inspect data.
3. Count brands.
4. Count conversations by brand.
5. Identify candidate brands.
6. Select ONE brand.
7. Sample manageable data.

Target approximately:

```text
10,000–50,000
```

relevant records/conversation turns, depending on the actual dataset structure and available resources.

Do not choose a brand until the data has been inspected.

Document why the selected brand was chosen.

---

# 14. Conversation reconstruction

The Twitter dataset contains multi-turn support interactions.

Where possible, reconstruct conversations.

Separate:

```text
Customer messages
```

from:

```text
Brand/support responses
```

Identify conversations where the brand actually provides a useful resolution.

Prefer resolved conversations for retrieval.

Do not use unresolved conversations as authoritative response evidence.

---

# 15. Data leakage prevention

This is mandatory.

Do NOT randomly split individual tweets when they belong to the same conversation.

Split at conversation/thread level.

Correct:

```text
Conversation A → training
Conversation B → training
Conversation C → evaluation
```

Incorrect:

```text
Conversation A turn 1 → training
Conversation A turn 2 → evaluation
```

The evaluation set must not contain information leaked from the same conversation used for development.

Document this in the report.

---

# 16. Development/evaluation split

Create:

```text
Development data
Evaluation data
Golden evaluation set
```

Keep the golden evaluation set separate.

Do not repeatedly tune the system against the golden set.

---

# 17. Baseline 1 — trivial baseline

Implement:

```text
Majority-class classifier
```

Always predict the most frequent intent.

This gives us a trivial benchmark.

---

# 18. Baseline 2 — simple baseline

Implement a simple keyword/rule-based classifier in TypeScript.

Rules should be derived from actual data.

Example:

```text
"refund"
"money back"
"return my money"
```

could indicate:

```text
refund_request
```

Do not create hundreds of arbitrary rules.

Keep the baseline simple and explainable.

---

# 19. Main AI intent classifier

Use an LLM for the main intent classification.

Provide:

- customer message
- intent definitions
- representative examples where useful

Require structured JSON.

Example:

```json
{
  "intent": "delivery_issue",
  "confidence": 0.91
}
```

The model must only select from the allowed intents.

Validate the returned intent in TypeScript.

---

# 20. Embeddings and retrieval

For each resolved historical customer-support case:

1. Generate an embedding.
2. Store the embedding in PostgreSQL using pgvector.

For a new customer message:

1. Generate its embedding.
2. Search pgvector.
3. Retrieve top 3–5 similar historical cases.
4. Prefer resolved cases.
5. Return similarity scores.

Do not send the entire database to the LLM.

Only send relevant retrieved evidence.

---

# 21. Grounded LLM response

Create a clear LLM prompt.

The prompt must instruct the model:

```text
You are assisting the selected customer-support brand.

Use only the historical support examples provided as evidence.

Generate a helpful response consistent with how the brand
historically resolved similar cases.

Do not invent:
- policies
- refunds
- timelines
- guarantees
- discounts
- account information
- unsupported actions

If the evidence is insufficient or contradictory,
recommend escalation instead of guessing.
```

Use structured output where practical.

---

# 22. Escalation logic

Keep escalation logic understandable.

Possible flow:

```text
Clear intent?
        |
        NO → ESCALATE
        |
       YES
        ↓
Strong historical evidence?
        |
        NO → ESCALATE
        |
       YES
        ↓
Routine/safe issue?
        |
        NO → ESCALATE
        |
       YES
        ↓
AUTO-HANDLE
```

The exact logic should be based on experiments.

Do not simply hard-code:

```text
confidence > 0.5
```

without validating it.

---

# 23. Golden evaluation set

Create:

```text
150–250 examples
```

Target approximately:

```text
200 examples
```

The examples should come from the selected brand.

Sample across:

- common intents
- rare intents
- ambiguous messages
- short messages
- noisy Twitter language
- difficult examples
- clear-resolution examples
- unclear-resolution examples

Each example should contain:

```text
id
customer_message
expected_intent
should_escalate
optional_expected_resolution
```

The human labels must be genuine.

Do not fabricate labels.

Document the sampling and labeling methodology.

---

# 24. Automated evaluation

Evaluate intent classification.

Report:

```text
Accuracy
Macro-F1
Precision
Recall
Per-intent F1
Confusion matrix
```

Compare:

```text
Majority baseline
vs
Keyword baseline
vs
AI system
```

The final report must use actual measured results.

Never invent numbers.

---

# 25. Escalation evaluation

Evaluate:

```text
Precision
Recall
F1
False-auto-handle rate
```

False-auto-handle is especially important.

Explain why incorrectly auto-handling a difficult customer issue can be more harmful than unnecessarily escalating it.

---

# 26. Reply evaluation

Implement an LLM-as-a-judge.

Evaluate generated replies using:

```text
Correctness          0–2
Groundedness         0–2
Relevance            0–2
No unsupported claims 0–2
Tone                 0–1
Usefulness           0–1
```

Total:

```text
10 points
```

The judge receives:

- customer message
- retrieved historical evidence
- generated reply

Example output:

```json
{
  "correctness": 2,
  "groundedness": 2,
  "relevance": 2,
  "unsupported_claims": 2,
  "tone": 1,
  "usefulness": 1,
  "total": 10,
  "reason": "The reply follows the historical resolution and does not introduce unsupported claims."
}
```

---

# 27. Human validation of the LLM judge

This is mandatory.

Take approximately 50 examples.

Have a human score the same replies using the same rubric.

Compare:

```text
Human score
vs
LLM judge score
```

Report:

- correlation
- exact agreement where appropriate
- agreement within 1 point
- important disagreements

Do NOT fabricate these results.

Generate them from actual human evaluation.

---

# 28. Failure analysis

Identify the five most important actual failure modes.

For each:

```text
Failure mode

Customer message:
...

Expected:
...

Actual:
...

Why it failed:
...

Hypothesis:
...

Potential improvement:
...
```

Potential examples include:

- refund vs cancellation confusion
- weak retrieval
- ambiguous language
- inconsistent historical responses
- unsupported LLM generation

Only report failures that actually occurred.

---

# 29. Mandatory section

Include:

```text
What is misleading about my headline number?
```

Discuss limitations such as:

- small golden set
- sampling bias
- class imbalance
- common vs rare intents
- ambiguous cases
- retrieval similarity
- dataset noise
- historical support responses being imperfect
- limitations of LLM-as-a-judge

Do not hide weaknesses.

---

# 30. Decision log

Create:

```text
decision_log.md
```

Include 10–15 non-obvious decisions.

For each:

```text
Decision:
...

Reason:
...

Trade-off:
...
```

Examples:

- Why the selected brand was chosen.
- Why the taxonomy has a particular number of intents.
- Why PostgreSQL + pgvector was selected.
- Why resolved conversations were preferred.
- Why conversation-level splitting was used.
- Why keyword classification was selected as the simple baseline.
- Why false-auto-handle rate matters.
- Why the golden set was kept separate.
- Why the LLM judge was validated by humans.
- Why weak evidence causes escalation.

---

# 31. Repository structure

Use this as a starting point:

```text
hiver-ai-support-agent/
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── data/
│   │   ├── intent/
│   │   ├── embeddings/
│   │   ├── retrieval/
│   │   ├── agent/
│   │   ├── evaluation/
│   │   ├── routes/
│   │   └── server.ts
│   │
│   ├── scripts/
│   │   ├── inspect-data.ts
│   │   ├── preprocess.ts
│   │   ├── select-brand.ts
│   │   ├── generate-embeddings.ts
│   │   ├── create-golden-set.ts
│   │   └── evaluate.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── golden/
│
├── sql/
│   └── schema.sql
│
├── experiments/
│   └── results.json
│
├── report/
│   └── report.md
│
├── decision_log.md
├── README.md
└── .gitignore
```

Adjust this structure if the actual implementation benefits from a simpler organization.

Do not create files just for the sake of having many files.

---

# 32. Environment variables

Use:

```text
OPENAI_API_KEY=
DATABASE_URL=
```

Add:

```text
.env.example
```

Never commit real API keys.

Never hard-code secrets.

---

# 33. NPM scripts

Create useful commands such as:

```bash
npm run dev
npm run build
npm run start
npm run inspect-data
npm run preprocess
npm run select-brand
npm run embeddings
npm run evaluate
```

Use separate frontend/backend scripts where appropriate.

Make the README explain exactly which command to run.

---

# 34. README

The README must explain:

## Project overview

What the system does.

## Why this brand

How the brand was selected.

## Architecture

Include a simple architecture diagram.

## Tech stack

Explain why each technology was chosen.

## Dataset

Explain the source and sampling.

## Setup

Installation and environment variables.

## Database

PostgreSQL + pgvector setup.

## Running the application

Frontend + backend commands.

## Running the pipeline

Explain preprocessing, embeddings, and evaluation.

## Evaluation

Show how to reproduce headline results.

The headline experiment should be reproducible in under 15 minutes after required data/model setup.

## Results

Use:

| System            | Accuracy | Macro-F1 |
| ----------------- | -------: | -------: |
| Majority baseline |   actual |   actual |
| Keyword baseline  |   actual |   actual |
| AI system         |   actual |   actual |

Never put placeholder/fake results in the final README.

## Failure analysis

Summarize five major failures.

## Limitations

Explain what the results do not prove.

---

# 35. Report

Maximum 6 pages if using a separate report.

Otherwise include the report in README.

Required sections:

1. Problem framing
2. What good means for this brand
3. What was intentionally not built
4. Brand selection
5. Intent taxonomy
6. Architecture
7. Baselines
8. Evaluation methodology
9. Results
10. Failure analysis
11. What is misleading about my headline number?
12. What I would do with one more week

---

# 36. Coding style

Write realistic developer code.

Prefer:

- TypeScript types
- simple functions
- clear variable names
- straightforward logic
- small modules
- proper error handling
- environment variables
- useful comments
- practical abstractions

Avoid:

- over-engineering
- giant classes
- unnecessary design patterns
- unnecessary dependencies
- complicated generic frameworks
- fake sophistication
- AI-looking code

The code should look like a strong developer project, not an unnecessarily complicated demo.

---

# 37. Testing

Add basic tests for important backend functionality.

At minimum test:

- input validation
- intent output validation
- escalation decision logic
- retrieval formatting
- API response structure

Do not spend excessive time building a huge test suite.

---

# 38. Reproducibility

The project must be reproducible.

Anyone cloning the repository should understand:

```text
1. Install dependencies
2. Configure PostgreSQL
3. Enable pgvector
4. Configure API key
5. Obtain dataset
6. Run preprocessing
7. Generate embeddings
8. Run evaluation
9. Start backend
10. Start frontend
```

Document every required step.

---

# 39. Important integrity rules

Never fabricate:

- dataset statistics
- brand statistics
- labels
- evaluation scores
- human scores
- LLM judge agreement
- historical responses
- company policies
- failure examples

If something must be known, inspect the actual data or measure it.

If something cannot be measured, explicitly say so.

---

# 40. Development phases

Follow these phases exactly.

## Phase 1 — Dataset inspection

Inspect the actual dataset.

Determine:

- files
- columns
- brands
- tweet counts
- conversation structure
- reply relationships

Recommend 3–5 candidate brands.

Do not build the AI yet.

STOP after Phase 1.

---

## Phase 2 — Brand selection and preprocessing

After I approve the brand:

- build data cleaning
- reconstruct conversations
- identify resolved conversations
- create a manageable sample
- prevent leakage

STOP.

---

## Phase 3 — Intent taxonomy

Analyze the selected brand.

Create approximately 6–10 intents.

Document boundaries and examples.

STOP.

---

## Phase 4 — Database

Create PostgreSQL schema.

Enable pgvector.

Create database access layer.

STOP.

---

## Phase 5 — Baselines

Implement:

1. Majority baseline
2. Keyword/rule baseline

Evaluate them.

STOP.

---

## Phase 6 — Embeddings and retrieval

Implement:

- embedding generation
- pgvector storage
- similarity search
- top-k retrieval

Test retrieval quality.

STOP.

---

## Phase 7 — LLM intent classification

Implement structured LLM intent classification.

Validate outputs.

STOP.

---

## Phase 8 — Grounded reply generation

Implement retrieval-grounded reply generation.

Prevent unsupported claims.

STOP.

---

## Phase 9 — Escalation

Implement escalation logic.

Validate thresholds using development data.

STOP.

---

## Phase 10 — Backend API

Build:

```http
POST /api/support/analyze
```

Test it.

STOP.

---

## Phase 11 — Frontend

Build the simple React dashboard.

Connect it to the backend.

STOP.

---

## Phase 12 — Golden evaluation set

Create approximately 200 manually labelled examples.

Document methodology.

STOP.

---

## Phase 13 — Automated evaluation

Implement:

- classification metrics
- escalation metrics
- reply evaluation pipeline

STOP.

---

## Phase 14 — LLM judge

Implement the reply-quality judge.

STOP.

---

## Phase 15 — Human agreement

Create the human evaluation process.

Compare human vs LLM judge.

STOP.

---

## Phase 16 — Experiments

Run all baselines and the main system.

Record actual results.

Do not fabricate numbers.

STOP.

---

## Phase 17 — Failure analysis

Identify five real failure modes.

STOP.

---

## Phase 18 — Report and decision log

Create:

```text
README.md
report/report.md
decision_log.md
```

STOP.

---

## Phase 19 — Final verification

Pretend you are the Hiver reviewer.

Check:

- Does the project run?
- Does the API work?
- Does the frontend work?
- Does the AI pipeline work?
- Are responses grounded?
- Does escalation work?
- Is evaluation reproducible?
- Are baselines included?
- Is the golden set present?
- Is human-vs-LLM agreement measured?
- Are failure cases real?
- Are results honest?
- Can the project be explained in an interview?

Fix issues found during this review.

---

# 41. Most important instruction

Do not optimize this project for visual complexity or number of technologies.

Optimize it for:

```text
Correctness
+
Simple architecture
+
Grounded AI
+
Reliable escalation
+
Strong evaluation
+
Reproducibility
+
Honest analysis
```

The final project should demonstrate that I can build an AI-powered backend system and evaluate whether it is actually trustworthy.

Start with **Phase 1 only**.

Do not implement anything beyond Phase 1 until I explicitly tell you to continue.
