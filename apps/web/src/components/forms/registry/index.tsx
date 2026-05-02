import { PostCreationForm } from "../post-creation-form";

export const FormRegistry: Record<string, React.ComponentType<{ threadId: string }>> = {
  PostCreationForm: PostCreationForm,
};
