import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Ban, Hash, Star, X } from "lucide-react";
import type { TagPreferenceDto, UserTagPreferencesDto } from "@repo/shared-dto";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { useTag } from "@/hooks/use-tag";
import {
  TAG_PREFERENCES_QUERY_KEY,
  useDeleteTagPreference,
  useSetTagPreference,
  useTagPreference,
} from "@/hooks/use-tag-preferences";
import { useToast as toast } from "@/hooks/use-toast";

interface TagHoverCardProps {
  slug: string;
  children: ReactElement;
  onOpenChange?: (open: boolean) => void;
}

function TagHoverCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      <div className="h-3 w-16 rounded bg-muted" />
      <div className="h-3 w-20 rounded bg-muted" />
    </div>
  );
}

export function TagHoverCard({
  slug,
  children,
  onOpenChange,
}: TagHoverCardProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: tag, isLoading } = useTag(slug, { enabled: open });
  const tagPreference = useTagPreference(slug);
  const setPreference = useSetTagPreference({ invalidate: false });
  const deletePreference = useDeleteTagPreference({ invalidate: false });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPreference = tagPreference.preference?.preference ?? null;

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const closeSoon = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 150);
  };

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  const stopInteraction = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleSetPreference = (
    preference: "preferred" | "blocked",
    event: MouseEvent,
  ) => {
    stopInteraction(event);
    setPreference.mutate(
      { slug, preference },
      {
        onSuccess: (updated) => {
          if (!updated) {
            toast.error("Tag not found");
            return;
          }

          queryClient.setQueryData<UserTagPreferencesDto>(
            TAG_PREFERENCES_QUERY_KEY,
            (previous) => updatePreferenceCache(previous, updated),
          );
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const handleDeletePreference = (event: MouseEvent) => {
    stopInteraction(event);
    deletePreference.mutate(slug, {
      onSuccess: () => {
        queryClient.setQueryData<UserTagPreferencesDto>(
          TAG_PREFERENCES_QUERY_KEY,
          (previous) => removePreferenceFromCache(previous, slug),
        );
      },
      onError: (error: Error) => toast.error(error.message),
    });
  };

  return (
    <HoverCard
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          clearCloseTimer();
          setOpen(true);
          return;
        }

        closeSoon();
      }}
    >
      <HoverCardTrigger render={children} />
      <HoverCardContent
        align="start"
        className="w-56"
        onMouseEnter={() => {
          clearCloseTimer();
          setOpen(true);
        }}
        onMouseLeave={closeSoon}
      >
        {isLoading ? (
          <TagHoverCardSkeleton />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">
                {tag?.displayName ?? slug}
              </span>
            </div>
            {tag && (
              <p className="text-xs text-muted-foreground">
                {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {currentPreference === "preferred"
                ? "You prefer this tag"
                : currentPreference === "blocked"
                  ? "You blocked this tag"
                  : "No preference set"}
            </p>
            <div className="flex flex-wrap gap-2">
              {currentPreference === "preferred" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deletePreference.isPending}
                  onClick={handleDeletePreference}
                >
                  <X className="h-3.5 w-3.5" />
                  Unprefer
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={setPreference.isPending}
                  onClick={(event) => handleSetPreference("preferred", event)}
                >
                  <Star className="h-3.5 w-3.5" />
                  Prefer
                </Button>
              )}
              {currentPreference === "blocked" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deletePreference.isPending}
                  onClick={handleDeletePreference}
                >
                  <X className="h-3.5 w-3.5" />
                  Unblock
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={setPreference.isPending}
                  onClick={(event) => handleSetPreference("blocked", event)}
                >
                  <Ban className="h-3.5 w-3.5" />
                  Block
                </Button>
              )}
            </div>
            <Link
              to="/tags/$slug"
              params={{ slug }}
              className="text-xs text-primary hover:underline"
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              View posts →
            </Link>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function updatePreferenceCache(
  previous: UserTagPreferencesDto | undefined,
  updated: TagPreferenceDto,
): UserTagPreferencesDto | undefined {
  if (!previous) {
    return previous;
  }

  const withoutTag = removePreferenceFromCache(previous, updated.slug);
  if (!withoutTag) {
    return withoutTag;
  }

  return {
    preferred:
      updated.preference === "preferred"
        ? [...withoutTag.preferred, updated]
        : withoutTag.preferred,
    blocked:
      updated.preference === "blocked"
        ? [...withoutTag.blocked, updated]
        : withoutTag.blocked,
  };
}

function removePreferenceFromCache(
  previous: UserTagPreferencesDto | undefined,
  slug: string,
): UserTagPreferencesDto | undefined {
  if (!previous) {
    return previous;
  }

  return {
    preferred: previous.preferred.filter((tag) => tag.slug !== slug),
    blocked: previous.blocked.filter((tag) => tag.slug !== slug),
  };
}
