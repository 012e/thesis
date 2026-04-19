import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconTrash } from "@tabler/icons-react";
import type { CommentType } from "@repo/rest-contracts";
import { useSession } from "@/hooks/use-session";
import { useDeleteComment } from "@/hooks/use-comments";

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

  const isOwner = session?.user?.id === comment.authorId;

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
        <AvatarImage src={comment.author.image ?? undefined} alt={comment.author.name || comment.author.username || undefined} />
        <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
          {authorInitial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-center mb-1">
          <span className="text-sm font-semibold truncate">
            {comment.author.name || comment.author.username || "Anonymous"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            @{comment.author.username || comment.author.email.split("@")[0]}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(comment.createdAt)}
          </span>
        </div>
        <div className="mb-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </div>
        <div className="flex gap-3 items-center">
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
