import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconActivity,
  IconBookmark,
  IconEye,
  IconHeart,
  IconMessageCircle,
  IconPointer,
  IconRefresh,
  IconShare,
} from "@tabler/icons-react";
import type {
  AnalyticsEventRowType,
  AnalyticsEventTypeEnum,
} from "@repo/rest-contracts";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { fetchMyAnalyticsEvents } from "@/lib/api/analytics";

export const Route = createFileRoute("/activity")({
  component: ActivityPage,
});

const PAGE_SIZE = 20;

const eventLabels: Record<AnalyticsEventTypeEnum, string> = {
  post_view: "Viewed a post",
  post_like: "Liked a post",
  post_unlike: "Removed a post like",
  post_bookmark: "Bookmarked a post",
  post_unbookmark: "Removed a bookmark",
  comment_create: "Created a comment",
  comment_like: "Liked a comment",
  post_share: "Shared a post",
  post_create: "Created a post",
  poll_vote: "Voted in a poll",
  search: "Searched",
  page_view: "Viewed a page",
};

const eventIcons: Record<AnalyticsEventTypeEnum, typeof IconActivity> = {
  post_view: IconEye,
  post_like: IconHeart,
  post_unlike: IconHeart,
  post_bookmark: IconBookmark,
  post_unbookmark: IconBookmark,
  comment_create: IconMessageCircle,
  comment_like: IconMessageCircle,
  post_share: IconShare,
  post_create: IconPointer,
  poll_vote: IconPointer,
  search: IconActivity,
  page_view: IconEye,
};

export function ActivityPage() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data, isError, isLoading, isFetching } = useQuery({
    queryKey: ["analytics-events", visibleCount],
    queryFn: () =>
      fetchMyAnalyticsEvents({
        limit: visibleCount,
        offset: 0,
        importantOnly: true,
      }),
  });

  const events = data?.items ?? [];
  const total = data?.total ?? 0;
  const canLoadMore = events.length < total;

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <IconActivity className="h-5 w-5" />
          <h1 className="text-xl font-bold">Activity</h1>
        </div>
      </div>

      <div>
        {isLoading && (
          <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
            <Spinner />
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-destructive">
            Failed to load activity.
          </div>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <IconActivity className="h-10 w-10 opacity-30" />
            <p className="text-sm">No activity yet</p>
          </div>
        )}

        {events.map((event) => (
          <ActivityItem key={event.id} event={event} />
        ))}

        {events.length > 0 && (
          <div className="flex justify-center border-t p-4">
            {canLoadMore ? (
              <Button
                variant="outline"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                disabled={isFetching}
              >
                {isFetching ? <Spinner /> : <IconRefresh />}
                Load more
              </Button>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                You&apos;re all caught up
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ActivityItem({ event }: { event: AnalyticsEventRowType }) {
  const Icon = eventIcons[event.type];
  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-sm font-semibold">{eventLabels[event.type]}</h2>
          <time
            className="text-xs text-muted-foreground"
            dateTime={event.clientTimestamp}
          >
            {formatRelativeTime(event.clientTimestamp)}
          </time>
        </div>
        {event.comment && (
          <div className="mt-2 border bg-background p-3">
            <p className="line-clamp-2 text-sm">{event.comment.contentPreview}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              comment by{" "}
              {event.comment.authorName ??
                event.comment.authorUsername ??
                "Unknown user"}
            </p>
          </div>
        )}
        {event.post && (
          <div className="mt-2 flex gap-3 border bg-background p-3">
            {event.post.imageUrl && (
              <img
                src={event.post.imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm">
                {event.post.contentPreview}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                post by{" "}
                {event.post.authorName ??
                  event.post.authorUsername ??
                  "Unknown user"}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (event.post) {
    return (
      <Link
        to="/posts/$postId"
        params={{ postId: event.post.id }}
        className="flex gap-3 border-b px-4 py-4 transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="flex gap-3 border-b px-4 py-4 transition-colors hover:bg-accent/30">
      {content}
    </article>
  );
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, unitSeconds] of units) {
    const amount = Math.trunc(seconds / unitSeconds);
    if (Math.abs(amount) >= 1) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
        amount,
        unit,
      );
    }
  }

  return "just now";
}
