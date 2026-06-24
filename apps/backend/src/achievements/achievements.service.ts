import { Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";

import type { AchievementDto } from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import { userAchievements, userXp, usersView } from "@/db/schema";
import { NotificationsService } from "@/notifications/notifications.service";
import { ACHIEVEMENT_TIERS } from "./achievements.constants";

/**
 * Owns XP-milestone achievements. Tiers are unlocked one-directionally as a
 * user's XP total crosses each threshold (badges are never revoked) and the
 * unique (user, tier) constraint keeps unlocks idempotent.
 */
@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Unlock any tiers the user's current XP total newly qualifies for and notify
   * them once per freshly unlocked tier. Safe to call repeatedly — already
   * unlocked tiers are ignored via the unique constraint. Intended to be invoked
   * fire-and-forget after an XP award.
   */
  async syncAndNotify(userId: string): Promise<void> {
    const total = await this.getXpTotal(userId);

    const qualifying = ACHIEVEMENT_TIERS.filter(
      (t) => total >= t.threshold,
    ).map((t) => ({ userId, tier: t.tier, xpAtUnlock: total }));

    if (qualifying.length === 0) return;

    // Only rows that did not already exist are returned — those are the tiers
    // the user just crossed and should be notified about.
    const inserted = await this.databaseService.db
      .insert(userAchievements)
      .values(qualifying)
      .onConflictDoNothing({
        target: [userAchievements.userId, userAchievements.tier],
      })
      .returning({ tier: userAchievements.tier });

    for (const row of inserted) {
      const definition = ACHIEVEMENT_TIERS.find((t) => t.tier === row.tier);
      if (!definition) continue;

      await this.notificationsService.deliver({
        userId,
        actorId: null,
        type: "achievement_unlocked",
        payload: {
          tier: definition.tier,
          label: definition.label,
          threshold: definition.threshold,
        },
      });
    }
  }

  /**
   * The full achievement board for a user: every defined tier with its unlocked
   * state. Returns null when the user does not exist.
   */
  async list(userId: string): Promise<AchievementDto[] | null> {
    const [userRow] = await this.databaseService.db
      .select({ id: usersView.id })
      .from(usersView)
      .where(eq(usersView.id, userId))
      .limit(1);

    if (!userRow) return null;

    const unlockedRows = await this.databaseService.db
      .select({
        tier: userAchievements.tier,
        unlockedAt: userAchievements.unlockedAt,
      })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const unlockedByTier = new Map(
      unlockedRows.map((r) => [r.tier, r.unlockedAt]),
    );

    return ACHIEVEMENT_TIERS.map((t) => {
      const unlockedAt = unlockedByTier.get(t.tier) ?? null;
      return {
        tier: t.tier,
        label: t.label,
        threshold: t.threshold,
        unlocked: unlockedAt !== null,
        unlockedAt: unlockedAt?.toISOString() ?? null,
      };
    });
  }

  private async getXpTotal(userId: string): Promise<number> {
    const [row] = await this.databaseService.db
      .select({ total: userXp.total })
      .from(userXp)
      .where(eq(userXp.userId, userId))
      .limit(1);

    return row?.total ?? 0;
  }
}
