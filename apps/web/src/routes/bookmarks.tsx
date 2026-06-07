import { createFileRoute, Link } from "@tanstack/react-router";
import { IconBookmark } from "@tabler/icons-react";
import { PostsFeed } from "@/components/posts-feed";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
});

function BookmarksPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const bookmarks = useBookmarks({
    userId: userId ?? "",
    limit: 20,
    enabled: !!userId,
  });

  if (!userId) {
    return (
      <div className="flex justify-center p-12">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  const allPosts = bookmarks.data?.pages.flatMap((p) => p.items) ?? [];
  const isEmpty = !bookmarks.isLoading && allPosts.length === 0;

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md px-4 py-3">
        <h1 className="text-xl font-bold">Bookmarks</h1>
        <p className="text-sm text-muted-foreground">
          Only you can see your saved posts
        </p>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground select-none">
          <IconBookmark className="w-12 h-12 opacity-20" />
          <p className="text-lg font-medium">No bookmarks yet</p>
          <p className="text-sm opacity-70">
            Save posts to revisit them later.
          </p>
          <Link to="/explore">
            <Button variant="outline" className="mt-2">
              Explore posts
            </Button>
          </Link>
        </div>
      ) : (
        <PostsFeed
          data={bookmarks.data}
          queryKey={["bookmarks", userId]}
          fetchNextPage={bookmarks.fetchNextPage}
          hasNextPage={bookmarks.hasNextPage}
          isFetchingNextPage={bookmarks.isFetchingNextPage}
          isLoading={bookmarks.isLoading}
          isError={bookmarks.isError}
          error={bookmarks.error}
          loadingLabel="Loading bookmarks..."
          errorLabel="Failed to load bookmarks"
          emptyLabel="No bookmarks yet"
        />
      )}
    </>
  );
}
