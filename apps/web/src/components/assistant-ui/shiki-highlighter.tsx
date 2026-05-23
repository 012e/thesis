"use client";

import type { FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import type {
  SyntaxHighlighterProps as AUIProps,
  CodeHeaderProps,
} from "@assistant-ui/react-markdown";

import { CodeLanguageBadge } from "@/lib/code-language-meta";
import { cn } from "@/lib/utils";

/**
 * Props for the SyntaxHighlighter component
 */
export type HighlighterProps = Omit<
  ShikiHighlighterProps,
  "children" | "theme"
> & {
  theme?: ShikiHighlighterProps["theme"];
} & Pick<AUIProps, "language" | "code"> &
  Partial<Pick<AUIProps, "node" | "components">>;

/**
 * SyntaxHighlighter component, using react-shiki.
 * Uses light-dark() for automatic theme switching based on CSS color-scheme.
 * Themes switch automatically when :root.dark / :root (light) color-scheme changes.
 */
export const SyntaxHighlighter: FC<HighlighterProps> = ({
  code,
  language,
  theme = { dark: "one-dark-pro", light: "one-light" },
  className,
  addDefaultStyles = false,
  showLanguage = false,
  node: _node,
  components: _components,
  ...props
}) => {
  return (
    <ShikiHighlighter
      {...props}
      language={language}
      theme={theme}
      addDefaultStyles={addDefaultStyles}
      showLanguage={showLanguage}
      defaultColor="light-dark()"
      className={cn(
        "aui-shiki-base [&_pre]:overflow-x-auto [&_pre]:bg-muted/75! [&_pre]:p-4 [&_pre]:text-xs [&_pre]:leading-relaxed",
        className,
      )}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
};

SyntaxHighlighter.displayName = "SyntaxHighlighter";

/**
 * CodeHeader component — renders the language badge above code blocks.
 * Used alongside SyntaxHighlighter in memoizeMarkdownComponents.
 */
export const CodeHeader: FC<CodeHeaderProps> = ({ language }) => {
  if (!language) return null;
  return (
    <div className="flex items-center border border-b-0 border-border/50 bg-muted/30 px-1">
      <CodeLanguageBadge language={language.toLowerCase()} />
    </div>
  );
};

CodeHeader.displayName = "CodeHeader";
