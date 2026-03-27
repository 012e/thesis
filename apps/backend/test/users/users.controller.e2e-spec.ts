import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import * as supertest from 'supertest';
import { DatabaseService } from '@/db/database.service';
import { closeTestApp, createTestApp } from '../helpers/app.setup';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import { createE2ETestUser } from '../helpers/auth.helper';
import { userFollows, posts } from '@/db/schema';
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from '../helpers/testcontainers.setup';

const request = supertest.default || supertest;

describe('UsersController (e2e)', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);
    testApp = await createTestApp(containers);
    databaseService = testApp.app.get(DatabaseService);
  }, 120000);

  afterAll(async () => {
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  describe('GET /users/:id/profile', () => {
    it('should return a 404 if user does not exist', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { cookie } = await createE2ETestUser(
        testApp.app,
        'user1@example.com',
        'user1',
      );

      return request(testApp.app.getHttpServer())
        .get('/users/non-existent-id/profile')
        .set('Cookie', cookie ? [cookie as string] : [])
        .expect(404);
    });

    it('should return user profile with correct stats', async () => {
      const currentUser = await createE2ETestUser(
        testApp.app,
        'user10@example.com',
        'user10',
      );
      const targetUser = await createE2ETestUser(
        testApp.app,
        'user20@example.com',
        'user20',
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const followerId = currentUser.user.id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const followeeId = targetUser.user.id;

      // Create a follow: currentUser -> targetUser
      await databaseService.db.insert(userFollows).values({
        followerId: followerId as string,
        followeeId: followeeId as string,
      });

      // Create a post for targetUser
      await databaseService.db.insert(posts).values({
        authorId: followeeId as string,
        content: { text: 'Hello' },
      });

      const response = await request(testApp.app.getHttpServer())
        .get(`/users/${followeeId as string}/profile`)
        .set('Cookie', currentUser.cookie ? [currentUser.cookie as string] : [])
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.id).toBe(followeeId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.email).toBe('user20@example.com');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.username).toBe('user20');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.followersCount).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.followingCount).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.postCount).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.isFollowing).toBe(true);
    });

    it('should return 401 if unauthorized', async () => {
      const targetUser = await createE2ETestUser(
        testApp.app,
        'user30@example.com',
        'user30',
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const targetUserId = targetUser.user.id;

      return request(testApp.app.getHttpServer())
        .get(`/users/${targetUserId as string}/profile`)
        .expect(401);
    });
  });
});
