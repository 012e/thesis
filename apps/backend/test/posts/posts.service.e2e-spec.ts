import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';

import { DatabaseService } from '@/db/database.service';
import { posts } from '@/db/schema';
import { DATABASE_POOL } from '@/db/tokens';
import { PostsService } from '@/posts/posts.service';

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

describe('PostsService integration', () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let postsService: PostsService;

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
        PostsService,
      ],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
    postsService = moduleRef.get(PostsService);

    // Seed the two author users used across all tests.
    await insertUser(pool, 'author-1', 'author1@example.com', 'Author One');
    await insertUser(pool, 'author-2', 'author2@example.com', 'Author Two');
  }, 120000);

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE posts RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  it('creates a post and reads it back from PostgreSQL', async () => {
    const created = await postsService.create('author-1', {
      content: {
        text: 'Hello from integration test',
      },
    });

    const fetched = await postsService.getById(created.id);

    expect(fetched).toEqual(created);
    expect(created.authorId).toBe('author-1');
    expect(created.author.id).toBe('author-1');
    expect(created.author.email).toBe('author1@example.com');
    expect(created.content).toEqual({
      text: 'Hello from integration test',
    });
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('lists posts in descending creation order', async () => {
    await databaseService.db.insert(posts).values([
      {
        authorId: 'author-1',
        content: { text: 'Older post' },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        authorId: 'author-2',
        content: { text: 'Newer post' },
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
    ]);

    const listedPosts = await postsService.list();

    expect(listedPosts).toHaveLength(2);
    expect(listedPosts.map((post) => post.content)).toEqual([
      { text: 'Newer post' },
      { text: 'Older post' },
    ]);
    expect(listedPosts[0].author.id).toBe('author-2');
    expect(listedPosts[1].author.id).toBe('author-1');
  });

  it('updates only posts owned by the author', async () => {
    const created = await postsService.create('author-1', {
      content: {
        poll: {
          question: 'Ship it?',
          options: [
            { id: 'yes', label: 'Yes' },
            { id: 'no', label: 'No' },
          ],
          allowsMultipleSelections: false,
        },
      },
    });

    const unauthorizedUpdate = await postsService.update(
      created.id,
      'author-2',
      {
        content: {
          text: 'Should not be saved',
        },
      },
    );
    const updated = await postsService.update(created.id, 'author-1', {
      content: {
        visualization: {
          title: 'Votes',
          visualizationType: 'bar',
          data: [{ label: 'Yes', value: 4 }],
        },
      },
    });

    expect(unauthorizedUpdate).toBeNull();
    expect(updated).not.toBeNull();
    expect(updated?.content).toEqual({
      visualization: {
        title: 'Votes',
        visualizationType: 'bar',
        data: [{ label: 'Yes', value: 4 }],
      },
    });
    expect(updated?.author.id).toBe('author-1');
  });

  it('deletes only posts owned by the author', async () => {
    const created = await postsService.create('author-1', {
      content: {
        text: 'Delete me',
      },
    });

    const unauthorizedDelete = await postsService.delete(
      created.id,
      'author-2',
    );
    const deleted = await postsService.delete(created.id, 'author-1');
    const fetchedAfterDelete = await postsService.getById(created.id);

    expect(unauthorizedDelete).toBeNull();
    expect(deleted?.id).toBe(created.id);
    expect(fetchedAfterDelete).toBeNull();
  });
});
