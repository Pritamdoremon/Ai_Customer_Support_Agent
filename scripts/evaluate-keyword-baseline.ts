import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {
  classifyWithKeywords,
  type IntentName,
} from "../src/intent/keyword-classifier.js";

const inputFile = path.join(
  process.cwd(),
  "data",
  "golden",
  "keyword-evaluation-set.json",
);
const resultFile = path.join(
  process.cwd(),
  "experiments",
  "keyword-baseline-results.json",
);
const reportFile = path.join(
  process.cwd(),
  "experiments",
  "keyword-baseline-report.md",
);
const sourceFile = path.join(
  process.cwd(),
  "data",
  "processed",
  "amazon-help-support-cases.jsonl",
);

const allowedGoldIntents = [
  "delivery_issue",
  "order_issue",
  "refund_return",
  "payment_billing",
  "account_prime",
  "digital_technical",
  "product_seller_issue",
  "other_unclear",
] as const;

type GoldIntent = (typeof allowedGoldIntents)[number];

const predictionMap: Partial<Record<IntentName, GoldIntent>> = {
  delivery_issue: "delivery_issue",
  order_issue: "order_issue",
  refund_return: "refund_return",
  payment_billing: "payment_billing",
  account_prime: "account_prime",
  digital_technical: "digital_technical",
  product_seller_issue: "product_seller_issue",
  other_unclear: "other_unclear",
};

type Annotation = {
  id: string;
  customer_message: string;
  gold_intent: string;
};

async function readEvaluationIds(): Promise<Set<string>> {
  const evaluationIds = new Set<string>();
  const input = readline.createInterface({
    input: fs.createReadStream(sourceFile),
    crlfDelay: Infinity,
  });

  for await (const line of input) {
    if (!line.trim()) continue;

    const supportCase = JSON.parse(line) as {
      customer_tweet_id: string;
      data_split: string;
    };

    if (supportCase.data_split === "evaluation") {
      evaluationIds.add(supportCase.customer_tweet_id);
    }
  }

  return evaluationIds;
}

function calculateMetrics(
  gold: GoldIntent[],
  predicted: GoldIntent[],
  intent: GoldIntent,
) {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (let index = 0; index < gold.length; index += 1) {
    if (gold[index] === intent && predicted[index] === intent) {
      truePositive += 1;
    }

    if (gold[index] !== intent && predicted[index] === intent) {
      falsePositive += 1;
    }

    if (gold[index] === intent && predicted[index] !== intent) {
      falseNegative += 1;
    }
  }

  const precision =
    truePositive + falsePositive === 0
      ? 0
      : truePositive / (truePositive + falsePositive);

  const recall =
    truePositive + falseNegative === 0
      ? 0
      : truePositive / (truePositive + falseNegative);

  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    support: truePositive + falseNegative,
  };
}

async function main(): Promise<void> {
  const document = JSON.parse(fs.readFileSync(inputFile, "utf8")) as {
    examples: Annotation[];
  };

  const evaluationIds = await readEvaluationIds();

  const seenIds = new Set<string>();

  const duplicateIds = document.examples.filter((example) => {
    const duplicate = seenIds.has(example.id);
    seenIds.add(example.id);
    return duplicate;
  });

  const missingEvaluationCases = document.examples.filter(
    (example) => !evaluationIds.has(example.id),
  );

  const missingLabels = document.examples.filter(
    (example) =>
      !allowedGoldIntents.includes(example.gold_intent as GoldIntent),
  );

  if (document.examples.length !== 200) {
    throw new Error(
      `Expected exactly 200 examples, found ${document.examples.length}.`,
    );
  }

  if (duplicateIds.length) {
    throw new Error(
      `Duplicate annotation IDs found: ${duplicateIds
        .map((example) => example.id)
        .join(", ")}`,
    );
  }

  if (missingEvaluationCases.length) {
    throw new Error(
      `Examples missing from the AmazonHelp evaluation split: ${missingEvaluationCases
        .map((example) => example.id)
        .join(", ")}`,
    );
  }

  if (missingLabels.length) {
    throw new Error(
      `${missingLabels.length} examples still need one of the eight human gold_intent labels.`,
    );
  }

  const unsupportedPredictions = [] as Array<{
    id: string;
    prediction: IntentName;
  }>;

  const gold = document.examples.map(
    (example) => example.gold_intent as GoldIntent,
  );

  const predicted: GoldIntent[] = [];

  const errors = [] as Array<{
    id: string;
    gold: GoldIntent;
    predicted: IntentName;
    message: string;
    confidence: number;
  }>;

  for (const example of document.examples) {
    const result = classifyWithKeywords(example.customer_message);
    const mappedPrediction = predictionMap[result.intent];

    if (!mappedPrediction) {
      unsupportedPredictions.push({
        id: example.id,
        prediction: result.intent,
      });
      continue;
    }

    predicted.push(mappedPrediction);

    if (mappedPrediction !== example.gold_intent) {
      errors.push({
        id: example.id,
        gold: example.gold_intent as GoldIntent,
        predicted: result.intent,
        message: example.customer_message,
        confidence: result.confidence,
      });
    }
  }

  if (unsupportedPredictions.length) {
    throw new Error(
      `The existing classifier produced unsupported intents: ${JSON.stringify(
        unsupportedPredictions.slice(0, 5),
      )}. Resolve the intent taxonomy mismatch before reporting metrics.`,
    );
  }

  if (predicted.length !== gold.length) {
    throw new Error(
      `Prediction count mismatch: expected ${gold.length}, got ${predicted.length}.`,
    );
  }

  const accuracy =
    gold.filter((label, index) => label === predicted[index]).length /
    gold.length;

  const perIntent = Object.fromEntries(
    allowedGoldIntents.map((intent) => [
      intent,
      calculateMetrics(gold, predicted, intent),
    ]),
  ) as Record<
    GoldIntent,
    ReturnType<typeof calculateMetrics>
  >;

  const macroF1 =
    allowedGoldIntents.reduce(
      (sum, intent) => sum + perIntent[intent].f1,
      0,
    ) / allowedGoldIntents.length;

  const confusionMatrix = Object.fromEntries(
    allowedGoldIntents.map((actual) => [
      actual,
      Object.fromEntries(
        allowedGoldIntents.map((prediction) => [prediction, 0]),
      ),
    ]),
  ) as Record<GoldIntent, Record<GoldIntent, number>>;

  for (let index = 0; index < gold.length; index += 1) {
    confusionMatrix[gold[index]][predicted[index]] += 1;
  }

  const results = {
    examplesEvaluated: gold.length,
    accuracy,
    macroF1,
    perIntent,
    confusionMatrix,
    errors,
    confidenceNote:
      "Classifier confidence is a heuristic score, not a probability.",
  };

  fs.mkdirSync(path.dirname(resultFile), { recursive: true });

  fs.writeFileSync(
    resultFile,
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );

  fs.writeFileSync(
    reportFile,
    `# Keyword baseline evaluation

Examples evaluated: ${gold.length}

Accuracy: ${accuracy}

Macro-F1: ${macroF1}

Classifier confidence is a heuristic score, not a probability.

Incorrect predictions: ${errors.length}
`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        examplesEvaluated: gold.length,
        accuracy,
        macroF1,
        errors: errors.length,
        resultFile,
        reportFile,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error("Keyword baseline evaluation failed:", error);
  process.exitCode = 1;
});
