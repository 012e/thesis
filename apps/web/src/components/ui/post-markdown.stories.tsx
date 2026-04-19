import type { Meta, StoryObj } from "@storybook/react";
import { PostMarkdown } from "./post-markdown";

const meta = {
  title: "Components/UI/PostMarkdown",
  component: PostMarkdown,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[700px] bg-background text-foreground p-6 border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicText: Story = {
  args: {
    content:
      "This is a simple post with **bold text**, *italic text*, and some `inline code`.",
  },
};

export const WithLists: Story = {
  args: {
    content: `Here's a shopping list:

- Apples
- Bananas
- Orange juice
- Bread

And a numbered list:

1. First step
2. Second step
3. Third step`,
  },
};

export const WithLinks: Story = {
  args: {
    content: `Check out these resources:

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MDN Web Docs](https://developer.mozilla.org)

External links open in a new tab automatically!`,
  },
};

export const WithBlockquotes: Story = {
  args: {
    content: `Someone once said:

> The only way to do great work is to love what you do.
> 
> Stay hungry. Stay foolish.

That's powerful advice.`,
  },
};

export const WithCodeBlocks: Story = {
  args: {
    content: `Here's a JavaScript example:

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

And here's some TypeScript:

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com'
};
\`\`\``,
  },
};

export const WithHeadings: Story = {
  args: {
    content: `# Main Heading

This is some text under the main heading.

## Subheading

More content here with **emphasis**.

### Smaller Heading

Even more granular content.

#### Tiny Heading

The smallest level heading used.`,
  },
};

export const WithTables: Story = {
  args: {
    content: `Here's a comparison table:

| Framework | Language   | Type Safety |
|-----------|------------|-------------|
| React     | JavaScript | Optional    |
| Vue       | JavaScript | Optional    |
| Angular   | TypeScript | Built-in    |
| Svelte    | JavaScript | Optional    |`,
  },
};

export const WithHorizontalRules: Story = {
  args: {
    content: `Section One

---

Section Two

---

Section Three`,
  },
};

export const ComplexPost: Story = {
  args: {
    content: `# Building Modern Web Apps

Web development has evolved significantly over the past decade. Here's what you need to know:

## Frameworks

Modern frameworks make development easier:

1. **React** - Component-based UI library
2. **Vue** - Progressive framework
3. **Svelte** - Compile-time framework

---

## Best Practices

> Always write clean, maintainable code.

Some key principles:

- **DRY** (Don't Repeat Yourself)
- **KISS** (Keep It Simple, Stupid)
- **YAGNI** (You Aren't Gonna Need It)

### Code Example

Here's a simple React component:

\`\`\`tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
\`\`\`

Learn more at [React.dev](https://react.dev).

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| FCP    | < 1.8s | 1.2s    |
| LCP    | < 2.5s | 1.8s    |
| TTI    | < 3.8s | 2.9s    |

Happy coding! 🚀`,
  },
};

export const StrikethroughAndTaskLists: Story = {
  args: {
    content: `# Todo List

~~Buy groceries~~ ✅

- [x] Write documentation
- [x] Create tests
- [ ] Deploy to production
- [ ] Monitor metrics

~~This feature was removed~~ in the latest release.`,
  },
  parameters: {
    docs: {
      description: {
        story:
          "GitHub Flavored Markdown (GFM) features like strikethrough and task lists.",
      },
    },
  },
};
