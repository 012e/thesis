import { createFileRoute } from "@tanstack/react-router";
import { PostComposer } from "@/components/ui/post-composer";
import { Post } from "@/components/post";
import { useRecommendations } from "@/hooks/use-recommendations";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useRecommendations({ limit: 20 });

  const observerTarget = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
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

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="flex items-center">
          <button className="flex-1 py-4 font-bold text-center transition-colors hover:bg-accent">
            For you
          </button>
          <button className="flex-1 py-4 font-semibold text-center transition-colors text-muted-foreground hover:bg-accent">
            Following
          </button>
        </div>
      </div>
      <PostComposer />
      <div className="divide-y">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">
            Loading recommendations...
          </div>
        )}
        {isError && (
          <div className="p-8 text-center text-destructive">
            Error loading recommendations: {error?.message}
          </div>
        )}
        {allPosts.length === 0 && !isLoading && !isError && (
          <div className="p-8 text-center text-muted-foreground">
            No posts available yet
          </div>
        )}
        {allPosts.map((post) => (
          <Post key={post.id} post={post} />
        ))}
        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-20">
          {isFetchingNextPage && (
            <div className="p-4 text-center text-muted-foreground">
              Loading more posts...
            </div>
          )}
          {!hasNextPage && allPosts.length > 0 && (
            <div className="p-4 text-center text-muted-foreground">
              You've reached the end
            </div>
          )}
        </div>
        {/* Manual load more button (optional fallback) */}
        {hasNextPage && !isFetchingNextPage && (
          <div className="p-4 text-center">
            <Button onClick={() => fetchNextPage()} variant="outline">
              Load more
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
