import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";
import { navigationAgent } from "./navigation-agent";
import { agentSkillsAgent } from "./agent-skills-agent";

/**
 * Shared config for the planning agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions.
 */
export const PLANNING_AGENT_CONFIG = {
  id: "planning-agent",
  name: "Planning Agent",
  description:
    "Creates and revises execution plans for complex work only. Use before acting when a task has 3+ steps, spans multiple agents/tools, mixes UI navigation with backend actions, needs context gathering before action, has ordering constraints, needs user approval for side effects, or requires researching/drafting content before posting. Consults the user's saved agent-skill library (via the agent-skills tool) to reuse relevant saved instructions while planning. For UI-adjacent work, it must consult navigation-agent and return navigation instructions for the orchestrator and downstream specialist agents.",
  instructions: PROMPTS.planningAgent,
} as const;

/**
 * Planning agent - uses the strongest configured model for careful plans.
 *
 * It turns goals into plans, revises plans, and identifies missing information
 * needed to plan safely. Its only tools are sub-agents used as planning aids:
 * navigation-agent for UI/route decisions and agent-skills-agent for looking up
 * the user's reusable saved skills so plans can apply them.
 */
export const planningAgent = new Agent({
  ...PLANNING_AGENT_CONFIG,
  model: MODEL_CONFIG.PLANNING_AGENT.model,
  agents: {
    navigationAgent,
    agentSkillsAgent,
  },
});
