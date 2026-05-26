import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { sql } from "drizzle-orm";
import { toSql } from "pgvector";
import { Pool } from "pg";

import { DatabaseService } from "@/db/database.service";
import { user } from "@/db/auth-schema";
import { posts, EMBEDDING_DIMENSIONS } from "@/db/schema";
import { DATABASE_POOL } from "@/db/tokens";
import { EMBEDDING_SERVICE } from "@/embedding/embedding.interface";
import { ContentHashService } from "@/moderation/content-hash.service";
import { DuplicateDetectionService } from "@/moderation/duplicate-detection.service";

import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("DuplicateDetectionService integration", () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let contentHashService: ContentHashService;
  let service: DuplicateDetectionService;
  const embeddingService = {
    embed: vi.fn<(...args: [string]) => Promise<number[]>>(),
  };

  const makeVector = (first: number, second: number = 0): number[] => {
    const values = new Array(EMBEDDING_DIMENSIONS).fill(0);
    values[0] = first;
    values[1] = second;
    return values;
  };

  const insertPost = async (input: {
    text: string;
    contentHash?: string | null;
    embedding?: number[] | null;
  }) => {
    const [post] = await databaseService.db
      .insert(posts)
      .values({
        authorId: "author-1",
        content: { text: input.text },
        contentHash: input.contentHash ?? null,
      })
      .returning();

    if (input.embedding) {
      const vector = toSql(input.embedding);
      await databaseService.db.execute(sql`
        UPDATE posts
        SET embedding = ${vector}::vector
        WHERE id = ${post.id}
      `);
    }

    return post;
  };

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    pool = new Pool({ connectionString: containers.databaseUrl });
    moduleRef = await Test.createTestingModule({
      providers: [
        { provide: DATABASE_POOL, useValue: pool },
        DatabaseService,
        ContentHashService,
        DuplicateDetectionService,
        {
          provide: EMBEDDING_SERVICE,
          useValue: embeddingService,
        },
      ],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
    contentHashService = moduleRef.get(ContentHashService);
    service = moduleRef.get(DuplicateDetectionService);

    await databaseService.db
      .insert(user)
      .values({
        id: "author-1",
        email: "author1@example.com",
        name: "Author One",
        emailVerified: false,
      })
      .onConflictDoNothing();
  }, 120000);

  beforeEach(async () => {
    vi.clearAllMocks();
    await databaseService.db.delete(posts);
  });

  afterAll(async () => {
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  it("returns not duplicate for empty text", async () => {
    const result = await service.check(randomUUID(), "   ");

    expect(result).toEqual({
      isDuplicate: false,
      method: null,
      similarPostId: null,
      similarityScore: null,
    });
    expect(embeddingService.embed).not.toHaveBeenCalled();
  });

  it("detects exact hash matches before embeddings", async () => {
    const duplicateText = "Hello moderation world";
    const existing = await insertPost({
      text: duplicateText,
      contentHash: contentHashService.hash(duplicateText),
    });

    const result = await service.check(
      randomUUID(),
      "  HELLO   moderation world ",
    );

    expect(result).toEqual({
      isDuplicate: true,
      method: "hash",
      similarPostId: existing.id,
      similarityScore: 1,
    });
    expect(embeddingService.embed).not.toHaveBeenCalled();
  });

  it("falls back to embedding similarity when no hash match exists and finds near duplicates", async () => {
    const existing = await insertPost({
      text: "Near duplicate candidate",
      contentHash: contentHashService.hash("Near duplicate candidate"),
      embedding: makeVector(1, 0),
    });
    embeddingService.embed.mockResolvedValue(makeVector(1, 0));

    const result = await service.check(
      randomUUID(),
      "Different wording entirely",
    );

    expect(embeddingService.embed).toHaveBeenCalledWith(
      "Different wording entirely",
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.method).toBe("embedding");
    expect(result.similarPostId).toBe(existing.id);
    expect(result.similarityScore).toBeGreaterThanOrEqual(0.92);
  });

  it("returns not duplicate when embedding similarity is below threshold", async () => {
    const existing = await insertPost({
      text: "Existing post",
      embedding: makeVector(0, 1),
    });
    embeddingService.embed.mockResolvedValue(makeVector(1, 0));

    const result = await service.check(
      randomUUID(),
      "Potentially related post",
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.method).toBeNull();
    expect(result.similarPostId).toBe(existing.id);
    expect(result.similarityScore).not.toBeNull();
    expect(result.similarityScore!).toBeLessThan(0.92);
  });

  it("fails open when the embedding service throws", async () => {
    await insertPost({
      text: "Existing post",
      embedding: makeVector(1, 0),
    });
    embeddingService.embed.mockRejectedValue(new Error("embedding outage"));

    const result = await service.check(randomUUID(), "Some content");

    expect(result).toEqual({
      isDuplicate: false,
      method: null,
      similarPostId: null,
      similarityScore: null,
    });
  });
});
