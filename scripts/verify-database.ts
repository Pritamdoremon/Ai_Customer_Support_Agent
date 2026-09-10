import "dotenv/config";
import { Pool } from "pg";

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value || value.includes("YOUR_PASSWORD")) {
    throw new Error("Set a real DATABASE_URL in .env before verifying PostgreSQL.");
  }
  return value;
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    const result = await pool.query<{
      brand: string;
      total: string;
      development: string;
      evaluation: string;
      conversations: string;
      customer_tweets: string;
      missing_customer_messages: string;
      missing_historical_replies: string;
      leakage: boolean;
    }>(`
      SELECT
        b.name AS brand,
        COUNT(sc.id)::text AS total,
        COUNT(*) FILTER (WHERE sc.data_split = 'development')::text AS development,
        COUNT(*) FILTER (WHERE sc.data_split = 'evaluation')::text AS evaluation,
        COUNT(DISTINCT sc.conversation_id)::text AS conversations,
        COUNT(DISTINCT sc.customer_tweet_id)::text AS customer_tweets,
        COUNT(*) FILTER (WHERE NULLIF(BTRIM(sc.customer_message), '') IS NULL)::text AS missing_customer_messages,
        COUNT(*) FILTER (WHERE NULLIF(BTRIM(sc.historical_reply), '') IS NULL)::text AS missing_historical_replies,
        EXISTS (
          SELECT 1
          FROM support_cases split_check
          WHERE split_check.brand_id = b.id
          GROUP BY split_check.conversation_id
          HAVING COUNT(DISTINCT split_check.data_split) > 1
        ) AS leakage
      FROM brands b
      LEFT JOIN support_cases sc ON sc.brand_id = b.id
      WHERE b.name = 'AmazonHelp'
      GROUP BY b.id, b.name
    `);

    if (!result.rows.length) throw new Error("AmazonHelp brand was not found.");
    const report = result.rows[0];
    const total = Number(report.total);
    const development = Number(report.development);
    const evaluation = Number(report.evaluation);
    const checks = {
      splitSumsMatch: development + evaluation === total,
      distinctTweetCountMatchesTotal: Number(report.customer_tweets) === total,
      noConversationLeakage: !report.leakage,
      noMissingCustomerMessages: Number(report.missing_customer_messages) === 0,
      noMissingHistoricalReplies: Number(report.missing_historical_replies) === 0,
    };

    console.log("Database verification complete\n");
    console.log(`Brand: ${report.brand}`);
    console.log(`Total cases: ${total}`);
    console.log(`Development: ${development}`);
    console.log(`Evaluation: ${evaluation}`);
    console.log(`Distinct conversations: ${report.conversations}`);
    console.log(`Conversation leakage: ${report.leakage}`);
    console.log(`\nChecks: ${JSON.stringify(checks, null, 2)}`);

    if (Object.values(checks).some((passed) => !passed)) {
      throw new Error("Database verification failed.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to verify database:", error);
  process.exitCode = 1;
});