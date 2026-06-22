import { openai as openaiHelper } from "@ai-sdk/openai";
function openai(string: Parameters<typeof openaiHelper>[0]) {
  return "openai/" + string;
}
function reasoning(
  string: "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | undefined,
) {
  return string;
}

/**
 * Dedicated model configuration for every Mastra agent.
 *
 * Format: "provider/model-name" as required by Mastra's model router.
 */
export const MODEL_CONFIG = {
  ORCHESTRATOR: {
    FAST_MODEL: {
      model: openai("gpt-5.4-mini"),
      reasoningEffort: reasoning("none"),
    },
    THINKING_MODEL: {
      model: openai("gpt-5.5"),
      reasoningEffort: reasoning("medium"),
    },
  },
  PLANNING_AGENT: {
    model: openai("gpt-5.5"),
    reasoningEffort: reasoning("xhigh"),
  },
  ASSISTANT: {
    model: openai("gpt-5.4-mini"),
    reasoningEffort: reasoning("none"),
  },
  SOCIAL_MEDIA_AGENT: {
    model: openai("gpt-5.4-mini"),
    reasoningEffort: reasoning("none"),
  },
  AGENT_SKILLS_AGENT: {
    model: openai("gpt-5.4-mini"),
    reasoningEffort: reasoning("none"),
  },
  POST_CREATION_AGENT: {
    model: openai("gpt-5.4-mini"),
    reasoningEffort: reasoning("none"),
  },
  POST_DRAFTING_AGENT: {
    model: openai("gpt-5.4-mini"),
    reasoningEffort: reasoning("none"),
  },
  SEARCH_AGENT: {
    model: openai("gpt-5.4-mini"),
    reasoningEffort: reasoning("minimal"),
  },
  NAVIGATION_AGENT: {
    model: openai("gpt-5.4-mini"),
    reasoningEffort: reasoning("minimal"),
  },
  STEP_JUDGE_AGENT: {
    model: openai("gpt-5.5"),
    reasoningEffort: reasoning("low"),
  },
} as const;

export function getOrchestratorModelConfig(mode: ModelMode) {
  return mode === "thinking"
    ? MODEL_CONFIG.ORCHESTRATOR.THINKING_MODEL
    : MODEL_CONFIG.ORCHESTRATOR.FAST_MODEL;
}

/** Union type for the two available interaction modes. */
export type ModelMode = "fast" | "thinking";
