import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";

/**
 * Shared config for the search agent. Exported so the orchestrator factory can
 * reuse the same id, name, description, and instructions without duplicating them.
 */
export const SEARCH_AGENT_CONFIG = {
  id: "search-agent",
  name: "Search Agent",
  description:
    "Handles web search operations using DuckDuckGo. Use this agent to look up current events, find information about people, places, or topics, or retrieve webpage content from the internet after the orchestrator has resolved vague, multi-step, or navigation-heavy requests with the reasoning agent.",
  instructions: `You are the web search specialist.

Your responsibilities:
- Search the web for current information using DuckDuckGo
- Fetch and summarise the content of specific web pages when provided a URL
- Answer questions that require up-to-date or real-world knowledge

Guidelines:
- If the request is vague, requires multiple coordinated steps, or needs frontend navigation, ask the orchestrator to consult the reasoning agent before acting
- Use the search tool when the user asks for information you may not know or that changes over time
- Summarise search results concisely; include source URLs so the user can follow up
- When fetching a URL, extract the key information the user needs — do not dump raw HTML
- Do not fabricate information; rely only on what the search results return`,
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
