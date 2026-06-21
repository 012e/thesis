import { IconBolt } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/** Compact reputation display, e.g. 1240 → "1.2k". */
function formatXp(xp: number): string {
  if (xp < 1000) return String(xp);
  if (xp < 1_000_000) return `${(xp / 1000).toFixed(xp < 10_000 ? 1 : 0)}k`;
  return `${(xp / 1_000_000).toFixed(1)}m`;
}

interface XpBadgeProps {
  xp: number;
  /** Render even when the user has no XP yet. Defaults to hiding at 0. */
  showZero?: boolean;
  className?: string;
}

/**
 * Reputation (XP) chip shown next to a user across the app — post bylines,
 * profiles and notifications — so the score reads identically everywhere.
 */
export function XpBadge({ xp, showZero = false, className }: XpBadgeProps) {
  if (xp <= 0 && !showZero) return null;

  return (
    <span
      title={`${xp.toLocaleString()} XP`}
      className={cn(
        "inline-flex gap-0.5 items-center text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0",
        className,
      )}
    >
      <IconBolt className="w-3 h-3 fill-current" />
      {formatXp(xp)}
    </span>
  );
}
