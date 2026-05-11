import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  subscribeToPost,
  unsubscribeFromPost,
} from "@/lib/api/posts";
import { useToast as toast } from "@/hooks/use-toast";

interface UsePostSubscriptionOptions {
  postId: string;
  initialSubscribed: boolean;
}

export function usePostSubscription({
  postId,
  initialSubscribed,
}: UsePostSubscriptionOptions) {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setIsSubscribed(initialSubscribed);
    }
  }, [initialSubscribed, isPending]);

  const subscribe = async () => {
    if (isPending || isSubscribed) return;
    setIsPending(true);
    setIsSubscribed(true);

    try {
      await subscribeToPost(postId);
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0];
          return key === "post" || key === "posts" || q.queryKey.includes("post");
        },
      });
      toast.success("Subscribed to post notifications");
    } catch (error) {
      setIsSubscribed(false);
      toast.error(
        `Failed to subscribe: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsPending(false);
    }
  };

  const unsubscribe = async () => {
    if (isPending || !isSubscribed) return;
    setIsPending(true);
    setIsSubscribed(false);

    try {
      await unsubscribeFromPost(postId);
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0];
          return key === "post" || key === "posts" || q.queryKey.includes("post");
        },
      });
      toast.success("Unsubscribed from post notifications");
    } catch (error) {
      setIsSubscribed(true);
      toast.error(
        `Failed to unsubscribe: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsPending(false);
    }
  };

  const toggle = () => (isSubscribed ? unsubscribe() : subscribe());

  return { isSubscribed, isPending, subscribe, unsubscribe, toggle };
}
