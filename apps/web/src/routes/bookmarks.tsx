import { createFileRoute } from "@tanstack/react-router";
import { PostsFeed } from "@/components/posts-feed";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { useBookmarkedPosts } from "@/hooks/use-bookmarked-posts";
import { setGlobalAIContext } from "@/lib/atoms/ai-context";

export const Route = createFileRoute("/bookmarks")({
  beforeLoad: () => {
    setGlobalAIContext({ type: "page", page: "bookmarks", label: "Bookmarks" });
  },
  component: BookmarksPage,
});

function BookmarksPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const bookmarks = useBookmarkedPosts({
    userId,
    limit: 20,
    enabled: Boolean(userId),
  });

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">
            Only you can see your saved posts
          </p>
        </div>
      </div>
      <PostsFeed
        data={bookmarks.data}
        fetchNextPage={bookmarks.fetchNextPage}
        hasNextPage={bookmarks.hasNextPage}
        isFetchingNextPage={bookmarks.isFetchingNextPage}
        isLoading={bookmarks.isLoading}
        isError={bookmarks.isError}
        error={bookmarks.error}
        loadingLabel="Loading bookmarks..."
        errorLabel="Error loading bookmarks"
        emptyLabel="No bookmarks yet"
      />
      {!bookmarks.isLoading &&
        !bookmarks.isError &&
        (bookmarks.data?.pages.flatMap((page) => page.items).length ?? 0) ===
          0 && (
          <div className="px-4 pb-10 -mt-4 text-center">
            <p className="text-muted-foreground mb-4">
              Save posts to revisit them later.
            </p>
            <Button variant="outline" onClick={() => void window.location.assign("/explore")}>
              Explore posts
            </Button>
          </div>
        )}
    </>
  );
}
