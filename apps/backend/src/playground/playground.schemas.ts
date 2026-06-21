import { z } from "zod";

import type { PlaygroundLanguage } from "@repo/rest-contracts";

const PLAYGROUND_LANGUAGES = [
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
] as const satisfies readonly PlaygroundLanguage[];

export const executeCodeSchema = z.object({
  code: z.string().min(1).max(102400),
  language: z.enum(PLAYGROUND_LANGUAGES).default("javascript"),
  timeout: z.number().int().positive().max(60000).optional(),
});

export type ExecuteCodeInput = z.infer<typeof executeCodeSchema>;
