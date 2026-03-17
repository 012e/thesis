import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';

import { closeTestApp, createTestApp } from '../helpers/app.setup';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from '../helpers/testcontainers.setup';

/**
 * Register a user via the HTTP API and return the session cookie string.
 */
async function registerAndGetSessionCookie(
  server: ReturnType<typeof request>,
  email: string,
  password = 'TestPassword123!',
  name = 'Test User',
): Promise<string> {
  const res = await server
    .post('/api/auth/sign-up/email')
    .send({ email, password, name })
    .expect(200);

  const setCookieHeader = res.headers['set-cookie'] as string[] | string;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  const entry = cookies.find((c) => c.startsWith('better-auth.session_token='));
  if (!entry) {
    throw new Error(
      `No session cookie found in Set-Cookie: ${JSON.stringify(cookies)}`,
    );
  }
  return entry.split(';')[0];
}

describe('ReactionsController integration', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userBCookie: string;

  // postId is set in beforeEach after each truncation
  let postId: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    userACookie = await registerAndGetSessionCookie(
      server,
      `reactions-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `reactions-b-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE post_reactions RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE posts RESTART IDENTITY CASCADE');

    // Create a fresh post owned by User A for each test.
    const server = request(testApp.app.getHttpServer());
    const res = await server
      .post('/posts')
      .set('Cookie', userACookie)
      .send({ content: { text: 'Reaction test post' } })
      .expect(201);

    postId = res.body.id as string;
  });

  describe('PUT /posts/:id/reaction', () => {
    it('upvotes a post and returns the reaction', async () => {
      const res = await request(testApp.app.getHttpServer())
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'upvote' })
        .expect(200);

      expect(res.body.postId).toBe(postId);
      expect(res.body.type).toBe('upvote');
      expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('downvotes a post and returns the reaction', async () => {
      const res = await request(testApp.app.getHttpServer())
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'downvote' })
        .expect(200);

      expect(res.body.type).toBe('downvote');
    });

    it('replaces an upvote with a downvote', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'upvote' })
        .expect(200);

      const res = await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'downvote' })
        .expect(200);

      expect(res.body.type).toBe('downvote');

      // Verify summary reflects the change.
      const summary = await server
        .get(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .expect(200);

      expect(summary.body.upvotes).toBe(0);
      expect(summary.body.downvotes).toBe(1);
    });

    it('returns 404 for a non-existent post', async () => {
      await request(testApp.app.getHttpServer())
        .put('/posts/00000000-0000-0000-0000-000000000000/reaction')
        .set('Cookie', userBCookie)
        .send({ type: 'upvote' })
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .put(`/posts/${postId}/reaction`)
        .send({ type: 'upvote' })
        .expect(401);
    });
  });

  describe('DELETE /posts/:id/reaction', () => {
    it('removes an existing reaction and returns it', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'upvote' })
        .expect(200);

      const res = await server
        .delete(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .expect(200);

      expect(res.body.type).toBe('upvote');

      // Summary should now show 0 upvotes.
      const summary = await server
        .get(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .expect(200);

      expect(summary.body.upvotes).toBe(0);
    });

    it('returns 404 when the user has no reaction to remove', async () => {
      await request(testApp.app.getHttpServer())
        .delete(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .expect(404);
    });

    it('returns 404 for a non-existent post', async () => {
      await request(testApp.app.getHttpServer())
        .delete('/posts/00000000-0000-0000-0000-000000000000/reaction')
        .set('Cookie', userBCookie)
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .delete(`/posts/${postId}/reaction`)
        .expect(401);
    });
  });

  describe('GET /posts/:id/reaction', () => {
    it('returns zero counts and null userReaction when nobody has reacted', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}/reaction`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toEqual({
        upvotes: 0,
        downvotes: 0,
        userReaction: null,
      });
    });

    it('counts multiple upvotes and downvotes', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userACookie)
        .send({ type: 'upvote' })
        .expect(200);

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'downvote' })
        .expect(200);

      const res = await server
        .get(`/posts/${postId}/reaction`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.upvotes).toBe(1);
      expect(res.body.downvotes).toBe(1);
    });

    it("reflects the requesting user's own reaction in userReaction", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'downvote' })
        .expect(200);

      const res = await server
        .get(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .expect(200);

      expect(res.body.userReaction).toBe('downvote');
    });

    it('returns 404 for a non-existent post', async () => {
      await request(testApp.app.getHttpServer())
        .get('/posts/00000000-0000-0000-0000-000000000000/reaction')
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}/reaction`)
        .expect(401);
    });
  });

  describe('GET /posts/:id/reactors', () => {
    it('returns an empty array when nobody has reacted', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}/reactors`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns all reactors with user details', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userACookie)
        .send({ type: 'upvote' })
        .expect(200);

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'downvote' })
        .expect(200);

      const res = await server
        .get(`/posts/${postId}/reactors`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBeTruthy();
      expect(res.body[0].email).toBeTruthy();
      expect(res.body[0].reactionType).toMatch(/^(upvote|downvote)$/);
      expect(res.body[0].reactedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('filters reactors by upvote type', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userACookie)
        .send({ type: 'upvote' })
        .expect(200);

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'downvote' })
        .expect(200);

      const res = await server
        .get(`/posts/${postId}/reactors?type=upvote`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].reactionType).toBe('upvote');
    });

    it('filters reactors by downvote type', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userACookie)
        .send({ type: 'upvote' })
        .expect(200);

      await server
        .put(`/posts/${postId}/reaction`)
        .set('Cookie', userBCookie)
        .send({ type: 'downvote' })
        .expect(200);

      const res = await server
        .get(`/posts/${postId}/reactors?type=downvote`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].reactionType).toBe('downvote');
    });

    it('returns 404 for a non-existent post', async () => {
      await request(testApp.app.getHttpServer())
        .get('/posts/00000000-0000-0000-0000-000000000000/reactors')
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}/reactors`)
        .expect(401);
    });
  });
});
