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

// ── Mode-specific model constants ──────────────────────────────────────────

/**
 * Fast mode: cheap and quick models for both orchestrator and sub-agents.
 * Suitable for simple queries where latency matters more than depth.
 */
export const MODEL_FAST_ORCHESTRATOR = "openai/gpt-4o-mini" as const;
export const MODEL_FAST_SUB_AGENT = "openai/gpt-4o-mini" as const;

/**
 * Thinking mode: reasoning-capable orchestrator with stronger sub-agents.
 * o4-mini provides chain-of-thought reasoning at the orchestration layer;
 * gpt-4o handles domain tasks with higher quality than the mini variant.
 */
export const MODEL_THINKING_ORCHESTRATOR = "openai/o4-mini" as const;
export const MODEL_THINKING_SUB_AGENT = "openai/gpt-4o" as const;

/** Union type for the two available interaction modes. */
export type ModelMode = "fast" | "thinking";
