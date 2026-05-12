import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CommentEditor } from "./comment-editor";
import { CommentTree } from "./comment-tree";
import { useCreateComment } from "@/hooks/use-comments";
import type { PostDto } from "@repo/shared-dto";

export interface CommentsDialogProps {
  post: PostDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsDialog({
  post,
  open,
  onOpenChange,
}: CommentsDialogProps) {
  const { mutate: createComment, isPending } = useCreateComment(post.id);

  const handleCommentSubmit = (content: string) => {
    createComment({ content });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[80dvh] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0"
        style={{
          width: "min(calc(100dvw - 2rem), 44rem)",
          maxWidth: "min(calc(100dvw - 2rem), 44rem)",
        }}
      >
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 overflow-hidden flex-col flex-1">
          {/* Comment Editor at the top */}
          <div className="shrink-0">
            <CommentEditor
              onSubmit={handleCommentSubmit}
              isPending={isPending}
              placeholder="Write a comment..."
            />
          </div>

          {/* Comments list — loaded lazily when dialog opens */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
            <div className="pt-5 pb-4">
              <CommentTree postId={post.id} isRoot />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
