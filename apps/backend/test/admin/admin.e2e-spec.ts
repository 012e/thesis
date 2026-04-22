import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";
import { user as userTable } from "../../src/db/auth-schema";
import { DatabaseService } from "../../src/db/database.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Register a user via the Better Auth HTTP API and return their session cookie
 * and user ID.
 */
async function registerUser(
  server: ReturnType<typeof request>,
  email: string,
  username: string,
): Promise<{ cookie: string; userId: string }> {
  const res = await server
    .post("/api/auth/sign-up/email")
    .send({
      email,
      username,
      password: "TestPassword123!",
      name: "Test User",
    })
    .expect(200);

  const setCookieHeader = res.headers["set-cookie"] as string[] | string;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  const entry = cookies.find((c) => c.startsWith("better-auth.session_token="));

  if (!entry) {
    throw new Error(
      `No session cookie in Set-Cookie: ${JSON.stringify(cookies)}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const userId = res.body.user.id as string;

  return { cookie: entry.split(";")[0], userId };
}

/**
 * Elevate a user to the "admin" role directly in the database.
 *
 * Better Auth re-reads the user row on every authenticated request, so the
 * role change takes effect immediately — no re-login required.
 */
async function promoteToAdmin(
  db: DatabaseService,
  userId: string,
): Promise<void> {
  await db.db
    .update(userTable)
    .set({ role: "admin" })
    .where(eq(userTable.id, userId));
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Admin feature", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let server: ReturnType<typeof request>;
  let db: DatabaseService;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);
    testApp = await createTestApp(containers);
    server = request(testApp.app.getHttpServer());
    db = testApp.module.get(DatabaseService);
  }, 120_000);

  afterAll(async () => {
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  // -------------------------------------------------------------------------
  // GET /admin/users — NestJS endpoint protected by AdminGuard
  // -------------------------------------------------------------------------

  describe("GET /admin/users", () => {
    it("returns 401 for unauthenticated requests", async () => {
      await server.get("/admin/users").expect(401);
    });

    it("returns 403 for regular (non-admin) users", async () => {
      const { cookie } = await registerUser(
        server,
        `regular-${Date.now()}@example.com`,
        `regular${Date.now()}`,
      );

      await server.get("/admin/users").set("Cookie", cookie).expect(403);
    });

    it("returns 200 with a paginated user list for admin users", async () => {
      const { cookie, userId } = await registerUser(
        server,
        `admin-${Date.now()}@example.com`,
        `admin${Date.now()}`,
      );

      await promoteToAdmin(db, userId);

      const res = await server
        .get("/admin/users")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);

      // The admin themselves should appear in the list with the correct role.
      const self = (res.body.users as Array<{ id: string; role: string }>).find(
        (u) => u.id === userId,
      );
      expect(self).toBeDefined();
      expect(self!.role).toBe("admin");
    });

    it("respects limit and offset query parameters", async () => {
      const { cookie, userId } = await registerUser(
        server,
        `admin-page-${Date.now()}@example.com`,
        `adminpage${Date.now()}`,
      );

      await promoteToAdmin(db, userId);

      const page1 = await server
        .get("/admin/users?limit=1&offset=0")
        .set("Cookie", cookie)
        .expect(200);

      expect(page1.body.users).toHaveLength(1);
      expect(page1.body.total).toBeGreaterThan(0);

      const page2 = await server
        .get("/admin/users?limit=1&offset=1")
        .set("Cookie", cookie)
        .expect(200);

      expect(page2.body.users).toHaveLength(1);

      // Different pages return different users when there are at least 2 total.
      if ((page1.body.total as number) >= 2) {
        const id1 = (page1.body.users as Array<{ id: string }>)[0].id;
        const id2 = (page2.body.users as Array<{ id: string }>)[0].id;
        expect(id2).not.toBe(id1);
      }
    });

    it("includes all expected fields on each user object", async () => {
      const { cookie, userId } = await registerUser(
        server,
        `admin-fields-${Date.now()}@example.com`,
        `adminfields${Date.now()}`,
      );

      await promoteToAdmin(db, userId);

      const res = await server
        .get("/admin/users")
        .set("Cookie", cookie)
        .expect(200);

      const someUser = (res.body.users as Array<Record<string, unknown>>)[0];
      expect(someUser).toHaveProperty("id");
      expect(someUser).toHaveProperty("name");
      expect(someUser).toHaveProperty("email");
      expect(someUser).toHaveProperty("role");
      expect(someUser).toHaveProperty("banned");
      expect(someUser).toHaveProperty("createdAt");
    });
  });

  // -------------------------------------------------------------------------
  // Better Auth admin plugin — /api/auth/admin/* routes
  //
  // These tests call Better Auth's built-in admin HTTP endpoints directly via
  // supertest so we stay in plain HTTP land and avoid client-typing gymnastics.
  // -------------------------------------------------------------------------

  describe("Better Auth admin API (/api/auth/admin/*)", () => {
    it("returns 401 for unauthenticated requests to the admin API", async () => {
      await server.get("/api/auth/admin/list-users").expect(401);
    });

    it("returns 403 when a regular user calls the admin API", async () => {
      const { cookie } = await registerUser(
        server,
        `ba-regular-${Date.now()}@example.com`,
        `baregular${Date.now()}`,
      );

      await server
        .get("/api/auth/admin/list-users")
        .set("Cookie", cookie)
        .expect(403);
    });

    it("admin can list users via the Better Auth admin API", async () => {
      const { cookie, userId } = await registerUser(
        server,
        `ba-list-${Date.now()}@example.com`,
        `balist${Date.now()}`,
      );
      await promoteToAdmin(db, userId);

      const res = await server
        .get("/api/auth/admin/list-users")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(typeof res.body.total).toBe("number");
    });

    it("admin can promote a regular user to admin via set-role", async () => {
      const { cookie: adminCookie, userId: adminId } = await registerUser(
        server,
        `ba-setrole-admin-${Date.now()}@example.com`,
        `basetadmin${Date.now()}`,
      );
      await promoteToAdmin(db, adminId);

      const { userId: targetId } = await registerUser(
        server,
        `ba-setrole-target-${Date.now()}@example.com`,
        `basettarget${Date.now()}`,
      );

      await server
        .post("/api/auth/admin/set-role")
        .set("Cookie", adminCookie)
        .send({ userId: targetId, role: "admin" })
        .expect(200);

      const [updated] = await db.db
        .select({ role: userTable.role })
        .from(userTable)
        .where(eq(userTable.id, targetId));

      expect(updated.role).toBe("admin");
    });

    it("admin can demote an admin to a regular user via set-role", async () => {
      const { cookie: adminCookie, userId: adminId } = await registerUser(
        server,
        `ba-demote-admin-${Date.now()}@example.com`,
        `bademoteadmin${Date.now()}`,
      );
      await promoteToAdmin(db, adminId);

      const { userId: targetId } = await registerUser(
        server,
        `ba-demote-target-${Date.now()}@example.com`,
        `bademotetrg${Date.now()}`,
      );
      await promoteToAdmin(db, targetId);

      await server
        .post("/api/auth/admin/set-role")
        .set("Cookie", adminCookie)
        .send({ userId: targetId, role: "user" })
        .expect(200);

      const [updated] = await db.db
        .select({ role: userTable.role })
        .from(userTable)
        .where(eq(userTable.id, targetId));

      expect(updated.role).toBe("user");
    });

    it("admin can ban a user and the ban is persisted in the database", async () => {
      const { cookie: adminCookie, userId: adminId } = await registerUser(
        server,
        `ba-ban-admin-${Date.now()}@example.com`,
        `babanadmin${Date.now()}`,
      );
      await promoteToAdmin(db, adminId);

      const { userId: targetId } = await registerUser(
        server,
        `ba-ban-target-${Date.now()}@example.com`,
        `babantarget${Date.now()}`,
      );

      await server
        .post("/api/auth/admin/ban-user")
        .set("Cookie", adminCookie)
        .send({ userId: targetId, banReason: "Spamming in tests" })
        .expect(200);

      const [banned] = await db.db
        .select({ banned: userTable.banned, banReason: userTable.banReason })
        .from(userTable)
        .where(eq(userTable.id, targetId));

      expect(banned.banned).toBe(true);
      expect(banned.banReason).toBe("Spamming in tests");
    });

    it("admin can unban a previously banned user", async () => {
      const { cookie: adminCookie, userId: adminId } = await registerUser(
        server,
        `ba-unban-admin-${Date.now()}@example.com`,
        `baunbanadmin${Date.now()}`,
      );
      await promoteToAdmin(db, adminId);

      const { userId: targetId } = await registerUser(
        server,
        `ba-unban-target-${Date.now()}@example.com`,
        `baunbantarget${Date.now()}`,
      );

      // Ban first, then unban.
      await server
        .post("/api/auth/admin/ban-user")
        .set("Cookie", adminCookie)
        .send({ userId: targetId })
        .expect(200);

      await server
        .post("/api/auth/admin/unban-user")
        .set("Cookie", adminCookie)
        .send({ userId: targetId })
        .expect(200);

      const [unbanned] = await db.db
        .select({ banned: userTable.banned })
        .from(userTable)
        .where(eq(userTable.id, targetId));

      expect(unbanned.banned).toBe(false);
    });

    it("banned user cannot sign in", async () => {
      const email = `ba-banned-signin-${Date.now()}@example.com`;

      const { cookie: adminCookie, userId: adminId } = await registerUser(
        server,
        `ba-banned-admin-${Date.now()}@example.com`,
        `babannedadmin${Date.now()}`,
      );
      await promoteToAdmin(db, adminId);

      const { userId: targetId } = await registerUser(
        server,
        email,
        `babannedtarget${Date.now()}`,
      );

      await server
        .post("/api/auth/admin/ban-user")
        .set("Cookie", adminCookie)
        .send({ userId: targetId })
        .expect(200);

      // Better Auth should reject the sign-in for a banned user.
      const signinRes = await server
        .post("/api/auth/sign-in/email")
        .send({ email, password: "TestPassword123!" });

      expect(signinRes.status).not.toBe(200);
    });
  });
});
