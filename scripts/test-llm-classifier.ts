import "dotenv/config";
import { classifyWithLlm } from "../src/intent/llm-classifier.js";
import { getLlmClient } from "../src/config/llm.js";

async function main(): Promise<void> {
  const result = await classifyWithLlm(
    getLlmClient(),
    "My package has not arrived and the delivery is late.",
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error("LLM classification failed:", error);
  process.exitCode = 1;
});