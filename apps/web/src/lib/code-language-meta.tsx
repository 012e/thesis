import type { IconType } from "react-icons";
import { GrJava } from "react-icons/gr";
import {
  SiBun,
  SiC,
  SiClojure,
  SiCplusplus,
  SiCss,
  SiDart,
  SiDocker,
  SiElixir,
  SiErlang,
  SiGit,
  SiGnubash,
  SiGo,
  SiGraphql,
  SiHaskell,
  SiHtml5,
  SiJavascript,
  SiJson,
  SiKotlin,
  SiKubernetes,
  SiLua,
  SiMongodb,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiOcaml,
  SiPhp,
  SiPostgresql,
  SiPython,
  SiReact,
  SiRedis,
  SiRuby,
  SiRust,
  SiScala,
  SiSqlite,
  SiSvelte,
  SiSwift,
  SiTerraform,
  SiToml,
  SiTypescript,
  SiVuedotjs,
  SiXml,
  SiYaml,
} from "react-icons/si";

type CodeLanguageMeta = [IconType, string, string];

const CODE_LANGUAGE_META: Record<string, CodeLanguageMeta> = {
  java: [GrJava, "#ED8B00", "Java"],
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
  bun: [SiBun, "#FBF0DF", "Bun"],
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

function getCodeLanguageMeta(language: string) {
  return CODE_LANGUAGE_META[language.toLowerCase()];
}

export function CodeLanguageBadge({ language }: { language: string }) {
  const meta = getCodeLanguageMeta(language);
  const LangIcon = meta?.[0];
  const iconColor = meta?.[1];
  const label = meta?.[2] ?? language;

  return (
    <span className="code-language-badge">
      {LangIcon && (
        <LangIcon
          style={{ color: iconColor }}
          className="code-language-badge-icon"
        />
      )}
      <span>{label}</span>
    </span>
  );
}
