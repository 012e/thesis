"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { memo } from "react";
import remarkGfm from "remark-gfm";

import { createMarkdownComponents } from "@/components/ui/markdown-components";
import { useTheme } from "@/hooks/use-theme";

const MarkdownTextImpl = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="pt-2 pl-1 aui-md"
      components={createMarkdownComponents(isDark)}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
