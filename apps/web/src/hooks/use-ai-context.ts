import { useAtom } from "jotai";
import { globalAIContextAtom, type AIContext } from "@/lib/atoms/ai-context";

/**
 * Read and write the global AI context from inside a React component.
 *
 * For use outside React, use setGlobalAIContext / getGlobalAIContext
 * from @/lib/atoms/ai-context instead.
 */
export function useAIContext(): [AIContext, (ctx: AIContext) => void] {
  return useAtom(globalAIContextAtom);
}
