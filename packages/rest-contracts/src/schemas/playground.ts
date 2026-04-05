import { z } from "zod";

export const ExecuteCodeBody = z.object({
  code: z.string().min(1).max(102400), // Max 100KB
  language: z.enum(["javascript", "typescript"]).default("javascript"),
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
