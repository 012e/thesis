import type { Meta, StoryObj } from "@storybook/react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { Thread } from "../components/assistant-ui/thread";

// --- Mock chat model adapter ---

const CANNED_RESPONSES: Record<string, string> = {
  "What's the weather in San Francisco?":
    "The weather in **San Francisco** today is partly cloudy with a high of 65°F (18°C). Expect some fog in the morning clearing up by noon.\n\n| Time | Temp | Condition |\n|------|------|-----------|\n| Morning | 58°F | Foggy |\n| Afternoon | 65°F | Partly Cloudy |\n| Evening | 60°F | Clear |",
  "Explain React hooks like useState":
    "## React Hooks: `useState`\n\n`useState` is a Hook that lets you add state to functional components.\n\n```tsx\nconst [count, setCount] = useState(0);\n```\n\n### Key points:\n- Returns a **state variable** and a **setter function**\n- The argument is the **initial value**\n- Calling the setter triggers a **re-render**\n- State updates are **batched** for performance\n\n> Hooks must be called at the top level of your component — never inside loops, conditions, or nested functions.",
};

const DEFAULT_RESPONSE =
  "I'm a mock AI assistant running in Storybook. I can respond to predefined prompts like:\n\n- *\"What's the weather in San Francisco?\"*\n- *\"Explain React hooks like useState\"*\n\nTry one of those, or type anything and I'll echo it back!";

function createMockAdapter(): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === "user");

      let responseText = DEFAULT_RESPONSE;

      if (lastUserMessage) {
        // Extract text from the message content
        const userText =
          lastUserMessage.content
            ?.filter(
              (part): part is { type: "text"; text: string } =>
                part.type === "text",
            )
            .map((part) => part.text)
            .join("") ?? "";

        responseText =
          CANNED_RESPONSES[userText] ??
          `You said: "${userText}"\n\nThis is a **mock response** from the Storybook local runtime. The real assistant would process your message through the Mastra AI service.`;
      }

      // Simulate streaming by yielding chunks with a small delay
      const words = responseText.split(" ");
      let accumulated = "";

      for (let i = 0; i < words.length; i++) {
        if (abortSignal?.aborted) break;
        accumulated += (i === 0 ? "" : " ") + words[i];
        yield {
          content: [{ type: "text", text: accumulated }],
        };
        // Small delay to simulate streaming
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    },
  };
}

// --- Wrapper component that sets up the local runtime ---

function ThreadWithRuntime() {
  const runtime = useLocalRuntime(createMockAdapter());

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

// --- Story config ---

const meta = {
  title: "Components/AssistantUI/Thread",
  component: ThreadWithRuntime,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-[700px] w-[700px] border rounded-lg bg-background text-foreground mx-auto my-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ThreadWithRuntime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {};
