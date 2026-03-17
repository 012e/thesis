import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  AuiIf,
  MessagePartPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import type { FC } from "react";
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
  IconThumbUp,
  IconThumbDown,
  IconRobot,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="bg-background flex h-full flex-col overflow-hidden">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-scroll scroll-smooth">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <AuiIf condition={(s) => !s.thread.isEmpty}>
          <div className="min-h-8 flex-grow" />
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            EditComposer: EditComposer,
            AssistantMessage: AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-4 flex w-full flex-col items-center gap-2 bg-background pb-4 px-4">
          <ThreadScrollToBottom />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <button className="rounded-full border bg-background p-2 shadow-md transition-opacity disabled:opacity-0 hover:bg-accent">
        <IconArrowDown className="size-4" />
      </button>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="flex flex-grow flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <IconRobot className="size-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">How can I help you?</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Start a conversation with your AI assistant
        </p>
      </div>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="border-input bg-background focus-within:border-ring flex w-full max-w-2xl flex-wrap items-end gap-2 rounded-2xl border px-3 py-2 shadow-sm transition-shadow focus-within:shadow-md">
      <ComposerPrimitive.Input
        autoFocus
        placeholder="Message AI assistant..."
        rows={1}
        className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none bg-transparent text-sm outline-none"
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 my-0.5 flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-50">
            <IconArrowUp className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 my-0.5 flex size-8 items-center justify-center rounded-full transition-colors">
            <IconPlayerStop className="size-4" />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
};

const TextPart: FC = () => {
  return (
    <MessagePartPrimitive.Text className="whitespace-pre-wrap break-words text-sm" />
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-2xl auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4 [&:where(>*)]:col-start-2 mx-auto px-4">
      <UserActionBar />
      <div className="bg-muted text-foreground max-w-xl rounded-3xl rounded-tr-sm px-5 py-2.5">
        <MessagePrimitive.Parts
          components={{
            Text: TextPart,
          }}
        />
      </div>
      <BranchPicker className="col-span-2 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="col-start-1 row-start-1 mt-2.5 flex flex-col items-end gap-1 pr-2"
    >
      <ActionBarPrimitive.Edit asChild>
        <button className="text-muted-foreground hover:bg-accent rounded-md p-1.5 transition-colors">
          <IconEdit className="size-4" />
        </button>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="bg-muted my-4 flex w-full max-w-2xl flex-col gap-2 rounded-xl px-4 pb-3 pt-2 mx-auto">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none bg-transparent text-sm outline-none" />
      <div className="flex items-center justify-center gap-2">
        <ComposerPrimitive.Cancel asChild>
          <button className="border-border hover:bg-accent rounded-full border px-4 py-2 text-sm font-medium transition-colors">
            Cancel
          </button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-2 text-sm font-medium transition-colors">
            Send
          </button>
        </ComposerPrimitive.Send>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-2xl grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4 mx-auto px-4">
      <div className="mr-3 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <IconRobot className="size-4 text-primary" />
      </div>
      <div className="col-span-2 col-start-2 row-start-1 my-1.5 max-w-xl break-words text-sm leading-relaxed">
        <MessagePrimitive.Parts
          components={{
            Text: TextPart,
          }}
        />
      </div>
      <AssistantActionBar />
      <BranchPicker className="col-start-2" />
    </MessagePrimitive.Root>
  );
};

const CopiedIcon: FC = () => {
  const isCopied = useAuiState((s) => s.message?.isCopied ?? false);
  return isCopied ? (
    <IconCheck className="size-4" />
  ) : (
    <IconCopy className="size-4" />
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="text-muted-foreground data-[floating]:bg-background col-start-3 row-start-2 -ml-1 flex gap-1 data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <button className="hover:bg-accent rounded-md p-1.5 transition-colors">
          <CopiedIcon />
        </button>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <button className="hover:bg-accent rounded-md p-1.5 transition-colors">
          <IconRefresh className="size-4" />
        </button>
      </ActionBarPrimitive.Reload>
      <ActionBarPrimitive.FeedbackPositive asChild>
        <button className="hover:bg-accent data-[active]:text-primary rounded-md p-1.5 transition-colors">
          <IconThumbUp className="size-4" />
        </button>
      </ActionBarPrimitive.FeedbackPositive>
      <ActionBarPrimitive.FeedbackNegative asChild>
        <button className="hover:bg-accent data-[active]:text-destructive rounded-md p-1.5 transition-colors">
          <IconThumbDown className="size-4" />
        </button>
      </ActionBarPrimitive.FeedbackNegative>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<{ className?: string }> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "text-muted-foreground inline-flex items-center text-xs",
        className,
      )}
    >
      <BranchPickerPrimitive.Previous asChild>
        <button className="hover:bg-accent rounded-md p-1 transition-colors disabled:opacity-50">
          <IconChevronLeft className="size-3.5" />
        </button>
      </BranchPickerPrimitive.Previous>
      <span className="px-1">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <button className="hover:bg-accent rounded-md p-1 transition-colors disabled:opacity-50">
          <IconChevronRight className="size-3.5" />
        </button>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
