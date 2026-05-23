"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

import {
  SyntaxHighlighter,
  CodeHeader,
} from "@/components/assistant-ui/shiki-highlighter";
import { createMarkdownComponents } from "@/components/ui/markdown-components";

// Stable module-level constant — components don't depend on runtime state
// (react-shiki handles theme switching via CSS color-scheme automatically)
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
