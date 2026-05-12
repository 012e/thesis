import type { CodeBlockLanguage } from "@repo/mdx-editor";
import { CodeLanguageBadge } from "@/lib/code-language-meta";

export const POST_CODE_BLOCK_LANGUAGES: CodeBlockLanguage[] = [
  {
    name: "JavaScript",
    alias: ["js", "javascript"],
    label: <CodeLanguageBadge language="js" />,
  },
  {
    name: "TypeScript",
    alias: ["ts", "typescript"],
    label: <CodeLanguageBadge language="ts" />,
  },
  { name: "TSX", alias: ["tsx"], label: <CodeLanguageBadge language="tsx" /> },
  { name: "JSX", alias: ["jsx"], label: <CodeLanguageBadge language="jsx" /> },
  { name: "CSS", alias: ["css"], label: <CodeLanguageBadge language="css" /> },
  {
    name: "HTML",
    alias: ["html"],
    label: <CodeLanguageBadge language="html" />,
  },
  {
    name: "Python",
    alias: ["py", "python"],
    label: <CodeLanguageBadge language="py" />,
  },
  {
    name: "Java",
    alias: ["java"],
    label: <CodeLanguageBadge language="java" />,
  },
  {
    name: "Go",
    alias: ["go", "golang"],
    label: <CodeLanguageBadge language="go" />,
  },
  {
    name: "Rust",
    alias: ["rs", "rust"],
    label: <CodeLanguageBadge language="rs" />,
  },
  {
    name: "Shell",
    alias: ["sh", "shell", "bash"],
    label: <CodeLanguageBadge language="sh" />,
  },
  {
    name: "JSON",
    alias: ["json"],
    label: <CodeLanguageBadge language="json" />,
  },
  {
    name: "YAML",
    alias: ["yaml", "yml"],
    label: <CodeLanguageBadge language="yaml" />,
  },
  { name: "SQL", alias: ["sql"], label: <CodeLanguageBadge language="sql" /> },
  {
    name: "Dockerfile",
    alias: ["dockerfile"],
    label: <CodeLanguageBadge language="dockerfile" />,
  },
];
