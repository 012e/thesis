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
    <ThreadPrimitive.Root className="flex overflow-hidden flex-col h-full bg-background">
      <ThreadPrimitive.Viewport className="flex overflow-y-scroll flex-col flex-1 scroll-smooth">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <AuiIf condition={(s) => !s.thread.isEmpty}>
          <div className="grow min-h-8" />
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            EditComposer: EditComposer,
            AssistantMessage: AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="flex sticky bottom-0 flex-col gap-2 items-center px-4 pb-4 mt-4 w-full bg-background">
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
      <button className="p-2 rounded-full border shadow-md transition-opacity disabled:opacity-0 bg-background hover:bg-accent">
        <IconArrowDown className="size-4" />
      </button>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
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
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex flex-wrap gap-2 items-end py-2 px-3 w-full max-w-2xl rounded-2xl border shadow-sm transition-shadow focus-within:shadow-md border-input bg-background focus-within:border-ring">
      <ComposerPrimitive.Input
        autoFocus
        placeholder="Message AI assistant..."
        rows={1}
        className="max-h-40 text-sm bg-transparent outline-none resize-none grow placeholder:text-muted-foreground"
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button className="flex justify-center items-center my-0.5 rounded-full transition-colors disabled:opacity-50 bg-primary text-primary-foreground size-8 hover:bg-primary/90">
            <IconArrowUp className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button className="flex justify-center items-center my-0.5 rounded-full transition-colors bg-primary text-primary-foreground size-8 hover:bg-primary/90">
            <IconPlayerStop className="size-4" />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
};

const TextPart: FC = () => {
  return (
    <MessagePartPrimitive.Text className="text-sm whitespace-pre-wrap break-words" />
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-2xl auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4 [&:where(>*)]:col-start-2 mx-auto px-4">
      <UserActionBar />
      <div className="py-2.5 px-5 max-w-xl rounded-3xl rounded-tr-sm bg-muted text-foreground">
        <MessagePrimitive.Parts
          components={{
            Text: TextPart,
          }}
        />
      </div>
      <BranchPicker className="col-span-2 justify-end -mr-1" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex flex-col col-start-1 row-start-1 gap-1 items-end pr-2 mt-2.5"
    >
      <ActionBarPrimitive.Edit asChild>
        <button className="p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-accent">
          <IconEdit className="size-4" />
        </button>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-2 px-4 pt-2 pb-3 my-4 mx-auto w-full max-w-2xl rounded-xl bg-muted">
      <ComposerPrimitive.Input className="flex w-full h-8 text-sm bg-transparent outline-none resize-none text-foreground" />
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
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid relative py-4 px-4 mx-auto w-full max-w-2xl grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr]">
      <div className="flex justify-center items-center mt-1 mr-3 rounded-full size-8 shrink-0 bg-primary/10">
        <IconRobot className="size-4 text-primary" />
      </div>
      <div className="col-span-2 col-start-2 row-start-1 my-1.5 max-w-xl text-sm leading-relaxed break-words">
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
      className="flex col-start-3 row-start-2 gap-1 -ml-1 text-muted-foreground data-[floating]:bg-background data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <button className="p-1.5 rounded-md transition-colors hover:bg-accent">
          <CopiedIcon />
        </button>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <button className="p-1.5 rounded-md transition-colors hover:bg-accent">
          <IconRefresh className="size-4" />
        </button>
      </ActionBarPrimitive.Reload>
      <ActionBarPrimitive.FeedbackPositive asChild>
        <button className="p-1.5 rounded-md transition-colors data-[active]:text-primary hover:bg-accent">
          <IconThumbUp className="size-4" />
        </button>
      </ActionBarPrimitive.FeedbackPositive>
      <ActionBarPrimitive.FeedbackNegative asChild>
        <button className="p-1.5 rounded-md transition-colors data-[active]:text-destructive hover:bg-accent">
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
};
