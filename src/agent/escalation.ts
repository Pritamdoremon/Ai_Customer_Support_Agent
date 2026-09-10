export type EscalationDecision = {
  decision: "auto_handle" | "escalate";
  reason: string;
};

export function decideEscalation(input: {
  intentConfidence: number;
  retrievedCaseCount: number;
  evidenceScore: number;
  sensitive: boolean;
  groundedDecision?: "auto_handle" | "escalate";
  reply?: string;
}): EscalationDecision {
  if (input.groundedDecision === "escalate") {
    return { decision: "escalate", reason: "The grounded response recommends manual support based on the available evidence." };
  }
  if (input.reply && /phone|call|chat with us|specialist|support team|escalat/i.test(input.reply)) {
    return { decision: "escalate", reason: "The drafted reply directs the customer to manual support." };
  }
  if (input.sensitive) {
    return { decision: "escalate", reason: "The issue may require sensitive account or payment handling." };
  }
  if (input.intentConfidence < 0.6) {
    return { decision: "escalate", reason: "The customer intent is not sufficiently clear." };
  }
  if (input.retrievedCaseCount === 0 || input.evidenceScore < 0.3) {
    return { decision: "escalate", reason: "There is not enough similar historical evidence." };
  }
  return { decision: "auto_handle", reason: "The intent is clear and similar historical evidence is available." };
}