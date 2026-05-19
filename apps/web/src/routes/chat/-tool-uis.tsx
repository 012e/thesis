import { makeAssistantToolUI } from "@assistant-ui/react";
import type { ComponentType } from "react";
import {
  IconCheck,
  IconCircleDashedCheck,
  IconEdit,
  IconFileCheck,
  IconLoader2,
  IconListCheck,
  IconPencil,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

type ToolTraceProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  state: "running" | "complete";
};

function ToolTrace({ icon: Icon, label, detail, state }: ToolTraceProps) {
  const isRunning = state === "running";

  return (
    <div
      className={cn(
        "my-2 flex w-fit max-w-full items-center gap-2 border bg-background px-3 py-2 font-mono text-sm leading-none",
        isRunning
          ? "border-primary/30 text-primary"
          : "border-border/80 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center border bg-primary/10 text-primary",
          isRunning
            ? "border-primary/40"
            : "border-primary/30",
        )}
      >
        {isRunning ? (
          <IconLoader2 className="size-3.5 animate-spin" />
        ) : (
          <Icon className="size-3.5" />
        )}
      </span>
      <span className="min-w-0 truncate text-foreground">{label}</span>
      {detail && (
        <span className="min-w-0 truncate text-muted-foreground">{detail}</span>
      )}
    </div>
  );
}

export const OpenFormToolUI = makeAssistantToolUI({
  toolName: "open_form",
  render: ({ args, status }) => {
    const formName = typeof args.formName === "string" ? args.formName : "form";

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

export const SetFormFieldToolUI = makeAssistantToolUI({
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

export const SubmitFormToolUI = makeAssistantToolUI({
  toolName: "submit_form",
  render: ({ status }) => {
    if (status.type === "running")
      return (
        <ToolTrace
          icon={IconCircleDashedCheck}
          label="Submitting form"
          state="running"
        />
      );
    return (
      <ToolTrace
        icon={IconCircleDashedCheck}
        label="Form submitted"
        state="complete"
      />
    );
  },
});

// Keep a compact trace in the message so tool calls remain visible while the
// sticky PlanProgressBar provides the richer live view.
export const CreatePlanToolUI = makeAssistantToolUI({
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

export const UpdatePlanItemToolUI = makeAssistantToolUI({
  toolName: "update_plan_item",
  render: ({ args, status }) => {
    if (status.type === "running") {
      return <ToolTrace icon={IconEdit} label="Updating step" state="running" />;
    }

    const label = typeof args.id === "string" ? args.id : "step";
    return (
      <ToolTrace
        icon={IconCheck}
        label="Updated step"
        detail={label}
        state="complete"
      />
    );
  },
});
