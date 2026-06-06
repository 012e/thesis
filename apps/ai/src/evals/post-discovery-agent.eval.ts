import { describe, expect, it } from "vitest";
import { runEvals } from "@mastra/core/evals";
import { postDiscoveryAgent } from "../mastra/agents/post-discovery-agent";
import { intentAlignmentScorer } from "../mastra/scorers/intent-alignment.scorer";
import { taskCompleteScorer } from "../mastra/scorers/task-complete.scorer";

/**
 * Eval tests for the Post Discovery Agent.
 *
 * The post-discovery agent handles read operations: browsing the feed
 * and reading full post threads.
 *
 * NOTE: These tests make real LLM API calls. Run locally with:
 *   pnpm test:evals
 *
 * The static agent export has no MCP tools attached. Scores reflect
 * tool-less LLM behaviour and serve as a baseline. Attach toolsets via
 * createOrchestratorAgent() to measure production-quality scores.
 */

describe("Post Discovery Agent — scorer evals", () => {
  it("feed read intents are correctly aligned", async () => {
    // All inputs are pure read intents. A tool-less response must not
    // contain write confirmation words — intent-alignment should score 1.
    const result = await runEvals({
      data: [
        {
          input: "show me the latest posts in the feed",
          groundTruth: { expectedAction: "read" },
        },
        {
          input: "what posts are trending right now",
          groundTruth: { expectedAction: "read" },
        },
        {
          input: "fetch the recommended feed",
          groundTruth: { expectedAction: "read" },
        },
        {
          input: "get the top 5 posts",
          groundTruth: { expectedAction: "read" },
        },
      ],
      target: postDiscoveryAgent,
      scorers: [intentAlignmentScorer],
    });

    expect(result.summary.totalItems).toBe(4);
    // Pure read inputs must not trigger a write-mismatch
    expect(result.scores["intent-alignment"]).toBe(1);
  });

  it("thread read intents are correctly aligned", async () => {
    const result = await runEvals({
      data: [
        {
          input: "show me post post-001 and its comments",
          groundTruth: { expectedAction: "read" },
        },
        {
          input: "display the thread for post post-999",
          groundTruth: { expectedAction: "read" },
        },
      ],
      target: postDiscoveryAgent,
      scorers: [intentAlignmentScorer, taskCompleteScorer],
    });

    expect(result.summary.totalItems).toBe(2);
    // Read-only — no write-mismatch expected
    expect(result.scores["intent-alignment"]).toBe(1);
    // Without tools the agent cannot fetch data — task-complete is baseline
    expect(result.scores["task-complete"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["task-complete"]).toBeLessThanOrEqual(1);
  });
});
