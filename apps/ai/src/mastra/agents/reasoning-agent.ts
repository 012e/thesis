import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

/**
 * Shared config for the reasoning agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions.
 */
export const REASONING_AGENT_CONFIG = {
  id: "reasoning-agent",
  name: "Reasoning Agent",
  description:
    "Handles complex reasoning, planning, clarification, frontend navigation guidance, trade-off analysis, debugging hypotheses, and deep synthesis when the task benefits from the strongest available model.",
  instructions: PROMPTS.reasoningAgent,
} as const;

/**
 * Reasoning agent - uses the strongest configured model for complex analysis.
 *
 * This agent is intentionally tool-free. Use it for hard thinking tasks such as
 * trade-off analysis, decomposition, debugging hypotheses, and synthesis that
 * should not directly mutate platform state.
 */
export const reasoningAgent = new Agent({
  ...REASONING_AGENT_CONFIG,
  model: MODEL_CONFIG.REASONING_AGENT.model,
});
