import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { llmModel } from "../config/llm.js";

export type LlmIntentResult = {
  intent: string;
  confidence: number;
  reason: string;
};

type Taxonomy = {
  brand: string;
  intents: Array<{
    name: string;
    description: string;
    inclusion_criteria: string[];
    exclusion_criteria: string[];
  }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const taxonomyFile = path.join(
  process.cwd(),
  "data",
  "processed",
  "intent-taxonomy.json",
);

function loadTaxonomy(): Taxonomy {
  if (!fs.existsSync(taxonomyFile)) {
    throw new Error(`Taxonomy file not found: ${taxonomyFile}`);
  }

  return JSON.parse(
    fs.readFileSync(taxonomyFile, "utf8"),
  ) as Taxonomy;
}

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY is missing or still uses the placeholder value in .env.",
    );
  }

  return apiKey;
}

function parseResult(
  content: string,
  allowedIntents: Set<string>,
): LlmIntentResult {
  const cleanedContent = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  let result: Partial<LlmIntentResult>;

  try {
    result = JSON.parse(cleanedContent) as Partial<LlmIntentResult>;
  } catch {
    throw new Error(
      `Gemini returned invalid JSON: ${cleanedContent}`,
    );
  }

  if (
    typeof result.intent !== "string" ||
    !allowedIntents.has(result.intent) ||
    typeof result.confidence !== "number" ||
    result.confidence < 0 ||
    result.confidence > 1 ||
    typeof result.reason !== "string"
  ) {
    throw new Error("Gemini returned an invalid intent result.");
  }

  return {
    intent: result.intent,
    confidence: result.confidence,
    reason: result.reason,
  };
}

function buildPrompt(taxonomy: Taxonomy): string {
  const intentGuidance = taxonomy.intents
    .map((intent) =>
      [
        `Intent: ${intent.name}`,
        `Description: ${intent.description}`,
        `Include: ${intent.inclusion_criteria.join("; ")}`,
        `Exclude: ${intent.exclusion_criteria.join("; ")}`,
      ].join("\n"),
    )
    .join("\n\n");

  return `
Classify one ${taxonomy.brand} customer support message.

Use ONLY one of these intents:

${intentGuidance}

Return ONLY valid JSON in exactly this format:

{
  "intent": "one_allowed_intent",
  "confidence": 0.0,
  "reason": "short explanation"
}

Rules:
- The intent must exactly match one of the allowed intent names.
- Confidence must be a number between 0 and 1.
- Reason must briefly explain why the intent was selected.
- Do not add markdown.
- Do not add extra fields.
- Confidence is a model score, not a calibrated probability.
`.trim();
}

export async function classifyWithLlm(
  customerMessage: string,
): Promise<LlmIntentResult> {
  if (!customerMessage.trim()) {
    throw new Error("Customer message cannot be empty.");
  }

  const apiKey = getGeminiApiKey();
  const taxonomy = loadTaxonomy();

  const allowedIntents = new Set(
    taxonomy.intents.map((intent) => intent.name),
  );

  const prompt = `${buildPrompt(taxonomy)}

Customer message:
${customerMessage}`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(llmModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });

    const body = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      const message =
        body.error?.message ||
        `Gemini API request failed with status ${response.status}.`;

      throw new Error(message);
    }

    const content =
      body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

    if (!content) {
      throw new Error("Gemini returned an empty response.");
    }

    return parseResult(content, allowedIntents);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Gemini classification failed: ${error.message}`);
    }

    throw new Error("Gemini classification failed.");
  }
}
