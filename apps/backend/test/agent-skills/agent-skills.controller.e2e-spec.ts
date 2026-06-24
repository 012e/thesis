import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { DEFAULT_AGENT_SKILLS } from "@/agent-skills/default-agent-skills";

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

  it("installs default skills on first list", async () => {
    const res = await server()
      .get("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items).toHaveLength(DEFAULT_AGENT_SKILLS.length);
    expect(res.body.items.every((s: { isDefault: boolean }) => s.isDefault)).toBe(
      true,
    );
    expect(res.body.items.map((s: { name: string }) => s.name)).toEqual(
      expect.arrayContaining([
        "Create a New Post",
        "Publish Provided Post",
        "Execute Code",
        "Debug Code",
        "Apply Saved Skill",
      ]),
    );

    // A second call must not duplicate the defaults.
    const again = await server()
      .get("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .expect(200);
    expect(again.body.items.length).toBe(res.body.items.length);
  });

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

  it("searches skills by text", async () => {
    await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({
        name: "Kubernetes Debugging",
        description: "Diagnose failing pods",
        content: "Inspect kubectl output and suggest fixes for crashing pods.",
      })
      .expect(201);

    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "kubernetes", mode: "text" })
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body.mode).toBe("text");
    expect(
      res.body.items.some(
        (s: { name: string }) => s.name === "Kubernetes Debugging",
      ),
    ).toBe(true);
  });

  it("searches skills by embedding without error", async () => {
    await server()
      .post("/users/me/agent-skills")
      .set("Cookie", userCookie)
      .send({ name: "Anything", description: "", content: "Some content." })
      .expect(201);

    const res = await server()
      .get("/users/me/agent-skills/search")
      .query({ q: "anything", mode: "embedding" })
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body.mode).toBe("embedding");
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
