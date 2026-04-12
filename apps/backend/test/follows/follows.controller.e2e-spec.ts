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

describe('FollowsController integration', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userBCookie: string;
  let userCCookie: string;

  let userAId: string;
  let userBId: string;
  let userCId: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());

    userACookie = await registerAndGetSessionCookie(
      server,
      `follows-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `follows-b-${Date.now()}@example.com`,
    );
    userCCookie = await registerAndGetSessionCookie(
      server,
      `follows-c-${Date.now()}@example.com`,
    );

    const userASession = await server
      .get('/api/auth/get-session')
      .set('Cookie', userACookie)
      .expect(200);
    const userBSession = await server
      .get('/api/auth/get-session')
      .set('Cookie', userBCookie)
      .expect(200);
    const userCSession = await server
      .get('/api/auth/get-session')
      .set('Cookie', userCCookie)
      .expect(200);

    userAId = userASession.body.user.id as string;
    userBId = userBSession.body.user.id as string;
    userCId = userCSession.body.user.id as string;
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE user_follows RESTART IDENTITY CASCADE');
  });

  describe('POST /users/:id/follow', () => {
    it('follows another user', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post(`/users/${userBId}/follow`)
        .set('Cookie', userACookie)
        .expect(201);

      expect(res.body.followerId).toBe(userAId);
      expect(res.body.followeeId).toBe(userBId);
      expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('is idempotent for duplicate follow requests', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/users/${userBId}/follow`)
        .set('Cookie', userACookie)
        .expect(201);

      await server
        .post(`/users/${userBId}/follow`)
        .set('Cookie', userACookie)
        .expect(201);

      const followers = await server
        .get(`/users/${userBId}/followers`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(followers.body).toHaveLength(1);
      expect(followers.body[0].id).toBe(userAId);
    });

    it('returns 400 when trying to follow self', async () => {
      await request(testApp.app.getHttpServer())
        .post(`/users/${userAId}/follow`)
        .set('Cookie', userACookie)
        .expect(400);
    });

    it('returns 404 when target user does not exist', async () => {
      await request(testApp.app.getHttpServer())
        .post('/users/does-not-exist-user/follow')
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .post(`/users/${userBId}/follow`)
        .expect(401);
    });
  });

  describe('DELETE /users/:id/follow', () => {
    it('unfollows a followed user', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/users/${userBId}/follow`)
        .set('Cookie', userACookie)
        .expect(201);

      const res = await server
        .delete(`/users/${userBId}/follow`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.followerId).toBe(userAId);
      expect(res.body.followeeId).toBe(userBId);
    });

    it('returns 404 when follow relation does not exist', async () => {
      await request(testApp.app.getHttpServer())
        .delete(`/users/${userBId}/follow`)
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 404 when target user does not exist', async () => {
      await request(testApp.app.getHttpServer())
        .delete('/users/does-not-exist-user/follow')
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .delete(`/users/${userBId}/follow`)
        .expect(401);
    });
  });

  describe('GET /users/:id/followers', () => {
    it('lists all followers of a user', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/users/${userBId}/follow`)
        .set('Cookie', userACookie)
        .expect(201);
      await server
        .post(`/users/${userBId}/follow`)
        .set('Cookie', userCCookie)
        .expect(201);

      const res = await server
        .get(`/users/${userBId}/followers`)
        .set('Cookie', userACookie)
        .expect(200);

      const followerIds = (res.body as { id: string }[])
        .map((u) => u.id)
        .sort();
      const expectedFollowerIds = [userAId, userCId].sort();

      expect(res.body).toHaveLength(2);
      expect(followerIds).toEqual(expectedFollowerIds);
    });

    it('returns an empty array when user has no followers', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userBId}/followers`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 404 when user does not exist', async () => {
      await request(testApp.app.getHttpServer())
        .get('/users/does-not-exist-user/followers')
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .get(`/users/${userBId}/followers`)
        .expect(401);
    });
  });

  describe('GET /users/:id/following', () => {
    it('lists all users followed by a user', async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/users/${userBId}/follow`)
        .set('Cookie', userACookie)
        .expect(201);
      await server
        .post(`/users/${userCId}/follow`)
        .set('Cookie', userACookie)
        .expect(201);

      const res = await server
        .get(`/users/${userAId}/following`)
        .set('Cookie', userACookie)
        .expect(200);

      const followingIds = (res.body as { id: string }[])
        .map((u) => u.id)
        .sort();
      const expectedFollowingIds = [userBId, userCId].sort();

      expect(res.body).toHaveLength(2);
      expect(followingIds).toEqual(expectedFollowingIds);
    });

    it('returns an empty array when user follows nobody', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/following`)
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 404 when user does not exist', async () => {
      await request(testApp.app.getHttpServer())
        .get('/users/does-not-exist-user/following')
        .set('Cookie', userACookie)
        .expect(404);
    });

    it('returns 401 when not authenticated', async () => {
      await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/following`)
        .expect(401);
    });
  });
});
