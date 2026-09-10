import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import csv from "csv-parser";

const BRAND = "AmazonHelp";
const RAW_FILE = path.resolve("data/raw/twcs/twcs.csv");
const OUTPUT_FILE = path.resolve("data/processed/amazon-help-cases.jsonl");
const SUMMARY_FILE = path.resolve("data/processed/summary.json");
const MAX_CASES = 50_000;

type Tweet = {
  tweet_id: string;
  author_id: string;
  inbound: string;
  created_at: string;
  text: string;
  response_tweet_id: string;
  in_response_to_tweet_id: string;
};

type SupportCase = {
  conversation_id: string;
  customer_tweet_id: string;
  brand_tweet_id: string;
  customer_message: string;
  historical_reply: string;
  customer_created_at: string;
  brand_created_at: string;
  evidence_type: "direct_brand_reply";
  split: "development" | "evaluation";
};

function isInbound(tweet: Tweet): boolean {
  return tweet.inbound.toLowerCase() === "true";
}

function rootId(tweetId: string, parentByTweet: Map<string, string>): string {
  let current = tweetId;
  const visited = new Set<string>();

  while (parentByTweet.has(current) && !visited.has(current)) {
    visited.add(current);
    current = parentByTweet.get(current) as string;
  }

  return current;
}

function splitFor(conversationId: string): "development" | "evaluation" {
  let hash = 0;
  for (const character of conversationId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % 10 === 0 ? "evaluation" : "development";
}

async function readTweets(): Promise<Tweet[]> {
  const tweets: Tweet[] = [];

  await new Promise<void>((resolve, reject) => {
    createReadStream(RAW_FILE)
      .pipe(csv())
      .on("data", (tweet: Tweet) => {
        if (tweet.author_id === BRAND || isInbound(tweet)) {
          tweets.push(tweet);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return tweets;
}

async function main(): Promise<void> {
  const tweets = await readTweets();
  const byId = new Map(tweets.map((tweet) => [tweet.tweet_id, tweet]));
  const parentByTweet = new Map<string, string>();

  for (const tweet of tweets) {
    if (tweet.in_response_to_tweet_id) {
      parentByTweet.set(tweet.tweet_id, tweet.in_response_to_tweet_id);
    }
  }

  const cases: SupportCase[] = [];
  const seenPairs = new Set<string>();

  for (const brandTweet of tweets) {
    if (brandTweet.author_id !== BRAND || !brandTweet.text.trim()) {
      continue;
    }

    const customerTweet = byId.get(brandTweet.in_response_to_tweet_id);
    if (!customerTweet || !isInbound(customerTweet) || !customerTweet.text.trim()) {
      continue;
    }

    const pairId = `${customerTweet.tweet_id}:${brandTweet.tweet_id}`;
    if (seenPairs.has(pairId)) {
      continue;
    }

    seenPairs.add(pairId);
    const conversationId = rootId(customerTweet.tweet_id, parentByTweet);
    cases.push({
      conversation_id: conversationId,
      customer_tweet_id: customerTweet.tweet_id,
      brand_tweet_id: brandTweet.tweet_id,
      customer_message: customerTweet.text.trim(),
      historical_reply: brandTweet.text.trim(),
      customer_created_at: customerTweet.created_at,
      brand_created_at: brandTweet.created_at,
      evidence_type: "direct_brand_reply",
      split: splitFor(conversationId),
    });
  }

  cases.sort((left, right) => left.customer_tweet_id.localeCompare(right.customer_tweet_id));
  const selectedCases = cases.slice(0, MAX_CASES);
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

  const output = createWriteStream(OUTPUT_FILE);
  for (const supportCase of selectedCases) {
    output.write(`${JSON.stringify(supportCase)}\n`);
  }
  await new Promise<void>((resolve, reject) => {
    output.end(resolve);
    output.on("error", reject);
  });

  const summary = {
    brand: BRAND,
    raw_file: path.relative(process.cwd(), RAW_FILE),
    definition: "Direct non-empty customer message paired with a direct non-empty brand reply.",
    cases_found: cases.length,
    cases_written: selectedCases.length,
    development_cases: selectedCases.filter((supportCase) => supportCase.split === "development").length,
    evaluation_cases: selectedCases.filter((supportCase) => supportCase.split === "evaluation").length,
    unique_conversations: new Set(selectedCases.map((supportCase) => supportCase.conversation_id)).size,
    leakage_prevention: "The deterministic split is assigned by conversation root, never by individual tweet.",
    limitation: "Direct replies are evidence candidates, not proof that the customer's issue was fully resolved.",
  };

  await writeFile(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});