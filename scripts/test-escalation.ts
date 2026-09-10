import { decideEscalation } from "../src/agent/escalation.js";

const cases = [
  { intentConfidence: 0.9, retrievedCaseCount: 5, evidenceScore: 0.7, sensitive: false },
  { intentConfidence: 0.4, retrievedCaseCount: 5, evidenceScore: 0.7, sensitive: false },
  { intentConfidence: 0.9, retrievedCaseCount: 0, evidenceScore: 0, sensitive: false },
  { intentConfidence: 0.9, retrievedCaseCount: 5, evidenceScore: 0.7, sensitive: true },
];

for (const input of cases) console.log(decideEscalation(input));