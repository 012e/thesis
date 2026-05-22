import { z } from "zod";

export const Thread = z.object({
  id: z.string().uuid(),
  externalId: z.string().optional().nullable(),
  title: z.string().nullable(),
  isArchived: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateThreadBody = z.object({
  localId: z.string().optional(),
});

export const UpdateThreadTitleBody = z.object({
  title: z.string(),
});

export const GenerateThreadTitleBody = z.object({
  messages: z.array(z.unknown()),
});

export const ThreadTokenUsage = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  messageCount: z.number().int().nonnegative(),
});

export type ThreadType = z.infer<typeof Thread>;
export type CreateThreadBodyType = z.infer<typeof CreateThreadBody>;
export type UpdateThreadTitleBodyType = z.infer<typeof UpdateThreadTitleBody>;
export type GenerateThreadTitleBodyType = z.infer<
  typeof GenerateThreadTitleBody
>;
export type ThreadTokenUsageType = z.infer<typeof ThreadTokenUsage>;
