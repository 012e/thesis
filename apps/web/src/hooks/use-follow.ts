import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { followUser, unfollowUser } from "@/lib/api/follows";

interface UseFollowOptions {
  userId: string;
  initialIsFollowing: boolean;
}

interface UseFollowReturn {
  isFollowing: boolean;
  isPending: boolean;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
  toggle: () => Promise<void>;
}

/**
 * Manages follow / unfollow state for a given user.
 *
 * Uses optimistic local state for instant UI feedback.
 * Invalidates the ["users", userId, "profile"] query on success so
 * any rendered follower counts refresh automatically.
 */
export function useFollow({
  userId,
  initialIsFollowing,
}: UseFollowOptions): UseFollowReturn {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, setIsPending] = useState(false);

  const follow = async () => {
    if (isPending || isFollowing) return;
    setIsPending(true);
    setIsFollowing(true); // optimistic
    try {
      await followUser(userId);
      await queryClient.invalidateQueries({
        queryKey: ["users", userId, "profile"],
      });
    } catch {
      setIsFollowing(false); // rollback
    } finally {
      setIsPending(false);
    }
  };

  const unfollow = async () => {
    if (isPending || !isFollowing) return;
    setIsPending(true);
    setIsFollowing(false); // optimistic
    try {
      await unfollowUser(userId);
      await queryClient.invalidateQueries({
        queryKey: ["users", userId, "profile"],
      });
    } catch {
      setIsFollowing(true); // rollback
    } finally {
      setIsPending(false);
    }
  };

  const toggle = () => (isFollowing ? unfollow() : follow());

  return { isFollowing, isPending, follow, unfollow, toggle };
}
