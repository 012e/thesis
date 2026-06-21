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

/**
 * Q&A primitives: question kind, accepted answer, solved state, and the
 * "still needs help" surface.
 */
describe("Q&A primitives integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  let askerCookie: string; // question author
  let helperCookie: string; // answerer

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    askerCookie = await registerAndGetSessionCookie(
      server,
      `asker-${Date.now()}@example.com`,
    );
    helperCookie = await registerAndGetSessionCookie(
      server,
      `helper-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE posts RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE comments RESTART IDENTITY CASCADE");
  });

  const createQuestion = async (text = "How do I fix this bug?") => {
    const res = await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", askerCookie)
      .send({ content: { text }, kind: "question" })
      .expect(201);
    return res.body;
  };

  const answer = async (postId: string, content = "Try this fix") => {
    const res = await request(testApp.app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .set("Cookie", helperCookie)
      .send({ content })
      .expect(201);
    return res.body;
  };

  it("defaults posts to discussion kind", async () => {
    const res = await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", askerCookie)
      .send({ content: { text: "Just sharing" } })
      .expect(201);

    expect(res.body.kind).toBe("discussion");
    expect(res.body.needsHelp).toBe(false);
    expect(res.body.solvedAt).toBeNull();
    expect(res.body.acceptedCommentId).toBeNull();
  });

  it("creates a question that needs help", async () => {
    const question = await createQuestion();

    expect(question.kind).toBe("question");
    expect(question.needsHelp).toBe(true);
    expect(question.solvedAt).toBeNull();
    expect(question.acceptedCommentId).toBeNull();
  });

  it("lets the asker accept an answer and marks the question solved", async () => {
    const question = await createQuestion();
    const comment = await answer(question.id);

    const res = await request(testApp.app.getHttpServer())
      .put(`/posts/${question.id}/accepted-answer`)
      .set("Cookie", askerCookie)
      .send({ commentId: comment.id })
      .expect(200);

    expect(res.body.acceptedCommentId).toBe(comment.id);
    expect(res.body.needsHelp).toBe(false);
    expect(res.body.solvedAt).not.toBeNull();

    const comments = await request(testApp.app.getHttpServer())
      .get(`/posts/${question.id}/comments`)
      .set("Cookie", askerCookie)
      .expect(200);

    const accepted = comments.body.find(
      (c: { id: string }) => c.id === comment.id,
    );
    expect(accepted.isAccepted).toBe(true);
  });

  it("forbids non-authors from accepting an answer", async () => {
    const question = await createQuestion();
    const comment = await answer(question.id);

    await request(testApp.app.getHttpServer())
      .put(`/posts/${question.id}/accepted-answer`)
      .set("Cookie", helperCookie)
      .send({ commentId: comment.id })
      .expect(403);
  });

  it("rejects accepting on a non-question post with 409", async () => {
    const discussion = await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", askerCookie)
      .send({ content: { text: "A discussion" } })
      .expect(201);

    const comment = await answer(discussion.body.id);

    await request(testApp.app.getHttpServer())
      .put(`/posts/${discussion.body.id}/accepted-answer`)
      .set("Cookie", askerCookie)
      .send({ commentId: comment.id })
      .expect(409);
  });

  it("rejects accepting a comment from a different post with 409", async () => {
    const question = await createQuestion();
    const otherQuestion = await createQuestion("Another question");
    const foreignComment = await answer(otherQuestion.id);

    await request(testApp.app.getHttpServer())
      .put(`/posts/${question.id}/accepted-answer`)
      .set("Cookie", askerCookie)
      .send({ commentId: foreignComment.id })
      .expect(409);
  });

  it("re-opens the question when the accepted answer is cleared", async () => {
    const question = await createQuestion();
    const comment = await answer(question.id);

    await request(testApp.app.getHttpServer())
      .put(`/posts/${question.id}/accepted-answer`)
      .set("Cookie", askerCookie)
      .send({ commentId: comment.id })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .delete(`/posts/${question.id}/accepted-answer`)
      .set("Cookie", askerCookie)
      .expect(200);

    expect(res.body.acceptedCommentId).toBeNull();
    expect(res.body.solvedAt).toBeNull();
    expect(res.body.needsHelp).toBe(true);
  });

  it("re-opens the question when the accepted comment is deleted", async () => {
    const question = await createQuestion();
    const comment = await answer(question.id);

    await request(testApp.app.getHttpServer())
      .put(`/posts/${question.id}/accepted-answer`)
      .set("Cookie", askerCookie)
      .send({ commentId: comment.id })
      .expect(200);

    await request(testApp.app.getHttpServer())
      .delete(`/comments/${comment.id}`)
      .set("Cookie", helperCookie)
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get(`/posts/${question.id}`)
      .set("Cookie", askerCookie)
      .expect(200);

    expect(res.body.acceptedCommentId).toBeNull();
    expect(res.body.solvedAt).toBeNull();
    expect(res.body.needsHelp).toBe(true);
  });

  it("lists only unsolved questions on the needs-help surface", async () => {
    const solved = await createQuestion("Solved question");
    const open = await createQuestion("Open question");
    // A plain discussion should never appear on the needs-help surface.
    await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", askerCookie)
      .send({ content: { text: "Discussion" } })
      .expect(201);

    const comment = await answer(solved.id);
    await request(testApp.app.getHttpServer())
      .put(`/posts/${solved.id}/accepted-answer`)
      .set("Cookie", askerCookie)
      .send({ commentId: comment.id })
      .expect(200);

    const res = await request(testApp.app.getHttpServer())
      .get("/questions/unanswered")
      .set("Cookie", helperCookie)
      .expect(200);

    const ids = res.body.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(open.id);
    expect(ids).not.toContain(solved.id);
  });
});
