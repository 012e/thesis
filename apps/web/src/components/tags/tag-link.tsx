import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface TagLinkProps {
  slug: string;
  displayName?: string;
  className?: string;
}

export function TagLink({ slug, displayName, className }: TagLinkProps) {
  return (
    <Link
      to="/tags/$slug"
      params={{ slug }}
      className={cn("text-primary hover:underline font-medium", className)}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      #{displayName ?? slug}
    </Link>
  );
}
