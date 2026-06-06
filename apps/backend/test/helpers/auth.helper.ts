import * as supertest from "supertest";
import { INestApplication } from "@nestjs/common";
import { expect } from "vitest";

export async function createE2ETestUser(
  app: INestApplication,
  email: string,
  username: string,
) {
  const request = supertest.default || supertest;

  const registerRes = await request(app.getHttpServer())
    .post("/api/auth/sign-up/email")
    .send({
      email,
      username,
      password: "TestPassword123!",
      name: "Test User",
    });

  if (registerRes.status !== 200) {
    console.error(
      "Registration failed:",
      registerRes.status,
      registerRes.body,
      registerRes.text,
    );
  }

  expect(registerRes.status).toBe(200);

  const headers = registerRes.headers;

  const setCookieHeader = headers["set-cookie"];

  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const cookie = cookies
    .find((c: any) => c.startsWith("better-auth.session_token="))
    ?.split(";")[0];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user = registerRes.body.user;

  return { user, cookie };
}

/**
 * Register a user via the HTTP API and return only the session cookie string.
 * Optionally accepts password and name; defaults to 'TestPassword123!' and 'Test User'.
 */
export async function registerAndGetSessionCookie(
  server: ReturnType<typeof supertest>,
  email: string,
  password = "TestPassword123!",
  name = "Test User",
): Promise<string> {
  const username =
    email.split("@")[0]?.replace(/[^a-zA-Z0-9_.]/g, "") ?? "user";
  const res = await server
    .post("/api/auth/sign-up/email")
    .send({ email, username, password, name })
    .expect(200);

  const setCookieHeader = res.headers["set-cookie"] as string[] | string;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  const entry = cookies.find((c) => c.startsWith("better-auth.session_token="));

  if (!entry) {
    throw new Error(
      `No session cookie found in Set-Cookie: ${JSON.stringify(cookies)}`,
    );
  }

  return entry.split(";")[0]; // "better-auth.session_token=<value>"
}

/**
 * Register a user via the HTTP API and return both the session cookie and user ID.
 * Useful when you need to track both authentication and user identity.
 */
export async function registerAndGetSession(
  server: ReturnType<typeof supertest>,
  email: string,
  username: string,
): Promise<{ cookie: string; userId: string }> {
  const res = await server
    .post("/api/auth/sign-up/email")
    .send({ email, username, password: "TestPassword123!", name: "Test User" })
    .expect(200);

  const setCookieHeader = res.headers["set-cookie"] as string[] | string;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  const entry = cookies.find((c) => c.startsWith("better-auth.session_token="));

  if (!entry) {
    throw new Error(
      `No session cookie found in Set-Cookie: ${JSON.stringify(cookies)}`,
    );
  }

  const cookie = entry.split(";")[0];

  const sessionRes = await server
    .get("/api/auth/get-session")
    .set("Cookie", cookie)
    .expect(200);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const userId = sessionRes.body.user.id as string;

  return { cookie, userId };
}

/**
 * Register a user and return both the session cookie, user ID, and Bearer JWT token.
 * The Bearer token is required for WebSocket (Socket.IO) authentication via the
 * `auth: { token }` handshake option.
 */
export async function registerAndGetSessionWithToken(
  server: ReturnType<typeof supertest>,
  email: string,
  username: string,
): Promise<{ cookie: string; userId: string; bearerToken: string }> {
  const res = await server
    .post("/api/auth/sign-up/email")
    .send({ email, username, password: "TestPassword123!", name: "Test User" })
    .expect(200);

  const setCookieHeader = res.headers["set-cookie"] as string[] | string;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  const entry = cookies.find((c) => c.startsWith("better-auth.session_token="));

  if (!entry) {
    throw new Error(
      `No session cookie found in Set-Cookie: ${JSON.stringify(cookies)}`,
    );
  }

  const cookie = entry.split(";")[0];

  // Better Auth bearer plugin returns the JWT in the `set-auth-token` header
  const bearerToken = res.headers["set-auth-token"] as string | undefined;
  if (!bearerToken) {
    throw new Error(
      "No bearer token found in set-auth-token response header. Ensure the Better Auth bearer plugin is enabled.",
    );
  }

  const sessionRes = await server
    .get("/api/auth/get-session")
    .set("Cookie", cookie)
    .expect(200);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const userId = sessionRes.body.user.id as string;

  return { cookie, userId, bearerToken };
}
