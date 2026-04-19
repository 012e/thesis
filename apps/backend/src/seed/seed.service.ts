import { Injectable, Logger } from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

import { auth } from "@/auth";
import { CommentsService } from "@/comments/comments.service";
import { DatabaseService } from "@/db/database.service";
import { FollowsService } from "@/follows/follows.service";
import { PostsService } from "@/posts/posts.service";
import { ReactionsService } from "@/reactions/reactions.service";
import { ThreadsService } from "@/threads/threads.service";

// ── seed volume constants ─────────────────────────────────────────────────────
const EXTRA_USERS = 4; // additional users alongside demo@gmail.com
const POSTS_PER_USER = 20;
const COMMENTS_PER_POST = 30;
const REPLIES_PER_COMMENT = 30;
const THREADS_PER_USER = 2;
const FOLLOWS_PER_USER = 2; // how many other users each user follows

type SeededUser = { id: string; email: string };

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService<typeof auth>,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly reactionsService: ReactionsService,
    private readonly followsService: FollowsService,
    private readonly threadsService: ThreadsService,
  ) {}

  async reseed() {
    this.logger.log("Starting demo seed flow (cleanup + seed)");

    await this.clearAllData();

    const users = await this.createSeedUsers();
    const demoUser = users.find((u) => u.email === "demo@gmail.com")!;

    const allPostIds: string[] = [];
    const allCommentIds: string[] = [];

    for (const user of users) {
      const postIds = await this.seedPostsForUser(user);
      allPostIds.push(...postIds);

      const commentIds = await this.seedCommentsForUser(user, postIds, users);
      allCommentIds.push(...commentIds);

      await this.seedThreadsForUser(user);
      await this.seedFollowsForUser(user, users);
    }

    // Give demo user reactions on everyone else's posts for visible activity
    await this.seedReactionsForUser(demoUser, allPostIds, allCommentIds);

    this.logger.log("Demo seed flow completed");

    return {
      success: true,
      users: users.map((u) => ({ id: u.id, email: u.email })),
      postCount: allPostIds.length,
      commentCount: allCommentIds.length,
      credentials: { email: "demo@gmail.com", password: "Demo@123" },
    };
  }

  // ── per-user seeders ────────────────────────────────────────────────────────

  private async seedPostsForUser(user: SeededUser): Promise<string[]> {
    const postIds: string[] = [];

    for (let i = 0; i < POSTS_PER_USER; i++) {
      const content = this.randomPostContent();
      const post = await this.postsService.create(user.id, { content });
      postIds.push(post.id);
    }

    return postIds;
  }

  private async seedCommentsForUser(
    user: SeededUser,
    ownPostIds: string[],
    allUsers: SeededUser[],
  ): Promise<string[]> {
    const commentIds: string[] = [];
    const otherUsers = allUsers.filter((u) => u.id !== user.id);

    for (const postId of ownPostIds) {
      // Other users comment on this user's posts
      const commenters = faker.helpers.arrayElements(
        otherUsers,
        Math.min(COMMENTS_PER_POST, otherUsers.length),
      );

      for (const commenter of commenters) {
        const comment = await this.commentsService.create(
          commenter.id,
          postId,
          faker.lorem.sentence(),
        );
        commentIds.push(comment.id);

        // Some comments get a shallow reply from the post owner
        for (let r = 0; r < REPLIES_PER_COMMENT; r++) {
          const reply = await this.commentsService.create(
            user.id,
            postId,
            faker.lorem.sentence(),
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

  // ── helpers ─────────────────────────────────────────────────────────────────

  private randomMarkdown(): string {
    const title = `# ${faker.lorem.sentence({ min: 3, max: 7 })}`;

    const intro = faker.lorem.paragraph();

    const heading = `## ${faker.lorem.words({ min: 2, max: 4 })}`;

    const bulletCount = faker.number.int({ min: 2, max: 5 });
    const bullets = Array.from(
      { length: bulletCount },
      () => `- ${faker.lorem.sentence()}`,
    ).join("\n");

    const codeLanguage = faker.helpers.arrayElement([
      "ts",
      "js",
      "json",
      "bash",
    ]);
    const codeSnippet = [
      "```" + codeLanguage,
      `// ${faker.hacker.phrase()}`,
      `const ${faker.hacker.noun().replace(/ /g, "_")} = ${faker.number.int({ min: 1, max: 99 })};`,
      "```",
    ].join("\n");

    const closing = faker.lorem.paragraph();

    const blockquote = `> ${faker.lorem.sentence()}`;

    return [
      title,
      intro,
      heading,
      bullets,
      codeSnippet,
      blockquote,
      closing,
    ].join("\n\n");
  }

  private randomPostContent() {
    const roll = faker.number.float({ min: 0, max: 1 });

    if (roll < 0.6) {
      // 60% markdown text post
      return { text: this.randomMarkdown() };
    }

    if (roll < 0.8) {
      // 20% poll post
      const optionCount = faker.number.int({ min: 2, max: 4 });
      return {
        poll: {
          question: faker.lorem.sentence({ min: 5, max: 10 }) + "?",
          options: Array.from({ length: optionCount }, (_, idx) => ({
            id: `opt-${idx + 1}`,
            label: faker.lorem.words({ min: 1, max: 3 }),
          })),
          allowsMultipleSelections: faker.datatype.boolean(),
          closesAt: faker.datatype.boolean()
            ? faker.date.future().toISOString()
            : null,
        },
      };
    }

    // 20% visualization post
    return {
      visualization: {
        title: faker.lorem.sentence({ min: 3, max: 6 }),
        visualizationType: faker.helpers.arrayElement([
          "bar",
          "line",
          "pie",
          "table",
        ] as const),
        data: Array.from(
          { length: faker.number.int({ min: 3, max: 6 }) },
          () => ({
            label: faker.lorem.word(),
            value: faker.number.int({ min: 10, max: 1000 }),
          }),
        ),
        description: faker.lorem.sentence(),
        unit: faker.helpers.arrayElement([
          "users",
          "items",
          "views",
          "clicks",
          "sales",
        ]),
      },
    };
  }

  // ── cleanup & user creation ─────────────────────────────────────────────────

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
    const candidates = [
      {
        email: "demo@gmail.com",
        password: "Demo@123",
        name: "Demo User",
        username: "demo",
      },
      ...Array.from({ length: EXTRA_USERS }, () => {
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
      }),
    ];

    const users: SeededUser[] = [];

    for (const candidate of candidates) {
      const created = await this.authService.api.signUpEmail({
        body: {
          email: candidate.email,
          password: candidate.password,
          name: candidate.name,
          username: candidate.username,
        },
      });

      users.push({ id: created.user.id, email: created.user.email });
    }

    return users;
  }
}
