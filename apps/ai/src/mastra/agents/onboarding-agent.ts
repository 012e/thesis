import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

/**
 * Onboarding agent.
 *
 * Walks a freshly registered user through a short preference setup. The agent
 * has no backend/MCP tools of its own — it drives the flow entirely through
 * dedicated client-rendered UI tools (choose_experience, pick_content_types,
 * suggest_tags, suggest_bio) that the web client forwards per request via
 * `AssistantChatTransport`. Each tool renders a tailored interactive card and
 * returns the user's answer, which the agent uses to personalise later steps.
 *
 * The tool definitions live on the client; this agent only needs the behaviour
 * rules in `PROMPTS.onboarding` to call them in order.
 */
export const ONBOARDING_AGENT_CONFIG = {
  id: "onboarding",
  name: "Onboarding",
  instructions: PROMPTS.onboarding,
} as const;

export const onboardingAgent = new Agent({
  ...ONBOARDING_AGENT_CONFIG,
  model: MODEL_CONFIG.ONBOARDING_AGENT.model,
});
