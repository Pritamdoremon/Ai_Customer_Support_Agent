import { classifyWithKeywords } from "../src/intent/keyword-classifier.js";

const examples = [
  "My package has not arrived yet",
  "I need a refund for this order",
  "My card was charged twice",
  "Prime Video shows a playback error",
  "I cannot log in to my account",
  "The product looks counterfeit",
  "Please cancel my order",
  "Thanks for the help",
];

for (const message of examples) {
  console.log(JSON.stringify({ message, result: classifyWithKeywords(message) }, null, 2));
}