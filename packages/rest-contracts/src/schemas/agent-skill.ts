import { z } from "zod";

/** A single agent skill owned by a user. */
export const AgentSkill = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  content: z.string(),
  /** True for skills that were preinstalled by default for the user. */
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AgentSkillsList = z.object({
  items: z.array(AgentSkill),
});

/** How to match skills when searching: lexical text match or semantic embedding. */
export const AgentSkillSearchMode = z.enum(["text", "embedding"]);

export const AgentSkillSearchResult = AgentSkill.extend({
  /** Relevance score for the query (higher is more relevant). */
  score: z.number(),
});

export const AgentSkillSearchPage = z.object({
  mode: AgentSkillSearchMode,
  items: z.array(AgentSkillSearchResult),
});

export const CreateAgentSkillBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).default(""),
  content: z.string().trim().min(1, "Content is required").max(20_000),
});

export const UpdateAgentSkillBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500),
    content: z.string().trim().min(1).max(20_000),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type AgentSkillType = z.infer<typeof AgentSkill>;
export type AgentSkillsListType = z.infer<typeof AgentSkillsList>;
export type AgentSkillSearchModeType = z.infer<typeof AgentSkillSearchMode>;
export type AgentSkillSearchResultType = z.infer<typeof AgentSkillSearchResult>;
export type AgentSkillSearchPageType = z.infer<typeof AgentSkillSearchPage>;
export type CreateAgentSkillBodyType = z.infer<typeof CreateAgentSkillBody>;
export type UpdateAgentSkillBodyType = z.infer<typeof UpdateAgentSkillBody>;
