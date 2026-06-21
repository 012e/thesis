import { useMemo } from "react";
import {
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import { z } from "zod";

import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import { FormToolUIs } from "@/components/assistant-ui/chat-tool-uis";
import { useChatState } from "@/hooks/use-chat-state";
import { requestFormSubmission } from "@/lib/assistant/form-submission";
import { useAssistantPageReady } from "@/lib/assistant/page-readiness";

const FormNameSchema = z.enum(["PostCreationForm"]);

const OpenFormInput = z.object({
  formName: FormNameSchema.describe("The name of the form to open"),
});

const SetFormFieldInput = z.object({
  formName: FormNameSchema.describe("The name of the currently active form"),
  field: z
    .enum(["content", "kind", "showPollCreator", "poll"])
    .describe("The form field to update"),
  value: z
    .unknown()
    .describe(
      'The value to set. For content, provide only the post body with no separate title or Markdown title heading. For kind, use exactly "discussion" or "question".',
    ),
});

const SubmitFormInput = z.object({
  formName: FormNameSchema.describe("The name of the form to submit"),
});

export function ChatPageAssistantTools() {
  const { threadId, activeForm, draftData } = useChatState();

  useAssistantInstructions(
    `The user is on the Chat page and the page-local form tools are available. Current Active Form: ${activeForm ?? "None"}\nCurrent Form State: ${JSON.stringify(draftData)}\n\nUse open_form to select a form and set_form_field to edit it. PostCreationForm uses a Twitter-like single-body format: there is no separate title, so put only the post body in content and do not prefix it with a title or Markdown heading. Set kind to "question" for a help-seeking post that can accept an answer, or "discussion" for a regular post. Only use submit_form after the user confirms submission.`,
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
        'Update a field in the active Chat workspace form. PostCreationForm is a Twitter-like post with no title: use content for the body only, without a separate title or Markdown title heading, and kind with "discussion" or "question" for the post type.',
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
