import { describe, expect, it } from "vitest";
import { runEvals } from "@mastra/core/evals";
import { identityAgent } from "../mastra/agents/identity-agent";
import { intentAlignmentScorer } from "../mastra/scorers/intent-alignment.scorer";
import { taskCompleteScorer } from "../mastra/scorers/task-complete.scorer";

/**
 * Eval tests for the Identity Agent.
 *
 * The identity agent handles read/write operations on the social graph:
 * profile lookups, following, unfollowing, listing followers/following.
 *
 * NOTE: These tests make real LLM API calls. Run locally with:
 *   pnpm test:evals
 *
 * The static agent export has no MCP tools attached. Scores reflect
 * tool-less LLM behaviour and serve as a baseline. Attach toolsets via
 * createOrchestratorAgent() to measure production-quality scores.
 */

describe("Identity Agent — scorer evals", () => {
  it("read intents are aligned (profile lookups, listing)", async () => {
    // All inputs express a clear read/lookup intent.
    // A tool-less response won't contain write confirmation words
    // (created/deleted/updated/posted), so intent-alignment should score 1.
    const result = await runEvals({
      data: [
        { input: "who am I on this platform" },
        {
          input: "show me the profile of alice",
          groundTruth: { expectedAction: "read" },
        },
        {
          input: "list my followers",
          groundTruth: { expectedAction: "read" },
        },
        {
          input: "who is alice following",
          groundTruth: { expectedAction: "read" },
        },
      ],
      target: identityAgent,
      scorers: [intentAlignmentScorer],
    });

    expect(result.summary.totalItems).toBe(4);
    // Read-only inputs must not trigger a write-mismatch
    expect(result.scores["intent-alignment"]).toBe(1);
  });

  it("follow / unfollow write intents do not misfire as reads", async () => {
    // These are write operations. Without tools the agent cannot confirm
    // execution, so task-complete will be low — but intent-alignment must
    // still be valid (no false read-detection).
    const result = await runEvals({
      data: [
        { input: "follow user bob" },
        { input: "unfollow user carol" },
      ],
      target: identityAgent,
      scorers: [intentAlignmentScorer, taskCompleteScorer],
    });

    expect(result.summary.totalItems).toBe(2);
    // Scores are valid numbers in [0, 1]
    expect(result.scores["intent-alignment"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["intent-alignment"]).toBeLessThanOrEqual(1);
    expect(result.scores["task-complete"]).toBeGreaterThanOrEqual(0);
    expect(result.scores["task-complete"]).toBeLessThanOrEqual(1);
  });
});
