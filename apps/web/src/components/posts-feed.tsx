import { useEffect, useRef } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import type { PostDto } from "@repo/shared-dto";
import { Post } from "@/components/post";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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

  const allPosts = data?.pages.flatMap((page) => page.items) ?? [];

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
        <Post key={post.id} post={post} />
      ))}
      <div ref={observerTarget} className="min-h-px">
        {isFetchingNextPage && (
          <div className="flex justify-center p-4" aria-label={loadingMoreLabel}>
            <Spinner className="w-5 h-5" />
          </div>
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <div className="p-4 text-center text-muted-foreground">
            You've reached the end
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
