import { PostMarkdown } from './post-markdown';
var meta = {
    title: 'Components/UI/PostMarkdown',
    component: PostMarkdown,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    decorators: [
        function (Story) { return (<div className="w-[700px] bg-background text-foreground p-6 border rounded-lg">
        <Story />
      </div>); },
    ],
};
export default meta;
export var BasicText = {
    args: {
        content: 'This is a simple post with **bold text**, *italic text*, and some `inline code`.',
    },
};
export var WithLists = {
    args: {
        content: "Here's a shopping list:\n\n- Apples\n- Bananas\n- Orange juice\n- Bread\n\nAnd a numbered list:\n\n1. First step\n2. Second step\n3. Third step",
    },
};
export var WithLinks = {
    args: {
        content: "Check out these resources:\n\n- [React Documentation](https://react.dev)\n- [TypeScript Handbook](https://www.typescriptlang.org/docs/)\n- [MDN Web Docs](https://developer.mozilla.org)\n\nExternal links open in a new tab automatically!",
    },
};
export var WithBlockquotes = {
    args: {
        content: "Someone once said:\n\n> The only way to do great work is to love what you do.\n> \n> Stay hungry. Stay foolish.\n\nThat's powerful advice.",
    },
};
export var WithCodeBlocks = {
    args: {
        content: "Here's a JavaScript example:\n\n```javascript\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n\ngreet('World');\n```\n\nAnd here's some TypeScript:\n\n```typescript\ninterface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nconst user: User = {\n  id: '1',\n  name: 'John Doe',\n  email: 'john@example.com'\n};\n```",
    },
};
export var WithHeadings = {
    args: {
        content: "# Main Heading\n\nThis is some text under the main heading.\n\n## Subheading\n\nMore content here with **emphasis**.\n\n### Smaller Heading\n\nEven more granular content.\n\n#### Tiny Heading\n\nThe smallest level heading used.",
    },
};
export var WithTables = {
    args: {
        content: "Here's a comparison table:\n\n| Framework | Language   | Type Safety |\n|-----------|------------|-------------|\n| React     | JavaScript | Optional    |\n| Vue       | JavaScript | Optional    |\n| Angular   | TypeScript | Built-in    |\n| Svelte    | JavaScript | Optional    |",
    },
};
export var WithHorizontalRules = {
    args: {
        content: "Section One\n\n---\n\nSection Two\n\n---\n\nSection Three",
    },
};
export var ComplexPost = {
    args: {
        content: "# Building Modern Web Apps\n\nWeb development has evolved significantly over the past decade. Here's what you need to know:\n\n## Frameworks\n\nModern frameworks make development easier:\n\n1. **React** - Component-based UI library\n2. **Vue** - Progressive framework\n3. **Svelte** - Compile-time framework\n\n---\n\n## Best Practices\n\n> Always write clean, maintainable code.\n\nSome key principles:\n\n- **DRY** (Don't Repeat Yourself)\n- **KISS** (Keep It Simple, Stupid)\n- **YAGNI** (You Aren't Gonna Need It)\n\n### Code Example\n\nHere's a simple React component:\n\n```tsx\nimport { useState } from 'react';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  \n  return (\n    <button onClick={() => setCount(count + 1)}>\n      Count: {count}\n    </button>\n  );\n}\n```\n\nLearn more at [React.dev](https://react.dev).\n\n---\n\n## Performance Metrics\n\n| Metric | Target | Current |\n|--------|--------|---------|\n| FCP    | < 1.8s | 1.2s    |\n| LCP    | < 2.5s | 1.8s    |\n| TTI    | < 3.8s | 2.9s    |\n\nHappy coding! \uD83D\uDE80",
    },
};
export var StrikethroughAndTaskLists = {
    args: {
        content: "# Todo List\n\n~~Buy groceries~~ \u2705\n\n- [x] Write documentation\n- [x] Create tests\n- [ ] Deploy to production\n- [ ] Monitor metrics\n\n~~This feature was removed~~ in the latest release.",
    },
    parameters: {
        docs: {
            description: {
                story: 'GitHub Flavored Markdown (GFM) features like strikethrough and task lists.',
            },
        },
    },
};
