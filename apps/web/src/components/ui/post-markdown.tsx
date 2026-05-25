import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@tanstack/react-router";

import { createMarkdownComponents } from "@/components/ui/markdown-components";
import { TagHoverCard } from "@/components/tags/tag-hover-card";
import { remarkHashtags } from "@/lib/remark-hashtags";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface PostMarkdownProps {
  content: string;
  className?: string;
  onTagHoverOpenChange?: (open: boolean) => void;
}

const PostMarkdownImpl = ({
  content,
  className,
  onTagHoverOpenChange,
}: PostMarkdownProps) => {
  const { resolvedTheme } = useTheme();
  const baseComponents = createMarkdownComponents(resolvedTheme === "dark");

  const components = {
    ...baseComponents,
    a: ({ href, children, className: cls, ...props }: React.ComponentPropsWithoutRef<"a"> & { className?: string }) => {
      // Render hashtag links as TanStack Router Links with hover card
      if (href?.startsWith("/tags/")) {
        const slug = href.replace("/tags/", "");
        return (
          <TagHoverCard slug={slug} onOpenChange={onTagHoverOpenChange}>
            <Link
              to={href}
              className={cn("text-primary hover:underline font-medium", cls)}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              {...props}
            >
              {children}
            </Link>
          </TagHoverCard>
        );
      }
      // Default external link behavior
      return (
        <a
          href={href}
          className={cn("text-primary hover:underline", cls)}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className={cn("post-markdown", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkHashtags]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const PostMarkdown = memo(PostMarkdownImpl);
