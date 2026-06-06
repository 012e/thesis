import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

export const IDENTITY_AGENT_CONFIG = {
  id: "identity-agent",
  name: "Identity Agent",
  description:
    "Handles user identity and social-graph operations: who the current user is, profile lookups, following and unfollowing users, and listing followers or followings. Use this agent directly for simple identity- or relationship-related tasks; use the planning agent first when the task is complex or needs multiple steps.",
  instructions: PROMPTS.identityAgent,
} as const;

/**
 * Identity agent — owns the social graph domain.
 *
 * Capable of:
 * - Identifying the current authenticated user (whoami)
 * - Looking up any user's public profile
 * - Following and unfollowing users
 * - Listing followers and followings
 *
 * Tools are injected per-request by the orchestrator via toolsets so that each
 * HTTP request carries its own authentication context.
 */
export const identityAgent = new Agent({
  ...IDENTITY_AGENT_CONFIG,
  model: MODEL_CONFIG.IDENTITY_AGENT.model,
});
