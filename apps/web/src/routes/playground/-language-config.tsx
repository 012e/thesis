import {
  PLAYGROUND_LANGUAGES,
  PLAYGROUND_LANGUAGE_VERSIONS,
} from "@repo/rest-contracts";

import { getCodeLanguageLabel } from "@/lib/code-language-meta";
import type { Language } from "./-types";

export { PLAYGROUND_LANGUAGES };

export const PLAYGROUND_LANGUAGE_LABELS = Object.fromEntries(
  PLAYGROUND_LANGUAGES.map((language) => [
    language,
    `${getCodeLanguageLabel(language)} ${
      language === "c" || language === "c++" ? "GCC " : ""
    }${PLAYGROUND_LANGUAGE_VERSIONS[language]}`,
  ]),
) as Record<Language, string>;

export const DEFAULT_CODE: Record<Language, string> = {
  javascript: `// JavaScript Playground
// Write your code here and click Run

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
console.log("Current time:", new Date().toISOString());
`,
  typescript: `// TypeScript Playground
// Write your code here and click Run

interface Greeting {
  message: string;
  timestamp: string;
}

function greet(name: string): Greeting {
  return {
    message: \`Hello, \${name}!\`,
    timestamp: new Date().toISOString(),
  };
}

const result = greet("World");
console.log(result.message);
console.log("Timestamp:", result.timestamp);
`,
  python: `# Python Playground

def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("World"))
`,
  c: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`,
  "c++": `#include <iostream>
#include <string>

int main() {
    const std::string name = "World";
    std::cout << "Hello, " << name << "!\\n";
    return 0;
}
`,
  java: `class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
  go: `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`,
  rust: `fn main() {
    println!("Hello, World!");
}
`,
  ruby: `def greet(name)
  "Hello, #{name}!"
end

puts greet("World")
`,
  php: `<?php

function greet(string $name): string {
    return "Hello, {$name}!";
}

echo greet("World"), PHP_EOL;
`,
  kotlin: `fun main() {
    println("Hello, World!")
}
`,
  swift: `func greet(_ name: String) -> String {
    return "Hello, \\(name)!"
}

print(greet("World"))
`,
  lua: `local function greet(name)
  return "Hello, " .. name .. "!"
end

print(greet("World"))
`,
};
