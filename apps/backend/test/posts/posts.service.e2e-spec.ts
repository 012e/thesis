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
