import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const sourceFile = path.join(
  process.cwd(),
  "data",
  "processed",
  "amazon-help-support-cases.jsonl",
);
const outputFile = path.join(
  process.cwd(),
  "data",
  "golden",
  "keyword-evaluation-set.json",
);
const sampleSize = 200;
const seed = 20260910;

type SupportCase = {
  brand: "AmazonHelp";
  conversation_id: string;
  customer_tweet_id: string;
  brand_tweet_id: string;
  customer_message: string;
  data_split: "development" | "evaluation";
};

type Annotation = {
  id: string;
  conversation_id: string;
  customer_tweet_id: string;
  brand_tweet_id: string;
  customer_message: string;
  gold_intent: "";
};

function randomGenerator(initialSeed: number): () => number {
  let value = initialSeed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

async function main(): Promise<void> {
  const evaluationCases: SupportCase[] = [];
  const input = readline.createInterface({
    input: fs.createReadStream(sourceFile),
    crlfDelay: Infinity,
  });

  for await (const line of input) {
    if (!line.trim()) continue;
    const supportCase = JSON.parse(line) as SupportCase;
    if (supportCase.data_split === "evaluation") evaluationCases.push(supportCase);
  }

  if (evaluationCases.length < sampleSize) {
    throw new Error(`Expected at least ${sampleSize} evaluation cases.`);
  }

  const random = randomGenerator(seed);
  for (let index = evaluationCases.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [evaluationCases[index], evaluationCases[swapIndex]] = [
      evaluationCases[swapIndex],
      evaluationCases[index],
    ];
  }

  const annotations: Annotation[] = evaluationCases.slice(0, sampleSize).map((supportCase) => ({
    id: supportCase.customer_tweet_id,
    conversation_id: supportCase.conversation_id,
    customer_tweet_id: supportCase.customer_tweet_id,
    brand_tweet_id: supportCase.brand_tweet_id,
    customer_message: supportCase.customer_message,
    gold_intent: "",
  }));

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(
    outputFile,
    `${JSON.stringify({
      brand: "AmazonHelp",
      source_split: "evaluation",
      sample_size: annotations.length,
      random_seed: seed,
      allowed_gold_intents: [
        "payment_issues",
        "digital_technical_problems",
        "account_access",
        "product_seller_issues",
        "order_cancellation",
        "unclear_messages",
      ],
      annotation_note: "Fill gold_intent using human judgment. Do not copy the classifier prediction.",
      examples: annotations,
    }, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify({ outputFile, sourceEvaluationCases: evaluationCases.length, sampled: annotations.length, seed }, null, 2));
}

main().catch((error: unknown) => {
  console.error("Failed to create keyword evaluation set:", error);
  process.exitCode = 1;
});