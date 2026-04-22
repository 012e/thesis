import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";
import { createE2ETestUser } from "../helpers/auth.helper";
import { AdminService } from "../../src/admin/admin.service";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Admin feature", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let server: ReturnType<typeof request>;
  let adminService: AdminService;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);
    testApp = await createTestApp(containers);
    server = request(testApp.app.getHttpServer());
    adminService = testApp.module.get(AdminService);
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
      const { cookie } = await createE2ETestUser(
        testApp.app,
        `regular-${Date.now()}@example.com`,
        `regular${Date.now()}`,
      );

      await server.get("/admin/users").set("Cookie", cookie!).expect(403);
    });

    it("returns 200 with a paginated user list for admin users", async () => {
      const { user, cookie } = await createE2ETestUser(
        testApp.app,
        `admin-${Date.now()}@example.com`,
        `admin${Date.now()}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(user.id as string);

      const res = await server
        .get("/admin/users")
        .set("Cookie", cookie!)
        .expect(200);

      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);

      // The admin themselves should appear in the list with the correct role.
      const self = (res.body.users as Array<{ id: string; role: string }>).find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (u) => u.id === (user.id as string),
      );
      expect(self).toBeDefined();
      expect(self!.role).toBe("admin");
    });

    it("respects limit and offset query parameters", async () => {
      const { user, cookie } = await createE2ETestUser(
        testApp.app,
        `admin-page-${Date.now()}@example.com`,
        `adminpage${Date.now()}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(user.id as string);

      const page1 = await server
        .get("/admin/users?limit=1&offset=0")
        .set("Cookie", cookie!)
        .expect(200);

      expect(page1.body.users).toHaveLength(1);
      expect(page1.body.total).toBeGreaterThan(0);

      const page2 = await server
        .get("/admin/users?limit=1&offset=1")
        .set("Cookie", cookie!)
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
      const { user, cookie } = await createE2ETestUser(
        testApp.app,
        `admin-fields-${Date.now()}@example.com`,
        `adminfields${Date.now()}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(user.id as string);

      const res = await server
        .get("/admin/users")
        .set("Cookie", cookie!)
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
      const { cookie } = await createE2ETestUser(
        testApp.app,
        `ba-regular-${Date.now()}@example.com`,
        `baregular${Date.now()}`,
      );

      await server
        .get("/api/auth/admin/list-users")
        .set("Cookie", cookie!)
        .expect(403);
    });

    it("admin can list users via the Better Auth admin API", async () => {
      const { user, cookie } = await createE2ETestUser(
        testApp.app,
        `ba-list-${Date.now()}@example.com`,
        `balist${Date.now()}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(user.id as string);

      const res = await server
        .get("/api/auth/admin/list-users")
        .set("Cookie", cookie!)
        .expect(200);

      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(typeof res.body.total).toBe("number");
    });

    it("admin can promote a regular user to admin via set-role", async () => {
      const { user: adminUser, cookie: adminCookie } = await createE2ETestUser(
        testApp.app,
        `ba-setrole-admin-${Date.now()}@example.com`,
        `basetadmin${Date.now()}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(adminUser.id as string);

      const { user: targetUser } = await createE2ETestUser(
        testApp.app,
        `ba-setrole-target-${Date.now()}@example.com`,
        `basettarget${Date.now()}`,
      );

      await server
        .post("/api/auth/admin/set-role")
        .set("Cookie", adminCookie!)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .send({ userId: targetUser.id as string, role: "admin" })
        .expect(200);

      // Verify the change is reflected in the response of our own endpoint.
      const listRes = await server
        .get("/api/auth/admin/list-users")
        .set("Cookie", adminCookie!)
        .expect(200);

      const promoted = (
        listRes.body.users as Array<{ id: string; role: string }>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ).find((u) => u.id === (targetUser.id as string));
      expect(promoted?.role).toBe("admin");
    });

    it("admin can demote an admin to a regular user via set-role", async () => {
      const { user: adminUser, cookie: adminCookie } = await createE2ETestUser(
        testApp.app,
        `ba-demote-admin-${Date.now()}@example.com`,
        `bademoteadmin${Date.now()}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(adminUser.id as string);

      const { user: targetUser } = await createE2ETestUser(
        testApp.app,
        `ba-demote-target-${Date.now()}@example.com`,
        `bademotetrg${Date.now()}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(targetUser.id as string);

      await server
        .post("/api/auth/admin/set-role")
        .set("Cookie", adminCookie!)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .send({ userId: targetUser.id as string, role: "user" })
        .expect(200);

      const listRes = await server
        .get("/api/auth/admin/list-users")
        .set("Cookie", adminCookie!)
        .expect(200);

      const demoted = (
        listRes.body.users as Array<{ id: string; role: string }>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ).find((u) => u.id === (targetUser.id as string));
      expect(demoted?.role).toBe("user");
    });

    it("admin can ban a user and the ban is persisted", async () => {
      const { user: adminUser, cookie: adminCookie } = await createE2ETestUser(
        testApp.app,
        `ba-ban-admin-${Date.now()}@example.com`,
        `babanadmin${Date.now()}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(adminUser.id as string);

      const { user: targetUser } = await createE2ETestUser(
        testApp.app,
        `ba-ban-target-${Date.now()}@example.com`,
        `babantarget${Date.now()}`,
      );

      await server
        .post("/api/auth/admin/ban-user")
        .set("Cookie", adminCookie!)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .send({ userId: targetUser.id as string, banReason: "Spamming in tests" })
        .expect(200);

      // Confirm via get-user that the user is now banned.
      const getUserRes = await server
        .get(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `/api/auth/admin/get-user?id=${targetUser.id as string}`,
        )
        .set("Cookie", adminCookie!)
        .expect(200);

      expect(getUserRes.body.user.banned).toBe(true);
      expect(getUserRes.body.user.banReason).toBe("Spamming in tests");
    });

    it("admin can unban a previously banned user", async () => {
      const { user: adminUser, cookie: adminCookie } = await createE2ETestUser(
        testApp.app,
        `ba-unban-admin-${Date.now()}@example.com`,
        `baunbanadmin${Date.now()}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(adminUser.id as string);

      const { user: targetUser } = await createE2ETestUser(
        testApp.app,
        `ba-unban-target-${Date.now()}@example.com`,
        `baunbantarget${Date.now()}`,
      );

      // Ban then unban.
      await server
        .post("/api/auth/admin/ban-user")
        .set("Cookie", adminCookie!)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .send({ userId: targetUser.id as string })
        .expect(200);

      await server
        .post("/api/auth/admin/unban-user")
        .set("Cookie", adminCookie!)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .send({ userId: targetUser.id as string })
        .expect(200);

      const getUserRes = await server
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .get(`/api/auth/admin/get-user?id=${targetUser.id as string}`)
        .set("Cookie", adminCookie!)
        .expect(200);

      expect(getUserRes.body.user.banned).toBe(false);
    });

    it("banned user cannot sign in", async () => {
      const email = `ba-banned-signin-${Date.now()}@example.com`;
      const username = `babannedtarget${Date.now()}`;

      const { user: adminUser, cookie: adminCookie } = await createE2ETestUser(
        testApp.app,
        `ba-banned-admin-${Date.now()}@example.com`,
        `babannedadmin${Date.now()}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await adminService.promoteToAdmin(adminUser.id as string);

      const { user: targetUser } = await createE2ETestUser(
        testApp.app,
        email,
        username,
      );

      await server
        .post("/api/auth/admin/ban-user")
        .set("Cookie", adminCookie!)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .send({ userId: targetUser.id as string })
        .expect(200);

      // Better Auth should reject the sign-in for a banned user.
      const signinRes = await server
        .post("/api/auth/sign-in/email")
        .send({ email, password: "TestPassword123!" });

      expect(signinRes.status).not.toBe(200);
    });
  });
});
