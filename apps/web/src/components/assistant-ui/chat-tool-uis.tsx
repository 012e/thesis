import { makeAssistantToolUI, useAuiState } from "@assistant-ui/react";
import { useAtomValue } from "jotai";
import type { ComponentType } from "react";
import {
  IconCheck,
  IconCircleDashedCheck,
  IconEdit,
  IconExternalLink,
  IconFileCheck,
  IconLoader2,
  IconListCheck,
  IconPencil,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { PostDto } from "@repo/shared-dto";

import { planStatesAtom } from "@/lib/atoms/plan-state";
import { cn } from "@/lib/utils";

type ToolTraceProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  state: "running" | "complete";
};

function formatIdentifier(value: string) {
  const words = value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : value;
}

export function ToolTrace({
  icon: Icon,
  label,
  detail,
  state,
}: ToolTraceProps) {
  const isRunning = state === "running";

  return (
    <div
      data-slot="tool-trace"
      className={cn(
        "flex w-full items-center gap-2 border bg-background px-4 py-3 text-sm leading-none",
        isRunning
          ? "border-primary/30 text-primary"
          : "border-border text-muted-foreground",
      )}
    >
      {isRunning ? (
        <IconLoader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <Icon className="size-4 shrink-0 text-foreground" />
      )}
      <span className="min-w-0 grow truncate text-left text-foreground">
        {label}
        {detail && (
          <>
            :{" "}
            <span className="font-medium text-muted-foreground">{detail}</span>
          </>
        )}
      </span>
    </div>
  );
}

const OpenFormToolUIImpl = makeAssistantToolUI({
  toolName: "open_form",
  render: ({ args, status }) => {
    const formName =
      typeof args.formName === "string"
        ? formatIdentifier(args.formName)
        : "Form";

    if (status.type === "running")
      return (
        <ToolTrace
          icon={IconFileCheck}
          label="Opening form"
          detail={formName}
          state="running"
        />
      );
    return (
      <ToolTrace
        icon={IconFileCheck}
        label="Opened form"
        detail={formName}
        state="complete"
      />
    );
  },
});

export function OpenFormToolUI() {
  return <OpenFormToolUIImpl />;
}

const SetFormFieldToolUIImpl = makeAssistantToolUI({
  toolName: "set_form_field",
  render: ({ args, status }) => {
    const field = typeof args.field === "string" ? args.field : "field";

    if (status.type === "running")
      return (
        <ToolTrace
          icon={IconPencil}
          label="Updating field"
          detail={field}
          state="running"
        />
      );
    return (
      <ToolTrace
        icon={IconPencil}
        label="Updated field"
        detail={field}
        state="complete"
      />
    );
  },
});

export function SetFormFieldToolUI() {
  return <SetFormFieldToolUIImpl />;
}

const SubmitFormToolUIImpl = makeAssistantToolUI({
  toolName: "submit_form",
  render: ({ result, status }) => {
    if (status.type === "running")
      return (
        <ToolTrace
          icon={IconCircleDashedCheck}
          label="Submitting form"
          state="running"
        />
      );

    const post =
      isRecord(result) && isPostDto(result.post) ? result.post : undefined;

    return (
      <div className="space-y-2">
        <ToolTrace
          icon={IconCircleDashedCheck}
          label={post ? "Post created" : "Form submitted"}
          state="complete"
        />
        {post && (
          <Link
            to="/posts/$postId"
            params={{ postId: post.id }}
            className="block border border-border bg-background p-4 transition-colors hover:bg-accent/50"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-foreground">
                {post.author.name ||
                  post.author.username ||
                  post.author.email}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                View post
                <IconExternalLink className="size-3.5" />
              </span>
            </div>
            {post.content.text && (
              <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {post.content.text}
              </p>
            )}
            {post.content.images?.[0] && (
              <img
                src={post.content.images[0].url}
                alt=""
                className="mt-3 max-h-48 w-full object-cover"
              />
            )}
          </Link>
        )}
      </div>
    );
  },
});

export function SubmitFormToolUI() {
  return <SubmitFormToolUIImpl />;
}

// Keep a compact trace in the message so tool calls remain visible while the
// sticky PlanProgressBar provides the richer live view.
const CreatePlanToolUIImpl = makeAssistantToolUI({
  toolName: "create_plan",
  render: ({ args, status }) => {
    if (status.type === "running") {
      return (
        <ToolTrace icon={IconListCheck} label="Creating plan" state="running" />
      );
    }

    const title = typeof args.title === "string" ? args.title : "plan";
    return (
      <ToolTrace
        icon={IconListCheck}
        label="Created plan"
        detail={title}
        state="complete"
      />
    );
  },
});

export function CreatePlanToolUI() {
  return <CreatePlanToolUIImpl />;
}

function PlanItemToolTrace({
  id,
  updateStatus,
  running,
}: {
  id?: string;
  updateStatus?: string;
  running: boolean;
}) {
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const planStates = useAtomValue(planStatesAtom);
  const plan = planStates[remoteId ?? localId];
  const item = plan?.items.find((candidate) => candidate.id === id);

  const label = running
    ? "Updating step"
    : updateStatus === "in_progress"
      ? "Started step"
      : updateStatus === "completed"
        ? "Completed step"
        : updateStatus === "skipped"
          ? "Skipped step"
          : "Updated step";

  return (
    <ToolTrace
      icon={running ? IconEdit : IconCheck}
      label={label}
      detail={item?.label ?? (id ? formatIdentifier(id) : "Step")}
      state={running ? "running" : "complete"}
    />
  );
}

const UpdatePlanItemToolUIImpl = makeAssistantToolUI({
  toolName: "update_plan_item",
  render: ({ args, status }) => {
    return (
      <PlanItemToolTrace
        id={typeof args.id === "string" ? args.id : undefined}
        updateStatus={
          typeof args.status === "string" ? args.status : undefined
        }
        running={status.type === "running"}
      />
    );
  },
});

export function UpdatePlanItemToolUI() {
  return <UpdatePlanItemToolUIImpl />;
}

export function PlanToolUIs() {
  return (
    <>
      <CreatePlanToolUI />
      <UpdatePlanItemToolUI />
    </>
  );
}

export function FormToolUIs() {
  return (
    <>
      <OpenFormToolUI />
      <SetFormFieldToolUI />
      <SubmitFormToolUI />
    </>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPostDto(value: unknown): value is PostDto {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isRecord(value.author) &&
    isRecord(value.content)
  );
}
