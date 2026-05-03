import { Injectable, Logger } from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

import { auth } from "@/auth";
import { CommentsService } from "@/comments/comments.service";
import { DatabaseService } from "@/db/database.service";
import { userProfiles } from "@/db/schema";
import { FollowsService } from "@/follows/follows.service";
import { PostsService } from "@/posts/posts.service";
import { ReactionsService } from "@/reactions/reactions.service";
import { ThreadsService } from "@/threads/threads.service";

// ── seed volume constants ─────────────────────────────────────────────────────
const EXTRA_USERS = 10; // additional users alongside demo@gmail.com
const POSTS_PER_USER = 10;
const COMMENTS_PER_POST = 3;
const REPLIES_PER_COMMENT = 3;
const THREADS_PER_USER = 2;
const FOLLOWS_PER_USER = 5; // how many other users each user follows

type SeededUser = { id: string; email: string };

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

  private readonly englishHeadings = [
    "Implementation Notes",
    "Operational Checklist",
    "Design Decisions",
    "Release Plan",
    "Engineering Tradeoffs",
    "Testing Strategy",
  ];

  private readonly englishPollQuestions = [
    "Which feature should the team prioritize next",
    "What is the best way to reduce API latency",
    "Which release strategy should we use this sprint",
    "What should be improved first in the onboarding flow",
    "Which notification channel is most useful to users",
  ];

  private readonly englishPollOptions = [
    "Ship now",
    "Run experiment",
    "Collect feedback",
    "Improve docs",
    "Refactor core",
    "Add tests",
    "Optimize query",
    "Monitor metrics",
  ];

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
          this.randomSentence(),
        );
        commentIds.push(comment.id);

        // Some comments get a shallow reply from the post owner
        for (let r = 0; r < REPLIES_PER_COMMENT; r++) {
          const reply = await this.commentsService.create(
            user.id,
            postId,
            this.randomSentence(),
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

  private randomSentence(): string {
    return faker.helpers.arrayElement(this.englishSentences);
  }

  private randomParagraph(min = 2, max = 4): string {
    const count = faker.number.int({ min, max });
    return Array.from({ length: count }, () => this.randomSentence()).join(" ");
  }

  private randomCodeBlock(): string {
    const snippets = [
      {
        language: "java",
        lines: [
          "public class Greeter {",
          "  public static void main(String[] args) {",
          '    String name = "Developer";',
          '    System.out.println("Hello, " + name + "!");',
          "  }",
          "}",
        ],
      },
      {
        language: "python",
        lines: [
          "def total(values: list[int]) -> int:",
          "    return sum(values)",
          "",
          "numbers = [3, 5, 8]",
          "print(total(numbers))",
        ],
      },
      {
        language: "javascript",
        lines: [
          "const users = [{ active: true }, { active: false }, { active: true }];",
          "const activeCount = users.filter((user) => user.active).length;",
          "console.log(`Active users: ${activeCount}`);",
        ],
      },
      {
        language: "typescript",
        lines: [
          "type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };",
          "",
          "function unwrap<T>(result: ApiResult<T>): T {",
          "  if (!result.ok) throw new Error(result.error);",
          "  return result.data;",
          "}",
        ],
      },
    ];

    const snippet = faker.helpers.arrayElement(snippets);
    return ["```" + snippet.language, ...snippet.lines, "```"].join("\n");
  }

  private randomMarkdown(): string {
    const title = `# ${this.randomSentence().replace(/\.$/, "")}`;

    const intro = this.randomParagraph();

    const heading = `## ${faker.helpers.arrayElement(this.englishHeadings)}`;

    const bulletCount = faker.number.int({ min: 2, max: 5 });
    const bullets = Array.from(
      { length: bulletCount },
      () => `- ${this.randomSentence()}`,
    ).join("\n");

    const codeSnippet = this.randomCodeBlock();

    const closing = this.randomParagraph();

    const blockquote = `> ${this.randomSentence()}`;

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

    if (roll > 0.8) {
      // 20% poll post
      const optionCount = faker.number.int({ min: 2, max: 4 });
      return {
        poll: {
          question: `${faker.helpers.arrayElement(this.englishPollQuestions)}?`,
          options: Array.from({ length: optionCount }, (_, idx) => ({
            id: `opt-${idx + 1}`,
            label: faker.helpers.arrayElement(this.englishPollOptions),
          })),
          allowsMultipleSelections: faker.datatype.boolean(),
          closesAt: faker.datatype.boolean()
            ? faker.date.future().toISOString()
            : null,
        },
      };
    }

    return { text: this.randomMarkdown() };
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
    const users: SeededUser[] = [];

    // Create demo user as admin via the admin createUser API (server-side call
    // skips the auth check when invoked without request/headers context).
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
      bio: this.randomParagraph(1, 3),
    });
    users.push({ id: demo.user.id, email: demo.user.email });

    // Create extra users via the standard sign-up flow.
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
        coverPhotoUrl: faker.image.urlPicsumPhotos({ width: 1600, height: 400 }),
        bio: this.randomParagraph(1, 3),
      });
      users.push({ id: created.user.id, email: created.user.email });
    }

    return users;
  }
}
