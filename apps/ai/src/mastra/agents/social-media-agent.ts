import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

/**
 * Shared config for the social media agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions while injecting the
 * per-request MCP toolsets.
 */
export const SOCIAL_MEDIA_AGENT_CONFIG = {
  id: "social-media-agent",
  name: "Social Media Agent",
  description:
    "Handles all backend social media platform operations across five domains: identity & social graph (whoami, profile lookups, follow/unfollow, followers/following, user search, notifications); content discovery (recommended feed and full post thread reads); engagement (comments and nested replies, post/comment reactions, poll voting); post management (unanswered questions, accepting/clearing answers, bookmarks, post subscriptions); and tags (trending/suggested tags, posts filtered by a tag, preferred/blocked tag preferences). Use this agent directly for simple social tasks; use the planning agent first when the task is complex or needs multiple steps. Does NOT create, update, or delete posts.",
  instructions: PROMPTS.socialMediaAgent,
} as const;

/**
 * Social media agent — the consolidated backend specialist that owns identity,
 * discovery, engagement, post management, and tags.
 *
 * Tools are injected per-request by the orchestrator via the merged MCP toolsets
 * so that each HTTP request carries its own authentication context. This static
 * registration is tool-free and exists for Mastra Studio compatibility only.
 */
export const socialMediaAgent = new Agent({
  ...SOCIAL_MEDIA_AGENT_CONFIG,
  model: MODEL_CONFIG.SOCIAL_MEDIA_AGENT.model,
});
