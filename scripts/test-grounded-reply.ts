import "dotenv/config";
import { generateGroundedReply } from "../src/agent/grounded-reply.js";
import { getLlmClient } from "../src/config/llm.js";

async function main(): Promise<void> {
  const result = await generateGroundedReply(
    getLlmClient(),
    "My package has not arrived and the delivery is late.",
    [],
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error("Grounded reply test failed:", error);
  process.exitCode = 1;
});