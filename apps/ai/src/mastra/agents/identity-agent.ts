import { Agent } from "@mastra/core/agent";
import { MODEL_SUB_AGENT } from "../constants";

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
  id: "identity-agent",
  name: "Identity Agent",
  description:
    "Handles user identity and social-graph operations: who the current user is, profile lookups, following and unfollowing users, and listing followers or followings. Use this agent for any identity- or relationship-related task.",
  instructions: `You are the identity specialist for a social media platform.

Your responsibilities:
- Identify who the current user is using the whoami tool
- Look up any user's public profile (follower/following counts, post count, bio)
- Follow or unfollow users on behalf of the current user
- List who follows a given user, and who that user follows

Guidelines:
- Always use whoami before performing actions that need the current user's ID
- Be concise — return only the information requested
- When listing followers/following, present them as a clean list
- Do not attempt to create, read, update, or delete posts; delegate that elsewhere`,
  model: MODEL_SUB_AGENT,
});
