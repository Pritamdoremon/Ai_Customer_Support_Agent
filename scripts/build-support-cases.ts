import fs from "node:fs";
import path from "node:path";
import csv from "csv-parser";

const BRAND = "AmazonHelp";
const rawFile = path.join(
  process.cwd(),
  "data",
  "raw",
  "extracted",
  "twcs",
  "twcs.csv",
);
const outputFile = path.join(
  process.cwd(),
  "data",
  "processed",
  "amazon-help-support-cases.jsonl",
);
const summaryFile = path.join(
  process.cwd(),
  "data",
  "processed",
  "support-cases-summary.json",
);

type Tweet = {
  tweet_id: string;
  author_id: string;
  inbound: string;
  created_at: string;
  text: string;
  in_response_to_tweet_id: string;
};

type SupportCase = {
  brand: "AmazonHelp";
  conversation_id: string;
  customer_tweet_id: string;
  brand_tweet_id: string;
  customer_message: string;
  historical_reply: string;
  customer_created_at: string;
  brand_created_at: string;
  evidence_type: "direct_brand_reply";
  data_split: "development" | "evaluation";
};

function isInbound(tweet: Tweet): boolean {
  return tweet.inbound.toLowerCase() === "true";
}

function splitFor(conversationId: string): "development" | "evaluation" {
  let hash = 0;
  for (const character of conversationId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % 10 === 0 ? "evaluation" : "development";
}

function getConversationRoot(
  tweetId: string,
  parentByTweet: Map<string, string>,
): string {
  let current = tweetId;
  const visited = new Set<string>();

  while (parentByTweet.has(current) && !visited.has(current)) {
    visited.add(current);
    current = parentByTweet.get(current) as string;
  }

  return current;
}

async function main(): Promise<void> {
  const customerTweets = new Map<string, Tweet>();
  const amazonReplies: Tweet[] = [];
  const parentByTweet = new Map<string, string>();

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(rawFile)
      .pipe(csv())
      .on("data", (tweet: Tweet) => {
        if (tweet.in_response_to_tweet_id) {
          parentByTweet.set(tweet.tweet_id, tweet.in_response_to_tweet_id);
        }

        if (isInbound(tweet)) {
          customerTweets.set(tweet.tweet_id, tweet);
        } else if (tweet.author_id === BRAND) {
          amazonReplies.push(tweet);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  const casesByCustomerTweet = new Map<string, SupportCase>();

  for (const brandReply of amazonReplies) {
    const customerTweet = customerTweets.get(brandReply.in_response_to_tweet_id);
    if (!customerTweet || !customerTweet.text.trim() || !brandReply.text.trim()) {
      continue;
    }

    const conversationId = getConversationRoot(
      customerTweet.tweet_id,
      parentByTweet,
    );

    const existingCase = casesByCustomerTweet.get(customerTweet.tweet_id);
    if (existingCase) {
      existingCase.brand_tweet_id += `,${brandReply.tweet_id}`;
      existingCase.historical_reply += `\n${brandReply.text.trim()}`;
    } else {
      casesByCustomerTweet.set(customerTweet.tweet_id, {
        brand: BRAND,
        conversation_id: conversationId,
        customer_tweet_id: customerTweet.tweet_id,
        brand_tweet_id: brandReply.tweet_id,
        customer_message: customerTweet.text.trim(),
        historical_reply: brandReply.text.trim(),
        customer_created_at: customerTweet.created_at,
        brand_created_at: brandReply.created_at,
        evidence_type: "direct_brand_reply",
        data_split: splitFor(conversationId),
      });
    }
  }

  const cases = [...casesByCustomerTweet.values()];
  cases.sort((left, right) => Number(left.customer_tweet_id) - Number(right.customer_tweet_id));
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(
    outputFile,
    `${cases.map((supportCase) => JSON.stringify(supportCase)).join("\n")}\n`,
    "utf8",
  );

  const summary = {
    brand: BRAND,
    source_file: path.relative(process.cwd(), rawFile),
    definition: "A non-empty inbound customer tweet paired with one or more direct non-empty AmazonHelp replies.",
    duplicate_reply_handling: "Multiple direct replies to one customer tweet are consolidated into one case, preserving all reply IDs and text.",
    cases_written: cases.length,
    development_cases: cases.filter((supportCase) => supportCase.data_split === "development").length,
    evaluation_cases: cases.filter((supportCase) => supportCase.data_split === "evaluation").length,
    unique_conversations: new Set(cases.map((supportCase) => supportCase.conversation_id)).size,
    leakage_prevention: "The split is assigned from the conversation root, so one thread cannot cross splits.",
    limitation: "A direct reply is an evidence candidate, not proof that the issue was fully resolved.",
  };

  fs.writeFileSync(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error("Failed to build support cases:", error);
  process.exitCode = 1;
});