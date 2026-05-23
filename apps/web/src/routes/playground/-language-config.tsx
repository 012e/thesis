import { getCodeLanguageLabel } from "@/lib/code-language-meta";
import type { Language } from "./-types";

export const PLAYGROUND_LANGUAGES = [
  "javascript",
  "typescript",
] as const satisfies readonly Language[];

export const PLAYGROUND_LANGUAGE_LABELS = Object.fromEntries(
  PLAYGROUND_LANGUAGES.map((language) => [
    language,
    getCodeLanguageLabel(language),
  ]),
) as Record<Language, string>;

export const DEFAULT_CODE: Record<Language, string> = {
  javascript: `// JavaScript Playground
// Write your code here and click Run

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
console.log("Current time:", new Date().toISOString());
`,
  typescript: `// TypeScript Playground
// Write your code here and click Run

interface Greeting {
  message: string;
  timestamp: string;
}

function greet(name: string): Greeting {
  return {
    message: \`Hello, \${name}!\`,
    timestamp: new Date().toISOString(),
  };
}

const result = greet("World");
console.log(result.message);
console.log("Timestamp:", result.timestamp);
`,
};
