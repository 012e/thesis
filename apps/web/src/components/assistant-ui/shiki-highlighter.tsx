"use client";

import type { FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import type {
  SyntaxHighlighterProps as AUIProps,
  CodeHeaderProps,
} from "@assistant-ui/react-markdown";

import { useTheme } from "@/hooks/use-theme";
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
 * Uses the app theme state directly so Shiki cannot alter page-level colors.
 */
export const SyntaxHighlighter: FC<HighlighterProps> = ({
  code,
  language,
  theme,
  className,
  addDefaultStyles = false,
  showLanguage = false,
  node: _node,
  components: _components,
  ...props
}) => {
  const { resolvedTheme } = useTheme();
  const shikiTheme = theme ?? (resolvedTheme === "dark" ? "one-dark-pro" : "one-light");
  const normalizedLanguage = language === "unknown" ? "text" : language;

  return (
    <ShikiHighlighter
      {...props}
      language={normalizedLanguage}
      theme={shikiTheme}
      addDefaultStyles={addDefaultStyles}
      showLanguage={showLanguage}
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
  if (!language || language === "unknown" || language === "text") return null;
  return (
    <div className="flex items-center border border-b-0 border-border/50 bg-muted/30 px-1">
      <CodeLanguageBadge language={language.toLowerCase()} />
    </div>
  );
};

CodeHeader.displayName = "CodeHeader";
