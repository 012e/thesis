import { z } from "zod";

export const PLAYGROUND_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "c",
  "c++",
  "java",
  "go",
  "rust",
  "ruby",
  "php",
  "kotlin",
  "swift",
  "lua",
] as const;

export const PlaygroundLanguage = z.enum(PLAYGROUND_LANGUAGES);
export type PlaygroundLanguage = z.infer<typeof PlaygroundLanguage>;

export const PLAYGROUND_LANGUAGE_VERSIONS = {
  javascript: "20.11.1",
  typescript: "5.0.3",
  python: "3.12",
  c: "10.2",
  "c++": "10.2",
  java: "15.0.2",
  go: "1.16.2",
  rust: "1.68.2",
  ruby: "3.0.1",
  php: "8.2.3",
  kotlin: "1.8.20",
  swift: "5.3.3",
  lua: "5.4.4",
} as const satisfies Record<PlaygroundLanguage, string>;

export const ExecuteCodeBody = z.object({
  code: z.string().min(1).max(102400), // Max 100KB
  language: PlaygroundLanguage.default("javascript"),
  timeout: z.number().int().positive().max(60000).optional(), // Max 60 seconds
});

export type ExecuteCodeBody = z.infer<typeof ExecuteCodeBody>;

export const ExecutionResult = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  executionTime: z.number().int(), // Execution time in milliseconds
});

export type ExecutionResult = z.infer<typeof ExecutionResult>;
