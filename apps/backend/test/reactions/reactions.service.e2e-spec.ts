import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';

import { DatabaseService } from '@/db/database.service';
import { posts } from '@/db/schema';
import { DATABASE_POOL } from '@/db/tokens';
import { ReactionsService } from '@/reactions/reactions.service';

import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from '../helpers/testcontainers.setup';

/** Insert a minimal user row into the better-auth `user` table. */
async function insertUser(
  pool: Pool,
  id: string,
  email: string,
  name = 'Test User',
): Promise<void> {
  await pool.query(
    `INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, false, now(), now())
     ON CONFLICT (id) DO NOTHING`,
    [id, email, name],
  );
}

describe('ReactionsService integration', () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let reactionsService: ReactionsService;

  let postId: string;

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
        ReactionsService,
      ],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
    reactionsService = moduleRef.get(ReactionsService);

    await insertUser(pool, 'user-1', 'user1@example.com', 'User One');
    await insertUser(pool, 'user-2', 'user2@example.com', 'User Two');
    await insertUser(pool, 'user-3', 'user3@example.com', 'User Three');
  }, 120000);

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE post_reactions RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE posts RESTART IDENTITY CASCADE');

    // Create a fresh post for each test.
    const [post] = await databaseService.db
      .insert(posts)
      .values({ authorId: 'user-1', content: { text: 'Test post' } })
      .returning();
    postId = post.id;
  });

  afterAll(async () => {
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  describe('react()', () => {
    it('creates an upvote reaction and returns it', async () => {
      const reaction = await reactionsService.react(postId, 'user-2', 'upvote');

      expect(reaction).not.toBeNull();
      expect(reaction!.postId).toBe(postId);
      expect(reaction!.userId).toBe('user-2');
      expect(reaction!.type).toBe('upvote');
      expect(reaction!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('creates a downvote reaction', async () => {
      const reaction = await reactionsService.react(
        postId,
        'user-2',
        'downvote',
      );

      expect(reaction!.type).toBe('downvote');
    });

    it('replaces an existing reaction when the type changes', async () => {
      await reactionsService.react(postId, 'user-2', 'upvote');
      const updated = await reactionsService.react(
        postId,
        'user-2',
        'downvote',
      );

      expect(updated!.type).toBe('downvote');

      // Only one row should exist for this user on this post.
      const summary = await reactionsService.getSummary(postId, 'user-2');
      expect(summary!.upvotes).toBe(0);
      expect(summary!.downvotes).toBe(1);
    });

    it('returns null for a non-existent post', async () => {
      const reaction = await reactionsService.react(
        '00000000-0000-0000-0000-000000000000',
        'user-2',
        'upvote',
      );

      expect(reaction).toBeNull();
    });
  });

  describe('unreact()', () => {
    it('removes an existing reaction and returns it', async () => {
      await reactionsService.react(postId, 'user-2', 'upvote');

      const deleted = await reactionsService.unreact(postId, 'user-2');

      expect(deleted).not.toBeNull();
      expect(deleted!.userId).toBe('user-2');
      expect(deleted!.type).toBe('upvote');

      const summary = await reactionsService.getSummary(postId, 'user-2');
      expect(summary!.upvotes).toBe(0);
    });

    it('returns null when the user has no reaction', async () => {
      const result = await reactionsService.unreact(postId, 'user-2');
      expect(result).toBeNull();
    });

    it('returns null for a non-existent post', async () => {
      const result = await reactionsService.unreact(
        '00000000-0000-0000-0000-000000000000',
        'user-2',
      );
      expect(result).toBeNull();
    });
  });

  describe('getSummary()', () => {
    it('returns zeros and null userReaction when there are no reactions', async () => {
      const summary = await reactionsService.getSummary(postId, 'user-1');

      expect(summary).toEqual({
        upvotes: 0,
        downvotes: 0,
        userReaction: null,
      });
    });

    it('counts upvotes and downvotes correctly', async () => {
      await reactionsService.react(postId, 'user-1', 'upvote');
      await reactionsService.react(postId, 'user-2', 'upvote');
      await reactionsService.react(postId, 'user-3', 'downvote');

      const summary = await reactionsService.getSummary(postId, 'user-1');

      expect(summary!.upvotes).toBe(2);
      expect(summary!.downvotes).toBe(1);
    });

    it("returns the requesting user's reaction type in userReaction", async () => {
      await reactionsService.react(postId, 'user-2', 'downvote');

      const summary = await reactionsService.getSummary(postId, 'user-2');
      expect(summary!.userReaction).toBe('downvote');
    });

    it('returns null userReaction when the requesting user has not reacted', async () => {
      await reactionsService.react(postId, 'user-1', 'upvote');

      const summary = await reactionsService.getSummary(postId, 'user-2');
      expect(summary!.userReaction).toBeNull();
    });

    it('returns null for a non-existent post', async () => {
      const result = await reactionsService.getSummary(
        '00000000-0000-0000-0000-000000000000',
        'user-1',
      );
      expect(result).toBeNull();
    });
  });

  describe('listReactors()', () => {
    it('returns all reactors when no type filter is applied', async () => {
      await reactionsService.react(postId, 'user-1', 'upvote');
      await reactionsService.react(postId, 'user-2', 'downvote');
      await reactionsService.react(postId, 'user-3', 'upvote');

      const reactors = await reactionsService.listReactors(postId);

      expect(reactors).not.toBeNull();
      expect(reactors!).toHaveLength(3);
    });

    it('filters reactors by upvote type', async () => {
      await reactionsService.react(postId, 'user-1', 'upvote');
      await reactionsService.react(postId, 'user-2', 'downvote');
      await reactionsService.react(postId, 'user-3', 'upvote');

      const upvoters = await reactionsService.listReactors(postId, 'upvote');

      expect(upvoters!).toHaveLength(2);
      expect(upvoters!.every((r) => r.reactionType === 'upvote')).toBe(true);
    });

    it('filters reactors by downvote type', async () => {
      await reactionsService.react(postId, 'user-1', 'upvote');
      await reactionsService.react(postId, 'user-2', 'downvote');

      const downvoters = await reactionsService.listReactors(
        postId,
        'downvote',
      );

      expect(downvoters!).toHaveLength(1);
      expect(downvoters![0].id).toBe('user-2');
      expect(downvoters![0].reactionType).toBe('downvote');
    });

    it('returns reactor user details', async () => {
      await reactionsService.react(postId, 'user-2', 'upvote');

      const reactors = await reactionsService.listReactors(postId, 'upvote');

      expect(reactors![0].id).toBe('user-2');
      expect(reactors![0].email).toBe('user2@example.com');
      expect(reactors![0].reactedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns an empty array when no one has reacted', async () => {
      const reactors = await reactionsService.listReactors(postId);
      expect(reactors).toEqual([]);
    });

    it('returns null for a non-existent post', async () => {
      const result = await reactionsService.listReactors(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });
});
