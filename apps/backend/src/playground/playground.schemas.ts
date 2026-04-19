import { z } from "zod";

export const executeCodeSchema = z.object({
  code: z.string().min(1).max(102400),
  language: z.enum(["javascript", "typescript"]).default("javascript"),
  timeout: z.number().int().positive().max(60000).optional(),
});

export type ExecuteCodeInput = z.infer<typeof executeCodeSchema>;
