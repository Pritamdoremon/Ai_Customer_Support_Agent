import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { Pool } from "pg";
import { findSimilarCases } from "../src/retrieval/full-text-retrieval.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes("YOUR_PASSWORD")) {
  throw new Error("Set a real DATABASE_URL in .env before testing retrieval.");
}

const pool = new Pool({ connectionString: databaseUrl });
const supportCasesFile = path.join(
  process.cwd(),
  "data",
  "processed",
  "amazon-help-support-cases.jsonl",
);

function getRealDevelopmentMessage(): string {
  const firstCase = fs
    .readFileSync(supportCasesFile, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { data_split: string; customer_message: string })
    .find((supportCase) => supportCase.data_split === "development");

  if (!firstCase) throw new Error("No development support case was found.");
  return firstCase.customer_message;
}

async function main(): Promise<void> {
  try {
    const message = getRealDevelopmentMessage();
    const cases = await findSimilarCases(pool, message, 5);

    console.log(`Query: ${message}\n`);
    console.log(`Retrieved cases: ${cases.length}\n`);
    for (const supportCase of cases) {
      console.log(`Conversation: ${supportCase.conversationId}`);
      console.log(`Similarity: ${supportCase.similarity.toFixed(4)}`);
      console.log(`Customer: ${supportCase.customerMessage}`);
      console.log(`Historical reply: ${supportCase.historicalReply}`);
      console.log("-");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Retrieval test failed:", error);
  process.exitCode = 1;
});