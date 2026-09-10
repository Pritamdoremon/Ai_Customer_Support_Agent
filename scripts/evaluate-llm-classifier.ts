import fs from "node:fs";
import path from "node:path";
import { classifyWithLlm } from "../src/intent/llm-classifier.js";

const inputFile = path.join(
  process.cwd(),
  "data",
  "golden",
  "keyword-evaluation-set.json",
);

const resultFile = path.join(
  process.cwd(),
  "experiments",
  "llm-classifier-results.json",
);

const reportFile = path.join(
  process.cwd(),
  "experiments",
  "llm-classifier-report.md",
);

type IntentName =
  | "delivery_issue"
  | "order_issue"
  | "refund_return"
  | "payment_billing"
  | "account_prime"
  | "digital_technical"
  | "product_seller_issue"
  | "other_unclear";

type Annotation = {
  id: string;
  customer_message: string;
  gold_intent: IntentName;
};

const allowedIntents: IntentName[] = [
  "delivery_issue",
  "order_issue",
  "refund_return",
  "payment_billing",
  "account_prime",
  "digital_technical",
  "product_seller_issue",
  "other_unclear",
];

function calculateMetrics(
  gold: IntentName[],
  predicted: IntentName[],
  intent: IntentName,
) {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (let i = 0; i < gold.length; i += 1) {
    if (gold[i] === intent && predicted[i] === intent) {
      truePositive += 1;
    }

    if (gold[i] !== intent && predicted[i] === intent) {
      falsePositive += 1;
    }

    if (gold[i] === intent && predicted[i] !== intent) {
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
  const document = JSON.parse(
    fs.readFileSync(inputFile, "utf8"),
  ) as {
    examples: Annotation[];
  };

  if (document.examples.length !== 200) {
    throw new Error(
      `Expected 200 examples, found ${document.examples.length}.`,
    );
  }

  const gold = document.examples.map((example) => example.gold_intent);
  const predicted: IntentName[] = [];
  const errors = [];

  console.log(`Starting AI evaluation for ${document.examples.length} examples...`);

  for (let i = 0; i < document.examples.length; i += 1) {
    const example = document.examples[i];

    console.log(
      `[${i + 1}/${document.examples.length}] ${example.id}`,
    );

    try {
      const result = await classifyWithLlm(example.customer_message);

      if (!allowedIntents.includes(result.intent as IntentName)) {
        throw new Error(
          `Unsupported intent returned: ${result.intent}`,
        );
      }

      const predictedIntent = result.intent as IntentName;
      predicted.push(predictedIntent);

      if (predictedIntent !== example.gold_intent) {
        errors.push({
          id: example.id,
          gold: example.gold_intent,
          predicted: predictedIntent,
          message: example.customer_message,
          confidence: result.confidence,
        });
      }
    } catch (error) {
      console.error(`Failed on example ${example.id}:`, error);
      throw error;
    }
  }

  const correct = gold.filter(
    (label, index) => label === predicted[index],
  ).length;

  const accuracy = correct / gold.length;

  const perIntent = Object.fromEntries(
    allowedIntents.map((intent) => [
      intent,
      calculateMetrics(gold, predicted, intent),
    ]),
  );

  const macroF1 =
    allowedIntents.reduce(
      (sum, intent) => sum + perIntent[intent].f1,
      0,
    ) / allowedIntents.length;

  const confusionMatrix = Object.fromEntries(
    allowedIntents.map((actual) => [
      actual,
      Object.fromEntries(
        allowedIntents.map((prediction) => [prediction, 0]),
      ),
    ]),
  ) as Record<IntentName, Record<IntentName, number>>;

  for (let i = 0; i < gold.length; i += 1) {
    confusionMatrix[gold[i]][predicted[i]] += 1;
  }

  const results = {
    examplesEvaluated: gold.length,
    accuracy,
    macroF1,
    perIntent,
    confusionMatrix,
    errors,
  };

  fs.mkdirSync(path.dirname(resultFile), {
    recursive: true,
  });

  fs.writeFileSync(
    resultFile,
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );

  fs.writeFileSync(
    reportFile,
    `# AI Classifier Evaluation

Examples evaluated: ${gold.length}

Accuracy: ${accuracy}

Macro-F1: ${macroF1}

Incorrect predictions: ${errors.length}
`,
    "utf8",
  );

  console.log("\nAI classifier evaluation completed.\n");

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
  console.error("AI classifier evaluation failed:", error);
  process.exitCode = 1;
});
