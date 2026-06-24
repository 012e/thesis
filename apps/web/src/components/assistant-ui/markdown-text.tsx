"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

import {
  SyntaxHighlighter,
  CodeHeader,
} from "@/components/assistant-ui/shiki-highlighter";
import { createMarkdownComponents } from "@/components/ui/markdown-components";

// Stable module-level constant — SyntaxHighlighter reads the app theme internally.
const components = {
  ...createMarkdownComponents(),
  SyntaxHighlighter,
  CodeHeader,
} as Parameters<typeof MarkdownTextPrimitive>[0]["components"];

export const MarkdownText = () => (
  <MarkdownTextPrimitive
    remarkPlugins={[remarkGfm]}
    className="pt-2 pl-1 aui-md"
    components={components}
  />
);

export const CompactMarkdownText = () => (
  <MarkdownTextPrimitive
    remarkPlugins={[remarkGfm]}
    className="aui-md"
    components={components}
  />
);
