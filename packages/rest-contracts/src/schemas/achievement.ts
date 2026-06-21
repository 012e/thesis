import { z } from "zod";

// ─── Tier enum ────────────────────────────────────────────────────────────────

export const AchievementTier = z.enum(["bronze", "silver", "gold", "platinum"]);

export type AchievementTierType = z.infer<typeof AchievementTier>;

// ─── Achievement ──────────────────────────────────────────────────────────────

/**
 * One entry on a user's achievement board. Every defined tier is always present;
 * `unlocked` and `unlockedAt` describe whether the user has crossed the XP
 * `threshold` for that tier yet.
 */
export const Achievement = z.object({
  tier: AchievementTier,
  label: z.string(),
  threshold: z.number().int().nonnegative(),
  unlocked: z.boolean(),
  unlockedAt: z.string().datetime().nullable(),
});

export type AchievementType = z.infer<typeof Achievement>;
