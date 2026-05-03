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
import type { IconType } from "react-icons";
import {
  SiPython,
  SiJavascript,
  SiTypescript,
  SiRust,
  SiGo,
  SiC,
  SiCplusplus,
  SiRuby,
  SiSwift,
  SiKotlin,
  SiPhp,
  SiHtml5,
  SiCss,
  SiGnubash,
  SiLua,
  SiScala,
  SiHaskell,
  SiDart,
  SiElixir,
  SiErlang,
  SiClojure,
  SiOcaml,
  SiSvelte,
  SiVuedotjs,
  SiReact,
  SiNextdotjs,
  SiNodedotjs,
  SiDocker,
  SiKubernetes,
  SiTerraform,
  SiMysql,
  SiPostgresql,
  SiMongodb,
  SiRedis,
  SiGraphql,
  SiGit,
  SiYaml,
  SiJson,
  SiXml,
  SiToml,
  SiSqlite,
} from "react-icons/si";

/** Map from fenced-code language identifier → [Icon, brandHex, displayLabel] */
const LANG_META: Record<string, [IconType, string, string]> = {
  python: [SiPython, "#3776AB", "Python"],
  py: [SiPython, "#3776AB", "Python"],
  javascript: [SiJavascript, "#F7DF1E", "JavaScript"],
  js: [SiJavascript, "#F7DF1E", "JavaScript"],
  typescript: [SiTypescript, "#3178C6", "TypeScript"],
  ts: [SiTypescript, "#3178C6", "TypeScript"],
  tsx: [SiReact, "#61DAFB", "TSX"],
  jsx: [SiReact, "#61DAFB", "JSX"],
  rust: [SiRust, "#CE422B", "Rust"],
  rs: [SiRust, "#CE422B", "Rust"],
  go: [SiGo, "#00ACD7", "Go"],
  golang: [SiGo, "#00ACD7", "Go"],
  c: [SiC, "#A8B9CC", "C"],
  cpp: [SiCplusplus, "#00599C", "C++"],
  "c++": [SiCplusplus, "#00599C", "C++"],
  ruby: [SiRuby, "#CC342D", "Ruby"],
  rb: [SiRuby, "#CC342D", "Ruby"],
  swift: [SiSwift, "#F05138", "Swift"],
  kotlin: [SiKotlin, "#7F52FF", "Kotlin"],
  kt: [SiKotlin, "#7F52FF", "Kotlin"],
  php: [SiPhp, "#777BB4", "PHP"],
  html: [SiHtml5, "#E34F26", "HTML"],
  css: [SiCss, "#1572B6", "CSS"],
  bash: [SiGnubash, "#4EAA25", "Bash"],
  sh: [SiGnubash, "#4EAA25", "Shell"],
  shell: [SiGnubash, "#4EAA25", "Shell"],
  zsh: [SiGnubash, "#4EAA25", "Zsh"],
  lua: [SiLua, "#2C2D72", "Lua"],
  scala: [SiScala, "#DC322F", "Scala"],
  haskell: [SiHaskell, "#5D4F85", "Haskell"],
  hs: [SiHaskell, "#5D4F85", "Haskell"],
  dart: [SiDart, "#0175C2", "Dart"],
  elixir: [SiElixir, "#4B275F", "Elixir"],
  ex: [SiElixir, "#4B275F", "Elixir"],
  erlang: [SiErlang, "#A90533", "Erlang"],
  clojure: [SiClojure, "#5881D8", "Clojure"],
  clj: [SiClojure, "#5881D8", "Clojure"],
  ocaml: [SiOcaml, "#EC6813", "OCaml"],
  ml: [SiOcaml, "#EC6813", "OCaml"],
  svelte: [SiSvelte, "#FF3E00", "Svelte"],
  vue: [SiVuedotjs, "#4FC08D", "Vue"],
  react: [SiReact, "#61DAFB", "React"],
  nextjs: [SiNextdotjs, "#000000", "Next.js"],
  nodejs: [SiNodedotjs, "#5FA04E", "Node.js"],
  node: [SiNodedotjs, "#5FA04E", "Node.js"],
  docker: [SiDocker, "#2496ED", "Docker"],
  dockerfile: [SiDocker, "#2496ED", "Dockerfile"],
  kubernetes: [SiKubernetes, "#326CE5", "Kubernetes"],
  k8s: [SiKubernetes, "#326CE5", "Kubernetes"],
  terraform: [SiTerraform, "#844FBA", "Terraform"],
  tf: [SiTerraform, "#844FBA", "Terraform"],
  mysql: [SiMysql, "#4479A1", "MySQL"],
  postgres: [SiPostgresql, "#4169E1", "PostgreSQL"],
  postgresql: [SiPostgresql, "#4169E1", "PostgreSQL"],
  sql: [SiPostgresql, "#4169E1", "SQL"],
  mongodb: [SiMongodb, "#47A248", "MongoDB"],
  redis: [SiRedis, "#FF4438", "Redis"],
  graphql: [SiGraphql, "#E10098", "GraphQL"],
  gql: [SiGraphql, "#E10098", "GraphQL"],
  git: [SiGit, "#F05032", "Git"],
  yaml: [SiYaml, "#CB171E", "YAML"],
  yml: [SiYaml, "#CB171E", "YAML"],
  json: [SiJson, "#000000", "JSON"],
  xml: [SiXml, "#005FAD", "XML"],
  toml: [SiToml, "#9C4121", "TOML"],
  sqlite: [SiSqlite, "#003B57", "SQLite"],
};

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
                const meta = LANG_META[lang];
                const LangIcon = meta?.[0];
                const iconColor = meta?.[1];
                const label = meta?.[2] ?? match[1];
                return (
                  <div className="group overflow-x-auto relative my-2 text-xs leading-relaxed rounded-none rounded-md border border-border/50 bg-muted/30">
                    {/* language badge — pinned to top-right, outside scroll flow */}
                    <div className="flex absolute top-0 right-0 z-10 gap-1 items-center px-1.5 py-0.5 font-mono text-[10px] font-medium transition-opacity transition-colors duration-150 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto cursor-default text-muted-foreground/60 hover:bg-accent hover:text-accent-foreground">
                      {LangIcon && (
                        <LangIcon
                          style={{ color: iconColor }}
                          className="size-2.5 shrink-0"
                        />
                      )}
                      <span>{label}</span>
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
