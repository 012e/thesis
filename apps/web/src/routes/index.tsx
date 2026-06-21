import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { PostComposer } from "@/components/ui/post-composer";
import { PostsFeed } from "@/components/posts-feed";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useFollowingPosts } from "@/hooks/use-following-posts";
import { useUnansweredQuestions } from "@/hooks/use-unanswered-questions";
import { useTagPreferences } from "@/hooks/use-tag-preferences";
import { setGlobalAIContext } from "@/lib/atoms/ai-context";
import { homeFeedRefreshRequestAtom } from "@/lib/atoms/feed-refresh";

type FeedTab = "for-you" | "following" | "needs-help";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    setGlobalAIContext({ type: "none" });
  },
  component: Index,
});

export function Index() {
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [refreshingTab, setRefreshingTab] = useState<FeedTab | null>(null);
  const homeFeedRefreshRequest = useAtomValue(homeFeedRefreshRequestAtom);
  const recommendations = useRecommendations({
    limit: 20,
    enabled: activeTab === "for-you",
  });
  const followingPosts = useFollowingPosts({
    limit: 20,
    enabled: activeTab === "following",
  });
  const unansweredQuestions = useUnansweredQuestions({
    limit: 20,
    enabled: activeTab === "needs-help",
  });
  const feedByTab = {
    "for-you": recommendations,
    following: followingPosts,
    "needs-help": unansweredQuestions,
  } as const;
  const activeFeedQueryKey =
    activeTab === "for-you"
      ? (["recommendations"] as const)
      : activeTab === "following"
        ? (["posts", "following"] as const)
        : (["unanswered-questions"] as const);
  const tagPreferences = useTagPreferences();
  const activeFeed = feedByTab[activeTab];
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

    const nextFeed = feedByTab[nextTab];

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
        <div className="grid grid-cols-3 items-center">
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
          <button
            type="button"
            className={`relative min-w-0 py-4 text-center transition-colors hover:bg-accent ${
              activeTab === "needs-help"
                ? "font-bold text-foreground"
                : "font-semibold text-muted-foreground"
            }`}
            onClick={() => handleTabChange("needs-help")}
          >
            Needs help
            {activeTab === "needs-help" && (
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
            : activeTab === "following"
              ? "Loading following posts..."
              : "Loading questions that need help..."
        }
        errorLabel={
          activeTab === "for-you"
            ? "Error loading recommendations"
            : activeTab === "following"
              ? "Error loading following posts"
              : "Error loading questions"
        }
        emptyLabel={
          activeTab === "for-you"
            ? "No posts available yet"
            : activeTab === "following"
              ? "No posts from people you follow yet"
              : "No open questions right now — everything's been answered!"
        }
        refreshSignal={homeFeedRefreshRequest}
      />
    </div>
  );
}
