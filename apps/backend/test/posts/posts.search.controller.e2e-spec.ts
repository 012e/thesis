import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import { registerAndGetSessionCookie } from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  startMinioContainer,
  stopMinioContainer,
  type PostgresContainerContext,
  type MinioContainerContext,
} from "../helpers/testcontainers.setup";

describe("GET /posts/search", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let minioContainer: MinioContainerContext;
  let pool: Pool;
  let userCookie: string;

  const expectPostDtoShape = (post: Record<string, unknown>) => {
    expect(post.id).toBeTruthy();
    expect(post.authorId).toBeTruthy();
    expect(post.author).toBeDefined();
    expect(post.content).toBeDefined();
    expect(post.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(post.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof post.upvoteCount).toBe("number");
    expect(typeof post.downvoteCount).toBe("number");
    expect(typeof post.commentCount).toBe("number");
    expect(typeof post.currentUserUpvoted).toBe("boolean");
    expect(typeof post.currentUserDownvoted).toBe("boolean");
    expect(typeof post.currentUserSubscribed).toBe("boolean");
    expect(typeof post.currentUserBookmarked).toBe("boolean");
    expect(Array.isArray(post.tags)).toBe(true);
  };

  beforeAll(async () => {
    containers = await startPostgresContainer();
    minioContainer = await startMinioContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers, undefined, minioContainer);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    userCookie = await registerAndGetSessionCookie(
      server,
      `search-user-${Date.now()}@example.com`,
    );
  }, 180000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
    await stopMinioContainer(minioContainer);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE posts RESTART IDENTITY CASCADE");
  });

  it("returns 401 when not authenticated", async () => {
    await request(testApp.app.getHttpServer())
      .get("/posts/search?q=hello")
      .expect(401);
  });

  it("returns 400 when q is missing", async () => {
    const res = await request(testApp.app.getHttpServer())
      .get("/posts/search")
      .set("Cookie", userCookie);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("returns post-shaped results for a search query", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({ content: { text: "GraphQL APIs are flexible and efficient" } })
      .expect(201);

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({ content: { text: "REST APIs follow a stateless architecture" } })
      .expect(201);

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({ content: { text: "Baking sourdough bread at home" } })
      .expect(201);

    const res = await server
      .get("/posts/search?q=GraphQL")
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (const post of res.body as Record<string, unknown>[]) {
      expectPostDtoShape(post);
    }
  });

  it("returns an array for queries without lexical matches", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({ content: { text: "Microservices architecture with Kubernetes" } })
      .expect(201);

    const res = await server
      .get("/posts/search?q=blockchain")
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (const post of res.body as Record<string, unknown>[]) {
      expectPostDtoShape(post);
    }
  });

  it("returns an empty array when there are no posts", async () => {
    const res = await request(testApp.app.getHttpServer())
      .get("/posts/search?q=anything")
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it("returns correct PostDto shape for each result", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({ content: { text: "Monorepo tooling with Nx and Turborepo" } })
      .expect(201);

    const res = await server
      .get("/posts/search?q=Monorepo")
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (const post of res.body as Record<string, unknown>[]) {
      expectPostDtoShape(post);
    }
  });

  it("is case-insensitive", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({
        content: {
          text: "WebAssembly brings near-native performance to browsers",
        },
      })
      .expect(201);

    const resLower = await server
      .get("/posts/search?q=webassembly")
      .set("Cookie", userCookie)
      .expect(200);

    const resUpper = await server
      .get("/posts/search?q=WEBASSEMBLY")
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(resLower.body)).toBe(true);
    expect(Array.isArray(resUpper.body)).toBe(true);
  });

  it("returns post-shaped results when several posts may match", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({ content: { text: "PostgreSQL full-text search capabilities" } })
      .expect(201);

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({
        content: { text: "PostgreSQL vs MySQL: which database to choose" },
      })
      .expect(201);

    await server
      .post("/posts")
      .set("Cookie", userCookie)
      .send({ content: { text: "Redis caching strategies for web apps" } })
      .expect(201);

    const res = await server
      .get("/posts/search?q=PostgreSQL")
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (const post of res.body as Record<string, unknown>[]) {
      expectPostDtoShape(post);
    }
  });
});
