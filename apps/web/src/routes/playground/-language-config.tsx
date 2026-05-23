import type { FC } from "react";
import type { Language } from "./-types";

export function JavaScriptIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="#F7DF1E" rx="2" />
      <text
        x="4"
        y="26"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="16"
        fill="#000"
      >
        JS
      </text>
    </svg>
  );
}

export function TypeScriptIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="#3178C6" rx="2" />
      <text
        x="3"
        y="26"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="16"
        fill="#fff"
      >
        TS
      </text>
    </svg>
  );
}

export const LANGUAGE_CONFIG: Record<
  Language,
  { label: string; Icon: FC<{ size?: number }> }
> = {
  javascript: { label: "JavaScript", Icon: JavaScriptIcon },
  typescript: { label: "TypeScript", Icon: TypeScriptIcon },
};

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
