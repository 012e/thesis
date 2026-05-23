import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { createMarkdownComponents } from "@/components/ui/markdown-components";
import { cn } from "@/lib/utils";

interface PostMarkdownProps {
  content: string;
  className?: string;
}

const components = createMarkdownComponents();

const PostMarkdownImpl = ({ content, className }: PostMarkdownProps) => {
  return (
    <div className={cn("post-markdown", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const PostMarkdown = memo(PostMarkdownImpl);
