import { makeAssistantToolUI } from "@assistant-ui/react";

export const OpenFormToolUI = makeAssistantToolUI({
  toolName: "open_form",
  render: ({ args, status }) => {
    if (status.type === "running")
      return (
        <div className="text-sm text-blue-500">
          Opening {args.formName as string}...
        </div>
      );
    return (
      <div className="text-sm text-green-600">
        Opened {args.formName as string}
      </div>
    );
  },
});

export const SetFormFieldToolUI = makeAssistantToolUI({
  toolName: "set_form_field",
  render: ({ args, status }) => {
    if (status.type === "running")
      return (
        <div className="text-sm text-blue-500">
          Updating {args.field as string}...
        </div>
      );
    return (
      <div className="text-sm text-green-600">
        Updated {args.field as string}
      </div>
    );
  },
});

export const SubmitFormToolUI = makeAssistantToolUI({
  toolName: "submit_form",
  render: ({ status }) => {
    if (status.type === "running")
      return <div className="text-sm text-blue-500">Submitting form...</div>;
    return <div className="text-sm text-green-600">Form submitted</div>;
  },
});

// Keep a compact trace in the message so tool calls remain visible while the
// sticky PlanProgressBar provides the richer live view.
export const CreatePlanToolUI = makeAssistantToolUI({
  toolName: "create_plan",
  render: ({ args, status }) => {
    if (status.type === "running") {
      return <div className="text-sm text-blue-500">Creating plan...</div>;
    }

    const title = typeof args.title === "string" ? args.title : "plan";
    return <div className="text-sm text-green-600">Created {title}</div>;
  },
});

export const UpdatePlanItemToolUI = makeAssistantToolUI({
  toolName: "update_plan_item",
  render: ({ args, status }) => {
    if (status.type === "running") {
      return <div className="text-sm text-blue-500">Updating step...</div>;
    }

    const label = typeof args.id === "string" ? args.id : "step";
    return <div className="text-sm text-green-600">Updated {label}</div>;
  },
});
