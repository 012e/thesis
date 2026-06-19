import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const openFormTool = createTool({
  id: "open_form",
  description:
    "Selects and opens a specific form for the user to view or edit in the split-screen view.",
  inputSchema: z.object({
    formName: z
      .enum(["PostCreationForm"])
      .describe("The name of the form to open"),
  }),
  execute: async () => {
    return { status: "forwarded_to_client" };
  },
});

export const setFormFieldTool = createTool({
  id: "set_form_field",
  description:
    "Updates a field in the active form. For PostCreationForm, write the post text to the content field.",
  inputSchema: z.object({
    formName: z
      .enum(["PostCreationForm"])
      .describe("The name of the currently active form"),
    field: z
      .enum(["content", "showPollCreator", "poll"])
      .describe(
        "The PostCreationForm field to update. Use content for the post text.",
      ),
    value: z.any().describe("The value to set the field to"),
  }),
  execute: async () => {
    return { status: "forwarded_to_client" };
  },
});

export const submitFormTool = createTool({
  id: "submit_form",
  description:
    "Submits the currently active form. Only call this after ensuring all required fields are filled and the user confirms they want to submit.",
  inputSchema: z.object({
    formName: z.string().describe("The name of the form to submit"),
  }),
  execute: async () => {
    return { status: "forwarded_to_client" };
  },
});
