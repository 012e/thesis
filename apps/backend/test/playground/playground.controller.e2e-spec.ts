import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import { registerAndGetSessionCookie } from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("PlaygroundController integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;
  let userCookie: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    userCookie = await registerAndGetSessionCookie(
      server,
      `playground-user-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  describe("POST /playground/execute", () => {
    it("executes valid JavaScript code and returns stdout", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: 'console.log("Hello, World!"); console.log(2 + 2);',
          language: "javascript",
        })
        .expect(200);

      expect(res.body).toMatchObject({
        stdout: expect.stringContaining("Hello, World!"),
        stderr: "",
        exitCode: 0,
      });
      expect(res.body.stdout).toContain("4");
      expect(res.body.executionTime).toBeGreaterThan(0);
    }, 120000);

    it("executes JavaScript with multiple console outputs", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: `
            for (let i = 0; i < 3; i++) {
              console.log('Count: ' + i);
            }
          `,
          language: "javascript",
        })
        .expect(200);

      expect(res.body.stdout).toContain("Count: 0");
      expect(res.body.stdout).toContain("Count: 1");
      expect(res.body.stdout).toContain("Count: 2");
      expect(res.body.exitCode).toBe(0);
    }, 120000);

    it("captures stderr for runtime errors", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: 'throw new Error("Test error");',
          language: "javascript",
        })
        .expect(200);

      expect(res.body.stderr).toContain("Error: Test error");
      expect(res.body.exitCode).toBe(1);
    }, 120000);

    it("handles syntax errors gracefully", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: 'console.log("missing closing parenthesis"',
          language: "javascript",
        })
        .expect(200);

      expect(res.body.stderr).toBeTruthy();
      expect(res.body.exitCode).not.toBe(0);
    }, 120000);

    it("respects custom timeout", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: "const start = Date.now(); while(Date.now() - start < 10000) {}", // Busy wait for 10 seconds
          language: "javascript",
          timeout: 2000, // 2 second timeout
        })
        .expect(200);

      expect(res.body.stderr).toContain("timeout");
      expect(res.body.exitCode).toBe(-1);
      expect(res.body.executionTime).toBeGreaterThanOrEqual(2000);
    }, 150000);

    it("rejects requests without authentication", async () => {
      await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .send({
          code: 'console.log("test");',
          language: "javascript",
        })
        .expect(401);
    }, 120000);

    it("validates code size limit", async () => {
      const largeCode = 'console.log("x");'.repeat(10000); // > 100KB
      // Express body-parser rejects large payloads with 413 before our validation
      await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: largeCode,
          language: "javascript",
        })
        .expect(413); // Payload Too Large from body-parser
    }, 120000);

    it("validates timeout maximum", async () => {
      await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: 'console.log("test");',
          language: "javascript",
          timeout: 70000, // Exceeds 60 second max
        })
        .expect(400);
    }, 120000);

    it("executes code with process.stdout.write", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: 'process.stdout.write("Direct write");',
          language: "javascript",
        })
        .expect(200);

      expect(res.body.stdout).toContain("Direct write");
      expect(res.body.exitCode).toBe(0);
    }, 120000);

    it("can use built-in Node.js modules", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: `
            const path = require('path');
            console.log(path.join('a', 'b', 'c'));
          `,
          language: "javascript",
        })
        .expect(200);

      expect(res.body.stdout).toContain("a/b/c");
      expect(res.body.exitCode).toBe(0);
    }, 120000);

    it("isolates executions from each other", async () => {
      // First execution sets a global variable
      await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: 'global.testVar = "first";',
          language: "javascript",
        })
        .expect(200);

      // Second execution should not see the global variable
      const res = await request(testApp.app.getHttpServer())
        .post("/playground/execute")
        .set("Cookie", userCookie)
        .send({
          code: "console.log(typeof global.testVar);",
          language: "javascript",
        })
        .expect(200);

      expect(res.body.stdout).toContain("undefined");
      expect(res.body.exitCode).toBe(0);
    }, 120000);
  });
});
