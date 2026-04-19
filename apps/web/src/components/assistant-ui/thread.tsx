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
  IconLoader2,
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
import "@assistant-ui/react-markdown/styles/dot.css";

import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";
import { Sources } from "@/components/assistant-ui/sources";
import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { cn } from "@/lib/utils";

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full bg-background">
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="flex overflow-y-scroll flex-col flex-1 scroll-smooth"
      >
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            EditComposer,
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="flex sticky bottom-0 flex-col gap-2 items-center px-4 pb-4 mt-auto w-full bg-background">
          <ThreadScrollToBottom />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function ThreadWelcome() {
  return (
    <div className="flex flex-col gap-4 justify-center items-center p-8 text-center grow">
      <div className="p-4 rounded-full bg-primary/10">
        <IconRobot className="size-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">How can I help you?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a conversation with your AI assistant
        </p>
      </div>
      <div className="grid gap-2 mt-4 w-full max-w-2xl md:grid-cols-2">
        <ThreadPrimitive.Suggestion
          prompt="What's the weather in San Francisco?"
          asChild
        >
          <Button
            variant="outline"
            className="flex flex-col gap-1 justify-start items-start py-4 px-5 h-auto text-sm text-left rounded-2xl hover:bg-accent"
          >
            <span className="font-medium">What's the weather</span>
            <span className="text-muted-foreground">in San Francisco?</span>
          </Button>
        </ThreadPrimitive.Suggestion>
        <ThreadPrimitive.Suggestion
          prompt="Explain React hooks like useState"
          asChild
        >
          <Button
            variant="outline"
            className="flex flex-col gap-1 justify-start items-start py-4 px-5 h-auto text-sm text-left rounded-2xl hover:bg-accent"
          >
            <span className="font-medium">Explain React hooks</span>
            <span className="text-muted-foreground">like useState</span>
          </Button>
        </ThreadPrimitive.Suggestion>
      </div>
    </div>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex flex-col w-full max-w-2xl">
      <ComposerPrimitive.AttachmentDropzone className="flex w-full flex-col rounded-2xl border border-input bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-ring focus-within:shadow-md data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50">
        <ComposerAttachments />
        <ComposerPrimitive.Input
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
      <ComposerAddAttachment />

      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button className="flex justify-center items-center rounded-full transition-colors disabled:opacity-50 size-8 bg-primary text-primary-foreground hover:bg-primary/90">
            <IconArrowUp className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button className="flex justify-center items-center rounded-full transition-colors size-8 bg-primary text-primary-foreground hover:bg-primary/90">
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
      <div className="col-start-2 max-w-xl break-words">
        <UserMessageAttachments />
        <div className="py-2.5 px-5 rounded-3xl rounded-tr-sm bg-muted text-foreground">
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

function AssistantMessage() {
  return (
    <MessagePrimitive.Root
      className="flex relative flex-col p-2 mx-auto w-full max-w-2xl group"
      data-role="assistant"
    >
      <div className="flex flex-col justify-center">
        <div className="flex my-1.5 max-w-xl text-sm leading-relaxed break-words text-foreground">
          <div className="flex justify-center items-center mt-1 mr-3 rounded-full size-8 shrink-0 bg-primary/10">
            <IconRobot className="size-4 text-primary" />
          </div>

          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <MessagePrimitive.Parts
              components={{
                Text: MarkdownText,
                tools: { Fallback: ToolFallback },
                Reasoning,
                ReasoningGroup,
                Source: Sources,
              }}
            />

            <MessageError />
            <AuiIf
              condition={(s) =>
                s.thread.isRunning && s.message.content.length === 0
              }
            >
              <div className="flex gap-2 items-center text-muted-foreground">
                <IconLoader2 className="animate-spin size-4" />
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
