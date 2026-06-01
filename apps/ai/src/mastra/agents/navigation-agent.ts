import { Agent } from "@mastra/core/agent";
import { PROMPTS } from "../../prompts";
import { MODEL_CONFIG } from "../constants";

/**
 * Shared config for the navigation agent. Exported so the orchestrator factory
 * can reuse the same id, name, description, and instructions.
 */
export const NAVIGATION_AGENT_CONFIG = {
  id: "navigation-agent",
  name: "Navigation Agent",
  description:
    "Finds the right application page and frontend assistant tools for a requested UI action. Use before page-specific client tools such as post editing forms, plan creation, playground editing, or any task that may require navigating to /chat, /playground, or another app page.",
  instructions: PROMPTS.navigationAgent,
} as const;

/**
 * Navigation agent — decides where the assistant should navigate and which
 * client-side tools should be available there.
 *
 * Tools are browser/client tools forwarded by assistant-ui per request. This
 * static registration is kept for Mastra Studio compatibility only.
 */
export const navigationAgent = new Agent({
  ...NAVIGATION_AGENT_CONFIG,
  model: MODEL_CONFIG.NAVIGATION_AGENT.model,
});
