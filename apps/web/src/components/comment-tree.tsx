import { useEffect, useState } from "react";
import { CommentItem } from "./comment-item";
import { CommentEditor } from "./comment-editor";
import type { CommentType } from "@repo/rest-contracts";
import { useComments, useCreateReply } from "@/hooks/use-comments";
import { IconLoader2, IconAlertCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface CommentTreeProps {
  postId: string;
  /** Scrolls the matching comment into view and highlights it. */
  focusedCommentId?: string;
  /** When true, fetches comments internally. Pass for the root render (e.g. inside CommentsDialog). */
  isRoot?: boolean;
  /** Supply comments directly (used when isRoot is false, or in Storybook). */
  comments?: CommentType[];
}

interface CommentNode extends CommentType {
  replies: CommentNode[];
}

// Build a tree structure from flat comment list
function buildCommentTree(comments: CommentType[]): CommentNode[] {
  const commentMap = new Map<string, CommentNode>();
  const rootComments: CommentNode[] = [];

  // Initialize all comments with empty replies array
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Build the tree
  comments.forEach((comment) => {
    const node = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(node);
      } else {
        // Parent not found (might be deleted), treat as root
        rootComments.push(node);
      }
    } else {
      rootComments.push(node);
    }
  });

  // Sort root comments by creation date (newest first)
  rootComments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Recursively sort replies (oldest first for replies to maintain conversation flow)
  const sortReplies = (node: CommentNode) => {
    node.replies.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    node.replies.forEach(sortReplies);
  };
  rootComments.forEach(sortReplies);

  return rootComments;
}

interface CommentNodeRendererProps {
  node: CommentNode;
  postId: string;
  level: number;
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  onCancelReply: () => void;
  focusedCommentId?: string;
}

function CommentNodeRenderer({
  node,
  postId,
  level,
  onReply,
  replyingTo,
  onCancelReply,
  focusedCommentId,
}: CommentNodeRendererProps) {
  const { mutate: createReply, isPending } = useCreateReply(postId);

  const handleReplySubmit = (content: string) => {
    createReply(
      { commentId: node.id, content },
      {
        onSuccess: () => {
          onCancelReply();
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div
        id={`comment-${node.id}`}
        className={cn(
          "scroll-mt-20 transition-colors",
          focusedCommentId === node.id && "bg-primary/10 ring-1 ring-primary/30",
        )}
      >
        <CommentItem
          comment={node}
          postId={postId}
          onReply={onReply}
          level={level}
        />
      </div>
      {replyingTo === node.id && (
        <div style={{ marginLeft: `${Math.min(level + 1, 4) * 16}px` }}>
          <CommentEditor
            onSubmit={handleReplySubmit}
            onCancel={onCancelReply}
            isPending={isPending}
            placeholder="Write a reply..."
            autoFocus
            submitLabel="Reply"
            isReply
          />
        </div>
      )}
      {node.replies.length > 0 && (
        <div className="space-y-3">
          {node.replies.map((reply) => (
            <CommentNodeRenderer
              key={reply.id}
              node={reply}
              postId={postId}
              level={level + 1}
              onReply={onReply}
              replyingTo={replyingTo}
              onCancelReply={onCancelReply}
              focusedCommentId={focusedCommentId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentTreeInnerProps {
  comments: CommentType[];
  postId: string;
  focusedCommentId?: string;
}

function CommentTreeInner({
  comments,
  postId,
  focusedCommentId,
}: CommentTreeInnerProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const tree = buildCommentTree(comments);

  useEffect(() => {
    if (!focusedCommentId) return;

    document
      .getElementById(`comment-${focusedCommentId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedCommentId, comments]);

  const handleReply = (commentId: string) => {
    setReplyingTo((prev) => (prev === commentId ? null : commentId));
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  if (tree.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tree.map((node) => (
        <CommentNodeRenderer
          key={node.id}
          node={node}
          postId={postId}
          level={0}
          onReply={handleReply}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          focusedCommentId={focusedCommentId}
        />
      ))}
    </div>
  );
}

export function CommentTree({
  postId,
  focusedCommentId,
  isRoot = false,
  comments,
}: CommentTreeProps) {
  const query = useComments(postId, { enabled: isRoot });

  if (isRoot) {
    if (query.isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <IconLoader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (query.error) {
      return (
        <div className="flex gap-2 items-center py-8 text-destructive">
          <IconAlertCircle className="w-5 h-5" />
          <p>Failed to load comments. Please try again.</p>
        </div>
      );
    }

    return (
      <CommentTreeInner
        comments={query.data ?? []}
        postId={postId}
        focusedCommentId={focusedCommentId}
      />
    );
  }

  return (
    <CommentTreeInner
      comments={comments ?? []}
      postId={postId}
      focusedCommentId={focusedCommentId}
    />
  );
}
