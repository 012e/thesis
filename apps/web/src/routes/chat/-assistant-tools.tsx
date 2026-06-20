import { useMemo } from "react";
import {
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import { z } from "zod";
import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import { FormToolUIs } from "@/components/assistant-ui/chat-tool-uis";
import { useAssistantPageReady } from "@/lib/assistant/page-readiness";
import { requestFormSubmission } from "@/lib/assistant/form-submission";
import { useChatState } from "@/hooks/use-chat-state";

const FormNameSchema = z.enum(["PostCreationForm"]);

const OpenFormInput = z.object({
  formName: FormNameSchema.describe("The name of the form to open"),
});

const SetFormFieldInput = z.object({
  formName: FormNameSchema.describe("The name of the currently active form"),
  field: z
    .enum(["content", "showPollCreator", "poll"])
    .describe("The form field to update"),
  value: z.unknown().describe("The value to set the field to"),
});

const SubmitFormInput = z.object({
  formName: FormNameSchema.describe("The name of the form to submit"),
});

export function ChatPageAssistantTools() {
  const { threadId, activeForm, draftData } = useChatState();

  useAssistantInstructions(
    `The user is on the Chat page and the page-local form tools are available. Current Active Form: ${activeForm ?? "None"}\nCurrent Form State: ${JSON.stringify(draftData)}\n\nUse open_form to select a form and set_form_field to edit it. Only use submit_form after the user confirms submission.`,
  );

  const openFormTool = useMemo(
    () => ({
      toolName: "open_form",
      description:
        "Open a supported form in the Chat split-screen workspace. This tool is only available while the Chat page is mounted.",
      parameters: OpenFormInput,
      execute: ({ formName }: z.infer<typeof OpenFormInput>) => ({
        status: "success",
        formName,
        message: "The form was opened in the Chat workspace.",
      }),
    }),
    [],
  );

  const setFormFieldTool = useMemo(
    () => ({
      toolName: "set_form_field",
      description:
        "Update a field in the active Chat workspace form. For PostCreationForm, use content for the post text.",
      parameters: SetFormFieldInput,
      execute: ({
        formName,
        field,
      }: z.infer<typeof SetFormFieldInput>) => ({
        status: "success",
        formName,
        field,
        message: "The form field was updated.",
      }),
    }),
    [],
  );

  const submitFormTool = useMemo(
    () => ({
      toolName: "submit_form",
      description:
        "Submit the active Chat workspace form. Only call this after all required fields are filled and the user confirms submission.",
      parameters: SubmitFormInput,
      execute: async ({ formName }: z.infer<typeof SubmitFormInput>) => {
        if (activeForm !== formName) {
          throw new Error(`${formName} is not currently open.`);
        }

        const post = await requestFormSubmission(threadId);

        return {
          status: "success",
          formName,
          post,
          message: "The post was created successfully.",
        };
      },
    }),
    [activeForm, threadId],
  );

  useAssistantTool(openFormTool);
  useAssistantTool(setFormFieldTool);
  useAssistantTool(submitFormTool);
  useAssistantPageReady("chat");

  return (
    <>
      <FormToolUIs />
      <ChatToolStateSync syncForms syncPlans={false} />
    </>
  );
}
