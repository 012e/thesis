import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';

import { closeTestApp, createTestApp } from '../helpers/app.setup';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  startPostgresContainer,
  stopPostgresContainer,
  startMinioContainer,
  stopMinioContainer,
  type PostgresContainerContext,
  type MinioContainerContext,
} from '../helpers/testcontainers.setup';

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

describe('GET /posts/search', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let minioContainer: MinioContainerContext;
  let pool: Pool;
  let userCookie: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    minioContainer = await startMinioContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers, undefined, minioContainer);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    userCookie = await registerAndGetSessionCookie(
      server,
      `search-user-${Date.now()}@example.com`,
    );
  }, 180000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
    await stopMinioContainer(minioContainer);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE posts RESTART IDENTITY CASCADE');
  });

  it('returns 401 when not authenticated', async () => {
    await request(testApp.app.getHttpServer())
      .get('/posts/search?q=hello')
      .expect(401);
  });

  it('returns 400 when q is missing', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/posts/search')
      .set('Cookie', userCookie);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('returns posts matching the query term', async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({ content: { text: 'GraphQL APIs are flexible and efficient' } })
      .expect(201);

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({ content: { text: 'REST APIs follow a stateless architecture' } })
      .expect(201);

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({ content: { text: 'Baking sourdough bread at home' } })
      .expect(201);

    const res = await server
      .get('/posts/search?q=GraphQL')
      .set('Cookie', userCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const texts: string[] = res.body.map((p: { content: { text?: string } }) =>
      (p.content.text ?? '').toLowerCase(),
    );
    expect(texts.every((t) => t.includes('graphql'))).toBe(true);
  });

  it('excludes posts that do not match the query', async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({ content: { text: 'Microservices architecture with Kubernetes' } })
      .expect(201);

    const res = await server
      .get('/posts/search?q=blockchain')
      .set('Cookie', userCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('returns an empty array when there are no posts', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/posts/search?q=anything')
      .set('Cookie', userCookie)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('returns correct PostDto shape for each result', async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({ content: { text: 'Monorepo tooling with Nx and Turborepo' } })
      .expect(201);

    const res = await server
      .get('/posts/search?q=Monorepo')
      .set('Cookie', userCookie)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    const post = res.body[0] as Record<string, unknown>;

    expect(post.id).toBeTruthy();
    expect(post.authorId).toBeTruthy();
    expect(post.author).toBeDefined();
    expect(post.content).toBeDefined();
    expect(post.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(post.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof post.upvoteCount).toBe('number');
    expect(typeof post.downvoteCount).toBe('number');
  });

  it('is case-insensitive', async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({
        content: {
          text: 'WebAssembly brings near-native performance to browsers',
        },
      })
      .expect(201);

    const resLower = await server
      .get('/posts/search?q=webassembly')
      .set('Cookie', userCookie)
      .expect(200);

    const resUpper = await server
      .get('/posts/search?q=WEBASSEMBLY')
      .set('Cookie', userCookie)
      .expect(200);

    expect(resLower.body.length).toBeGreaterThan(0);
    expect(resUpper.body.length).toBeGreaterThan(0);
  });

  it('matches multiple posts when several contain the search term', async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({ content: { text: 'PostgreSQL full-text search capabilities' } })
      .expect(201);

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({
        content: { text: 'PostgreSQL vs MySQL: which database to choose' },
      })
      .expect(201);

    await server
      .post('/posts')
      .set('Cookie', userCookie)
      .send({ content: { text: 'Redis caching strategies for web apps' } })
      .expect(201);

    const res = await server
      .get('/posts/search?q=PostgreSQL')
      .set('Cookie', userCookie)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const texts: string[] = res.body.map((p: { content: { text?: string } }) =>
      (p.content.text ?? '').toLowerCase(),
    );
    expect(texts.every((t) => t.includes('postgresql'))).toBe(true);
  });
});
