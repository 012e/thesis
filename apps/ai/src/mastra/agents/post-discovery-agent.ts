import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

export const POST_DISCOVERY_AGENT_CONFIG = {
  id: "post-discovery-agent",
  name: "Post Discovery Agent",
  description:
    "Handles read operations on posts: browsing the recommended feed and reading full post threads with their comments. Use this agent directly for simple discovery tasks; use the planning agent first when the task is complex or needs multiple steps.",
  instructions: PROMPTS.postDiscoveryAgent,
} as const;

/**
 * Post-discovery agent — owns all read operations on posts.
 *
 * Capable of:
 * - Fetching the recommended feed (ranked by reactions)
 * - Reading a full post thread including all its comments
 *
 * Tools are injected per-request by the orchestrator via toolsets so that each
 * HTTP request carries its own authentication context.
 */
export const postDiscoveryAgent = new Agent({
  ...POST_DISCOVERY_AGENT_CONFIG,
  model: MODEL_CONFIG.POST_DISCOVERY_AGENT.model,
});
