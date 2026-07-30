import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import * as zlib from "node:zlib";

import { Injectable, Logger } from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

import { auth } from "@/auth";
import { CommentsService } from "@/comments/comments.service";
import { DatabaseService } from "@/db/database.service";
import { posts, userProfiles } from "@/db/schema";
import { FollowsService } from "@/follows/follows.service";
import { ReactionsService } from "@/reactions/reactions.service";
import { ThreadsService } from "@/threads/threads.service";

// ── seed volume constants ─────────────────────────────────────────────────────
const EXTRA_USERS = 10; // additional users alongside demo@gmail.com
const COMMENTS_PER_POST = 3;
const REPLIES_PER_COMMENT = 3;
const THREADS_PER_USER = 2;
const FOLLOWS_PER_USER = 5;

/** Posts inserted in a single Drizzle batch call. */
const INSERT_BATCH_SIZE = 50;

/** Total posts seeded for the "small" preset (~10 per user, 11 users). */
const SMALL_POST_COUNT = (EXTRA_USERS + 1) * 10;

const REDDIT_POSTS_PATH = path.resolve(__dirname, "reddit-posts.jsonl.gz");

type SeedSize = "small" | "big";
type SeededUser = { id: string; email: string };
type RedditPost = { title: string; body: string };

// ── compressed JSONL streaming ────────────────────────────────────────────────

/**
 * Streams `limit` lines from the gzip JSONL file and returns them as an array.
 * When limit is undefined the entire file is consumed.
 */
async function loadRedditPosts(limit?: number): Promise<RedditPost[]> {
  const result: RedditPost[] = [];
  const fileStream = fs.createReadStream(REDDIT_POSTS_PATH);
  const gunzip = zlib.createGunzip();
  const rl = readline.createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    result.push(JSON.parse(trimmed) as RedditPost);
    if (limit !== undefined && result.length >= limit) {
      rl.close();
      fileStream.destroy();
      gunzip.destroy();
      break;
    }
  }

  return result;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function randomSentence(pool: string[]): string {
  return faker.helpers.arrayElement(pool);
}

// ── service ───────────────────────────────────────────────────────────────────

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  private readonly englishSentences = [
    "Shipping small improvements every day beats waiting for a perfect launch.",
    "A clear interface usually solves more problems than a clever workaround.",
    "Good monitoring turns production incidents into short stories.",
    "When tests describe intent, refactors become much less risky.",
    "Teams move faster when naming is consistent across services.",
    "Simple defaults help new contributors stay productive on day one.",
    "Reliable background jobs need idempotency more than retries.",
    "Healthy code reviews focus on behavior, not personal style.",
    "Feature flags let us learn safely from real user feedback.",
    "Performance wins often come from measuring before optimizing.",
  ];

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService<typeof auth>,
    private readonly commentsService: CommentsService,
    private readonly reactionsService: ReactionsService,
    private readonly followsService: FollowsService,
    private readonly threadsService: ThreadsService,
  ) {}

  async reseed(size: SeedSize = "small") {
    this.logger.log(`Starting seed (size=${size})`);

    await this.clearAllData();

    const users = await this.createSeedUsers();
    const demoUser = users.find((u) => u.email === "demo@gmail.com")!;

    // ── load Reddit posts ────────────────────────────────────────────────────
    const postLimit = size === "small" ? SMALL_POST_COUNT : undefined;
    this.logger.log(
      `Loading Reddit posts from compressed dataset (limit=${postLimit ?? "all"}) …`,
    );
    const redditPosts = await loadRedditPosts(postLimit);
    this.logger.log(`  Loaded ${redditPosts.length} posts`);

    // ── distribute posts round-robin to users, insert in batches ────────────
    const allPostIds = await this.seedPostsBatched(users, redditPosts);

    // ── comments, follows, threads, reactions ───────────────────────────────
    const allCommentIds: string[] = [];

    for (const user of users) {
      // Gather only this user's post IDs for comment seeding
      const userPostIds = allPostIds.filter((_, i) => i % users.length === users.indexOf(user));

      const commentIds = await this.seedCommentsForUser(
        user,
        userPostIds,
        users,
      );
      allCommentIds.push(...commentIds);

      await this.seedThreadsForUser(user);
      await this.seedFollowsForUser(user, users);
    }

    await this.seedReactionsForUser(demoUser, allPostIds, allCommentIds);

    this.logger.log("Seed completed");

    return {
      success: true,
      users: users.map((u) => ({ id: u.id, email: u.email })),
      postCount: allPostIds.length,
      commentCount: allCommentIds.length,
      credentials: { email: "demo@gmail.com", password: "Demo@123" },
    };
  }

  // ── batch post insertion ───────────────────────────────────────────────────

  /**
   * Assigns Reddit posts to users in round-robin order and bulk-inserts them
   * in batches of INSERT_BATCH_SIZE.  Returns all created post IDs in order.
   */
  private async seedPostsBatched(
    users: SeededUser[],
    redditPosts: RedditPost[],
  ): Promise<string[]> {
    const allPostIds: string[] = [];

    // Build the full list of rows to insert before hitting the DB.
    type InsertRow = {
      authorId: string;
      content: object;
    };

    const rows: InsertRow[] = redditPosts.map((post, i) => {
      const user = users[i % users.length]!;
      const content = {
        text: `# ${post.title}\n\n${post.body}`,
      };

      return {
        authorId: user.id,
        content,
      };
    });

    // Chunked insert keeps the large seed path fast; embeddings are applied by
    // the standalone `seed:embeddings` script when semantic search data is needed.
    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      const chunk = rows.slice(i, i + INSERT_BATCH_SIZE);
      const inserted = await this.databaseService.db
        .insert(posts)
        .values(chunk)
        .returning({ id: posts.id });

      allPostIds.push(...inserted.map((r) => r.id));

      if ((i / INSERT_BATCH_SIZE) % 20 === 0) {
        this.logger.log(
          `  Inserted ${Math.min(i + INSERT_BATCH_SIZE, rows.length)}/${rows.length} posts …`,
        );
      }
    }

    return allPostIds;
  }

  // ── per-user seeders ───────────────────────────────────────────────────────

  private async seedCommentsForUser(
    user: SeededUser,
    ownPostIds: string[],
    allUsers: SeededUser[],
  ): Promise<string[]> {
    const commentIds: string[] = [];
    const otherUsers = allUsers.filter((u) => u.id !== user.id);

    for (const postId of ownPostIds) {
      const commenters = faker.helpers.arrayElements(
        otherUsers,
        Math.min(COMMENTS_PER_POST, otherUsers.length),
      );

      for (const commenter of commenters) {
        const comment = await this.commentsService.create(
          commenter.id,
          postId,
          randomSentence(this.englishSentences),
        );
        commentIds.push(comment.id);

        for (let r = 0; r < REPLIES_PER_COMMENT; r++) {
          const reply = await this.commentsService.create(
            user.id,
            postId,
            randomSentence(this.englishSentences),
            comment.id,
          );
          commentIds.push(reply.id);
        }
      }
    }

    return commentIds;
  }

  private async seedThreadsForUser(user: SeededUser): Promise<void> {
    for (let i = 0; i < THREADS_PER_USER; i++) {
      await this.threadsService.create(
        user.id,
        `thread-${faker.string.alphanumeric(8)}`,
      );
    }
  }

  private async seedFollowsForUser(
    user: SeededUser,
    allUsers: SeededUser[],
  ): Promise<void> {
    const targets = faker.helpers.arrayElements(
      allUsers.filter((u) => u.id !== user.id),
      Math.min(FOLLOWS_PER_USER, allUsers.length - 1),
    );
    for (const target of targets) {
      await this.followsService.follow(user.id, target.id);
    }
  }

  private async seedReactionsForUser(
    user: SeededUser,
    postIds: string[],
    commentIds: string[],
  ): Promise<void> {
    const reactionTypes = ["upvote", "downvote"] as const;

    const targetPosts = faker.helpers.arrayElements(
      postIds,
      Math.ceil(postIds.length / 2),
    );
    for (const postId of targetPosts) {
      await this.reactionsService.react(
        postId,
        user.id,
        faker.helpers.arrayElement(reactionTypes),
      );
    }

    const targetComments = faker.helpers.arrayElements(
      commentIds,
      Math.ceil(commentIds.length / 2),
    );
    for (const commentId of targetComments) {
      await this.reactionsService.reactToComment(
        commentId,
        user.id,
        faker.helpers.arrayElement(reactionTypes),
      );
    }
  }

  // ── cleanup & user creation ────────────────────────────────────────────────

  private async clearAllData() {
    await this.databaseService.db.execute(sql`
      TRUNCATE TABLE
        poll_votes,
        comment_reactions,
        comments,
        post_reactions,
        posts,
        user_follows,
        threads,
        session,
        account,
        verification,
        jwks,
        "user"
      RESTART IDENTITY CASCADE
    `);
  }

  private async createSeedUsers(): Promise<SeededUser[]> {
    const users: SeededUser[] = [];

    const demo = await this.authService.api.createUser({
      body: {
        email: "demo@gmail.com",
        password: "Demo@123",
        name: "Demo User",
        role: "admin",
        data: { username: "demo" },
      },
    });
    await this.databaseService.db.insert(userProfiles).values({
      userId: demo.user.id,
      avatarUrl: faker.image.avatar(),
      coverPhotoUrl: faker.image.urlPicsumPhotos({ width: 1600, height: 400 }),
      bio: faker.helpers.arrayElements(this.englishSentences, 2).join(" "),
    });
    users.push({ id: demo.user.id, email: demo.user.email });

    const extraCandidates = Array.from({ length: EXTRA_USERS }, () => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      return {
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: "Seed@123",
        name: `${firstName} ${lastName}`,
        username: faker.internet
          .username({ firstName, lastName })
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .slice(0, 20),
      };
    });

    for (const candidate of extraCandidates) {
      const created = await this.authService.api.signUpEmail({
        body: {
          email: candidate.email,
          password: candidate.password,
          name: candidate.name,
          username: candidate.username,
        },
      });
      await this.databaseService.db.insert(userProfiles).values({
        userId: created.user.id,
        avatarUrl: faker.image.avatar(),
        coverPhotoUrl: faker.image.urlPicsumPhotos({
          width: 1600,
          height: 400,
        }),
        bio: faker.helpers.arrayElements(this.englishSentences, 2).join(" "),
      });
      users.push({ id: created.user.id, email: created.user.email });
    }

    return users;
  }
}
