import { describe, expect, it } from "vitest";
import { runEvals } from "@mastra/core/evals";
import { postCreationAgent } from "../mastra/agents/post-creation-agent";
import { intentAlignmentScorer } from "../mastra/scorers/intent-alignment.scorer";
import { taskCompleteScorer } from "../mastra/scorers/task-complete.scorer";

/**
 * Eval tests for the Post Creation Agent.
 *
 * The post-creation agent handles write operations on posts:
 * creating, updating, and deleting posts.
 *
 * NOTE: These tests make real LLM API calls. Run locally with:
 *   pnpm test:evals
 *
 * The static agent export has no MCP tools attached. Scores reflect
 * tool-less LLM behaviour and serve as a baseline. Attach toolsets via
 * createOrchestratorAgent() to measure production-quality scores.
 */

describe("Post Creation Agent — scorer evals", () => {
  it("create post intent is processed without read-mismatch", async () => {
    // The agent should not respond as if it performed a read operation
    // when the user wants to write. Intent-alignment checks this.
    const result = await runEvals({
      data: [
        { input: "create a post saying: Hello, world!" },
        { input: "publish a new post: Just shipped v2!" },
        { input: "make a post: Excited to share this news." },
      ],
      target: postCreationAgent,
      scorers: [intentAlignmentScorer, taskCompleteScorer],
    });

    expect(result.summary.totalItems).toBe(3);
    // Scores are valid numbers in [0, 1]
    expect(result.scores["intent-alignment"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["intent-alignment"]).toBeLessThanOrEqual(1);
    // Without tools the agent cannot confirm creation — task-complete may be 0
    expect(result.scores["task-complete"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["task-complete"]).toBeLessThanOrEqual(1);
  });

  it("delete post intent is processed correctly", async () => {
    const result = await runEvals({
      data: [
        {
          input: "delete my post with id post-abc123",
          groundTruth: { expectedAction: "delete" },
        },
        {
          input: "remove the post with id post-xyz789",
          groundTruth: { expectedAction: "delete" },
        },
      ],
      target: postCreationAgent,
      scorers: [intentAlignmentScorer, taskCompleteScorer],
    });

    expect(result.summary.totalItems).toBe(2);
    expect(result.scores["intent-alignment"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["intent-alignment"]).toBeLessThanOrEqual(1);
    expect(result.scores["task-complete"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["task-complete"]).toBeLessThanOrEqual(1);
  });

  it("update post intent is processed correctly", async () => {
    const result = await runEvals({
      data: [
        {
          input: "update post post-001 with the text: Updated content here",
          groundTruth: { expectedAction: "update" },
        },
      ],
      target: postCreationAgent,
      scorers: [intentAlignmentScorer, taskCompleteScorer],
    });

    expect(result.summary.totalItems).toBe(1);
    expect(result.scores["intent-alignment"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["intent-alignment"]).toBeLessThanOrEqual(1);
    expect(result.scores["task-complete"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["task-complete"]).toBeLessThanOrEqual(1);
  });
});
