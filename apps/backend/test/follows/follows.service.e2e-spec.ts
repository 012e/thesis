import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';

import { user } from '@/db/auth-schema';
import { DatabaseService } from '@/db/database.service';
import { userFollows } from '@/db/schema';
import { DATABASE_POOL } from '@/db/tokens';
import { FollowsService } from '@/follows/follows.service';

import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from '../helpers/testcontainers.setup';

describe('FollowsService integration', () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let followsService: FollowsService;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    pool = new Pool({ connectionString: containers.databaseUrl });
    moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: DATABASE_POOL,
          useValue: pool,
        },
        DatabaseService,
        FollowsService,
      ],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
    followsService = moduleRef.get(FollowsService);

    await databaseService.db
      .insert(user)
      .values([
        {
          id: 'follow-user-1',
          email: 'follow1@example.com',
          name: 'Follow User 1',
          emailVerified: false,
        },
        {
          id: 'follow-user-2',
          email: 'follow2@example.com',
          name: 'Follow User 2',
          emailVerified: false,
        },
        {
          id: 'follow-user-3',
          email: 'follow3@example.com',
          name: 'Follow User 3',
          emailVerified: false,
        },
      ])
      .onConflictDoNothing();
  }, 120000);

  beforeEach(async () => {
    await databaseService.db.delete(userFollows);
  });

  afterAll(async () => {
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  describe('follow()', () => {
    it('creates a follow relation', async () => {
      const follow = await followsService.follow(
        'follow-user-1',
        'follow-user-2',
      );

      expect(follow).not.toBeNull();
      expect(follow!.followerId).toBe('follow-user-1');
      expect(follow!.followeeId).toBe('follow-user-2');
      expect(follow!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('is idempotent when following the same user twice', async () => {
      await followsService.follow('follow-user-1', 'follow-user-2');
      const second = await followsService.follow(
        'follow-user-1',
        'follow-user-2',
      );

      expect(second).not.toBeNull();

      const followers = await followsService.listFollowers('follow-user-2');
      expect(followers).toHaveLength(1);
      expect(followers![0].id).toBe('follow-user-1');
    });

    it('returns null when target user does not exist', async () => {
      const follow = await followsService.follow(
        'follow-user-1',
        'does-not-exist-user',
      );

      expect(follow).toBeNull();
    });
  });

  describe('unfollow()', () => {
    it('deletes an existing follow relation and returns it', async () => {
      await followsService.follow('follow-user-1', 'follow-user-2');

      const deleted = await followsService.unfollow(
        'follow-user-1',
        'follow-user-2',
      );

      expect(deleted).not.toBeNull();
      expect(deleted!.followerId).toBe('follow-user-1');
      expect(deleted!.followeeId).toBe('follow-user-2');
    });

    it('returns null when follow relation does not exist', async () => {
      const result = await followsService.unfollow(
        'follow-user-1',
        'follow-user-2',
      );
      expect(result).toBeNull();
    });

    it('returns null when target user does not exist', async () => {
      const result = await followsService.unfollow(
        'follow-user-1',
        'does-not-exist-user',
      );

      expect(result).toBeNull();
    });
  });

  describe('listFollowers()', () => {
    it('lists followers of a user', async () => {
      await followsService.follow('follow-user-1', 'follow-user-2');
      await followsService.follow('follow-user-3', 'follow-user-2');

      const followers = await followsService.listFollowers('follow-user-2');

      expect(followers).not.toBeNull();
      expect(followers).toHaveLength(2);
      expect(followers!.map((f) => f.id).sort()).toEqual([
        'follow-user-1',
        'follow-user-3',
      ]);
    });

    it('returns an empty array when the user has no followers', async () => {
      const followers = await followsService.listFollowers('follow-user-2');
      expect(followers).toEqual([]);
    });

    it('returns null for a non-existent user', async () => {
      const followers = await followsService.listFollowers(
        'does-not-exist-user',
      );
      expect(followers).toBeNull();
    });
  });

  describe('listFollowing()', () => {
    it('lists users followed by a user', async () => {
      await followsService.follow('follow-user-1', 'follow-user-2');
      await followsService.follow('follow-user-1', 'follow-user-3');

      const following = await followsService.listFollowing('follow-user-1');

      expect(following).not.toBeNull();
      expect(following).toHaveLength(2);
      expect(following!.map((f) => f.id).sort()).toEqual([
        'follow-user-2',
        'follow-user-3',
      ]);
    });

    it('returns an empty array when the user follows nobody', async () => {
      const following = await followsService.listFollowing('follow-user-1');
      expect(following).toEqual([]);
    });

    it('returns null for a non-existent user', async () => {
      const following = await followsService.listFollowing(
        'does-not-exist-user',
      );
      expect(following).toBeNull();
    });
  });
});
