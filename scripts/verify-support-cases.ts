import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const inputFile = path.join(
  process.cwd(),
  "data",
  "processed",
  "amazon-help-support-cases.jsonl",
);

type SupportCase = {
  brand: "AmazonHelp";
  conversation_id: string;
  customer_tweet_id: string;
  brand_tweet_id: string;
  customer_message: string;
  historical_reply: string;
  data_split: "development" | "evaluation";
};

function isValidCase(value: unknown): value is SupportCase {
  if (!value || typeof value !== "object") return false;
  const supportCase = value as Record<string, unknown>;
  return (
    typeof supportCase.conversation_id === "string" &&
    supportCase.brand === "AmazonHelp" &&
    typeof supportCase.customer_tweet_id === "string" &&
    typeof supportCase.brand_tweet_id === "string" &&
    typeof supportCase.customer_message === "string" &&
    typeof supportCase.historical_reply === "string" &&
    (supportCase.data_split === "development" || supportCase.data_split === "evaluation")
  );
}

async function main(): Promise<void> {
  const developmentConversations = new Set<string>();
  const evaluationConversations = new Set<string>();
  const customerTweetIds = new Set<string>();
  const conversationCustomerPairs = new Set<string>();
  const examples: SupportCase[] = [];
  let total = 0;
  let development = 0;
  let evaluation = 0;
  let missingCustomerMessages = 0;
  let missingHistoricalReplies = 0;
  let missingConversationIds = 0;
  let invalidCases = 0;

  const input = readline.createInterface({
    input: fs.createReadStream(inputFile),
    crlfDelay: Infinity,
  });

  for await (const line of input) {
    if (!line.trim()) continue;
    const supportCase: unknown = JSON.parse(line);
    total += 1;

    if (!isValidCase(supportCase)) {
      invalidCases += 1;
      continue;
    }

    if (!supportCase.customer_message.trim()) missingCustomerMessages += 1;
    if (!supportCase.historical_reply.trim()) missingHistoricalReplies += 1;
    if (!supportCase.conversation_id.trim()) missingConversationIds += 1;
    if (customerTweetIds.has(supportCase.customer_tweet_id)) {
      console.error(`Duplicate customer tweet ID: ${supportCase.customer_tweet_id}`);
    }
    customerTweetIds.add(supportCase.customer_tweet_id);

    const pair = `${supportCase.conversation_id}:${supportCase.customer_tweet_id}`;
    if (conversationCustomerPairs.has(pair)) {
      console.error(`Duplicate conversation/customer pair: ${pair}`);
    }
    conversationCustomerPairs.add(pair);

    if (supportCase.data_split === "development") {
      development += 1;
      developmentConversations.add(supportCase.conversation_id);
    } else {
      evaluation += 1;
      evaluationConversations.add(supportCase.conversation_id);
    }

    if (examples.length < 5) examples.push(supportCase);
  }

  const leakage = [...developmentConversations].some((id) => evaluationConversations.has(id));
  const report = {
    total,
    development,
    evaluation,
    missingCustomerMessages,
    missingHistoricalReplies,
    missingConversationIds,
    duplicateCustomerTweetIds: total - customerTweetIds.size,
    duplicateConversationCustomerPairs: total - conversationCustomerPairs.size,
    invalidCases,
    amazonHelpCases: total,
    conversationLeakage: leakage,
  };

  console.log("Support-case verification complete\n");
  console.log(JSON.stringify(report, null, 2));
  console.log("\nRepresentative support cases:\n");
  for (const supportCase of examples) {
    console.log(JSON.stringify(supportCase, null, 2));
    console.log("-");
  }

  if (invalidCases || missingCustomerMessages || missingHistoricalReplies || missingConversationIds || leakage) {
    throw new Error("Support-case verification failed.");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});