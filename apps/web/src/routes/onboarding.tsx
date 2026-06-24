import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AssistantRuntimeProvider, useAui } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useEffect, useRef, useState, type FC } from "react";
import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import { IconArrowRight, IconSparkles } from "@tabler/icons-react";

import { env } from "@/env";
import bearerToken from "@/lib/atoms/bearer-token";
import { Button } from "@/components/ui/button";
import { Thread } from "@/components/assistant-ui/thread";
import { OnboardingAssistantTools } from "@/components/assistant-ui/onboarding-tools";

export const Route = createFileRoute("/onboarding")({
  component: RouteComponent,
});

const ONBOARDING_KICKOFF_MESSAGE =
  "Hi! I just signed up. Help me set up my account.";
const TYPEWRITER_INITIAL_PAUSE_MS = 450;
const TYPEWRITER_READING_PAUSE_MS = 650;

function getTypingDelay(character: string, characterIndex: number) {
  const jitter = Math.random();

  if (/[.!?]/.test(character)) {
    return 320 + jitter * 180;
  }

  if (/[,;:]/.test(character)) {
    return 180 + jitter * 100;
  }

  if (character === " ") {
    return 45 + jitter * 55;
  }

  const briefHesitation = characterIndex > 0 && characterIndex % 9 === 0;
  return 70 + jitter * 65 + (briefHesitation ? 85 : 0);
}

// Mirrors the main chat runtime: once the user answers a tool-backed question,
// the completed tool result is automatically sent back so the agent continues.
type AutoSendMessage = {
  role: string;
  parts?: readonly {
    type: string;
    state?: string;
    providerExecuted?: boolean;
  }[];
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

/**
 * Types the kickoff locally first, then sends it to the runtime. Appending is
 * intentionally delayed because it starts the assistant run immediately.
 */
const OnboardingKickoff: FC<{
  onTextChange: (text: string) => void;
}> = ({ onTextChange }) => {
  const aui = useAui();
  const auiRef = useRef(aui);
  auiRef.current = aui;

  useEffect(() => {
    let characterIndex = 0;
    let typingTimeout: ReturnType<typeof setTimeout> | undefined;
    let sendTimeout: ReturnType<typeof setTimeout> | undefined;

    const typeNextCharacter = () => {
      characterIndex += 1;
      onTextChange(ONBOARDING_KICKOFF_MESSAGE.slice(0, characterIndex));

      if (characterIndex >= ONBOARDING_KICKOFF_MESSAGE.length) {
        sendTimeout = setTimeout(() => {
          auiRef.current.thread().append({
            role: "user",
            content: [
              {
                type: "text",
                text: ONBOARDING_KICKOFF_MESSAGE,
              },
            ],
          });
        }, TYPEWRITER_READING_PAUSE_MS);
        return;
      }

      const typedCharacter =
        ONBOARDING_KICKOFF_MESSAGE[characterIndex - 1] ?? "";
      typingTimeout = setTimeout(
        typeNextCharacter,
        getTypingDelay(typedCharacter, characterIndex),
      );
    };

    typingTimeout = setTimeout(typeNextCharacter, TYPEWRITER_INITIAL_PAUSE_MS);

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      if (sendTimeout) clearTimeout(sendTimeout);
    };
  }, [onTextChange]);

  return null;
};

function RouteComponent() {
  const token = useAtomValue(bearerToken);
  const [kickoffText, setKickoffText] = useState("");

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
      <OnboardingKickoff onTextChange={setKickoffText} />
      <OnboardingScreen kickoffText={kickoffText} />
    </AssistantRuntimeProvider>
  );
}

function OnboardingScreen({ kickoffText }: { kickoffText: string }) {
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
        <Thread
          composerPlaceholder="Type a reply, or use the cards above…"
          emptyState={<TypewriterUserMessage text={kickoffText} />}
          hideComposerTools
          richToolsOnRail
        />
      </div>
    </div>
  );
}

/**
 * Stand-in for the kickoff user message while it types out. Mirrors the bubble
 * layout of the shared Thread's <UserMessage /> so the swap to the real message
 * (once the thread is no longer empty) is seamless.
 */
function TypewriterUserMessage({ text }: { text: string }) {
  const isTyping =
    text.length > 0 && text.length < ONBOARDING_KICKOFF_MESSAGE.length;

  return (
    <div
      aria-label={ONBOARDING_KICKOFF_MESSAGE}
      className="grid auto-rows-auto gap-y-2 py-4 px-4 mx-auto w-full max-w-2xl grid-cols-[minmax(72px,1fr)_auto]"
    >
      <div className="col-start-2 max-w-xl wrap-break-word">
        <div className="py-2.5 px-5 text-sm bg-muted text-foreground">
          {text}
          {isTyping && (
            <motion.span
              aria-hidden="true"
              className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 bg-foreground"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
