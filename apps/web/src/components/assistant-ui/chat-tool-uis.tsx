import { makeAssistantToolUI, useAuiState } from "@assistant-ui/react";
import { useAtomValue } from "jotai";
import type { ComponentType } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleDashedCheck,
  IconEdit,
  IconFileCheck,
  IconListCheck,
  IconLoader2,
  IconPencil,
  IconQuestionMark,
} from "@tabler/icons-react";

import { UserContextQuestionnaireByRequestId } from "@/components/assistant-ui/user-context-questionnaire";
import { RailRow, ToolStep } from "@/components/assistant-ui/tool-timeline";
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

export function ToolTrace({ icon, label, detail, state }: ToolTraceProps) {
  return <ToolStep icon={icon} label={label} detail={detail} state={state} />;
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

    const postCreated = isRecord(result) && isRecord(result.post);

    return (
      <ToolTrace
        icon={IconCircleDashedCheck}
        label={postCreated ? "Post created" : "Form submitted"}
        state="complete"
      />
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
        updateStatus={typeof args.status === "string" ? args.status : undefined}
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

const RequestUserContextToolUIImpl = makeAssistantToolUI({
  toolName: "ask_questions",
  render: ({ args, result, status, toolCallId, isError }) => {
    const title = typeof args.title === "string" ? args.title : "Questions";
    const cancelled = isRecord(result) && result.status === "cancelled";
    const error =
      isError && isRecord(result) && typeof result.error === "string"
        ? result.error
        : undefined;

    const running = status.type === "running";
    const label = running
      ? "Waiting for your answers"
      : isError
        ? "Questionnaire failed"
        : cancelled
          ? "Questionnaire cancelled"
          : "Context provided";

    return (
      <RailRow
        node={
          running ? (
            <IconLoader2 className="size-4 animate-spin text-primary" />
          ) : isError ? (
            <IconAlertTriangle className="size-4 text-destructive" />
          ) : (
            <IconQuestionMark className="size-4 text-foreground" />
          )
        }
        contentClassName="pt-0.5"
      >
        <div
          className={cn(
            "text-sm leading-snug",
            isError ? "text-destructive" : "text-foreground",
          )}
        >
          {label}
        </div>
        <div className="mt-1">
          <span className="inline-flex max-w-full items-center truncate bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {title}
          </span>
        </div>
        {running && (
          <div className="mt-2">
            <UserContextQuestionnaireByRequestId requestId={toolCallId} />
          </div>
        )}
        {error && (
          <p className="mt-2 border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive">
            {error}
          </p>
        )}
      </RailRow>
    );
  },
});

export function RequestUserContextToolUI() {
  return <RequestUserContextToolUIImpl />;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
