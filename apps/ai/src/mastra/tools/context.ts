import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { AIContextPayload } from "@repo/shared-dto";

export function createGetContextTool(context: AIContextPayload | undefined) {
  return createTool({
    id: "get_current_context",
    description:
      "Returns the current UI context: what page or content the user is currently viewing. Call this when the user refers to something on screen, such as the current post or current page.",
    inputSchema: z.object({}),
    execute: async () =>
      context ?? ({ type: "none" } satisfies AIContextPayload),
  });
}
