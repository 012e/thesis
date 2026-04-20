import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <DialogContent className="flex flex-col p-0 max-w-2xl max-h-[80vh]">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex overflow-hidden flex-col flex-1">
          {/* Comment Editor at the top */}
          <CommentEditor
            onSubmit={handleCommentSubmit}
            isPending={isPending}
            placeholder="Write a comment..."
          />

          {/* Comments list — loaded lazily when dialog opens */}
          <ScrollArea className="flex-1 px-4">
            <div className="pb-4">
              <CommentTree postId={post.id} isRoot />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
