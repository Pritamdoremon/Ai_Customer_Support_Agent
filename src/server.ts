import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { getLlmClient } from "./config/llm.js";
import { decideEscalation } from "./agent/escalation.js";
import { generateGroundedReply } from "./agent/grounded-reply.js";
import { classifyWithLlm } from "./intent/llm-classifier.js";
import { findSimilarCases } from "./retrieval/full-text-retrieval.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const pool = new Pool({ connectionString: databaseUrl });
const app = express();
app.use(express.json());

app.post("/api/support/analyze", async (request, response) => {
  const message = request.body?.message;
  if (typeof message !== "string" || !message.trim()) {
    response.status(400).json({ error: "message must be a non-empty string" });
    return;
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
    response.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  try {
    const client = getLlmClient();
    const intent = await classifyWithLlm(client, message.trim());
    const retrievedCases = await findSimilarCases(pool, message.trim(), 5);
    const reply = await generateGroundedReply(client, message.trim(), retrievedCases);
    const escalation = decideEscalation({
      intentConfidence: intent.confidence,
      retrievedCaseCount: retrievedCases.length,
      evidenceScore: retrievedCases[0]?.similarity ?? 0,
      sensitive: ["payment_billing", "account_prime"].includes(intent.intent),
      groundedDecision: reply.decision,
      reply: reply.reply,
    });

    response.json({ intent, retrieved_cases: retrievedCases, reply: reply.reply, escalation });
  } catch (error: unknown) {
    console.error("Support analysis failed:", error);
    const providerError = error as { status?: number };
    const status = providerError.status === 429 ? 429 : 500;
    const message = status === 429
      ? "Gemini rate limit reached. Wait and try again, or use a key with available quota."
      : error instanceof Error ? error.message : "Support analysis failed";
    response.status(status).json({ error: message });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Support API listening on port ${port}`));