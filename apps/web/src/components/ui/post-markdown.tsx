import { memo, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/hooks/use-theme";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneLight,
  oneDark,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { CodeLanguageBadge } from "@/lib/code-language-meta";

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
        components={{
          h1: ({ className: cls, ...props }) => (
            <h1
              className={cn(
                "mb-2 scroll-m-20 font-semibold text-base first:mt-0 last:mb-0",
                cls,
              )}
              {...props}
            />
          ),
          h2: ({ className: cls, ...props }) => (
            <h2
              className={cn(
                "mt-3 mb-1.5 scroll-m-20 font-semibold text-sm first:mt-0 last:mb-0",
                cls,
              )}
              {...props}
            />
          ),
          h3: ({ className: cls, ...props }) => (
            <h3
              className={cn(
                "mt-2.5 mb-1 scroll-m-20 font-semibold text-sm first:mt-0 last:mb-0",
                cls,
              )}
              {...props}
            />
          ),
          h4: ({ className: cls, ...props }) => (
            <h4
              className={cn(
                "mt-2 mb-1 scroll-m-20 font-medium text-sm first:mt-0 last:mb-0",
                cls,
              )}
              {...props}
            />
          ),
          h5: ({ className: cls, ...props }) => (
            <h5
              className={cn(
                "mt-2 mb-1 font-medium text-sm first:mt-0 last:mb-0",
                cls,
              )}
              {...props}
            />
          ),
          h6: ({ className: cls, ...props }) => (
            <h6
              className={cn(
                "mt-2 mb-1 font-medium text-sm first:mt-0 last:mb-0",
                cls,
              )}
              {...props}
            />
          ),
          p: ({ className: cls, ...props }) => (
            <p
              className={cn("my-1.5 leading-normal first:mt-0 last:mb-0", cls)}
              {...props}
            />
          ),
          a: ({ className: cls, ...props }) => (
            <a
              className={cn(
                "text-primary underline underline-offset-2 hover:text-primary/80",
                cls,
              )}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: ({ className: cls, ...props }) => (
            <blockquote
              className={cn(
                "my-2 border-muted-foreground/30 border-l-2 pl-3 text-muted-foreground italic",
                cls,
              )}
              {...props}
            />
          ),
          ul: ({ className: cls, ...props }) => (
            <ul
              className={cn(
                "my-1.5 ml-4 list-disc marker:text-muted-foreground [&>li]:mt-0.5",
                cls,
              )}
              {...props}
            />
          ),
          ol: ({ className: cls, ...props }) => (
            <ol
              className={cn(
                "my-1.5 ml-4 list-decimal marker:text-muted-foreground [&>li]:mt-0.5",
                cls,
              )}
              {...props}
            />
          ),
          hr: ({ className: cls, ...props }) => (
            <hr
              className={cn("my-2 border-muted-foreground/20", cls)}
              {...props}
            />
          ),
          table: ({ className: cls, ...props }) => (
            <div className="overflow-x-auto my-2">
              <table
                className={cn(
                  "w-full border-separate border-spacing-0 text-sm",
                  cls,
                )}
                {...props}
              />
            </div>
          ),
          th: ({ className: cls, ...props }) => (
            <th
              className={cn(
                "bg-muted px-2 py-1 text-left font-medium first:rounded-tl-md last:rounded-tr-md",
                cls,
              )}
              {...props}
            />
          ),
          td: ({ className: cls, ...props }) => (
            <td
              className={cn(
                "border-muted-foreground/20 border-b border-l px-2 py-1 text-left last:border-r",
                cls,
              )}
              {...props}
            />
          ),
          tr: ({ className: cls, ...props }) => (
            <tr
              className={cn(
                "m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-md [&:last-child>td:last-child]:rounded-br-md",
                cls,
              )}
              {...props}
            />
          ),
          li: ({ className: cls, ...props }) => (
            <li className={cn("leading-normal", cls)} {...props} />
          ),
          pre: ({ children, ...props }) => {
            // Extract language and code text from the child <code> element
            const codeChild = Array.isArray(children) ? children[0] : children;
            if (
              codeChild &&
              typeof codeChild === "object" &&
              "props" in codeChild
            ) {
              const { className: codeClass, children: codeText } =
                codeChild.props as { className?: string; children?: unknown };
              const match = /language-([\w-]+)/.exec(codeClass || "");
              if (match) {
                const lang = match[1].toLowerCase();
                return (
                  <div className="group overflow-x-auto relative my-2 text-xs leading-relaxed rounded-none border border-border/50 bg-muted/30">
                    {/* language badge — pinned to top-right, outside scroll flow */}
                    <div className="absolute top-0 right-0 z-10 pointer-events-auto">
                      <CodeLanguageBadge language={lang} />
                    </div>
                    <SyntaxHighlighter
                      language={match[1]}
                      style={
                        (isDark ? oneDark : oneLight) as unknown as Record<
                          string,
                          CSSProperties
                        >
                      }
                      customStyle={{
                        margin: 0,
                        padding: "0.625rem",
                        background: "transparent",
                        fontSize: "0.75rem",
                        lineHeight: "1.5",
                      }}
                      codeTagProps={{ style: {} }}
                    >
                      {String(codeText).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  </div>
                );
              }
            }
            return (
              <pre
                className="overflow-x-auto p-2.5 my-2 text-xs leading-relaxed rounded-md border border-border/50 bg-muted/30"
                {...props}
              >
                {children}
              </pre>
            );
          },
          code: ({ className: cls, ...props }) => (
            <code
              className={cn(
                "rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.85em]",
                cls,
              )}
              {...props}
            />
          ),
          strong: ({ className: cls, ...props }) => (
            <strong className={cn("font-semibold", cls)} {...props} />
          ),
          em: ({ className: cls, ...props }) => (
            <em className={cn("italic", cls)} {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const PostMarkdown = memo(PostMarkdownImpl);
