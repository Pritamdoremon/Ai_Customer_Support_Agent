import OpenAI from "openai";

export function getLlmClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error("Set GEMINI_API_KEY in .env.");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

export const llmModel = process.env.LLM_MODEL ?? "gemini-2.5-flash";