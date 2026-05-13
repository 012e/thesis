import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import * as zlib from "node:zlib";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { posts } from "../db/schema";

const EMBEDDED_POSTS_FILE_PATTERN =
  /^reddit-posts\.embeddings\.part-\d+\.jsonl\.gz$/;
const UPDATE_BATCH_SIZE = 50;

type EmbeddedPost = {
  title: string;
  body: string;
  embedding: string;
};

type EmbeddingUpdate = {
  content: { text: string };
  embedding: string;
};

function decodeEmbeddingVector(value: string): string {
  const buffer = Buffer.from(value, "base64");
  const length = buffer.length / Float32Array.BYTES_PER_ELEMENT;
  const values = new Array<string>(length);

  for (let i = 0; i < length; i++) {
    values[i] = String(buffer.readFloatLE(i * Float32Array.BYTES_PER_ELEMENT));
  }

  return `[${values.join(",")}]`;
}

async function* streamEmbeddedPosts(): AsyncGenerator<EmbeddedPost> {
  const embeddedPostPaths = fs
    .readdirSync(__dirname)
    .filter((fileName) => EMBEDDED_POSTS_FILE_PATTERN.test(fileName))
    .sort()
    .map((fileName) => path.resolve(__dirname, fileName));

  if (embeddedPostPaths.length === 0) {
    throw new Error("No reddit post embedding shard files found.");
  }

  for (const embeddedPostPath of embeddedPostPaths) {
    const fileStream = fs.createReadStream(embeddedPostPath);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({
      input: fileStream.pipe(gunzip),
      crlfDelay: Infinity,
    });

    try {
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        yield JSON.parse(trimmed) as EmbeddedPost;
      }
    } finally {
      rl.close();
      fileStream.destroy();
      gunzip.destroy();
    }
  }
}

async function updateBatch(
  db: ReturnType<typeof drizzle>,
  batch: EmbeddingUpdate[],
): Promise<number> {
  if (batch.length === 0) return 0;

  const values = sql.join(
    batch.map(
      (item) => sql`(${JSON.stringify(item.content)}::jsonb, ${item.embedding}::vector)`,
    ),
    sql`,`,
  );

  const result = await db.execute(sql`
    WITH data(content, embedding) AS (VALUES ${values})
    UPDATE ${posts}
    SET embedding = data.embedding
    FROM data
    WHERE ${posts.content} = data.content
  `);

  return result.rowCount ?? 0;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Run via `pnpm seed:embeddings`.");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  let read = 0;
  let updated = 0;
  let batch: EmbeddingUpdate[] = [];

  try {
    for await (const post of streamEmbeddedPosts()) {
      batch.push({
        content: { text: `# ${post.title}\n\n${post.body}` },
        embedding: decodeEmbeddingVector(post.embedding),
      });
      read += 1;

      if (batch.length >= UPDATE_BATCH_SIZE) {
        updated += await updateBatch(db, batch);
        batch = [];
        process.stdout.write(
          `\r  processed ${read.toLocaleString()} embedded rows, updated ${updated.toLocaleString()} posts`,
        );
      }
    }

    updated += await updateBatch(db, batch);
    process.stdout.write(
      `\r  processed ${read.toLocaleString()} embedded rows, updated ${updated.toLocaleString()} posts\n`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
