import { createFileRoute, Link } from "@tanstack/react-router";
import { PostComposer } from "@/components/ui/post-composer";
import { PostsFeed } from "@/components/posts-feed";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useFollowingPosts } from "@/hooks/use-following-posts";
import { useTagPreferences } from "@/hooks/use-tag-preferences";
import { setGlobalAIContext } from "@/lib/atoms/ai-context";
import { useState } from "react";

type FeedTab = "for-you" | "following";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    setGlobalAIContext({ type: "none" });
  },
  component: Index,
});

export function Index() {
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [refreshingTab, setRefreshingTab] = useState<FeedTab | null>(null);
  const recommendations = useRecommendations({
    limit: 20,
    enabled: activeTab === "for-you",
  });
  const followingPosts = useFollowingPosts({
    limit: 20,
    enabled: activeTab === "following",
  });
  const activeFeedQueryKey =
    activeTab === "for-you"
      ? (["recommendations"] as const)
      : (["posts", "following"] as const);
  const tagPreferences = useTagPreferences();
  const activeFeed = activeTab === "for-you" ? recommendations : followingPosts;
  const isSwitchingFeed = refreshingTab === activeTab;
  const hasTagPreferences =
    (tagPreferences.data?.preferred.length ?? 0) > 0 ||
    (tagPreferences.data?.blocked.length ?? 0) > 0;
  const hasForYouPosts =
    (recommendations.data?.pages.flatMap((page) => page.items).length ?? 0) >
    0;
  const showInterestsPrompt =
    activeTab === "for-you" &&
    !tagPreferences.isLoading &&
    !hasTagPreferences &&
    !recommendations.isLoading &&
    !hasForYouPosts;

  const handleTabChange = (nextTab: FeedTab) => {
    if (nextTab === activeTab) {
      return;
    }

    const nextFeed = nextTab === "for-you" ? recommendations : followingPosts;

    setActiveTab(nextTab);
    setRefreshingTab(nextTab);
    window.scrollTo({ top: 0, behavior: "auto" });

    void nextFeed.refetch().finally(() => {
      setRefreshingTab((currentTab) =>
        currentTab === nextTab ? null : currentTab,
      );
    });
  };

  return (
    <div className="grid min-w-0 grid-cols-1">
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="grid grid-cols-2 items-center">
          <button
            type="button"
            className={`relative min-w-0 py-4 text-center transition-colors hover:bg-accent ${
              activeTab === "for-you"
                ? "font-bold text-foreground"
                : "font-semibold text-muted-foreground"
            }`}
            onClick={() => handleTabChange("for-you")}
          >
            For you
            {activeTab === "for-you" && (
              <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-t-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            className={`relative min-w-0 py-4 text-center transition-colors hover:bg-accent ${
              activeTab === "following"
                ? "font-bold text-foreground"
                : "font-semibold text-muted-foreground"
            }`}
            onClick={() => handleTabChange("following")}
          >
            Following
            {activeTab === "following" && (
              <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-t-full bg-primary" />
            )}
          </button>
        </div>
      </div>
      <PostComposer />
      {showInterestsPrompt && (
        <div className="border-b bg-muted/30 px-4 py-3 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              Choose topics to improve your feed.
            </span>
            <Link
              to="/settings"
              search={{ tab: "interests" }}
              className="font-semibold text-primary hover:underline"
            >
              Open interests
            </Link>
          </div>
        </div>
      )}
      <PostsFeed
        key={activeTab}
        data={isSwitchingFeed ? undefined : activeFeed.data}
        queryKey={activeFeedQueryKey}
        fetchNextPage={activeFeed.fetchNextPage}
        hasNextPage={activeFeed.hasNextPage}
        isFetchingNextPage={activeFeed.isFetchingNextPage}
        isLoading={activeFeed.isLoading || isSwitchingFeed}
        isError={activeFeed.isError}
        error={activeFeed.error}
        loadingLabel={
          activeTab === "for-you"
            ? "Loading recommendations..."
            : "Loading following posts..."
        }
        errorLabel={
          activeTab === "for-you"
            ? "Error loading recommendations"
            : "Error loading following posts"
        }
        emptyLabel={
          activeTab === "for-you"
            ? "No posts available yet"
            : "No posts from people you follow yet"
        }
      />
    </div>
  );
}
