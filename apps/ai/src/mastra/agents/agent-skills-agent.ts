import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

/**
 * Shared config for the agent-skills agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions while injecting the
 * per-request MCP toolset.
 */
export const AGENT_SKILLS_AGENT_CONFIG = {
  id: "agent-skills-agent",
  name: "Agent Skills Agent",
  description:
    "Manages the current user's private library of reusable agent skills (named instructions the assistant can apply). List all skills, search them by keyword ('text') or by meaning ('embedding'), and create, update, or delete them. Use this agent to find a relevant saved skill before acting on a request, and for any skill CRUD. Use the planning agent first when the task is complex or needs multiple steps.",
  instructions: PROMPTS.agentSkillsAgent,
} as const;

/**
 * Agent skills agent — owns the user's reusable skill library.
 *
 * Tools are injected per-request by the orchestrator via the MCP toolset so that
 * each HTTP request carries its own authentication context. This static
 * registration is tool-free and exists for Mastra Studio compatibility only.
 */
export const agentSkillsAgent = new Agent({
  ...AGENT_SKILLS_AGENT_CONFIG,
  model: MODEL_CONFIG.AGENT_SKILLS_AGENT.model,
});
