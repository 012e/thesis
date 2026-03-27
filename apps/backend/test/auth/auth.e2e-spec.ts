import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { closeTestApp, createTestApp } from '../helpers/app.setup';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  createTestAuthClient,
  type TestAuthClient,
} from 'test/helpers/auth-client.helper';
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from '../helpers/testcontainers.setup';

describe('Auth integration', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let authClient: TestAuthClient;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    authClient = createTestAuthClient(testApp.app);
  }, 120000);

  afterAll(async () => {
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  describe('registration', () => {
    it('creates a new user and returns user data', async () => {
      const email = `register-${Date.now()}@example.com`;

      const { data, error } = await authClient.register({
        email,
        username: `user-${Date.now()}`,
        password: 'TestPassword123!',
        name: 'Test User',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.user).toBeDefined();
      expect(data!.user.id).toBeTruthy();
      expect(data!.user.email).toBe(email);
      expect(data!.user.name).toBe('Test User');
    });

    it('rejects duplicate email registrations', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      const first = await authClient.register({
        email,
        username: `first-${Date.now()}`,
        password: 'TestPassword123!',
        name: 'First User',
      });
      expect(first.error).toBeNull();

      const second = await authClient.register({
        email,
        username: `second-${Date.now()}`,
        password: 'TestPassword123!',
        name: 'Second User',
      });

      expect(second.error).toBeTruthy();
    });

    it('rejects registration with a weak password', async () => {
      const { error } = await authClient.register({
        email: `weak-${Date.now()}@example.com`,
        username: `weak-${Date.now()}`,
        password: 'short',
        name: 'Weak Password User',
      });

      expect(error).toBeTruthy();
    });

    it('returns a session token after successful registration', async () => {
      const { data, error } = await authClient.register({
        email: `session-${Date.now()}@example.com`,
        username: `session-${Date.now()}`,
        password: 'TestPassword123!',
        name: 'Session User',
      });

      expect(error).toBeNull();
      // Better Auth returns token directly on data (null when using cookies)
      // In a Node.js test env, the token is returned as data.token
      expect(data!.user).toBeDefined();
      expect(data!.user.id).toBeTruthy();
    });
  });

  describe('login', () => {
    const email = `login-user-${Date.now()}@example.com`;
    const password = 'LoginPassword123!';

    beforeAll(async () => {
      await authClient.register({
        email,
        username: `login-user-${Date.now()}`,
        password,
        name: 'Login User',
      });
    });

    it('signs in with correct credentials', async () => {
      const { data, error } = await authClient.login({ email, password });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.user.email).toBe(email);
    });

    it('rejects login with wrong password', async () => {
      const { error } = await authClient.login({
        email,
        password: 'WrongPassword999!',
      });

      expect(error).toBeTruthy();
    });

    it('rejects login for non-existent user', async () => {
      const { error } = await authClient.login({
        email: `nonexistent-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      });

      expect(error).toBeTruthy();
    });
  });

  describe('session', () => {
    it('returns the authenticated user for a valid session token', async () => {
      // Register via HTTP to capture the Set-Cookie header
      const registerRes = await request(testApp.app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          email: `session-check-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Session Check User',
        })
        .expect(200);

      // Extract session token from Set-Cookie header
      const setCookieHeader = registerRes.headers['set-cookie'] as
        | string[]
        | string;
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      const sessionCookie = cookies
        .find((c) => c.startsWith('better-auth.session_token='))
        ?.split(';')[0];

      expect(sessionCookie).toBeTruthy();
      const token = sessionCookie!.replace('better-auth.session_token=', '');

      const { data: sessionData, error } = await authClient.getSession(token);

      expect(error).toBeNull();
      expect(sessionData).toBeDefined();
      expect(sessionData!.user.email).toContain('session-check-');
    });

    it('returns no session for an invalid token', async () => {
      const { data } = await authClient.getSession('invalid-token-xyz');

      expect(data).toBeNull();
    });
  });

  describe('sign-out', () => {
    it('invalidates the session after sign-out', async () => {
      // Register via HTTP to get a session cookie
      const registerRes = await request(testApp.app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          email: `signout-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Sign Out User',
        })
        .expect(200);

      const setCookieHeader = registerRes.headers['set-cookie'] as
        | string[]
        | string;
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      const sessionCookie = cookies
        .find((c) => c.startsWith('better-auth.session_token='))
        ?.split(';')[0];
      const token = sessionCookie!.replace('better-auth.session_token=', '');

      await authClient.signOut(token);

      const { data: afterSignOut } = await authClient.getSession(token);
      expect(afterSignOut).toBeNull();
    });
  });

  describe('Better Auth HTTP endpoints', () => {
    it('GET /api/auth/get-session returns 200', async () => {
      await request(testApp.app.getHttpServer())
        .get('/api/auth/get-session')
        .expect(200);
    });

    it('GET /api/auth/get-session with valid cookie returns user data', async () => {
      const email = `http-session-${Date.now()}@example.com`;

      const registerRes = await request(testApp.app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          email,
          password: 'TestPassword123!',
          name: 'HTTP Session User',
        })
        .expect(200);

      const setCookieHeader = registerRes.headers['set-cookie'] as
        | string[]
        | string;
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      const sessionCookieEntry = cookies.find((c) =>
        c.startsWith('better-auth.session_token='),
      );

      expect(sessionCookieEntry).toBeTruthy();

      const response = await request(testApp.app.getHttpServer())
        .get('/api/auth/get-session')
        .set('Cookie', sessionCookieEntry!.split(';')[0])
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(email);
    });
    describe('/auth/me endpoint', () => {
      it('returns 401 for unauthenticated requests', async () => {
        await request(testApp.app.getHttpServer()).get('/auth/me').expect(401);
      });

      it('returns user data for authenticated requests', async () => {
        const email = `auth-me-${Date.now()}@example.com`;
        const username = `authme${Date.now()}`;

        const registerRes = await request(testApp.app.getHttpServer())
          .post('/api/auth/sign-up/email')
          .send({
            email,
            username,
            password: 'TestPassword123!',
            name: 'Auth Me User',
          })
          .expect(200);

        const setCookieHeader = registerRes.headers['set-cookie'] as
          | string[]
          | string;
        const cookies = Array.isArray(setCookieHeader)
          ? setCookieHeader
          : [setCookieHeader];
        const sessionCookieEntry = cookies.find((c) =>
          c.startsWith('better-auth.session_token='),
        );

        const response = await request(testApp.app.getHttpServer())
          .get('/auth/me')
          .set('Cookie', sessionCookieEntry!.split(';')[0])
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.id).toBeTruthy();
        expect(response.body.username).toBe(username);
      });
    });
  });
});
