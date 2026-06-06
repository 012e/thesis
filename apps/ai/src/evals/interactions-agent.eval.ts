import { describe, expect, it } from "vitest";
import { runEvals } from "@mastra/core/evals";
import { interactionsAgent } from "../mastra/agents/interactions-agent";
import { intentAlignmentScorer } from "../mastra/scorers/intent-alignment.scorer";
import { taskCompleteScorer } from "../mastra/scorers/task-complete.scorer";

/**
 * Eval tests for the Interactions Agent.
 *
 * The interactions agent handles engagement operations: commenting,
 * upvoting/downvoting, and removing reactions.
 *
 * NOTE: These tests make real LLM API calls. Run locally with:
 *   pnpm test:evals
 *
 * The static agent export has no MCP tools attached. Scores reflect
 * tool-less LLM behaviour and serve as a baseline. Attach toolsets via
 * createOrchestratorAgent() to measure production-quality scores.
 */

describe("Interactions Agent — scorer evals", () => {
  it("reaction write intents do not misfire as reads", async () => {
    // Upvote / downvote are write operations. Intent-alignment must not
    // flag them as a read-mismatch regardless of tool availability.
    const result = await runEvals({
      data: [
        {
          input: "upvote post post-001",
          groundTruth: { expectedAction: "react" },
        },
        {
          input: "downvote post post-002",
          groundTruth: { expectedAction: "react" },
        },
        {
          input: "remove my reaction from post post-003",
          groundTruth: { expectedAction: "remove-reaction" },
        },
      ],
      target: interactionsAgent,
      scorers: [intentAlignmentScorer, taskCompleteScorer],
    });

    expect(result.summary.totalItems).toBe(3);
    expect(result.scores["intent-alignment"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["intent-alignment"]).toBeLessThanOrEqual(1);
    expect(result.scores["task-complete"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["task-complete"]).toBeLessThanOrEqual(1);
  });

  it("comment write intents are handled without read-mismatch", async () => {
    const result = await runEvals({
      data: [
        {
          input: 'add a comment "Great post!" to post post-010',
          groundTruth: { expectedAction: "comment" },
        },
        {
          input:
            'reply "Thanks for sharing!" to comment comment-abc on post post-011',
          groundTruth: { expectedAction: "reply" },
        },
      ],
      target: interactionsAgent,
      scorers: [intentAlignmentScorer, taskCompleteScorer],
    });

    expect(result.summary.totalItems).toBe(2);
    expect(result.scores["intent-alignment"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["intent-alignment"]).toBeLessThanOrEqual(1);
    expect(result.scores["task-complete"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["task-complete"]).toBeLessThanOrEqual(1);
  });
});
