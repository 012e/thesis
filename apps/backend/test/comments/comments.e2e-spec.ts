import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';

import { closeTestApp, createTestApp } from '../helpers/app.setup';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import { registerAndGetSessionCookie } from '../helpers/auth.helper';
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from '../helpers/testcontainers.setup';

describe('CommentsController integration', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userBCookie: string;
  let postId: string;

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
    await pool.query('TRUNCATE TABLE comments RESTART IDENTITY CASCADE');

    // Create a post for testing
    const server = request(testApp.app.getHttpServer());
    const res = await server
      .post('/posts')
      .set('Cookie', userACookie)
      .send({ content: { text: 'Test Post' } })
      .expect(201);
    postId = res.body.id;
  });

  describe('GET /posts/:postId/comments', () => {
    it('returns empty array when there are no comments', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns comments ordered by creation date descending', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'First comment' })
        .expect(201);

      await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userBCookie)
        .send({ content: 'Second comment' })
        .expect(201);

      const res = await server
        .get(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].content).toBe('Second comment');
      expect(res.body[1].content).toBe('First comment');
    });
  });

  describe('POST /posts/:postId/comments', () => {
    it('creates a comment and returns 201', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'My new comment' })
        .expect(201);

      expect(res.body.id).toBeTruthy();
      expect(res.body.content).toBe('My new comment');
      expect(res.body.postId).toBe(postId);
      expect(res.body.author.id).toBeTruthy();
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/comments`)
        .send({ content: 'Anonymous' })
        .expect(401);
    });
  });

  describe('DELETE /comments/:id', () => {
    it('deletes an owned comment', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'Delete me' })
        .expect(201);

      await server
        .delete(`/comments/${created.body.id}`)
        .set('Cookie', userACookie)
        .expect(200);

      // Verify it's gone
      const res = await server
        .get(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('returns 403 when another user tries to delete the comment', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'User A comment' })
        .expect(201);

      await server
        .delete(`/comments/${created.body.id}`)
        .set('Cookie', userBCookie)
        .expect(403);
    });
  });

  describe('Nested Comments', () => {
    it('creates a reply to a comment', async () => {
      const server = request(testApp.app.getHttpServer());

      const parent = await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'Parent comment' })
        .expect(201);

      const reply = await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userBCookie)
        .send({ content: 'Reply comment', parentId: parent.body.id })
        .expect(201);

      expect(reply.body.parentId).toBe(parent.body.id);
      expect(reply.body.content).toBe('Reply comment');
    });

    it('lists comments with parentId', async () => {
      const server = request(testApp.app.getHttpServer());

      // Create parent
      const parent = await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'Root' })
        .expect(201);

      // Create child
      await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userBCookie)
        .send({ content: 'Child', parentId: parent.body.id })
        .expect(201);

      const list = await server
        .get(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .expect(200);

      const childComment = list.body.find((c: any) => c.content === 'Child');
      const rootComment = list.body.find((c: any) => c.content === 'Root');

      expect(childComment.parentId).toBe(rootComment.id);
      expect(rootComment.parentId).toBeNull();
    });

    it('gets direct replies for a comment', async () => {
      const server = request(testApp.app.getHttpServer());

      const parent = await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'Parent for replies' })
        .expect(201);

      await server
        .post(`/comments/${parent.body.id}/replies`)
        .set('Cookie', userBCookie)
        .send({ content: 'Direct reply 1' })
        .expect(201);

      await server
        .post(`/comments/${parent.body.id}/replies`)
        .set('Cookie', userACookie)
        .send({ content: 'Direct reply 2' })
        .expect(201);

      const replies = await server
        .get(`/comments/${parent.body.id}/replies`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(replies.body).toHaveLength(2);
      expect(replies.body[0].content).toBe('Direct reply 2');
      expect(replies.body[1].content).toBe('Direct reply 1');
    });

    it('creates a reply using the dedicated endpoint', async () => {
      const server = request(testApp.app.getHttpServer());

      const parent = await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'Target for reply' })
        .expect(201);

      const reply = await server
        .post(`/comments/${parent.body.id}/replies`)
        .set('Cookie', userBCookie)
        .send({ content: 'Dedicated reply' })
        .expect(201);

      expect(reply.body.parentId).toBe(parent.body.id);
      expect(reply.body.postId).toBe(postId);
      expect(reply.body.content).toBe('Dedicated reply');
    });

    it('fetches a single comment', async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post(`/posts/${postId}/comments`)
        .set('Cookie', userACookie)
        .send({ content: 'Single comment' })
        .expect(201);

      const fetched = await server
        .get(`/comments/${created.body.id}`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(fetched.body.id).toBe(created.body.id);
      expect(fetched.body.content).toBe('Single comment');
    });
  });
});
