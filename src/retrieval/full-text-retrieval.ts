import { Pool } from "pg";

export type RetrievedCase = {
  conversationId: string;
  customerTweetId: string;
  customerMessage: string;
  historicalReply: string;
  similarity: number;
};

function toSearchQuery(message: string): string {
  const stopWords = new Set(["and", "are", "has", "have", "the", "this", "was", "with"]);
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)].map((word) => `'${word}'`).join(" OR ");
}

export async function findSimilarCases(
  pool: Pool,
  message: string,
  limit = 5,
): Promise<RetrievedCase[]> {
  const searchQuery = toSearchQuery(message);
  if (!searchQuery) return [];

  const result = await pool.query<{
    conversation_id: string;
    customer_tweet_id: string;
    customer_message: string;
    historical_reply: string;
    similarity: number;
  }>(
    `SELECT
       sc.conversation_id,
       sc.customer_tweet_id,
       sc.customer_message,
       sc.historical_reply,
      ts_rank_cd(sc.search_vector, websearch_to_tsquery('english', $1)) AS similarity
     FROM support_cases sc
     JOIN brands b ON b.id = sc.brand_id
     WHERE b.name = 'AmazonHelp'
       AND sc.data_split = 'development'
       AND sc.search_vector @@ websearch_to_tsquery('english', $1)
     ORDER BY similarity DESC, sc.id
     LIMIT $2`,
    [searchQuery, limit],
  );

  return result.rows.map((row) => ({
    conversationId: row.conversation_id,
    customerTweetId: row.customer_tweet_id,
    customerMessage: row.customer_message,
    historicalReply: row.historical_reply,
    similarity: Number(row.similarity),
  }));
}