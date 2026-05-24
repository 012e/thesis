import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { bookmarkPost, unbookmarkPost } from "@/lib/api/posts";
import { useToast as toast } from "@/hooks/use-toast";

interface UsePostBookmarkOptions {
  postId: string;
  initialBookmarked: boolean;
}

export function usePostBookmark({
  postId,
  initialBookmarked,
}: UsePostBookmarkOptions) {
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsBookmarked(initialBookmarked);
  }, [postId, initialBookmarked]);

  const invalidatePostQueries = () =>
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0];
        return (
          key === "post" ||
          key === "posts" ||
          key === "recommendations" ||
          key === "bookmarks" ||
          q.queryKey.includes("post") ||
          q.queryKey.includes("posts") ||
          q.queryKey.includes("bookmarks")
        );
      },
    });

  const bookmark = async () => {
    if (isPending || isBookmarked) return;
    setIsPending(true);
    setIsBookmarked(true);

    try {
      await bookmarkPost(postId);
      await invalidatePostQueries();
      toast.success("Saved to bookmarks");
    } catch {
      setIsBookmarked(false);
      toast.error("Could not save bookmark");
    } finally {
      setIsPending(false);
    }
  };

  const unbookmark = async () => {
    if (isPending || !isBookmarked) return;
    setIsPending(true);
    setIsBookmarked(false);

    try {
      await unbookmarkPost(postId);
      await invalidatePostQueries();
      toast.success("Removed from bookmarks");
    } catch {
      setIsBookmarked(true);
      toast.error("Could not remove bookmark");
    } finally {
      setIsPending(false);
    }
  };

  const toggle = () => (isBookmarked ? unbookmark() : bookmark());

  return { isBookmarked, isPending, bookmark, unbookmark, toggle };
}
