import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import "dotenv/config";
import { Pool } from "pg";

const inputFile = path.join(
  process.cwd(),
  "data",
  "processed",
  "amazon-help-support-cases.jsonl",
);
const batchSize = 500;

type SupportCase = {
  brand: "AmazonHelp";
  conversation_id: string;
  customer_tweet_id: string;
  brand_tweet_id: string;
  customer_message: string;
  historical_reply: string;
  customer_created_at: string;
  brand_created_at: string;
  evidence_type: string;
  data_split: "development" | "evaluation";
};

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value || value.includes("YOUR_PASSWORD")) {
    throw new Error("Set a real DATABASE_URL in .env before loading support cases.");
  }
  return value;
}

function validateCase(value: unknown): SupportCase {
  if (!value || typeof value !== "object") throw new Error("Case is not an object.");
  const supportCase = value as Record<string, unknown>;
  const requiredFields = [
    "brand",
    "conversation_id",
    "customer_tweet_id",
    "brand_tweet_id",
    "customer_message",
    "historical_reply",
    "customer_created_at",
    "brand_created_at",
    "evidence_type",
    "data_split",
  ];

  for (const field of requiredFields) {
    if (typeof supportCase[field] !== "string" || !supportCase[field]) {
      throw new Error(`Missing required support-case field: ${field}`);
    }
  }

  if (supportCase.data_split !== "development" && supportCase.data_split !== "evaluation") {
    throw new Error(`Invalid data_split: ${supportCase.data_split}`);
  }
  if (supportCase.brand !== "AmazonHelp") {
    throw new Error(`Unexpected support-case brand: ${supportCase.brand}`);
  }
  return supportCase as unknown as SupportCase;
}

async function insertBatch(pool: Pool, brandId: string, cases: SupportCase[]): Promise<number> {
  if (!cases.length) return 0;
  const values: unknown[] = [brandId];
  const rows = cases.map((supportCase, index) => {
    const offset = 2 + index * 9;
    values.push(
      supportCase.conversation_id,
      supportCase.customer_tweet_id,
      supportCase.brand_tweet_id,
      supportCase.customer_message,
      supportCase.historical_reply,
      supportCase.customer_created_at,
      supportCase.brand_created_at,
      supportCase.evidence_type,
      supportCase.data_split,
    );
    return `($1, $${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
  });

  const result = await pool.query(
    `INSERT INTO support_cases (
      brand_id, conversation_id, customer_tweet_id, brand_tweet_id,
      customer_message, historical_reply, customer_created_at,
      brand_created_at, evidence_type, data_split
    ) VALUES ${rows.join(",")}
    ON CONFLICT (customer_tweet_id) DO NOTHING`,
    values,
  );
  return result.rowCount ?? 0;
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl() });
  let processed = 0;
  let inserted = 0;
  let batch: SupportCase[] = [];

  try {
    const brandResult = await pool.query<{ id: string }>(
      `INSERT INTO brands (name) VALUES ('AmazonHelp')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    );
    const brandId = brandResult.rows[0].id;
    const input = readline.createInterface({
      input: fs.createReadStream(inputFile),
      crlfDelay: Infinity,
    });

    for await (const line of input) {
      if (!line.trim()) continue;
      batch.push(validateCase(JSON.parse(line)));
      processed += 1;
      if (batch.length === batchSize) {
        inserted += await insertBatch(pool, brandId, batch);
        batch = [];
        console.log(`Processed ${processed}; inserted ${inserted}`);
      }
    }

    inserted += await insertBatch(pool, brandId, batch);
    console.log(`\nSupport-case load complete\nProcessed: ${processed}\nInserted: ${inserted}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to load support cases:", error);
  process.exitCode = 1;
});