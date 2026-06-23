import { registerApiRoute } from "@mastra/core/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { onboardingAgent } from "../agents/onboarding-agent";

/**
 * Onboarding chat stream route.
 *
 * Drives the post-signup preference setup. Unlike `/chat`, this route does not
 * need per-request MCP auth toolsets — the onboarding agent works exclusively
 * through client-rendered UI tools (choose_experience, pick_content_types,
 * suggest_tags, suggest_bio) that the web client forwards via
 * `AssistantChatTransport`. Those client tools are passed straight through to
 * the agent's `stream()` call so the model can call them.
 *
 * Compatible with Vercel AI SDK's AssistantChatTransport (UIMessage stream).
 *
 * POST /onboarding/chat
 * Headers: Authorization: Bearer <token>
 */

const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.any()),
  metadata: z.any().optional(),
});

const OnboardingRequestSchema = z.object({
  messages: z.array(UIMessageSchema).min(1, "At least one message is required"),
  /** System instructions forwarded by assistant-ui model context providers. */
  system: z.string().optional(),
  /** Browser/client tools forwarded by AssistantChatTransport. */
  tools: z.custom<ToolSet>().optional(),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  messageId: z.string().optional(),
  metadata: z.any().optional(),
  resumeData: z.record(z.string(), z.any()).optional(),
});

export const onboardingRoute = registerApiRoute("/onboarding/chat", {
  method: "POST",
  handler: async (c) => {
    try {
      const body = await c.req.json();
      const parseResult = OnboardingRequestSchema.safeParse(body);

      if (!parseResult.success) {
        return c.json(
          {
            error: "Invalid request body",
            details: parseResult.error.issues,
          },
          400,
        );
      }

      const { messages, system, tools: clientTools } = parseResult.data;

      const agentStream = await onboardingAgent.stream(messages, {
        maxSteps: 20,
        system,
        clientTools,
        providerOptions: {
          openai: {
            // Force one question (tool call) at a time so the UI stays focused.
            parallelToolCalls: false,
          },
        },
      });

      const stream = createUIMessageStream({
        originalMessages: messages,
        execute: async ({ writer }) => {
          for await (const part of toAISdkStream(agentStream, {
            from: "agent",
            version: "v6",
            sendReasoning: true,
          })) {
            writer.write(part);
          }
        },
      });

      return createUIMessageStreamResponse({ stream });
    } catch (error) {
      console.error("Onboarding route error:", error);
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
