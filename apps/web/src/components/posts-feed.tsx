import { useEffect, useRef } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import type { PostDto } from "@repo/shared-dto";
import { Post } from "@/components/post";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePostInViewTracker } from "@/hooks/use-post-in-view";
import {
  clearCreatedPostGlow,
  createdPostAtom,
  createdPostGlowIdAtom,
} from "@/lib/atoms/created-post";
import { cn } from "@/lib/utils";

interface PostsPageData {
  items: PostDto[];
  nextCursor: string | null;
}

export interface PostsFeedProps {
  data: InfiniteData<PostsPageData> | undefined;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  loadingLabel: string;
  loadingMoreLabel?: string;
  errorLabel: string;
  emptyLabel: string;
}

function PostFeedItem({
  post,
  shouldGlow,
  isCreatedPost,
}: {
  post: PostDto;
  shouldGlow: boolean;
  isCreatedPost: boolean;
}) {
  return (
    <div
      data-post-id={post.id}
      className={cn(
        "relative overflow-hidden",
        isCreatedPost && "shadow-[inset_0_0_0_1px_var(--primary)]",
      )}
    >
      {shouldGlow && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-primary/20 shadow-[0_0_24px_0_color-mix(in_oklch,var(--primary)_24%,transparent)]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          onAnimationComplete={() => clearCreatedPostGlow(post.id)}
        />
      )}
      <Post post={post} />
    </div>
  );
}

export function PostsFeed({
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
  error,
  loadingLabel,
  loadingMoreLabel = "Loading more posts...",
  errorLabel,
  emptyLabel,
}: PostsFeedProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const createdPost = useAtomValue(createdPostAtom);
  const createdPostGlowId = useAtomValue(createdPostGlowIdAtom);

  const fetchedPosts = data?.pages.flatMap((page) => page.items) ?? [];
  const allPosts = createdPost
    ? [
        createdPost,
        ...fetchedPosts.filter((post) => post.id !== createdPost.id),
      ]
    : fetchedPosts;

  // Track which post is most visible and sync to the global AI context.
  usePostInViewTracker(allPosts);

  // Infinite scroll — load next page when the sentinel div enters the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12" aria-label={loadingLabel}>
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="divide-y">
      {isError && (
        <div className="p-8 text-center text-destructive">
          {errorLabel}: {error?.message}
        </div>
      )}
      {allPosts.length === 0 && !isError && (
        <div className="p-8 text-center text-muted-foreground">
          {emptyLabel}
        </div>
      )}
      {allPosts.map((post) => (
        <PostFeedItem
          key={post.id}
          post={post}
          shouldGlow={createdPostGlowId === post.id}
          isCreatedPost={createdPost?.id === post.id}
        />
      ))}
      <div ref={observerTarget} className="min-h-px">
        {isFetchingNextPage && (
          <div
            className="flex justify-center p-4"
            aria-label={loadingMoreLabel}
          >
            <Spinner className="w-5 h-5" />
          </div>
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <div className="p-4 text-center text-muted-foreground">
            You&apos;ve reached the end
          </div>
        )}
      </div>
      {hasNextPage && !isFetchingNextPage && (
        <div className="p-4 text-center">
          <Button onClick={() => fetchNextPage()} variant="outline">
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
