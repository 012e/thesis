import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";
import { webResearchTools } from "../tools/research";

/**
 * Shared config for the deep-search agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions while injecting the
 * per-request platform MCP toolsets (internal posts + tags) as extra sources.
 *
 * Web research tools (OpenAI web search + page fetcher) are baked in here so the
 * statically registered agent is still useful in Mastra Studio. The orchestrator
 * merges the auth-scoped internal sources on top at request time.
 */
export const DEEP_SEARCH_AGENT_CONFIG = {
  id: "deep-search-agent",
  name: "Deep Search Agent",
  description:
    "Performs exhaustive, multi-source research before drafting or answering. Runs several web searches, fetches and cross-checks primary sources, and also mines the platform's own posts and tags as internal sources. Use this agent (instead of the simpler search-agent) when a task needs deep investigation, a literature/source review, fact-gathering for a post, comparing claims across sources, or a synthesized brief with citations. Use the planning agent first when the overall task has multiple non-research steps.",
  instructions: PROMPTS.deepSearchAgent,
  tools: webResearchTools,
} as const;

/**
 * Deep-search agent — owns in-depth, multi-source research.
 *
 * Capable of:
 * - Running multiple web searches and fetching primary sources to cross-check
 * - Searching the platform's own posts and tags as internal information sources
 *   (injected per-request by the orchestrator with the caller's auth context)
 * - Synthesising a source-grounded brief with citations for downstream agents
 *
 * The internal-source MCP tools require per-request auth, so this static
 * registration carries only the web research tools and exists for Mastra Studio
 * compatibility. The live orchestrator constructs it with internal sources merged in.
 */
export const deepSearchAgent = new Agent({
  ...DEEP_SEARCH_AGENT_CONFIG,
  model: MODEL_CONFIG.DEEP_SEARCH_AGENT.model,
});
