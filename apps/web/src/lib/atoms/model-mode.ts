import { atomWithStorage } from "jotai/utils";

export type ModelMode = "fast" | "thinking";

/**
 * Persisted atom for the selected AI interaction mode.
 *
 * - "fast"     → lower-latency orchestration for everyday requests
 * - "thinking" → higher-quality orchestration for complex requests
 *
 * Defaults to "fast". Persisted in localStorage so the choice survives
 * page refreshes.
 */
const modelMode = atomWithStorage<ModelMode>("model-mode", "fast");

export default modelMode;
