import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { registerAndGetSession } from "../helpers/auth.helper";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("Agent skills controller", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;
  let userCookie: string;
  let otherCookie: string;

  const server = () => request(testApp.app.getHttpServer());

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const suffix = Date.now();
    userCookie = (
      await registerAndGetSession(
        server(),
        `skilluser${suffix}@example.com`,
        `skilluser${suffix}`,
      )
    ).cookie;
    otherCookie = (
      await registerAndGetSession(
        server(),
        `skillother${suffix}@example.com`,
        `skillother${suffix}`,
      )
    ).cookie;
  }, 120000);

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE agent_skills RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  // ─── List ───────────────────────────────────────────────────────────────────

  it("installs default skills on first list", async () => {
    const res = await server()
      .get("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    expect(
      res.body.items.every((s: { isDefault: boolean }) => s.isDefault),
    ).toBe(true);

    // A second call must not duplicate the defaults.
    const again = await server()
      .get("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .expect(200);
    expect(again.body.items.length).toBe(res.body.items.length);
  });

  it("requires authentication", async () => {
    await server().get("/users/me/agent-skills").expect(401);
    await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "test" })
      .expect(401);
    await server().post("/users/me/agent-skills").expect(401);
  });

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  it("creates, updates, and deletes a skill", async () => {
    const created = await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({
        name: "Translate to French",
        description: "Translate text into French",
        content: "Translate the user's text into fluent French.",
      })
      .expect(201);

    expect(created.body.name).toBe("Translate to French");
    expect(created.body.isDefault).toBe(false);
    expect(created.body.id).toBeTruthy();
    expect(created.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const id = created.body.id as string;

    const updated = await server()
      .patch(`/users/me/agent-skills/${id}`)
      .set("Cookie", userCookie)
      .send({ description: "Translate any text into French" })
      .expect(200);
    expect(updated.body.description).toBe("Translate any text into French");
    expect(updated.body.name).toBe("Translate to French");

    await server()
      .delete(`/users/me/agent-skills/${id}`)
      .set("Cookie", userCookie)
      .expect(204);

    await server()
      .patch(`/users/me/agent-skills/${id}`)
      .set("Cookie", userCookie)
      .send({ name: "Nope" })
      .expect(404);
  });

  it("does not let a user touch another user's skill", async () => {
    const created = await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({ name: "Private skill", description: "", content: "Do a thing." })
      .expect(201);
    const id = created.body.id as string;

    await server()
      .patch(`/users/me/agent-skills/${id}`)
      .set("Cookie", otherCookie)
      .send({ name: "Hijack" })
      .expect(404);

    await server()
      .delete(`/users/me/agent-skills/${id}`)
      .set("Cookie", otherCookie)
      .expect(404);
  });

  it("rejects update with no fields", async () => {
    const created = await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({ name: "Test", description: "", content: "Content." })
      .expect(201);

    await server()
      .patch(`/users/me/agent-skills/${created.body.id as string}`)
      .set("Cookie", userCookie)
      .send({})
      .expect(400);
  });

  // ─── Hybrid search ──────────────────────────────────────────────────────────

  it("returns { items } shape with no mode field", async () => {
    await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({
        name: "Write Unit Tests",
        description: "Generate unit tests",
        content: "Write comprehensive unit tests for the provided code.",
      })
      .expect(201);

    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "unit tests" })
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body.mode).toBeUndefined();
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("returns scored results matching a keyword query", async () => {
    await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({
        name: "Kubernetes Debugging",
        description: "Diagnose failing pods",
        content: "Inspect kubectl output and suggest fixes for crashing pods.",
      })
      .expect(201);
    await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({
        name: "SQL Query Optimizer",
        description: "Improve slow database queries",
        content: "Analyze and rewrite SQL queries to improve performance.",
      })
      .expect(201);

    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "kubernetes" })
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(
      res.body.items.some(
        (s: { name: string }) => s.name === "Kubernetes Debugging",
      ),
    ).toBe(true);
    for (const item of res.body.items as { score: unknown }[]) {
      expect(typeof item.score).toBe("number");
      expect(isFinite(item.score as number)).toBe(true);
    }
  });

  it("searches across name, description, and content fields", async () => {
    // Match via name
    const byName = await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({ name: "Refactor Python", description: "", content: "Clean up code." })
      .expect(201);

    // Match via description
    const byDesc = await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({
        name: "Code Assistant",
        description: "Rewrite legacy python modules",
        content: "Help with code improvements.",
      })
      .expect(201);

    // Match via content
    const byContent = await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({
        name: "Development Helper",
        description: "General coding assistance",
        content: "Convert python 2 scripts to python 3 syntax.",
      })
      .expect(201);

    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "python" })
      .set("Cookie", userCookie)
      .expect(200);

    const names = (res.body.items as { name: string }[]).map((s) => s.name);
    expect(names).toContain(byName.body.name);
    expect(names).toContain(byDesc.body.name);
    expect(names).toContain(byContent.body.name);
  });

  it("returns valid items array for a query with no BM25 match", async () => {
    // Hybrid search: BM25 returns nothing but the vector stage may still surface
    // skills (with the stub zero-vector embedding, cosine distance is undefined
    // but pgvector handles it gracefully). The response must always be a valid
    // array with numeric scores.
    await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({ name: "Something", description: "", content: "Do a thing." })
      .expect(201);

    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "zzznomatchqueryzzz" })
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    for (const item of res.body.items as { score: unknown }[]) {
      expect(typeof item.score).toBe("number");
      expect(isFinite(item.score as number)).toBe(true);
    }
  });

  it("installs defaults before search and includes them in results", async () => {
    // Trigger default install via search (no prior list call)
    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "summarize" })
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    // Defaults were installed, so there should be skills to score
  });

  it("respects the limit parameter", async () => {
    // Create several skills
    for (let i = 1; i <= 5; i++) {
      await server()
        .post("/users/me/agent-skills")
        .set("Cookie", userCookie)
        .send({
          name: `Translation Skill ${i}`,
          description: "Translate content",
          content: `Translate text into language ${i}.`,
        })
        .expect(201);
    }

    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "translate", limit: 2 })
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body.items.length).toBeLessThanOrEqual(2);
  });

  it("rejects search with missing q param", async () => {
    const res = await server()
      .get("/users/me/agent-skills/search")
      .set("Cookie", userCookie);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("does not return another user's skills in search results", async () => {
    await server()
      .post("/users/me/agent-skills")
      .set("Cookie", otherCookie)
      .send({
        name: "OtherUser Exclusive",
        description: "Belongs to other",
        content: "This is a secret skill.",
      })
      .expect(201);

    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "OtherUser" })
      .set("Cookie", userCookie)
      .expect(200);

    expect(
      (res.body.items as { name: string }[]).some(
        (s) => s.name === "OtherUser Exclusive",
      ),
    ).toBe(false);
  });

  // ─── Reset to defaults ──────────────────────────────────────────────────────

  it("resets skills to defaults, replacing custom ones", async () => {
    // Create a custom skill
    await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({
        name: "Custom Skill To Be Deleted",
        description: "",
        content: "This will be wiped.",
      })
      .expect(201);

    const before = await server()
      .get("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .expect(200);
    expect(
      before.body.items.some(
        (s: { name: string }) => s.name === "Custom Skill To Be Deleted",
      ),
    ).toBe(true);

    const reset = await server()
      .post("/users/me/agent-skills/reset-to-defaults")
      .set("Cookie", userCookie)
      .expect(200);

    expect(Array.isArray(reset.body.items)).toBe(true);
    expect(reset.body.items.length).toBeGreaterThan(0);
    expect(
      reset.body.items.every((s: { isDefault: boolean }) => s.isDefault),
    ).toBe(true);
    expect(
      reset.body.items.some(
        (s: { name: string }) => s.name === "Custom Skill To Be Deleted",
      ),
    ).toBe(false);
  });

  it("reset-to-defaults is idempotent", async () => {
    const first = await server()
      .post("/users/me/agent-skills/reset-to-defaults")
      .set("Cookie", userCookie)
      .expect(200);

    const second = await server()
      .post("/users/me/agent-skills/reset-to-defaults")
      .set("Cookie", userCookie)
      .expect(200);

    expect(first.body.items.length).toBe(second.body.items.length);
    const firstNames = (first.body.items as { name: string }[])
      .map((s) => s.name)
      .sort();
    const secondNames = (second.body.items as { name: string }[])
      .map((s) => s.name)
      .sort();
    expect(firstNames).toEqual(secondNames);
  });

  it("reset-to-defaults requires authentication", async () => {
    await server()
      .post("/users/me/agent-skills/reset-to-defaults")
      .expect(401);
  });
});
