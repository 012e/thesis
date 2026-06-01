import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function extractHtmlText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractMetaContent(html: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const metaPattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  return decodeHtmlEntities(metaPattern.exec(html)?.[1]?.trim() ?? "");
}

const fetchUrlTool = createTool({
  id: "fetch_url",
  description:
    "Fetches a public web page by URL and returns normalized page text, title, and description for source-grounded synthesis after web search.",
  inputSchema: z.object({
    url: z.url().describe("The public http(s) URL to fetch from search results"),
  }),
  execute: async ({ url: inputUrl }) => {
    const url = new URL(inputUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Only http and https URLs can be fetched");
    }

    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; thesis-search-agent/1.0; +https://example.local)",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const rawText = await response.text();
    const isHtml = contentType.includes("text/html") || /<html[\s>]/i.test(rawText);
    const title = isHtml
      ? decodeHtmlEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(rawText)?.[1]?.trim() ?? "")
      : "";
    const description = isHtml ? extractMetaContent(rawText, "description") : "";
    const text = isHtml ? extractHtmlText(rawText) : rawText.replace(/\s+/g, " ").trim();

    return {
      url: url.toString(),
      title,
      description,
      contentType,
      text: text.slice(0, 12_000),
      truncated: text.length > 12_000,
    };
  },
});

const searchTools = {
  webSearch: openai.tools.webSearch(),
  fetch_url: fetchUrlTool,
};

/**
 * Shared config for the search agent. Exported so the orchestrator factory can
 * reuse the same id, name, description, and instructions without duplicating them.
 */
export const SEARCH_AGENT_CONFIG = {
  id: "search-agent",
  name: "Search Agent",
  description:
    "Handles web search operations using OpenAI web search. Use this agent directly for simple web lookups; use the planning agent first when the task is complex or needs multiple steps.",
  instructions: PROMPTS.searchAgent,
  tools: searchTools,
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
