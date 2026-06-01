import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";
import { navigationAgent } from "./navigation-agent";

/**
 * Shared config for the planning agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions.
 */
export const PLANNING_AGENT_CONFIG = {
  id: "planning-agent",
  name: "Planning Agent",
  description:
    "Creates and revises execution plans for complex work only. Use before acting when a task has 3+ steps, spans multiple agents/tools, mixes UI navigation with backend actions, needs context gathering before action, has ordering constraints, needs user approval for side effects, or requires researching/drafting content before posting.",
  instructions: PROMPTS.planningAgent,
} as const;

/**
 * Planning agent - uses the strongest configured model for careful plans.
 *
 * This agent is intentionally tool-free. It should only turn goals into plans,
 * revise plans, or identify missing information needed to plan safely.
 */
export const planningAgent = new Agent({
  ...PLANNING_AGENT_CONFIG,
  model: MODEL_CONFIG.PLANNING_AGENT.model,
  agents: {
    navigationAgent,
  },
});
