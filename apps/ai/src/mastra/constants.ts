/**
 * Model name constants for all Mastra agents.
 *
 * Centralise model strings here so that switching models requires a single
 * edit rather than hunting for hardcoded strings across every agent file.
 *
 * Format: "provider/model-name" as required by Mastra's model router.
 */

/** Lightweight model used by domain-specialist sub-agents. */
export const MODEL_SUB_AGENT = "openai/gpt-4o-mini" as const;

/** Stronger model used by the orchestrator for multi-step reasoning. */
export const MODEL_ORCHESTRATOR = "openai/gpt-4o" as const;

/** Model used by the step-judge agent for structured evaluation. */
export const MODEL_JUDGE = "openai/gpt-4o" as const;
