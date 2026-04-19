import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import { registerAndGetSessionCookie } from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("PollsController integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userBCookie: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    userACookie = await registerAndGetSessionCookie(
      server,
      `poll-user-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `poll-user-b-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE poll_votes RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE posts RESTART IDENTITY CASCADE");
  });

  /**
   * Helper to create a post with a poll
   */
  async function createPollPost(
    cookie: string,
    poll: {
      question: string;
      options: { id: string; label: string }[];
      allowsMultipleSelections: boolean;
      closesAt?: string | null;
    },
    text?: string,
  ) {
    const content: { poll: typeof poll; text?: string } = { poll };
    if (text) content.text = text;

    const res = await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", cookie)
      .send({ content })
      .expect(201);

    return res.body;
  }

  describe("GET /posts/:id/poll", () => {
    it("returns poll results for a post with a poll", async () => {
      const post = await createPollPost(userACookie, {
        question: "Favourite color?",
        options: [
          { id: "red", label: "Red" },
          { id: "blue", label: "Blue" },
          { id: "green", label: "Green" },
        ],
        allowsMultipleSelections: false,
      });

      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${post.id}/poll`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.postId).toBe(post.id);
      expect(res.body.totalVotes).toBe(0);
      expect(res.body.options).toHaveLength(3);
      expect(res.body.options[0].optionId).toBe("red");
      expect(res.body.options[0].label).toBe("Red");
      expect(res.body.options[0].voteCount).toBe(0);
      expect(res.body.options[0].percentage).toBe(0);
      expect(res.body.userVotes).toEqual([]);
      expect(res.body.isClosed).toBe(false);
    });

    it("returns 404 for a post without a poll", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "No poll here" } })
        .expect(201);

      await request(testApp.app.getHttpServer())
        .get(`/posts/${res.body.id}/poll`)
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 404 for a non-existent post", async () => {
      await request(testApp.app.getHttpServer())
        .get("/posts/00000000-0000-0000-0000-000000000000/poll")
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      const post = await createPollPost(userACookie, {
        question: "Test?",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        allowsMultipleSelections: false,
      });

      await request(testApp.app.getHttpServer())
        .get(`/posts/${post.id}/poll`)
        .expect(401);
    });
  });

  describe("POST /posts/:id/poll/vote", () => {
    it("allows voting on a single-selection poll", async () => {
      const post = await createPollPost(userACookie, {
        question: "Pick one",
        options: [
          { id: "opt1", label: "Option 1" },
          { id: "opt2", label: "Option 2" },
        ],
        allowsMultipleSelections: false,
      });

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["opt1"] })
        .expect(200);

      expect(res.body.totalVotes).toBe(1);
      expect(res.body.userVotes).toEqual(["opt1"]);
      expect(
        res.body.options.find((o: any) => o.optionId === "opt1").voteCount,
      ).toBe(1);
      expect(
        res.body.options.find((o: any) => o.optionId === "opt1").percentage,
      ).toBe(100);
      expect(
        res.body.options.find((o: any) => o.optionId === "opt2").voteCount,
      ).toBe(0);
    });

    it("allows voting on a multiple-selection poll", async () => {
      const post = await createPollPost(userACookie, {
        question: "Pick many",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
          { id: "c", label: "C" },
        ],
        allowsMultipleSelections: true,
      });

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["a", "c"] })
        .expect(200);

      expect(res.body.totalVotes).toBe(1);
      expect(res.body.userVotes).toEqual(expect.arrayContaining(["a", "c"]));
      expect(res.body.userVotes).toHaveLength(2);
    });

    it("rejects multiple selections on a single-selection poll", async () => {
      const post = await createPollPost(userACookie, {
        question: "Pick one only",
        options: [
          { id: "x", label: "X" },
          { id: "y", label: "Y" },
        ],
        allowsMultipleSelections: false,
      });

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["x", "y"] })
        .expect(400);

      expect(res.body.message).toContain("single selection");
    });

    it("replaces previous vote when voting again", async () => {
      const post = await createPollPost(userACookie, {
        question: "Change your mind?",
        options: [
          { id: "first", label: "First" },
          { id: "second", label: "Second" },
        ],
        allowsMultipleSelections: false,
      });

      // First vote
      await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["first"] })
        .expect(200);

      // Change vote
      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["second"] })
        .expect(200);

      expect(res.body.totalVotes).toBe(1);
      expect(res.body.userVotes).toEqual(["second"]);
      expect(
        res.body.options.find((o: any) => o.optionId === "first").voteCount,
      ).toBe(0);
      expect(
        res.body.options.find((o: any) => o.optionId === "second").voteCount,
      ).toBe(1);
    });

    it("rejects invalid option IDs", async () => {
      const post = await createPollPost(userACookie, {
        question: "Valid options only",
        options: [
          { id: "valid1", label: "Valid 1" },
          { id: "valid2", label: "Valid 2" },
        ],
        allowsMultipleSelections: false,
      });

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["invalid-option"] })
        .expect(400);

      expect(res.body.message).toContain("Invalid option ID");
    });

    it("tracks votes from multiple users correctly", async () => {
      const post = await createPollPost(userACookie, {
        question: "Multi-user poll",
        options: [
          { id: "alpha", label: "Alpha" },
          { id: "beta", label: "Beta" },
        ],
        allowsMultipleSelections: false,
      });

      // User A votes
      await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["alpha"] })
        .expect(200);

      // User B votes
      await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userBCookie)
        .send({ optionIds: ["beta"] })
        .expect(200);

      // Check results from User A's perspective
      const resA = await request(testApp.app.getHttpServer())
        .get(`/posts/${post.id}/poll`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(resA.body.totalVotes).toBe(2);
      expect(resA.body.userVotes).toEqual(["alpha"]);
      expect(
        resA.body.options.find((o: any) => o.optionId === "alpha").voteCount,
      ).toBe(1);
      expect(
        resA.body.options.find((o: any) => o.optionId === "beta").voteCount,
      ).toBe(1);

      // Check results from User B's perspective
      const resB = await request(testApp.app.getHttpServer())
        .get(`/posts/${post.id}/poll`)
        .set("Cookie", userBCookie)
        .expect(200);

      expect(resB.body.totalVotes).toBe(2);
      expect(resB.body.userVotes).toEqual(["beta"]);
    });

    it("calculates percentages correctly", async () => {
      const post = await createPollPost(userACookie, {
        question: "Percentage test",
        options: [
          { id: "majority", label: "Majority" },
          { id: "minority", label: "Minority" },
        ],
        allowsMultipleSelections: false,
      });

      // Add 3 votes for majority via direct DB
      await pool.query(
        `INSERT INTO poll_votes (post_id, option_id, user_id) VALUES
         ($1, 'majority', 'voter-1'),
         ($1, 'majority', 'voter-2'),
         ($1, 'majority', 'voter-3'),
         ($1, 'minority', 'voter-4')`,
        [post.id],
      );

      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${post.id}/poll`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.totalVotes).toBe(4);
      expect(
        res.body.options.find((o: any) => o.optionId === "majority").percentage,
      ).toBe(75);
      expect(
        res.body.options.find((o: any) => o.optionId === "minority").percentage,
      ).toBe(25);
    });

    it("returns 400 for a post without a poll", async () => {
      const textPost = await request(testApp.app.getHttpServer())
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Just text" } })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${textPost.body.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["any"] })
        .expect(400);

      expect(res.body.message).toContain("poll");
    });

    it("returns 401 when not authenticated", async () => {
      const post = await createPollPost(userACookie, {
        question: "Auth test",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        allowsMultipleSelections: false,
      });

      await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .send({ optionIds: ["a"] })
        .expect(401);
    });

    it("rejects voting on a closed poll", async () => {
      // Create poll that closes in the past
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const post = await createPollPost(userACookie, {
        question: "Closed poll",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        allowsMultipleSelections: false,
        closesAt: pastDate,
      });

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userBCookie)
        .send({ optionIds: ["a"] })
        .expect(400);

      expect(res.body.message).toContain("closed");
    });
  });

  describe("DELETE /posts/:id/poll/vote", () => {
    it("removes user vote from a poll", async () => {
      const post = await createPollPost(userACookie, {
        question: "Unvote test",
        options: [
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ],
        allowsMultipleSelections: false,
      });

      // Vote first
      await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["yes"] })
        .expect(200);

      // Unvote
      const res = await request(testApp.app.getHttpServer())
        .delete(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.totalVotes).toBe(0);
      expect(res.body.userVotes).toEqual([]);
      expect(
        res.body.options.find((o: any) => o.optionId === "yes").voteCount,
      ).toBe(0);
    });

    it("does not affect other users votes when unvoting", async () => {
      const post = await createPollPost(userACookie, {
        question: "Multi-user unvote",
        options: [
          { id: "opt", label: "Option" },
          { id: "opt2", label: "Option 2" },
        ],
        allowsMultipleSelections: false,
      });

      // Both users vote
      await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .send({ optionIds: ["opt"] })
        .expect(200);

      await request(testApp.app.getHttpServer())
        .post(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userBCookie)
        .send({ optionIds: ["opt"] })
        .expect(200);

      // User A unvotes
      await request(testApp.app.getHttpServer())
        .delete(`/posts/${post.id}/poll/vote`)
        .set("Cookie", userACookie)
        .expect(200);

      // Check User B still has vote
      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${post.id}/poll`)
        .set("Cookie", userBCookie)
        .expect(200);

      expect(res.body.totalVotes).toBe(1);
      expect(res.body.userVotes).toEqual(["opt"]);
    });

    it("returns 404 for a post without a poll", async () => {
      const textPost = await request(testApp.app.getHttpServer())
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "No poll" } })
        .expect(201);

      await request(testApp.app.getHttpServer())
        .delete(`/posts/${textPost.body.id}/poll/vote`)
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      const post = await createPollPost(userACookie, {
        question: "Auth test",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        allowsMultipleSelections: false,
      });

      await request(testApp.app.getHttpServer())
        .delete(`/posts/${post.id}/poll/vote`)
        .expect(401);
    });
  });

  describe("Poll with post text", () => {
    it("creates a post with both text and poll", async () => {
      const post = await createPollPost(
        userACookie,
        {
          question: "Poll with context",
          options: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
          allowsMultipleSelections: false,
        },
        "Here is some context for the poll",
      );

      expect(post.content.text).toBe("Here is some context for the poll");
      expect(post.content.poll.question).toBe("Poll with context");
    });
  });

  describe("Poll expiration", () => {
    it("marks poll as closed when closesAt is in the past", async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const post = await createPollPost(userACookie, {
        question: "Expired poll",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        allowsMultipleSelections: false,
        closesAt: pastDate,
      });

      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${post.id}/poll`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.isClosed).toBe(true);
    });

    it("marks poll as open when closesAt is in the future", async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const post = await createPollPost(userACookie, {
        question: "Active poll",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        allowsMultipleSelections: false,
        closesAt: futureDate,
      });

      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${post.id}/poll`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.isClosed).toBe(false);
      expect(res.body.closesAt).toBe(futureDate);
    });
  });
});
