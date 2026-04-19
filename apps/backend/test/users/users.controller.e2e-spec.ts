import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as supertest from "supertest";
import { DatabaseService } from "@/db/database.service";
import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import { createE2ETestUser } from "../helpers/auth.helper";
import { userFollows, posts, userProfiles } from "@/db/schema";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

const request = supertest.default || supertest;

describe("UsersController (e2e)", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);
    testApp = await createTestApp(containers);
    databaseService = testApp.app.get(DatabaseService);
  }, 120000);

  afterAll(async () => {
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  describe("GET /users/:id/profile", () => {
    it("should return a 404 if user does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { cookie } = await createE2ETestUser(
        testApp.app,
        "user1@example.com",
        "user1",
      );

      return request(testApp.app.getHttpServer())
        .get("/users/non-existent-id/profile")
        .set("Cookie", cookie ? [cookie as string] : [])
        .expect(404);
    });

    it("should return user profile with correct stats", async () => {
      const currentUser = await createE2ETestUser(
        testApp.app,
        "user10@example.com",
        "user10",
      );
      const targetUser = await createE2ETestUser(
        testApp.app,
        "user20@example.com",
        "user20",
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const followerId = currentUser.user.id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const followeeId = targetUser.user.id;

      // Create a follow: currentUser -> targetUser
      await databaseService.db.insert(userFollows).values({
        followerId: followerId as string,
        followeeId: followeeId as string,
      });

      // Create a post for targetUser
      await databaseService.db.insert(posts).values({
        authorId: followeeId as string,
        content: { text: "Hello" },
      });

      const response = await request(testApp.app.getHttpServer())
        .get(`/users/${followeeId as string}/profile`)
        .set("Cookie", currentUser.cookie ? [currentUser.cookie as string] : [])
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.id).toBe(followeeId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.email).toBe("user20@example.com");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.username).toBe("user20");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.followersCount).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.followingCount).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.postCount).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.isFollowing).toBe(true);
    });

    it("should return 401 if unauthorized", async () => {
      const targetUser = await createE2ETestUser(
        testApp.app,
        "user30@example.com",
        "user30",
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const targetUserId = targetUser.user.id;

      return request(testApp.app.getHttpServer())
        .get(`/users/${targetUserId as string}/profile`)
        .expect(401);
    });
  });

  describe("GET /users/search", () => {
    let authCookie: string;

    beforeAll(async () => {
      const { cookie } = await createE2ETestUser(
        testApp.app,
        "srchactor@example.com",
        "srchactor",
      );
      if (!cookie)
        throw new Error("No session cookie returned from user creation");
      authCookie = cookie;
    });

    it("should return 401 if not authenticated", () => {
      return request(testApp.app.getHttpServer())
        .get("/users/search?q=test")
        .expect(401);
    });

    it("should return an empty array when no users match the query", async () => {
      const response = await request(testApp.app.getHttpServer())
        .get("/users/search?q=zzznomatchzzzxxx99999")
        .set("Cookie", [authCookie])
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should find users by username", async () => {
      await createE2ETestUser(
        testApp.app,
        "srchbyusr@example.com",
        "srchbyusr",
      );

      const response = await request(testApp.app.getHttpServer())
        .get("/users/search?q=srchbyusr")
        .set("Cookie", [authCookie])
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      const usernames = response.body.map((u: any) => u.username);
      expect(usernames).toContain("srchbyusr");
    });

    it("should find users by name", async () => {
      // createE2ETestUser hardcodes name='Test User', so call sign-up directly
      await request(testApp.app.getHttpServer())
        .post("/api/auth/sign-up/email")
        .send({
          email: "srchbyname@example.com",
          username: "srchbyname",
          password: "TestPassword123!",
          name: "Zephyranthes",
        })
        .expect(200);

      const response = await request(testApp.app.getHttpServer())
        .get("/users/search?q=Zephyranthes")
        .set("Cookie", [authCookie])
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      const names = response.body.map((u: any) => u.name);
      expect(names).toContain("Zephyranthes");
    });

    it("should find users by email (email is indexed but not returned)", async () => {
      // Use a unique email local-part that differs from the username so we can
      // be sure the match is driven by the email field, not the username field.
      await request(testApp.app.getHttpServer())
        .post("/api/auth/sign-up/email")
        .send({
          email: "zxqemailsrch@example.com",
          username: "emailsrchuser",
          password: "TestPassword123!",
          name: "Test User",
        })
        .expect(200);

      const response = await request(testApp.app.getHttpServer())
        .get("/users/search?q=zxqemailsrch")
        .set("Cookie", [authCookie])
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      const usernames = response.body.map((u: any) => u.username);
      expect(usernames).toContain("emailsrchuser");
    });

    it("should not expose email in the response", async () => {
      await createE2ETestUser(
        testApp.app,
        "srchprivacy@example.com",
        "srchprivacy",
      );

      const response = await request(testApp.app.getHttpServer())
        .get("/users/search?q=srchprivacy")
        .set("Cookie", [authCookie])
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.body.forEach((u: any) => {
        // email is used for indexing but must never appear in the response
        expect(u).not.toHaveProperty("email");
      });
    });

    it("should return results with the correct shape", async () => {
      await createE2ETestUser(
        testApp.app,
        "srchshape@example.com",
        "srchshape",
      );

      const response = await request(testApp.app.getHttpServer())
        .get("/users/search?q=srchshape")
        .set("Cookie", [authCookie])
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const u = response.body[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(u.id).toBeTruthy();
      expect(u).toHaveProperty("username");
      expect(u).toHaveProperty("displayUsername");
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("image");
      expect(u).not.toHaveProperty("email");
    });
  });

  describe("PATCH /users/me/avatar", () => {
    it("should save the avatar URL and return it in the response", async () => {
      const { cookie, user } = await createE2ETestUser(
        testApp.app,
        "avatartest@example.com",
        "avatartest",
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const userId = user.id as string;
      const avatarUrl = "https://cdn.example.com/avatars/avatartest.webp";

      const response = await request(testApp.app.getHttpServer())
        .patch("/users/me/avatar")
        .set("Cookie", cookie ? [cookie as string] : [])
        .send({ avatarUrl })
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.image).toBe(avatarUrl);

      // Verify it was persisted: the row must exist in user_profiles.
      const { eq } = await import("drizzle-orm");
      const [profileRow] = await databaseService.db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      expect(profileRow).toBeDefined();
      expect(profileRow?.avatarUrl).toBe(avatarUrl);
    });

    it("should reflect the saved avatar in GET /users/:id/profile", async () => {
      const { cookie, user } = await createE2ETestUser(
        testApp.app,
        "avatarprofile@example.com",
        "avatarprofile",
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const userId = user.id as string;
      const avatarUrl = "https://cdn.example.com/avatars/avatarprofile.webp";

      // Set the avatar
      await request(testApp.app.getHttpServer())
        .patch("/users/me/avatar")
        .set("Cookie", cookie ? [cookie as string] : [])
        .send({ avatarUrl })
        .expect(200);

      // Profile should return the saved URL exactly.
      const profileResponse = await request(testApp.app.getHttpServer())
        .get(`/users/${userId}/profile`)
        .set("Cookie", cookie ? [cookie as string] : [])
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(profileResponse.body.image).toBe(avatarUrl);
    });
  });
});
