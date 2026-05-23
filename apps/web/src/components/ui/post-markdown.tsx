import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { createMarkdownComponents } from "@/components/ui/markdown-components";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface PostMarkdownProps {
  content: string;
  className?: string;
}

const PostMarkdownImpl = ({ content, className }: PostMarkdownProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("post-markdown", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={createMarkdownComponents(isDark)}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const PostMarkdown = memo(PostMarkdownImpl);
