import { useMemo } from "react";
import {
  makeAssistantToolUI,
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import {
  IconExternalLink,
  IconMessageCircle,
  IconNote,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";

const RenderPostInput = z.object({
  postId: z.string().uuid().describe("The UUID of the post to display"),
  preview: z
    .string()
    .optional()
    .describe("Optional short preview of the post content"),
});

const RenderCommentInput = z.object({
  postId: z.string().uuid().describe("The UUID of the comment's post"),
  commentId: z.string().uuid().describe("The UUID of the comment to display"),
  preview: z
    .string()
    .optional()
    .describe("Optional short preview of the comment content"),
});

const RenderPostToolUI = makeAssistantToolUI({
  toolName: "render_post",
  render: ({ args }) => {
    if (typeof args.postId !== "string") return null;

    return (
      <ContentReferenceLink
        postId={args.postId}
        icon={IconNote}
        label="View post"
        preview={typeof args.preview === "string" ? args.preview : undefined}
      />
    );
  },
});

const RenderCommentToolUI = makeAssistantToolUI({
  toolName: "render_comment",
  render: ({ args }) => {
    if (
      typeof args.postId !== "string" ||
      typeof args.commentId !== "string"
    ) {
      return null;
    }

    return (
      <ContentReferenceLink
        postId={args.postId}
        commentId={args.commentId}
        icon={IconMessageCircle}
        label="View comment"
        preview={typeof args.preview === "string" ? args.preview : undefined}
      />
    );
  },
});

export function ContentReferenceAssistantTools() {
  useAssistantInstructions(
    "The render_post and render_comment client tools are always available. After creating or presenting a specific post or comment, call the matching render tool so the user gets a clickable link. Use render_comment after a comment is created.",
  );

  const renderPostTool = useMemo(
    () => ({
      toolName: "render_post",
      description:
        "Render a clickable link to a specific post in the chat UI. Call this after creating or presenting a specific post.",
      parameters: RenderPostInput,
      execute: (input: z.infer<typeof RenderPostInput>) => ({
        status: "success",
        ...input,
      }),
    }),
    [],
  );

  const renderCommentTool = useMemo(
    () => ({
      toolName: "render_comment",
      description:
        "Render a clickable link to a specific comment in the chat UI. Call this after creating or presenting a specific comment.",
      parameters: RenderCommentInput,
      execute: (input: z.infer<typeof RenderCommentInput>) => ({
        status: "success",
        ...input,
      }),
    }),
    [],
  );

  useAssistantTool(renderPostTool);
  useAssistantTool(renderCommentTool);

  return (
    <>
      <RenderPostToolUI />
      <RenderCommentToolUI />
    </>
  );
}

function ContentReferenceLink({
  postId,
  commentId,
  icon: Icon,
  label,
  preview,
}: {
  postId: string;
  commentId?: string;
  icon: typeof IconNote;
  label: string;
  preview?: string;
}) {
  return (
    <Link
      to="/posts/$postId"
      params={{ postId }}
      search={commentId ? { commentId } : {}}
      className="flex w-full items-center gap-3 border border-border bg-background px-4 py-3 transition-colors hover:bg-accent/50"
    >
      <Icon className="size-4 shrink-0 text-foreground" />
      <span className="min-w-0 grow">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        {preview && (
          <span className="mt-1 block truncate text-sm text-muted-foreground">
            {preview}
          </span>
        )}
      </span>
      <IconExternalLink className="size-4 shrink-0 text-primary" />
    </Link>
  );
}
