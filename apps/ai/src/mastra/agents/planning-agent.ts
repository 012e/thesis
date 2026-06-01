import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

/**
 * Shared config for the planning agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions.
 */
export const PLANNING_AGENT_CONFIG = {
  id: "planning-agent",
  name: "Planning Agent",
  description:
    "Creates and revises explicit execution plans only. Use when the user asks for a plan, a task has multiple dependent steps, or side effects require user-approved planning.",
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
});
