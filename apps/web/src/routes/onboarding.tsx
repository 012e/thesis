import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useEffect, useRef, type FC } from "react";
import { useAtomValue } from "jotai";
import { IconArrowRight, IconSparkles } from "@tabler/icons-react";

import { env } from "@/env";
import bearerToken from "@/lib/atoms/bearer-token";
import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { OnboardingAssistantTools } from "@/components/assistant-ui/onboarding-tools";

export const Route = createFileRoute("/onboarding")({
  component: RouteComponent,
});

// Mirrors the main chat runtime: once the user answers a tool-backed question,
// the completed tool result is automatically sent back so the agent continues.
type AutoSendMessage = {
  role: string;
  parts?: readonly { type: string; state?: string; providerExecuted?: boolean }[];
};

function lastAssistantMessageIsCompleteWithToolCalls({
  messages,
}: {
  messages: readonly AutoSendMessage[];
}) {
  const message = messages.at(-1);
  if (!message || message.role !== "assistant") return false;

  const parts = message.parts ?? [];
  const lastStepStartIndex = parts.reduce(
    (lastIndex, part, index) =>
      part.type === "step-start" ? index : lastIndex,
    -1,
  );
  const toolParts = parts
    .slice(lastStepStartIndex + 1)
    .filter((part) => part.type.startsWith("tool-") && !part.providerExecuted);

  return (
    toolParts.length > 0 &&
    toolParts.every(
      (part) =>
        part.state === "output-available" || part.state === "output-error",
    )
  );
}

/** Sends a single kickoff message so the agent greets and asks the first question. */
const OnboardingKickoff: FC = () => {
  const aui = useAui();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    aui.thread().append({
      role: "user",
      content: [
        {
          type: "text",
          text: "Hi! I just signed up. Help me set up my preferences.",
        },
      ],
    });
  }, [aui]);

  return null;
};

function RouteComponent() {
  const token = useAtomValue(bearerToken);

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: env.VITE_MASTRA_ONBOARDING_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <OnboardingAssistantTools />
      <OnboardingKickoff />
      <OnboardingScreen />
    </AssistantRuntimeProvider>
  );
}

function OnboardingScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <IconSparkles className="size-5 text-primary" />
          <span className="text-sm font-semibold">Welcome to Toin</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/" })}
        >
          Enter Toin
          <IconArrowRight className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        <OnboardingThread />
      </div>
    </div>
  );
}

function OnboardingThread() {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background @container/onboarding">
      <ThreadPrimitive.Viewport
        ref={viewportRef}
        turnAnchor="top"
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto flex w-full flex-col items-center gap-2 bg-background px-3 pb-4">
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root
      className="mb-4 flex w-full justify-end"
      data-role="user"
    >
      <div className="max-w-xl break-words bg-muted px-5 py-2.5 text-sm text-foreground">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root
      className="mb-4 flex w-full gap-3"
      data-role="assistant"
    >
      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Mascot className="size-6" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm leading-relaxed text-foreground">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            tools: { Fallback: ToolFallback },
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex w-full max-w-2xl flex-col">
      <div className="flex w-full items-end gap-2 border border-input bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-ring">
        <ComposerPrimitive.Input
          id="onboarding-composer-input"
          placeholder="Type a reply, or use the cards above…"
          className="flex max-h-40 min-h-9 w-full resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          rows={1}
        />
        <ComposerPrimitive.Send asChild>
          <Button size="sm" type="submit">
            Send
          </Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}
