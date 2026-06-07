import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Link } from "@tanstack/react-router";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useTag } from "@/hooks/use-tag";
import { Hash } from "lucide-react";

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
  const { data: tag, isLoading } = useTag(slug, { enabled: open });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
