import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Hash } from "lucide-react";
import { PostsFeed } from "@/components/posts-feed";
import { useTag } from "@/hooks/use-tag";
import { useTagPosts } from "@/hooks/use-tag-posts";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tagSearchSchema = z.object({
  sort: z.enum(["top", "latest"]).optional(),
});

export const Route = createFileRoute("/tags/$slug")({
  validateSearch: tagSearchSchema,
  component: TagPage,
});

function TagPage() {
  const { slug } = Route.useParams();
  const { sort = "top" } = Route.useSearch();
  const navigate = useNavigate();

  const {
    data: tag,
    isLoading: isTagLoading,
    isError: isTagError,
  } = useTag(slug);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isPostsLoading,
    isError: isPostsError,
    error: postsError,
  } = useTagPosts(slug, sort as "top" | "latest");

  const handleSortChange = (newSort: "top" | "latest") => {
    navigate({
      to: "/tags/$slug",
      params: { slug },
      search: { sort: newSort },
      replace: true,
    });
  };

  if (isTagLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (isTagError || !tag) {
    return (
      <div className="p-8 text-center">
        <Hash className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold mb-2">Tag not found</h2>
        <p className="text-muted-foreground mb-4">
          The tag #{slug} doesn't exist yet.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/explore" })}>
          Search instead
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">#{tag.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
            </p>
          </div>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex border-b">
        <button
          type="button"
          className={cn(
            "flex-1 py-3 text-center text-sm font-medium transition-colors hover:bg-muted/50",
            sort === "top"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground",
          )}
          onClick={() => handleSortChange("top")}
        >
          Top
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 py-3 text-center text-sm font-medium transition-colors hover:bg-muted/50",
            sort === "latest"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground",
          )}
          onClick={() => handleSortChange("latest")}
        >
          Latest
        </button>
      </div>

      {/* Feed */}
      <PostsFeed
        data={data}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isPostsLoading}
        isError={isPostsError}
        error={postsError}
        loadingLabel="Loading tag posts..."
        errorLabel="Failed to load posts"
        emptyLabel={`No posts with #${tag.displayName} yet.`}
      />
    </div>
  );
}
