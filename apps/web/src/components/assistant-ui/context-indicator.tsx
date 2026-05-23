import { useAtomValue, useSetAtom } from "jotai";
import {
  IconX,
  IconFileText,
  IconLayoutDashboard,
  IconUser,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { globalAIContextAtom, type AIContext } from "@/lib/atoms/ai-context";
import { cn } from "@/lib/utils";

function contextLabel(
  ctx: AIContext,
): { icon: ReactNode; text: string } | null {
  switch (ctx.type) {
    case "none":
      return null;

    case "page":
      return {
        icon: <IconLayoutDashboard className="size-3.5 shrink-0" />,
        text: ctx.label,
      };

    case "post": {
      const author = ctx.post.author.username ?? ctx.post.author.email;
      const preview = ctx.post.content.text?.slice(0, 60) ?? "";
      return {
        icon: <IconFileText className="size-3.5 shrink-0" />,
        text: preview
          ? `Post by @${author}: "${preview}${preview.length >= 60 ? "..." : ""}"`
          : `Post by @${author}`,
      };
    }

    case "user-profile":
      return {
        icon: <IconUser className="size-3.5 shrink-0" />,
        text: `@${ctx.username}'s profile`,
      };
  }
}

/**
 * A small pill displayed just above the AI chat composer that shows the
 * current user context (which post / page the user is viewing).
 *
 * Renders nothing when context is { type: "none" }.
 */
export function AIContextIndicator({ compact = false }: { compact?: boolean }) {
  const ctx = useAtomValue(globalAIContextAtom);
  const setCtx = useSetAtom(globalAIContextAtom);

  const label = contextLabel(ctx);
  if (!label) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 w-full",
        compact ? "max-w-none px-0" : "max-w-2xl",
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 px-2.5 py-1.5 bg-muted/60 border border-border/60 text-muted-foreground text-xs">
        {label.icon}
        <span className="truncate min-w-0 flex-1">{label.text}</span>
      </div>
      <button
        type="button"
        title="Dismiss context"
        onClick={() => setCtx({ type: "none" })}
        className="shrink-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground p-2"
      >
        <IconX className="size-3" />
      </button>
    </div>
  );
}
