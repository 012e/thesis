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
  return entry.split(';')[0]; // "better-auth.session_token=<value>"
}

describe('PostsController integration', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  // Two distinct users for authorization tests
  let userACookie: string;
  let userBCookie: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    userACookie = await registerAndGetSessionCookie(
      server,
      `user-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `user-b-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE posts RESTART IDENTITY CASCADE');
  });

  describe('GET /posts', () => {
    it('returns an empty array when there are no posts', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/posts')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns all posts ordered by creation date descending', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'First post' } })
        .expect(201);

      await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Second post' } })
        .expect(201);

      const res = await server
        .get('/posts')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].content.text).toBe('Second post');
      expect(res.body[1].content.text).toBe('First post');
    });

    it('returns posts from all users', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Post by A' } })
        .expect(201);

      await server
        .post('/posts')
        .set('Cookie', userBCookie)
        .send({ content: { text: 'Post by B' } })
        .expect(201);

      const res = await server
        .get('/posts')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer()).get('/posts').expect(401);
    });
  });

  describe('POST /posts', () => {
    it('creates a text post and returns 201 with the new post', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Hello world' } })
        .expect(201);

      expect(res.body.id).toBeTruthy();
      expect(res.body.content.text).toBe('Hello world');
      expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('creates a poll post', async () => {
      const poll = {
        question: 'Favourite language?',
        options: [
          { id: 'ts', label: 'TypeScript' },
          { id: 'py', label: 'Python' },
        ],
        allowsMultipleSelections: false,
      };

      const res = await request(testApp.app.getHttpServer())
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { poll } })
        .expect(201);

      expect(res.body.content.poll.question).toBe('Favourite language?');
      expect(res.body.content.poll.options).toHaveLength(2);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .post('/posts')
        .send({ content: { text: 'Unauthorized' } })
        .expect(401);
    });

    it('returns 422 or 400 for invalid post content', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: {} }); // no text, poll, or visualization

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('GET /posts/:id', () => {
    it('returns a post by ID', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Find me by ID' } })
        .expect(201);

      const res = await server
        .get(`/posts/${created.body.id}`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.content.text).toBe('Find me by ID');
    });

    it('returns 404 for a non-existent post', async () => {
      await request(testApp.app.getHttpServer())
        .get('/posts/00000000-0000-0000-0000-000000000000')
        .set('Cookie', userACookie)
        .expect(404);
    });
  });

  describe('PUT /posts/:id', () => {
    it('updates an owned post', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Original text' } })
        .expect(201);

      const res = await server
        .put(`/posts/${created.body.id}`)
        .set('Cookie', userACookie)
        .send({ content: { text: 'Updated text' } })
        .expect(200);

      expect(res.body.content.text).toBe('Updated text');
    });

    it('returns 403 when another user tries to update the post', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'User A post' } })
        .expect(201);

      await server
        .put(`/posts/${created.body.id}`)
        .set('Cookie', userBCookie)
        .send({ content: { text: 'Hacked by B' } })
        .expect(403);
    });

    it('returns 404 for a non-existent post', async () => {
      await request(testApp.app.getHttpServer())
        .put('/posts/00000000-0000-0000-0000-000000000000')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Ghost update' } })
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Auth check' } })
        .expect(201);

      await server
        .put(`/posts/${created.body.id}`)
        .send({ content: { text: 'No auth' } })
        .expect(401);
    });
  });

  describe('DELETE /posts/:id', () => {
    it('deletes an owned post and makes it unfetchable', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Delete me' } })
        .expect(201);

      await server
        .delete(`/posts/${created.body.id}`)
        .set('Cookie', userACookie)
        .expect(200);

      await server
        .get(`/posts/${created.body.id}`)
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 403 when another user tries to delete the post', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'User A post to keep' } })
        .expect(201);

      await server
        .delete(`/posts/${created.body.id}`)
        .set('Cookie', userBCookie)
        .expect(403);

      // Post should still exist
      await server
        .get(`/posts/${created.body.id}`)
        .set('Cookie', userACookie)
        .expect(200);
    });

    it('returns 404 for a non-existent post', async () => {
      await request(testApp.app.getHttpServer())
        .delete('/posts/00000000-0000-0000-0000-000000000000')
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post('/posts')
        .set('Cookie', userACookie)
        .send({ content: { text: 'Protected post' } })
        .expect(201);

      await server.delete(`/posts/${created.body.id}`).expect(401);
    });
  });
});
