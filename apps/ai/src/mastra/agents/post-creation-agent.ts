import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

export const POST_CREATION_AGENT_CONFIG = {
  id: "post-creation-agent",
  name: "Post Creation Agent",
  description:
    "Handles write operations on posts: creating new posts, updating the text of existing posts, and deleting posts. Use this agent directly whenever the user wants to publish, edit, or remove content; use the planning agent first only when an explicit multi-step plan is needed. Does NOT handle comments or reactions.",
  instructions: PROMPTS.postCreationAgent,
} as const;

/**
 * Post-creation agent — owns all write operations on posts.
 *
 * Capable of:
 * - Creating new text posts authored by the current user
 * - Updating the text of an existing post (author-only)
 * - Deleting an existing post (author-only)
 *
 * Tools are injected per-request by the orchestrator via toolsets so that each
 * HTTP request carries its own authentication context.
 */
export const postCreationAgent = new Agent({
  ...POST_CREATION_AGENT_CONFIG,
  model: MODEL_CONFIG.POST_CREATION_AGENT.model,
});
