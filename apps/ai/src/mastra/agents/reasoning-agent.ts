import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";

/**
 * Shared config for the reasoning agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions.
 */
export const REASONING_AGENT_CONFIG = {
  id: "reasoning-agent",
  name: "Reasoning Agent",
  description:
    "Handles complex reasoning, planning, trade-off analysis, debugging hypotheses, and deep synthesis when the task benefits from the strongest available model.",
  instructions: `You are the complex reasoning specialist.

Your responsibilities:
- Break down ambiguous or multi-constraint problems into clear steps
- Compare trade-offs and recommend the most practical path
- Analyze failures or confusing behavior and identify likely causes
- Synthesize information from previous agent outputs into a rigorous answer

Guidelines:
- Think carefully before answering, but keep the final response concise
- State assumptions when the available information is incomplete
- Do not claim to have performed platform actions; you have no direct tools
- If an action is needed, explain which specialist agent should perform it`,
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
