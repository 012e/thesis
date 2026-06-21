import { Agent } from "@mastra/core/agent";
import { PROMPTS } from "../../prompts";
import { MODEL_CONFIG } from "../constants";

export const POST_DRAFTING_AGENT_CONFIG = {
  id: "post-drafting-agent",
  name: "Post Drafting Agent",
  description:
    "Drafts post content without publishing it. Infers whether the request calls for a professional LinkedIn-style discussion post or a technical Stack Overflow-style question, then returns the matching post kind and polished final text. Use after any required research and before post creation or form filling.",
  instructions: PROMPTS.postDraftingAgent,
} as const;

/**
 * Post-drafting agent — turns user intent and supplied facts into publishable
 * prose. It is intentionally tool-free and never creates or updates posts.
 */
export const postDraftingAgent = new Agent({
  ...POST_DRAFTING_AGENT_CONFIG,
  model: MODEL_CONFIG.POST_DRAFTING_AGENT.model,
});
