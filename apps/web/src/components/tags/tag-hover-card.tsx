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
  children: React.ReactNode;
}

export function TagHoverCard({ slug, children }: TagHoverCardProps) {
  const { data: tag } = useTag(slug);

  return (
    <HoverCard>
      <HoverCardTrigger>{children}</HoverCardTrigger>
      <HoverCardContent align="start" className="w-56">
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
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            View posts →
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
