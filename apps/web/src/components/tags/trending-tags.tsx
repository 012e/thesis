import { Link } from "@tanstack/react-router";
import { Hash } from "lucide-react";
import { useTrendingTags } from "@/hooks/use-trending-tags";
import { Spinner } from "@/components/ui/spinner";

export function TrendingTags() {
  const { data, isLoading, isError } = useTrendingTags();

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-bold text-base mb-3">Trending</h3>
        <div className="flex justify-center py-4">
          <Spinner className="w-4 h-4" />
        </div>
      </div>
    );
  }

  if (isError || !data?.items?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card">
      <h3 className="font-bold text-base px-4 pt-3 pb-2">Trending</h3>
      <div className="divide-y">
        {data.items.map((tag) => (
          <Link
            key={tag.slug}
            to="/tags/$slug"
            params={{ slug: tag.slug }}
            className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
          >
            <Hash className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">
                {tag.displayName}
              </span>
              <span className="text-xs text-muted-foreground">
                {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
