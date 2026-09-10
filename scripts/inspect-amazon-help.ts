import fs from "node:fs";
import path from "node:path";
import csv from "csv-parser";

const BRAND = "AmazonHelp";
const filePath = path.join(
  process.cwd(),
  "data",
  "raw",
  "extracted",
  "twcs",
  "twcs.csv",
);

type Tweet = {
  tweet_id: string;
  author_id: string;
  inbound: string;
  created_at: string;
  text: string;
  response_tweet_id: string;
  in_response_to_tweet_id: string;
};

type ConversationExample = {
  conversationId: string;
  customerTweetId: string;
  brandTweetId: string;
  customerMessage: string;
  brandReply: string;
};

const inboundTweets = new Map<string, Tweet>();
const parentByTweet = new Map<string, string>();
const amazonTweetIds = new Set<string>();
const amazonReplies: Tweet[] = [];
let amazonTweetCount = 0;

function isInbound(tweet: Tweet): boolean {
  return tweet.inbound.toLowerCase() === "true";
}

function conversationRoot(tweetId: string): string {
  let current = tweetId;
  const visited = new Set<string>();

  while (parentByTweet.has(current) && !visited.has(current)) {
    visited.add(current);
    current = parentByTweet.get(current) as string;
  }

  return current;
}

function isCustomerMessageInvolvingAmazon(tweet: Tweet): boolean {
  return (
    tweet.text.toLowerCase().includes("@amazonhelp") ||
    amazonTweetIds.has(tweet.response_tweet_id)
  );
}

async function inspectDataset(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (tweet: Tweet) => {
        if (tweet.in_response_to_tweet_id) {
          parentByTweet.set(tweet.tweet_id, tweet.in_response_to_tweet_id);
        }

        if (isInbound(tweet)) {
          inboundTweets.set(tweet.tweet_id, tweet);
          return;
        }

        if (tweet.author_id === BRAND) {
          amazonTweetCount += 1;
          amazonTweetIds.add(tweet.tweet_id);
          amazonReplies.push(tweet);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  const involvingCustomerTweets = [...inboundTweets.values()].filter(
    isCustomerMessageInvolvingAmazon,
  );
  const directReplies: ConversationExample[] = [];

  for (const brandTweet of amazonReplies) {
    const customerTweet = inboundTweets.get(brandTweet.in_response_to_tweet_id);
    if (!customerTweet || !customerTweet.text.trim() || !brandTweet.text.trim()) {
      continue;
    }

    directReplies.push({
      conversationId: conversationRoot(customerTweet.tweet_id),
      customerTweetId: customerTweet.tweet_id,
      brandTweetId: brandTweet.tweet_id,
      customerMessage: customerTweet.text.trim(),
      brandReply: brandTweet.text.trim(),
    });
  }

  const conversationIds = new Set(
    directReplies.map((conversation) => conversation.conversationId),
  );

  console.log(`\nAmazonHelp conversation inspection:\n`);
  console.log(`AmazonHelp tweets:                 ${amazonTweetCount}`);
  console.log(`Customer tweets involving AmazonHelp: ${involvingCustomerTweets.length}`);
  console.log(`Direct AmazonHelp replies:          ${directReplies.length}`);
  console.log(`Conversation threads:              ${conversationIds.size}`);
  console.log("\nDefinition of customer involvement:");
  console.log("- Customer text mentions @AmazonHelp, or");
  console.log("- Customer tweet directly replies to an AmazonHelp tweet.");
  console.log("\nExample customer -> AmazonHelp conversations:\n");

  for (const example of directReplies.slice(0, 5)) {
    console.log(`Conversation: ${example.conversationId}`);
    console.log(`Customer (${example.customerTweetId}): ${example.customerMessage}`);
    console.log(`AmazonHelp (${example.brandTweetId}): ${example.brandReply}`);
    console.log("-");
  }
}

inspectDataset().catch((error: unknown) => {
  console.error("Failed to inspect AmazonHelp conversations:", error);
  process.exitCode = 1;
});