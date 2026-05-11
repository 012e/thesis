import { PostCreationForm } from "../post-creation-form";

export type FormConfig = {
  form: React.ComponentType<{ threadId: string }>;
  layout: "vertical" | "horizontal";
};

export const FormRegistry: Record<string, FormConfig> = {
  PostCreationForm: {
    form: PostCreationForm,
    layout: "horizontal",
  },
};
