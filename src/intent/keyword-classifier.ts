export const intentNames = [
  "delivery_issue",
  "order_issue",
  "refund_return",
  "payment_billing",
  "account_prime",
  "digital_technical",
  "product_seller_issue",
  "other_unclear",
] as const;

export type IntentName = (typeof intentNames)[number];

export type IntentResult = {
  intent: IntentName;
  confidence: number;
  matchedTerms: string[];
};

type Rule = {
  intent: Exclude<IntentName, "other_unclear">;
  terms: string[];
};

const rules: Rule[] = [
  {
    intent: "refund_return",
    terms: ["refund", "return", "money back", "moneyback"],
  },
  {
    intent: "delivery_issue",
    terms: ["delivery", "delivered", "arrive", "arrived", "late", "delay", "package"],
  },
  {
    intent: "payment_billing",
    terms: ["payment", "charge", "charged", "invoice", "billing", "card"],
  },
  {
    intent: "digital_technical",
    terms: ["kindle", "fire tv", "prime video", "app", "download", "broken", "error", "not working"],
  },
  {
    intent: "product_seller_issue",
    terms: ["seller", "duplicate", "counterfeit", "fake", "product", "price", "mrp"],
  },
  {
    intent: "account_prime",
    terms: ["account", "password", "login", "log in", "sign in", "prime", "membership", "subscription"],
  },
  {
    intent: "order_issue",
    terms: ["cancel", "cancellation", "place order", "change my order", "wrong item"],
  },
];

function containsTerm(message: string, term: string): boolean {
  return message.includes(term);
}

export function classifyWithKeywords(message: string): IntentResult {
  const normalizedMessage = message.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  const scores = new Map<IntentName, string[]>();

  for (const rule of rules) {
    const matchedTerms = rule.terms.filter((term) => containsTerm(normalizedMessage, term));
    if (matchedTerms.length) scores.set(rule.intent, matchedTerms);
  }

  const ranked = [...scores.entries()].sort((left, right) => right[1].length - left[1].length);
  const best = ranked[0];
  if (!best) {
    return { intent: "other_unclear", confidence: 0.2, matchedTerms: [] };
  }

  const tied = ranked.filter(([, matchedTerms]) => matchedTerms.length === best[1].length);
  if (tied.length > 1) {
    return {
      intent: "other_unclear",
      confidence: 0.3,
      matchedTerms: tied.flatMap(([, matchedTerms]) => matchedTerms),
    };
  }

  return {
    intent: best[0],
    confidence: Math.min(0.9, 0.5 + best[1].length * 0.1),
    matchedTerms: best[1],
  };
}