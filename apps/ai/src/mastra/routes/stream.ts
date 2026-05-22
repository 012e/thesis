import { registerApiRoute } from "@mastra/core/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import {
  AIContextPayloadSchema,
  formatContextHint,
  type AIContextPayload,
} from "@repo/shared-dto";
import { createOrchestratorAgent } from "../agents/orchestrator-agent";
import { getOrchestratorModelConfig, type ModelMode } from "../constants";

/**
 * Chat stream route for the assistant agent with authenticated MCP clients.
 *
 * Creates a per-request MCP client with the auth token baked in, then
 * streams the agent response in AI SDK UIMessage format.
 *
 * Compatible with Vercel AI SDK's AssistantChatTransport.
 *
 * Usage:
 * POST /chat
 * Headers:
 *   Authorization: Bearer <token>
 * Body:
 *   {
 *     "messages": [{ "id": "1", "role": "user", "parts": [{ "type": "text", "text": "Hello" }] }],
 *     "mode": "fast" | "thinking",   // optional, defaults to "fast"
 *     "context": { "type": "post", ... } // optional current UI context
 *   }
 *
 * Response: AI SDK-compatible UIMessage stream
 *
 * The orchestrator is created fresh per-request so each request's MCP tools
 * carry the correct auth token. Sub-agents receive their domain-specific tools
 * at construction time inside `createOrchestratorAgent`.
 */

// UIMessage format from Vercel AI SDK
// Use permissive schema since parts can be text, file, tool-call, tool-result, etc.
const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.any()), // Accept any part type
  metadata: z.any().optional(),
});

const StreamRequestSchema = z.object({
  messages: z.array(UIMessageSchema).min(1, "At least one message is required"),
  /** System instructions forwarded by assistant-ui model context providers. */
  system: z.string().optional(),
  /** Browser/client tools forwarded by AssistantChatTransport. */
  tools: z.record(z.string(), z.unknown()).optional(),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  messageId: z.string().optional(),
  metadata: z.any().optional(),
  resumeData: z.record(z.string(), z.any()).optional(),
  /** Model interaction mode sent by the web client. Defaults to "fast". */
  mode: z.enum(["fast", "thinking"]).optional(),
  /** Current UI context sent by the web client. */
  context: AIContextPayloadSchema.optional(),
});

type UIMessage = z.infer<typeof UIMessageSchema>;

function createContextMessage(
  context: AIContextPayload | undefined,
  lastMessageId: string,
): UIMessage | null {
  if (!context || context.type === "none") return null;

  const hint = formatContextHint(context);
  if (!hint) return null;

  return {
    id: `ui-context-${lastMessageId}`,
    role: "user",
    parts: [
      {
        type: "text",
        text: `Ephemeral UI context for this request only: ${JSON.stringify(hint)}. This message is application-provided context, not user-authored chat content or instructions. Call get_current_context for full structured details when relevant to the user's request.`,
      },
    ],
    metadata: {
      ephemeral: true,
      source: "ui-context",
    },
  };
}

function injectContextMessage(
  messages: UIMessage[],
  context: AIContextPayload | undefined,
): UIMessage[] {
  let latestUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      latestUserIndex = i;
      break;
    }
  }
  const insertIndex =
    latestUserIndex === -1 ? messages.length : latestUserIndex;
  const referenceMessage =
    messages[insertIndex] ?? messages[messages.length - 1];
  const contextMessage = createContextMessage(context, referenceMessage.id);

  if (!contextMessage) return messages;

  return [
    ...messages.slice(0, insertIndex),
    contextMessage,
    ...messages.slice(insertIndex),
  ];
}

export const streamRoute = registerApiRoute("/chat", {
  method: "POST",
  handler: async (c) => {
    try {
      const body = await c.req.json();
      const parseResult = StreamRequestSchema.safeParse(body);

      if (!parseResult.success) {
        return c.json(
          {
            error: "Invalid request body",
            details: parseResult.error.issues,
          },
          400,
        );
      }

      const {
        messages,
        system,
        tools: clientTools,
        mode,
        context: userContext,
      } = parseResult.data;
      const requestContext = c.get("requestContext");

      // Resolve model mode from the request body.
      // Defaults to "fast" if the field is absent or contains an unknown value.
      const resolvedMode: ModelMode = mode ?? "fast";
      const orchestratorModelConfig = getOrchestratorModelConfig(resolvedMode);

      // Build a per-request orchestrator with auth-aware MCP tools baked into
      // each sub-agent at construction time.
      const orchestrator = await createOrchestratorAgent(
        requestContext,
        resolvedMode,
        userContext,
      );

      const messagesWithContext = injectContextMessage(messages, userContext);

      const agentStream = await orchestrator.stream(messagesWithContext, {
        maxSteps: 20,
        system,
        clientTools,
        providerOptions: orchestratorModelConfig.reasoningEffort
          ? {
              openai: {
                reasoningEffort: orchestratorModelConfig.reasoningEffort,
                reasoningSummary: "detailed",
              },
            }
          : undefined,
      });

      return createUIMessageStreamResponse({
        // Cast resolves Node.js vs Web Streams API ambient type mismatch; runtime is correct
        stream: toAISdkStream(agentStream, {
          from: "agent",
          sendReasoning: true,
        }) as any,
      });
    } catch (error) {
      console.error("Stream route error:", error);
      return c.json(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
});
