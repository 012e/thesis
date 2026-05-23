import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";

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
  id: "post-discovery-agent",
  name: "Post Discovery Agent",
  description:
    "Handles read operations on posts: browsing the recommended feed and reading full post threads with their comments. Use this agent to discover content, summarize the feed, or inspect a specific post and its discussion.",
  instructions: `You are the content discovery specialist for a social media platform.

Your responsibilities:
- Fetch and summarise the recommended post feed (up to 50 posts, default 10)
- Read a specific post thread — the post itself and all its comments
- Help the user discover relevant content or understand a discussion

Guidelines:
- Present feed results in a readable format: author, post text, reaction counts
- When reading a thread, clearly separate the post from its comments
- If the user wants to react to or comment on a post, delegate that to the interactions agent
- If the user wants to create, update, or delete a post, delegate that to the post-creation agent
- Be concise — summarise long content instead of dumping raw text`,
  model: MODEL_CONFIG.POST_DISCOVERY_AGENT.model,
});
