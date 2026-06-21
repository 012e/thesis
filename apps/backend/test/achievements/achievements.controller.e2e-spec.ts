import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import type { AchievementDto } from "@repo/shared-dto";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  registerAndGetSession,
  registerAndGetSessionCookie,
} from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

/** Retry an assertion until it passes or the timeout elapses (for async XP side effects). */
async function waitFor<T>(
  fn: () => Promise<T>,
  timeoutMs = 5000,
  intervalMs = 50,
): Promise<T> {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  throw lastErr;
}

describe("AchievementsController integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  let authorCookie: string;
  let authorId: string;
  let voterBCookie: string;
  let voterCCookie: string;

  // postId is set in beforeEach after each truncation
  let postId: string;

  const getAchievements = async (
    cookie: string,
    userId: string,
  ): Promise<AchievementDto[]> => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/users/${userId}/achievements`)
      .set("Cookie", cookie)
      .expect(200);
    return res.body.achievements as AchievementDto[];
  };

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    const author = await registerAndGetSession(
      server,
      `achv-author-${Date.now()}@example.com`,
      `achvauthor${Date.now()}`,
    );
    authorCookie = author.cookie;
    authorId = author.userId;

    voterBCookie = await registerAndGetSessionCookie(
      server,
      `achv-b-${Date.now()}@example.com`,
    );
    voterCCookie = await registerAndGetSessionCookie(
      server,
      `achv-c-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE user_achievements RESTART IDENTITY CASCADE",
    );
    await pool.query("TRUNCATE TABLE notifications RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE xp_ledger RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE user_xp RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE post_reactions RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE posts RESTART IDENTITY CASCADE");

    // A fresh question post owned by the author, ready to be upvoted.
    const res = await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", authorCookie)
      .send({ content: { text: "Achievement test post" } })
      .expect(201);

    postId = res.body.id as string;
  });

  describe("GET /users/:id/achievements", () => {
    it("returns the full board with every tier locked for a fresh user", async () => {
      const achievements = await getAchievements(authorCookie, authorId);

      expect(achievements).toHaveLength(4);
      expect(achievements.map((a) => a.tier)).toEqual([
        "bronze",
        "silver",
        "gold",
        "platinum",
      ]);
      expect(achievements.every((a) => !a.unlocked)).toBe(true);
      expect(achievements.every((a) => a.unlockedAt === null)).toBe(true);

      const bronze = achievements.find((a) => a.tier === "bronze");
      expect(bronze?.threshold).toBe(100);
    });

    it("returns 404 for a non-existent user", async () => {
      await request(testApp.app.getHttpServer())
        .get("/users/does-not-exist/achievements")
        .set("Cookie", authorCookie)
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get(`/users/${authorId}/achievements`)
        .expect(401);
    });
  });

  describe("unlocking on XP threshold crossing", () => {
    it("unlocks Bronze and notifies the author when their XP crosses 100", async () => {
      // Pre-seed the author just below the Bronze threshold (no ledger rows so
      // the daily vote cap is untouched), then one upvote (+5) crosses it.
      await pool.query(
        "INSERT INTO user_xp (user_id, total) VALUES ($1, 98)",
        [authorId],
      );

      await request(testApp.app.getHttpServer())
        .put(`/posts/${postId}/reaction`)
        .set("Cookie", voterBCookie)
        .send({ type: "upvote" })
        .expect(200);

      // XP award + achievement sync are fire-and-forget — poll until applied.
      const bronze = await waitFor(async () => {
        const achievements = await getAchievements(authorCookie, authorId);
        const b = achievements.find((a) => a.tier === "bronze");
        expect(b?.unlocked).toBe(true);
        return b!;
      });

      expect(bronze.unlockedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Higher tiers remain locked at 103 XP.
      const achievements = await getAchievements(authorCookie, authorId);
      expect(
        achievements.filter((a) => a.tier !== "bronze").every((a) => !a.unlocked),
      ).toBe(true);

      // The author received an achievement_unlocked notification.
      const notifRes = await request(testApp.app.getHttpServer())
        .get("/notifications")
        .set("Cookie", authorCookie)
        .expect(200);

      const unlockNotif = (notifRes.body.notifications as Array<{
        type: string;
        payload: { tier?: string; label?: string; threshold?: number };
      }>).find((n) => n.type === "achievement_unlocked");

      expect(unlockNotif).toBeDefined();
      expect(unlockNotif?.payload.tier).toBe("bronze");
      expect(unlockNotif?.payload.label).toBe("Bronze");
      expect(unlockNotif?.payload.threshold).toBe(100);
    });

    it("does not unlock or notify twice for the same tier", async () => {
      await pool.query(
        "INSERT INTO user_xp (user_id, total) VALUES ($1, 98)",
        [authorId],
      );

      // First qualifying upvote → 103 XP → Bronze unlocks once.
      await request(testApp.app.getHttpServer())
        .put(`/posts/${postId}/reaction`)
        .set("Cookie", voterBCookie)
        .send({ type: "upvote" })
        .expect(200);

      await waitFor(async () => {
        const achievements = await getAchievements(authorCookie, authorId);
        expect(achievements.find((a) => a.tier === "bronze")?.unlocked).toBe(
          true,
        );
      });

      // Second qualifying upvote from a different user → 108 XP, still Bronze.
      await request(testApp.app.getHttpServer())
        .put(`/posts/${postId}/reaction`)
        .set("Cookie", voterCCookie)
        .send({ type: "upvote" })
        .expect(200);

      // Wait until the second award has landed, then assert no duplication.
      await waitFor(async () => {
        const { rows } = await pool.query<{ total: number }>(
          "SELECT total FROM user_xp WHERE user_id = $1",
          [authorId],
        );
        expect(rows[0]?.total).toBe(108);
      });

      const achvCount = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM user_achievements WHERE user_id = $1 AND tier = 'bronze'",
        [authorId],
      );
      expect(achvCount.rows[0]?.count).toBe("1");

      const notifCount = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND type = 'achievement_unlocked'",
        [authorId],
      );
      expect(notifCount.rows[0]?.count).toBe("1");
    });
  });
});
