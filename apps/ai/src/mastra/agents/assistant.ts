import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

/**
 * Assistant agent for social media interactions.
 *
 * Tools are provided per-request via the curried MCP client in the stream route,
 * allowing each request to use its own authentication context.
 *
 * Memory is backed by PostgreSQL so conversation context persists across
 * sessions. Pass `memory.resource` and `memory.thread` when calling
 * `stream()` or `generate()` to activate it.
 */
export const assistantAgent = new Agent({
  id: "assistant",
  name: "Assistant",
  instructions: PROMPTS.assistant,
  model: MODEL_CONFIG.ASSISTANT.model,
});
