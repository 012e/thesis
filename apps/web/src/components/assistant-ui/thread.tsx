import {
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconCheck,
  IconPlayerStop,
  IconArrowDown,
  IconEdit,
  IconRefresh,
  IconDownload,
  IconMessage2,
  IconHash,
  IconRocket,
  IconSparkles,
  IconUserCircle,
} from "@tabler/icons-react";
import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PropsWithChildren,
} from "react";
import "@assistant-ui/react-markdown/styles/dot.css";

import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui/button";
import {
  CompactMarkdownText,
  MarkdownText,
} from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { RailRow, ToolTimeline } from "@/components/assistant-ui/tool-timeline";
import { isTimelineTool } from "@/lib/assistant/tool-timeline";
import { ONBOARDING_TOOL_NAMES } from "@/lib/assistant/onboarding-tools";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import { Sources } from "@/components/assistant-ui/sources";
import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { PlanProgressBar } from "@/components/assistant-ui/plan-progress";
import { AIContextIndicator } from "@/components/assistant-ui/context-indicator";
import {
  FinishedIndicator,
  ThinkingIndicator,
} from "@/components/assistant-ui/thinking-indicator";
import { Separator } from "@/components/ui/separator";

interface ThreadProps {
  scrollToEndKey?: unknown;
  footerContent?: ReactNode;
  /** Replaces the default <ThreadWelcome /> shown while the thread is empty. */
  emptyState?: ReactNode;
  /** Overrides the composer input placeholder. */
  composerPlaceholder?: string;
  /** Hides the attachment button and model selector in the composer. */
  hideComposerTools?: boolean;
  /** Optional cleanup hook invoked when the current assistant run is cancelled. */
  onCancelRun?: () => void;
  /**
   * Render rich (non-timeline) tools — e.g. the onboarding cards — connected on
   * the activity rail instead of breaking out as detached full-width blocks.
   */
  richToolsOnRail?: boolean;
}

/** Whether rich tool UIs should be hung off the activity rail. */
const RichToolsOnRailContext = createContext(false);

export function Thread({
  scrollToEndKey,
  footerContent,
  emptyState,
  composerPlaceholder,
  hideComposerTools,
  onCancelRun,
  richToolsOnRail = false,
}: ThreadProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const threadId = useAuiState(
    (s) => s.threadListItem.remoteId ?? s.threadListItem.id,
  );
  const messageCount = useAuiState((s) => s.thread.messages?.length ?? 0);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const scrollToEnd = () => {
      const previousScrollBehavior = viewport.style.scrollBehavior;
      viewport.style.scrollBehavior = "auto";
      viewport.scrollTop = viewport.scrollHeight;
      viewport.style.scrollBehavior = previousScrollBehavior;
    };

    scrollToEnd();
    const frame = requestAnimationFrame(scrollToEnd);

    return () => cancelAnimationFrame(frame);
  }, [threadId, messageCount, scrollToEndKey]);

  return (
    <RichToolsOnRailContext.Provider value={richToolsOnRail}>
      <ThreadPrimitive.Root className="flex flex-col h-full bg-background @container/thread">
        <ThreadPrimitive.Viewport
          ref={viewportRef}
          turnAnchor="top"
          className="flex overflow-y-scroll flex-col flex-1"
        >
          <AuiIf condition={(s) => s.thread.isEmpty}>
            {emptyState ?? <ThreadWelcome />}
          </AuiIf>

          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.composer.isEditing) return <EditComposer />;
              if (message.role === "user") return <UserMessage />;
              return <AssistantMessage />;
            }}
          </ThreadPrimitive.Messages>

          <ThreadPrimitive.ViewportFooter className="flex sticky bottom-0 flex-col gap-2 items-center mt-auto w-full px-3 pb-3 @md/thread:px-4 @md/thread:pb-4">
            <ThreadScrollToBottom />
            <AIContextIndicator />
            {footerContent}
            <PlanProgressBar />
            <Composer
              placeholder={composerPlaceholder}
              hideTools={hideComposerTools}
              onCancelRun={onCancelRun}
            />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </RichToolsOnRailContext.Provider>
  );
}

function ThreadWelcome() {
  const focusComposer = () => {
    requestAnimationFrame(() => {
      const composerInput = document.getElementById("thread-composer-input");
      if (composerInput instanceof HTMLTextAreaElement) {
        composerInput.focus();
      }
    });
  };

  return (
    <div className="flex flex-col justify-center items-center text-center grow min-w-0 gap-3 px-4 py-6 @md/thread:gap-4 @md/thread:p-8">
      <div className="flex items-center justify-center rounded-full bg-primary/10 p-3 @md/thread:p-4">
        <Mascot
          animateOccasionally
          className="size-9 @md/thread:size-11"
        />
      </div>
      <div>
        <h2 className="text-lg font-semibold @md/thread:text-xl">
          How can I help you?
        </h2>
        <p className="mx-auto mt-1 max-w-60 text-sm text-muted-foreground @md/thread:max-w-none">
          Ask me anything — I can read posts, search content, and help you
          explore
        </p>
      </div>
      <div className="mt-2 grid w-full max-w-65 grid-cols-1 gap-2 @md/thread:mt-4 @md/thread:max-w-2xl @md/thread:grid-cols-2">
        <ThreadPrimitive.Suggestion
          prompt="What are the most upvoted posts right now?"
          asChild
        >
          <Button
            variant="outline"
            onClick={focusComposer}
            className={cn(
              "flex flex-col gap-1 justify-start items-start h-auto text-sm text-left hover:bg-accent min-w-0 px-3 py-2.5 @md/thread:px-5 @md/thread:py-4",
            )}
          >
            <span className="font-medium truncate max-w-full">
              What's trending?
            </span>
            <span className="text-muted-foreground truncate max-w-full">
              Show me the most upvoted posts
            </span>
          </Button>
        </ThreadPrimitive.Suggestion>
        <ThreadPrimitive.Suggestion
          prompt="Summarize the latest posts from people I follow"
          asChild
        >
          <Button
            variant="outline"
            onClick={focusComposer}
            className={cn(
              "flex flex-col gap-1 justify-start items-start h-auto text-sm text-left hover:bg-accent min-w-0 px-3 py-2.5 @md/thread:px-5 @md/thread:py-4",
            )}
          >
            <span className="font-medium truncate max-w-full">
              My feed summary
            </span>
            <span className="text-muted-foreground truncate max-w-full">
              Summarize recent posts I follow
            </span>
          </Button>
        </ThreadPrimitive.Suggestion>
        <ThreadPrimitive.Suggestion
          prompt="Find posts about programming or software development"
          asChild
        >
          <Button
            variant="outline"
            onClick={focusComposer}
            className={cn(
              "flex flex-col gap-1 justify-start items-start h-auto text-sm text-left hover:bg-accent min-w-0 px-3 py-2.5 @md/thread:px-5 @md/thread:py-4",
            )}
          >
            <span className="font-medium truncate max-w-full">
              Search posts
            </span>
            <span className="text-muted-foreground truncate max-w-full">
              Find posts about a topic
            </span>
          </Button>
        </ThreadPrimitive.Suggestion>
        <ThreadPrimitive.Suggestion
          prompt="Who are the most active users? What have they been posting about?"
          asChild
        >
          <Button
            variant="outline"
            onClick={focusComposer}
            className={cn(
              "flex flex-col gap-1 justify-start items-start h-auto text-sm text-left hover:bg-accent min-w-0 px-3 py-2.5 @md/thread:px-5 @md/thread:py-4",
            )}
          >
            <span className="font-medium truncate max-w-full">
              Active users
            </span>
            <span className="text-muted-foreground truncate max-w-full">
              See who's been most active
            </span>
          </Button>
        </ThreadPrimitive.Suggestion>
      </div>
    </div>
  );
}

function Composer({
  placeholder,
  hideTools,
  onCancelRun,
}: {
  placeholder?: string;
  hideTools?: boolean;
  onCancelRun?: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ComposerPrimitive.Root className="flex flex-col w-full max-w-none @md/thread:max-w-2xl">
      <ComposerPrimitive.AttachmentDropzone className="flex w-full flex-col border border-input bg-background/80 backdrop-blur-md px-3 py-2 shadow-sm transition-shadow focus-within:border-ring focus-within:shadow-md data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          id="thread-composer-input"
          ref={inputRef}
          placeholder={placeholder ?? "Message AI assistant..."}
          className="pt-1 w-full max-h-40 text-sm bg-transparent outline-none resize-none min-h-10 placeholder:text-muted-foreground"
          rows={1}
          autoFocus
        />
        <ComposerAction hideTools={hideTools} onCancelRun={onCancelRun} />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function ComposerAction({
  hideTools,
  onCancelRun,
}: {
  hideTools?: boolean;
  onCancelRun?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center mt-2",
        hideTools ? "justify-end" : "justify-between",
      )}
    >
      {!hideTools && (
        <div className="flex items-center gap-2">
          <ComposerAddAttachment />
          <ModelSelector />
        </div>
      )}

      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button className="flex justify-center items-center transition-colors disabled:opacity-50 size-8 bg-primary text-primary-foreground hover:bg-primary/90">
            <IconArrowUp className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button
            type="button"
            aria-label="Stop response"
            onClick={onCancelRun}
            className="flex justify-center items-center transition-colors size-8 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconPlayerStop className="size-4" />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
}

function ThreadScrollToBottom() {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <button className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-full border shadow-md transition-opacity disabled:pointer-events-none disabled:opacity-0 bg-background/80 backdrop-blur-md hover:bg-accent p-2">
        <IconArrowDown className="size-4" />
      </button>
    </ThreadPrimitive.ScrollToBottom>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root
      className="grid auto-rows-auto gap-y-2 py-4 px-4 mx-auto w-full max-w-2xl grid-cols-[minmax(72px,1fr)_auto] group"
      data-role="user"
    >
      <UserActionBar />
      <div className="col-start-2 max-w-xl wrap-break-word">
        <UserMessageAttachments />
        <div className="py-2.5 px-5 bg-muted text-foreground">
          <MessagePrimitive.Parts />
        </div>
      </div>
      <BranchPicker className="col-span-2 justify-end -mr-1" />
    </MessagePrimitive.Root>
  );
}

function UserActionBar() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className="flex flex-col col-start-1 row-start-1 items-end pr-2 mt-2.5 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <ActionBarPrimitive.Edit asChild>
        <button className="p-1.5 transition-colors text-muted-foreground hover:bg-accent">
          <IconEdit className="size-4" />
        </button>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
}

function EditComposer() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-4 px-4 pt-2 pb-3 my-4 mx-auto w-full max-w-2xl bg-muted">
      <ComposerPrimitive.Input
        className="flex w-full h-8 text-sm bg-transparent outline-none resize-none text-foreground"
        autoFocus
      />
      <Separator />
      <div className="flex gap-2 justify-end items-center">
        <ComposerPrimitive.Cancel asChild>
          <button className="py-2 px-4 text-sm font-medium transition-colors border-border hover:bg-accent">
            Cancel
          </button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <button className="py-2 px-4 text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
            Send
          </button>
        </ComposerPrimitive.Send>
      </div>
    </MessagePrimitive.Root>
  );
}

function ChainOfThoughtGroup({
  active,
  count,
  children,
}: PropsWithChildren<{ active: boolean; count: number }>) {
  return (
    <ReasoningRoot defaultOpen={active} className="mb-2">
      <ReasoningTrigger
        active={active}
        label={`Thinking (${count} step${count === 1 ? "" : "s"})`}
      />
      <ReasoningContent aria-busy={active}>
        <ReasoningText className="flex flex-col gap-2">
          {children}
        </ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
}

/**
 * Position of an assistant message within its "run" — the maximal sequence of
 * consecutive assistant messages answering one user turn. A turn with tool
 * activity is rendered as ONE connected rail spanning all its messages, so we
 * need to know which message starts/ends the run and whether it has activity.
 */
function useAssistantRunInfo() {
  const index = useAuiState((s) => s.message.index);
  const messages = useAuiState((s) => s.thread.messages);

  return useMemo(() => {
    if (messages[index]?.role !== "assistant") {
    return {
      isFirstInRun: true,
      isLastInRun: true,
      runHasActivity: false,
      hasLaterActivity: false,
    };
    }

    let start = index;
    while (start > 0 && messages[start - 1]?.role === "assistant") start--;
    let end = index;
    while (end < messages.length - 1 && messages[end + 1]?.role === "assistant")
      end++;

    let runHasActivity = false;
    for (let i = start; i <= end && !runHasActivity; i++) {
      for (const part of messages[i]?.content ?? []) {
        if (part.type === "tool-call" || part.type === "data") {
          runHasActivity = true;
          break;
        }
      }
    }

    let hasLaterActivity = false;
    for (let i = index + 1; i < messages.length && !hasLaterActivity; i++) {
      for (const part of messages[i]?.content ?? []) {
        if (part.type === "tool-call" || part.type === "data") {
          hasLaterActivity = true;
          break;
        }
      }
    }

    return {
      isFirstInRun: index === start,
      isLastInRun: index === end,
      runHasActivity,
      hasLaterActivity,
    };
  }, [messages, index]);
}

function AssistantMessage() {
  const { isFirstInRun, isLastInRun, runHasActivity, hasLaterActivity } =
    useAssistantRunInfo();

  if (runHasActivity) {
    return (
      <ActivityAssistantMessage
        isFirstInRun={isFirstInRun}
        isLastInRun={isLastInRun}
        hasLaterActivity={hasLaterActivity}
      />
    );
  }

  return <PlainAssistantMessage />;
}

function getRichToolRailIcon(toolName: string) {
  switch (toolName) {
    case ONBOARDING_TOOL_NAMES.chooseExperience:
    case ONBOARDING_TOOL_NAMES.suggestBio:
      return IconUserCircle;
    case ONBOARDING_TOOL_NAMES.pickContentTypes:
      return IconSparkles;
    case ONBOARDING_TOOL_NAMES.suggestTags:
      return IconHash;
    case ONBOARDING_TOOL_NAMES.finishOnboarding:
      return IconRocket;
    default:
      return null;
  }
}

function isRichToolRailTool(toolName: string) {
  return Object.values(ONBOARDING_TOOL_NAMES).includes(
    toolName as (typeof ONBOARDING_TOOL_NAMES)[keyof typeof ONBOARDING_TOOL_NAMES],
  );
}

function messageParts(message: unknown): readonly unknown[] {
  if (typeof message !== "object" || message == null) return [];

  const candidate = message as {
    content?: unknown;
    parts?: unknown;
  };

  if (Array.isArray(candidate.content)) return candidate.content;
  if (Array.isArray(candidate.parts)) return candidate.parts;
  return [];
}

function partType(part: unknown) {
  if (typeof part !== "object" || part == null) return undefined;
  const type = (part as { type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}

function messageHasToolCall(message: unknown) {
  return messageParts(message).some((part) => partType(part) === "tool-call");
}

function toolPartStatusType(part: unknown) {
  const status = (part as { status?: { type?: unknown } }).status;
  return typeof status?.type === "string" ? status.type : undefined;
}

function toolPartHasResult(part: unknown) {
  return (
    "result" in (part as Record<string, unknown>) &&
    (part as { result?: unknown }).result != null
  );
}

/** Classic bubble layout: mascot beside the content. Used for plain answers. */
function PlainAssistantMessage() {
  return (
    <MessagePrimitive.Root
      className="flex relative flex-col p-2 mx-auto w-full max-w-2xl group"
      data-role="assistant"
    >
      <div className="flex flex-col justify-center">
        <div className="flex my-1.5 max-w-xl text-sm leading-relaxed wrap-break-word text-foreground">
          <div className="flex justify-center items-center mt-1 mr-3 rounded-full size-8 shrink-0 bg-primary/10">
            <Mascot className="size-6" />
          </div>

          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <MessagePrimitive.GroupedParts
              groupBy={(part) =>
                part.type === "reasoning" ? ["group-chain-of-thought"] : null
              }
            >
              {({ part, children }) => {
                switch (part.type) {
                  case "group-chain-of-thought":
                    return (
                      <ChainOfThoughtGroup
                        active={part.status.type === "running"}
                        count={part.indices.length}
                      >
                        {children}
                      </ChainOfThoughtGroup>
                    );
                  case "text":
                    return <MarkdownText />;
                  case "reasoning":
                    return <Reasoning {...part} />;
                  case "source":
                    return <Sources {...part} />;
                  case "tool-call":
                    return part.toolUI ?? <ToolFallback {...part} />;
                  case "data":
                    return part.dataRendererUI ?? null;
                  default:
                    return null;
                }
              }}
            </MessagePrimitive.GroupedParts>

            <MessageError />
            <AuiIf condition={(s) => s.message.isLast}>
              <MessageRunStatus />
            </AuiIf>
          </div>
        </div>

        <div className="flex col-start-2 items-center">
          <BranchPicker />
        </div>

        <div className="flex col-start-3 row-start-2 items-center -ml-1">
          <AssistantActionBar />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

/**
 * Activity-turn layout. Tool/agent steps form one connected rail. Because a
 * turn is split into several assistant messages (each typically a step plus a
 * line of narration), we render each message's steps into a shared rail that
 * continues into the next message (`capLast={isLastInRun}`), suppress the
 * intermediate narration, and show only the final answer as normal prose.
 */
function ActivityAssistantMessage({
  isFirstInRun,
  isLastInRun,
  hasLaterActivity,
}: {
  isFirstInRun: boolean;
  isLastInRun: boolean;
  hasLaterActivity: boolean;
}) {
  const richToolsOnRail = useContext(RichToolsOnRailContext);
  const messageIndex = useAuiState((s) => s.message.index);
  const messages = useAuiState((s) => s.thread.messages);

  const hasActivityAfterPart = (indices: readonly number[]) => {
    if (!richToolsOnRail) return false;

    const maxPartIndex = Math.max(...indices);
    const currentContent = messages[messageIndex]?.content ?? [];
    for (let i = maxPartIndex + 1; i < currentContent.length; i++) {
      const part = currentContent[i];
      if (part?.type === "tool-call" || part?.type === "data") return true;
    }

    return hasLaterActivity;
  };

  return (
    <MessagePrimitive.Root
      className={cn(
        "relative isolate mx-auto w-full max-w-2xl px-3 group",
        isFirstInRun ? "pt-4" : "pt-0",
        isLastInRun ? "pb-2" : "pb-0",
      )}
      data-role="assistant"
    >
      {isFirstInRun && (
        <div className="mb-1 flex w-6 items-center justify-center">
          <span className="flex items-center justify-center rounded-full size-6 bg-primary/10">
            <Mascot className="size-4" />
          </span>
        </div>
      )}

      <MessagePrimitive.GroupedParts
        groupBy={(part) => {
          if (part.type === "reasoning") return ["group-chain-of-thought"];
          // Tool steps, the (invisible) agent data that follows them, and
          // standalone narration all form one continuous rail.
          if (
            (part.type === "tool-call" &&
              (isTimelineTool(part.toolName) || richToolsOnRail)) ||
            (part.type === "data" && !richToolsOnRail) ||
            (part.type === "text" &&
              (richToolsOnRail || !isLastInRun))
          )
            return ["group-tool-timeline"];
          return null;
        }}
      >
        {({ part, children }) => {
          switch (part.type) {
            case "group-tool-timeline": {
              const indices =
                "indices" in part && Array.isArray(part.indices)
                  ? part.indices
                  : [];

              return (
                <ToolTimeline
                  capLast={isLastInRun && !hasActivityAfterPart(indices)}
                >
                  {children}
                </ToolTimeline>
              );
            }
            case "group-chain-of-thought":
              return (
                <ChainOfThoughtGroup
                  active={part.status.type === "running"}
                  count={part.indices.length}
                >
                  {children}
                </ChainOfThoughtGroup>
              );
            case "text": {
              if (!part.text.trim()) return null;

              if (richToolsOnRail) {
                if (messageHasToolCall(messages[messageIndex])) return null;

                return (
                  <RailRow
                    node={
                      <IconMessage2 className="size-4 text-muted-foreground" />
                    }
                  >
                    <div className="pt-0.5 text-sm leading-relaxed wrap-break-word text-muted-foreground">
                      <MarkdownText />
                    </div>
                  </RailRow>
                );
              }

              // Intermediate narration is a "thought" step on the rail; the
              // final answer renders as normal prose below the rail.
              return isLastInRun ? (
                <div className="pl-9 text-sm leading-relaxed wrap-break-word text-foreground">
                  <CompactMarkdownText />
                </div>
              ) : (
                <RailRow
                  node={
                    <IconMessage2 className="size-4 text-muted-foreground" />
                  }
                >
                  <div className="pt-0.5 text-sm leading-relaxed text-muted-foreground">
                    <MarkdownText />
                  </div>
                </RailRow>
              );
            }
            case "source":
              return isLastInRun ? <Sources {...part} /> : null;
            case "tool-call": {
              const toolContent = part.toolUI ?? <ToolFallback {...part} />;
              if (
                richToolsOnRail &&
                (isRichToolRailTool(part.toolName) ||
                  !isTimelineTool(part.toolName))
              ) {
                if (
                  isRichToolRailTool(part.toolName) &&
                  toolPartStatusType(part) !== "running" &&
                  !toolPartHasResult(part)
                ) {
                  return null;
                }

                const Icon = getRichToolRailIcon(part.toolName);
                return (
                  <RailRow
                    node={
                      Icon ? (
                        <Icon className="size-4 text-foreground" />
                      ) : (
                        <span className="size-2.5 rounded-full bg-primary" />
                      )
                    }
                  >
                    {toolContent}
                  </RailRow>
                );
              }
              return toolContent;
            }
            case "data":
              return part.dataRendererUI ?? null;
            default:
              return null;
          }
        }}
      </MessagePrimitive.GroupedParts>

      {isLastInRun && (
        <div className="pl-9">
          <MessageError />
          <AuiIf condition={(s) => s.message.isLast}>
            <MessageRunStatus className="mt-2" />
          </AuiIf>

          <div className="mt-1 flex items-center gap-2">
            <AssistantActionBar />
            <BranchPicker />
          </div>
        </div>
      )}
    </MessagePrimitive.Root>
  );
}

/**
 * Renders the streaming status for the last assistant message: a thinking
 * indicator while the run is in progress, then a "Finished in …" label once it
 * completes. The elapsed time is measured client-side across the running →
 * finished transition, so it only appears for responses generated this session
 * (not historical messages restored on load).
 */
function MessageRunStatus({ className }: { className?: string } = {}) {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const startRef = useRef<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      startRef.current = Date.now();
      setDurationMs(null);
    } else if (startRef.current != null) {
      setDurationMs(Date.now() - startRef.current);
      startRef.current = null;
    }
  }, [isRunning]);

  if (isRunning) return <ThinkingIndicator className={className} />;
  if (durationMs == null) return null;
  return <FinishedIndicator durationMs={durationMs} className={className} />;
}

function MessageError() {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="p-3 mt-2 text-sm rounded-md border dark:text-red-200 border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
}

function AssistantActionBar() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground"
    >
      <ActionBarPrimitive.Copy asChild>
        <button className="p-1.5 rounded-md transition-colors hover:bg-accent">
          <CopiedIcon />
        </button>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.ExportMarkdown asChild>
        <button className="p-1.5 rounded-md transition-colors hover:bg-accent">
          <IconDownload className="size-4" />
        </button>
      </ActionBarPrimitive.ExportMarkdown>
      <ActionBarPrimitive.Reload asChild>
        <button className="p-1.5 rounded-md transition-colors hover:bg-accent">
          <IconRefresh className="size-4" />
        </button>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
}

function CopiedIcon() {
  const isCopied = useAuiState((s) => s.message?.isCopied ?? false);
  return isCopied ? (
    <IconCheck className="size-4" />
  ) : (
    <IconCopy className="size-4" />
  );
}

function BranchPicker({ className }: { className?: string }) {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "inline-flex items-center text-xs text-muted-foreground",
        className,
      )}
    >
      <BranchPickerPrimitive.Previous asChild>
        <button className="p-1 rounded-md transition-colors disabled:opacity-50 hover:bg-accent">
          <IconChevronLeft className="size-3.5" />
        </button>
      </BranchPickerPrimitive.Previous>
      <span className="px-1">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <button className="p-1 rounded-md transition-colors disabled:opacity-50 hover:bg-accent">
          <IconChevronRight className="size-3.5" />
        </button>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}
