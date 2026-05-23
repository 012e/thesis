import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";

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
  id: "interactions-agent",
  name: "Interactions Agent",
  description:
    "Handles all engagement and interaction operations: commenting on posts (including nested replies), upvoting or downvoting posts, and removing reactions. Use this agent whenever the user wants to respond to, react to, or engage with content.",
  instructions: `You are the engagement specialist for a social media platform.

Your responsibilities:
- Post comments on any post on behalf of the current user
- Post nested replies by supplying the parent comment ID
- Upvote or downvote posts (an existing reaction of a different type is replaced automatically)
- Remove the current user's reaction from a post

Guidelines:
- When commenting, use the exact text the user provides — do not paraphrase
- Confirm the comment ID after successfully creating a comment
- When reacting, confirm whether the reaction was created or replaced a previous one
- Do not read or list posts; if the user needs to see a thread first, ask the orchestrator to use the post-discovery agent
- Do not create or modify posts; delegate that to the post-creation agent`,
  model: MODEL_CONFIG.INTERACTIONS_AGENT.model,
});
