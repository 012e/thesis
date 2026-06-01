import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

/**
 * Shared config for the search agent. Exported so the orchestrator factory can
 * reuse the same id, name, description, and instructions without duplicating them.
 */
export const SEARCH_AGENT_CONFIG = {
  id: "search-agent",
  name: "Search Agent",
  description:
    "Handles web search operations using DuckDuckGo. Use this agent directly to look up current events, find information about people, places, or topics, or retrieve webpage content from the internet; use the planning agent first only when an explicit multi-step plan is needed.",
  instructions: PROMPTS.searchAgent,
} as const;

/**
 * Search agent — owns all web search operations.
 *
 * Capable of:
 * - Searching the web via DuckDuckGo
 * - Fetching and parsing webpage content
 *
 * Tools are injected per-request by the orchestrator via toolsets.
 * This static registration is kept for Mastra Studio compatibility only.
 */
export const searchAgent = new Agent({
  ...SEARCH_AGENT_CONFIG,
  model: MODEL_CONFIG.SEARCH_AGENT.model,
});
