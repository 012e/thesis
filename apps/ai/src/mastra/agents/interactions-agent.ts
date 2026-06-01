import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

export const INTERACTIONS_AGENT_CONFIG = {
  id: "interactions-agent",
  name: "Interactions Agent",
  description:
    "Handles all engagement and interaction operations: commenting on posts (including nested replies), upvoting or downvoting posts, and removing reactions. Use this agent directly whenever the user wants to respond to, react to, or engage with content; use the planning agent first only when an explicit multi-step plan is needed.",
  instructions: PROMPTS.interactionsAgent,
} as const;

/**
 * Interactions agent — owns all engagement operations.
 *
 * Capable of:
 * - Commenting on posts (including nested/threaded replies)
 * - Upvoting or downvoting posts
 * - Removing the current user's reaction from a post
 *
 * Tools are injected per-request by the orchestrator via toolsets so that each
 * HTTP request carries its own authentication context.
 */
export const interactionsAgent = new Agent({
  ...INTERACTIONS_AGENT_CONFIG,
  model: MODEL_CONFIG.INTERACTIONS_AGENT.model,
});
