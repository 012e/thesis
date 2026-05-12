import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/lib/toast";
import { useToast as toast } from "@/hooks/use-toast";

function useStoryTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );

  useEffect(() => {
    const updateTheme = () => {
      setTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    };

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

function SonnerShowcase() {
  const theme = useStoryTheme();

  return (
    <div className="min-h-64 space-y-4 p-4">
      <Toaster theme={theme} />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            toast.success("Saved", { description: "Profile updated" })
          }
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.error("Failed", {
              description: "Request could not be completed",
            })
          }
        >
          Error
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.info("Heads up", { description: "New activity detected" })
          }
        >
          Info
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.warning("Warning", {
              description: "You are close to quota limit",
            })
          }
        >
          Warning
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.headless({
              title: "Custom headless toast",
              description: "Blocky, theme-aware, and closable.",
              action: {
                label: "Undo",
                onClick: () => {},
              },
              cancel: {
                label: "Dismiss",
                onClick: () => {},
              },
            })
          }
        >
          Headless
        </Button>
      </div>
    </div>
  );
}

const meta: Meta<typeof SonnerShowcase> = {
  title: "Feedback/Sonner",
  component: SonnerShowcase,
};

export default meta;

type Story = StoryObj<typeof SonnerShowcase>;

export const Playground: Story = {};
