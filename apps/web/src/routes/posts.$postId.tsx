import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect } from "react";
import { z } from "zod";
import { Post } from "@/components/post";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { fetchPost } from "@/lib/api/posts";
import { useSession } from "@/hooks/use-session";
import { setGlobalAIContext } from "@/lib/atoms/ai-context";
import { CommentTree } from "@/components/comment-tree";
import { CommentEditor } from "@/components/comment-editor";
import { useCreateComment } from "@/hooks/use-comments";

const postSearchSchema = z.object({
  commentId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/posts/$postId")({
  validateSearch: postSearchSchema,
  beforeLoad: () => {
    setGlobalAIContext({ type: "none" });
  },
  component: SinglePostPage,
});

function SinglePostPage() {
  const { postId } = Route.useParams();
  const { commentId } = Route.useSearch();
  const { data: session } = useSession();

  const {
    data: post,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["posts", postId],
    queryFn: () => fetchPost(postId),
    enabled: !!session && !!postId,
    staleTime: 1000 * 60 * 2,
  });

  const { mutate: createComment, isPending: isCommentPending } =
    useCreateComment(postId);

  useEffect(() => {
    if (!post) {
      setGlobalAIContext({ type: "none" });
      return;
    }

    setGlobalAIContext({ type: "post", post });

    return () => {
      setGlobalAIContext({ type: "none" });
    };
  }, [post]);

  const handleCommentSubmit = (content: string) => {
    createComment({ content });
  };

  if (isPending) {
    return <PageSpinner />;
  }

  if (isError || !post) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="text-muted-foreground">
          {error?.message || "Post not found"}
        </div>
        <Link to="/">
          <Button variant="outline">
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back to feed
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 py-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="p-1.5">
            <IconArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      {/* Post content */}
      <Post post={post} />

      {/* Inline comments section */}
      <div className="border-t">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Comments</h2>
        </div>
        <CommentEditor
          onSubmit={handleCommentSubmit}
          isPending={isCommentPending}
          placeholder="Write a comment..."
        />
        <div className="px-4 py-4">
          <CommentTree
            postId={postId}
            focusedCommentId={commentId}
            isRoot
          />
        </div>
      </div>
    </>
  );
}
