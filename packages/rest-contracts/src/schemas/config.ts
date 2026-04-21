import { z } from "zod";

export const AppConfigSchema = z.object({
  feed: z.object({
    defaultPageSize: z.number().int().positive().default(20),
  }),
  ai: z.object({
    model: z.enum(["gpt-4o", "gpt-4o-mini"]).default("gpt-4o"),
  }),
  uploads: z.object({
    maxFileSizeBytes: z.number().int().positive().default(10_000_000),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export type AppConfigNamespace = keyof AppConfig;
