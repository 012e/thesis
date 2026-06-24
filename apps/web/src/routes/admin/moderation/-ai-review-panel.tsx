import { useEffect, useRef } from "react";
import { useAui } from "@assistant-ui/react";
import {
  IconSparkles,
  IconGavel,
  IconHistory,
  IconClipboardCheck,
} from "@tabler/icons-react";
import type { PostModerationType } from "@repo/rest-contracts";

import { Button } from "@/components/ui/button";
import { Thread } from "@/components/assistant-ui/thread";
import { useAIContext } from "@/hooks/use-ai-context";
import { getGlobalAIContext, type AIContext } from "@/lib/atoms/ai-context";

interface QuickAction {
  readonly label: string;
  readonly icon: typeof IconGavel;
  readonly prompt: string;
}

const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    label: "Summarize author history",
    icon: IconHistory,
    prompt:
      "Look up the author of the post under review and summarize their prior behavior on the platform: recent posts, how often their content has been reported or moderated, and any patterns worth flagging. Keep it concise.",
  },
  {
    label: "Assess this report",
    icon: IconGavel,
    prompt:
      "Assess the moderation record under review. Explain whether the flagged content plausibly violates the policy implied by the moderation source, weigh the LLM summary and confidence against the actual post content, and note anything that could make this a false positive.",
  },
  {
    label: "Recommend an action",
    icon: IconClipboardCheck,
    prompt:
      "Based on the post content, the moderation source, the LLM summary/confidence, and the author's history, recommend whether I should reject the post, mark it a false positive, or escalate for human review. Give a short justification and a one-line suggested review note.",
  },
];

/**
 * Right-hand AI review panel for the moderation detail dialog.
 *
 * Reuses the global assistant runtime (mounted at the app root) by rendering
 * the shared <Thread />, and points the assistant at the record under review by
 * writing a "moderation" AI context while mounted. The previous context is
 * captured on mount and restored on unmount so the floating global chat returns
 * to whatever page/post context it had before the dialog opened.
 */
export function ModerationAIReviewPanel({
  moderation,
}: {
  moderation: PostModerationType;
}) {
  const [, setContext] = useAIContext();
  const aui = useAui();
  // Snapshot the context that was active before this panel mounted.
  const previousContextRef = useRef<AIContext | null>(null);

  useEffect(() => {
    previousContextRef.current ??= getGlobalAIContext();
    setContext({ type: "moderation", moderation });
  }, [moderation, setContext]);

  useEffect(() => {
    return () => {
      setContext(previousContextRef.current ?? { type: "none" });
      previousContextRef.current = null;
    };
  }, [setContext]);

  function runQuickAction(prompt: string) {
    aui.thread().append({
      role: "user",
      content: [{ type: "text", text: prompt }],
    });
  }

  return (
    <div className="flex min-h-0 flex-col border-t md:border-l md:border-t-0">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2.5">
        <IconSparkles className="size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-semibold">AI review assistant</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Ask about the author, the report, or a recommended decision.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b bg-background px-3 py-2">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[11px]"
            onClick={() => runQuickAction(action.prompt)}
          >
            <action.icon className="size-3.5" />
            {action.label}
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Thread
          composerPlaceholder="Ask the AI to help review this record…"
          emptyState={<ReviewWelcome />}
        />
      </div>
    </div>
  );
}

function ReviewWelcome() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <div className="flex items-center justify-center rounded-full bg-primary/10 p-3">
        <IconSparkles className="size-7 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold">AI-assisted review</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          I can summarize the reported author&apos;s history, weigh the report
          against the post, and recommend an action. Use a quick action above or
          ask your own question.
        </p>
      </div>
    </div>
  );
}
