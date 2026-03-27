import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommentEditor } from "./comment-editor";
import { CommentTree } from "./comment-tree";
import { useComments, useCreateComment } from "@/hooks/use-comments";
import { IconLoader2, IconAlertCircle } from "@tabler/icons-react";
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
  const { data: comments, isLoading, error } = useComments(post.id);
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

          {/* Comments list */}
          <ScrollArea className="flex-1 px-4">
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <IconLoader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="flex gap-2 items-center py-8 text-destructive">
                <IconAlertCircle className="w-5 h-5" />
                <p>Failed to load comments. Please try again.</p>
              </div>
            )}

            {comments && !isLoading && !error && (
              <div className="pb-4">
                <CommentTree comments={comments} postId={post.id} />
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
