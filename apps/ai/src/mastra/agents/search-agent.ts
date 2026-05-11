import { Agent } from "@mastra/core/agent";
import { MODEL_SUB_AGENT } from "../constants";

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
  id: "search-agent",
  name: "Search Agent",
  description:
    "Handles web search operations using DuckDuckGo. Use this agent to look up current events, find information about people, places, or topics, or retrieve webpage content from the internet.",
  instructions: `You are the web search specialist.

Your responsibilities:
- Search the web for current information using DuckDuckGo
- Fetch and summarise the content of specific web pages when provided a URL
- Answer questions that require up-to-date or real-world knowledge

Guidelines:
- Use the search tool when the user asks for information you may not know or that changes over time
- Summarise search results concisely; include source URLs so the user can follow up
- When fetching a URL, extract the key information the user needs — do not dump raw HTML
- Do not fabricate information; rely only on what the search results return`,
  model: MODEL_SUB_AGENT,
});
