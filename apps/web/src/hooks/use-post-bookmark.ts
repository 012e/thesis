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
      predicate: (q) =>
        q.queryKey.includes("post") ||
        q.queryKey.includes("posts") ||
        q.queryKey.includes("recommendations"),
    });

  const save = async () => {
    if (isPending || isBookmarked) return;
    setIsPending(true);
    setIsBookmarked(true);
    toast.success("Saved to bookmarks");

    try {
      await bookmarkPost(postId);
      await invalidatePostQueries();
    } catch {
      setIsBookmarked(false);
      toast.error("Could not save bookmark");
    } finally {
      setIsPending(false);
    }
  };

  const remove = async () => {
    if (isPending || !isBookmarked) return;
    setIsPending(true);
    setIsBookmarked(false);
    toast.success("Removed from bookmarks");

    try {
      await unbookmarkPost(postId);
      await invalidatePostQueries();
    } catch {
      setIsBookmarked(true);
      toast.error("Could not remove bookmark");
    } finally {
      setIsPending(false);
    }
  };

  const toggle = () => (isBookmarked ? remove() : save());

  return { isBookmarked, isPending, toggle };
}
