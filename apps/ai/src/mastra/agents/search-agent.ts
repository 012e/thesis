import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";
import { webResearchTools } from "../tools/research";

/**
 * Shared config for the search agent. Exported so the orchestrator factory can
 * reuse the same id, name, description, and instructions without duplicating them.
 */
export const SEARCH_AGENT_CONFIG = {
  id: "search-agent",
  name: "Search Agent",
  description:
    "Handles web search operations using OpenAI web search. Use this agent directly for simple web lookups; use the planning agent first when the task is complex or needs multiple steps. For exhaustive, multi-source investigation, prefer the deep-search agent.",
  instructions: PROMPTS.searchAgent,
  tools: webResearchTools,
} as const;

/**
 * Search agent — owns all web search operations.
 *
 * Capable of:
 * - Searching the web via OpenAI web search
 * - Summarising current web information from search results
 */
export const searchAgent = new Agent({
  ...SEARCH_AGENT_CONFIG,
  model: MODEL_CONFIG.SEARCH_AGENT.model,
});
