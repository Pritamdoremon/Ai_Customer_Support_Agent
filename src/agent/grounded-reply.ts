import OpenAI from "openai";
import type { RetrievedCase } from "../retrieval/full-text-retrieval.js";
import { llmModel } from "../config/llm.js";

export type GroundedReply = {
  reply: string;
  decision: "auto_handle" | "escalate";
  reason: string;
};

function parseReply(content: string): GroundedReply {
  const json = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const result = JSON.parse(json) as Record<string, unknown>;
  const decision = result.decision === "escalate" ? "escalate" : "auto_handle";
  if (
    typeof result.reply !== "string" ||
    !result.reply.trim() ||
    (decision !== "auto_handle" && decision !== "escalate") ||
    typeof result.reason !== "string" ||
    !result.reason.trim()
  ) {
    throw new Error(`The LLM returned an invalid grounded-reply result: ${JSON.stringify(result)}`);
  }
  return { reply: result.reply, decision, reason: result.reason } as GroundedReply;
}

export async function generateGroundedReply(
  client: OpenAI,
  customerMessage: string,
  retrievedCases: RetrievedCase[],
): Promise<GroundedReply> {
  const evidence = retrievedCases
    .map((supportCase, index) => [
      `Evidence ${index + 1}`,
      `Customer message: ${supportCase.customerMessage}`,
      `Historical reply: ${supportCase.historicalReply}`,
      `Retrieval score: ${supportCase.similarity}`,
    ].join("\n"))
    .join("\n\n");

  const response = await client.chat.completions.create({
    model: llmModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are an AmazonHelp support assistant. Use only the historical evidence supplied below. Do not invent policies, refunds, timelines, guarantees, discounts, account information, or actions. If evidence is missing, weak, or contradictory, set decision to escalate and explain why. Return JSON with exactly reply, decision, and reason.\n\n${evidence || "No historical evidence was retrieved."}`,
      },
      {
        role: "user",
        content: customerMessage,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("The LLM returned an empty grounded reply.");
  return parseReply(content);
}