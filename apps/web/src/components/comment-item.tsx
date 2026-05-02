import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostMarkdown } from "@/components/ui/post-markdown";
import { IconTrash, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import type { CommentType } from "@repo/rest-contracts";
import { useSession } from "@/hooks/use-session";
import { useDeleteComment } from "@/hooks/use-comments";
import { useCommentReaction } from "@/hooks/use-comment-reaction";

export interface CommentItemProps {
  comment: CommentType;
  postId: string;
  onReply?: (commentId: string) => void;
  level?: number;
}

export function CommentItem({
  comment,
  postId,
  onReply,
  level = 0,
}: CommentItemProps) {
  const { data: session } = useSession();
  const { mutate: deleteComment, isPending: isDeleting } =
    useDeleteComment(postId);
  const { mutate: react, isPending: isVoting } = useCommentReaction(postId);

  const isOwner = session?.user?.id === comment.authorId;

  const userVote = comment.currentUserReaction;
  const upvoteCount = comment.upvoteCount;
  const downvoteCount = comment.downvoteCount;

  const handleVote = (type: "upvote" | "downvote") => {
    react({
      commentId: comment.id,
      type: userVote === type ? null : type,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteComment(comment.id);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return "now";
  };

  const authorInitial = (
    comment.author.name?.[0] ||
    comment.author.username?.[0] ||
    comment.author.email[0]
  ).toUpperCase();

  // Limit indentation depth
  const indentLevel = Math.min(level, 4);

  return (
    <div className="flex gap-2" style={{ marginLeft: `${indentLevel * 16}px` }}>
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage
          src={comment.author.image ?? undefined}
          alt={comment.author.name || comment.author.username || undefined}
        />
        <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
          {authorInitial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-center mb-1">
          <span className="text-sm font-semibold truncate">
            {comment.author.name || comment.author.username || "Anonymous"}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            @{comment.author.username || comment.author.email.split("@")[0]}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(comment.createdAt)}
          </span>
        </div>
        <div className="mb-2 text-sm leading-relaxed">
          <PostMarkdown content={comment.content} />
        </div>
        <div className="flex gap-3 items-center">
          {/* Reaction pill */}
          <div className="flex gap-1 items-center py-0.5 px-1.5 rounded-full bg-muted/50">
            <button
              onClick={() => handleVote("upvote")}
              disabled={isVoting}
              className={`p-1 rounded-full transition-all ${
                userVote === "upvote"
                  ? "text-orange-600 bg-orange-600/10"
                  : "text-muted-foreground hover:text-orange-600 hover:bg-orange-600/10"
              }`}
            >
              <IconArrowUp className="w-3 h-3" />
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              {upvoteCount - downvoteCount}
            </span>
            <button
              onClick={() => handleVote("downvote")}
              disabled={isVoting}
              className={`p-1 rounded-full transition-all ${
                userVote === "downvote"
                  ? "text-blue-600 bg-blue-600/10"
                  : "text-muted-foreground hover:text-blue-600 hover:bg-blue-600/10"
              }`}
            >
              <IconArrowDown className="w-3 h-3" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
            onClick={() => onReply?.(comment.id)}
          >
            Reply
          </Button>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <IconTrash className="w-3 h-3 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
