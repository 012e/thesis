import { atomWithStorage } from "jotai/utils";

export type ModelMode = "fast" | "thinking";

/**
 * Persisted atom for the selected AI interaction mode.
 *
 * - "fast"     → gpt-4o-mini orchestrator + gpt-4o-mini sub-agents
 * - "thinking" → o4-mini orchestrator (reasoning) + gpt-4o sub-agents
 *
 * Defaults to "fast". Persisted in localStorage so the choice survives
 * page refreshes.
 */
const modelMode = atomWithStorage<ModelMode>("model-mode", "fast");

export default modelMode;
