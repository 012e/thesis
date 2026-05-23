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
  IconRobot,
  IconDownload,
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
  useEffect,
  useLayoutEffect,
  useRef,
  type PropsWithChildren,
} from "react";
import "@assistant-ui/react-markdown/styles/dot.css";

import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
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
import { useAtomValue } from "jotai";
import { FormRegistry } from "@/components/forms/registry";
import { threadActiveFormAtomFamily } from "@/lib/atoms/chat-state";
import { PlanProgressBar } from "@/components/assistant-ui/plan-progress";
import { AIContextIndicator } from "@/components/assistant-ui/context-indicator";

interface ThreadProps {
  scrollToEndKey?: unknown;
}

export function Thread({ scrollToEndKey }: ThreadProps) {
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
    <ThreadPrimitive.Root className="flex flex-col h-full bg-background @container/thread">
      <ThreadPrimitive.Viewport
        ref={viewportRef}
        turnAnchor="top"
        className="flex overflow-y-scroll flex-col flex-1"
      >
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <ThreadPrimitive.Messages>
          {({ message }) => {
            if (message.composer.isEditing) return <EditComposer />;
            if (message.role === "user") return <UserMessage />;
            return <AssistantMessage />;
          }}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter
          className="flex sticky bottom-0 flex-col gap-2 items-center mt-auto w-full bg-background px-3 pb-3 @md/thread:px-4 @md/thread:pb-4"
        >
          <ThreadScrollToBottom />
          <AIContextIndicator />
          <ActiveVerticalForm />
          <PlanProgressBar />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function ActiveVerticalForm() {
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const threadId = remoteId ?? localId;
  const activeForm = useAtomValue(threadActiveFormAtomFamily(threadId));

  if (!activeForm) return null;
  const config = FormRegistry[activeForm];
  if (config?.layout !== "vertical") return null;

  const Form = config.form;
  return (
    <div className="w-full max-w-2xl p-4 bg-muted/30 rounded-xl border border-border shadow-sm">
      <Form threadId={threadId} />
    </div>
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
    <div
      className="flex flex-col justify-center items-center text-center grow min-w-0 gap-3 px-4 py-6 @md/thread:gap-4 @md/thread:p-8"
    >
      <div className="rounded-full bg-primary/10 p-3 @md/thread:p-4">
        <IconRobot className="size-6 text-primary @md/thread:size-8" />
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
      <div className="mt-2 grid w-full max-w-[260px] grid-cols-1 gap-2 @md/thread:mt-4 @md/thread:max-w-2xl @md/thread:grid-cols-2">
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

function Composer() {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ComposerPrimitive.Root
      className="flex flex-col w-full max-w-none @md/thread:max-w-2xl"
    >
      <ComposerPrimitive.AttachmentDropzone className="flex w-full flex-col border border-input bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-ring focus-within:shadow-md data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          id="thread-composer-input"
          ref={inputRef}
          placeholder="Message AI assistant..."
          className="pt-1 w-full max-h-40 text-sm bg-transparent outline-none resize-none min-h-10 placeholder:text-muted-foreground"
          rows={1}
          autoFocus
        />
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function ComposerAction() {
  return (
    <div className="flex justify-between items-center mt-2">
      <div className="flex items-center gap-2">
        <ComposerAddAttachment />
        <ModelSelector />
      </div>

      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button className="flex justify-center items-center transition-colors disabled:opacity-50 size-8 bg-primary text-primary-foreground hover:bg-primary/90">
            <IconArrowUp className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button className="flex justify-center items-center transition-colors size-8 bg-primary text-primary-foreground hover:bg-primary/90">
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
      <button className="p-2 rounded-full border shadow-md transition-opacity disabled:opacity-0 bg-background hover:bg-accent">
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
        <div className="py-2.5 px-5 rounded-sm bg-muted text-foreground">
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
        <button className="p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-accent">
          <IconEdit className="size-4" />
        </button>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
}

function EditComposer() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-2 px-4 pt-2 pb-3 my-4 mx-auto w-full max-w-2xl rounded-xl bg-muted">
      <ComposerPrimitive.Input
        className="flex w-full h-8 text-sm bg-transparent outline-none resize-none text-foreground"
        autoFocus
      />
      <div className="flex gap-2 justify-center items-center">
        <ComposerPrimitive.Cancel asChild>
          <button className="py-2 px-4 text-sm font-medium rounded-full border transition-colors border-border hover:bg-accent">
            Cancel
          </button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <button className="py-2 px-4 text-sm font-medium rounded-full transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
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

function AssistantMessage() {
  return (
    <MessagePrimitive.Root
      className="flex relative flex-col p-2 mx-auto w-full max-w-2xl group"
      data-role="assistant"
    >
      <div className="flex flex-col justify-center">
        <div className="flex my-1.5 max-w-xl text-sm leading-relaxed wrap-break-word text-foreground">
          <div className="flex justify-center items-center mt-1 mr-3 rounded-full size-8 shrink-0 bg-primary/10">
            <IconRobot className="size-4 text-primary" />
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
            <AuiIf
              condition={(s) =>
                s.thread.isRunning && s.message.content.length === 0
              }
            >
              <div className="flex gap-2 items-center text-muted-foreground">
                <span className="text-sm">Thinking...</span>
              </div>
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
