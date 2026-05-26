import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContentHashService } from "@/moderation/content-hash.service";
import type { DuplicateCheckResult } from "@/moderation/duplicate-detection.service";
import { DuplicateDetectionService } from "@/moderation/duplicate-detection.service";
import { HarmfulContentService } from "@/moderation/harmful-content.service";
import { LlmValidationService } from "@/moderation/llm-validation.service";
import { ModerationPipelineService } from "@/moderation/moderation-pipeline.service";
import { ModerationService } from "@/moderation/moderation.service";

describe("ModerationPipelineService", () => {
  let contentHashService: Pick<ContentHashService, "hash">;
  let duplicateDetectionService: Pick<DuplicateDetectionService, "check">;
  let harmfulContentService: Pick<HarmfulContentService, "check">;
  let llmValidationService: Pick<
    LlmValidationService,
    "validateDuplicate" | "validateHarmful" | "validateReport"
  >;
  let moderationService: Pick<
    ModerationService,
    | "updateContentHash"
    | "createModerationRecord"
    | "hidePost"
    | "createReport"
    | "getPostText"
  >;
  let service: ModerationPipelineService;

  beforeEach(() => {
    contentHashService = {
      hash: vi.fn().mockReturnValue("hash-123"),
    };
    duplicateDetectionService = {
      check: vi.fn().mockResolvedValue({
        isDuplicate: false,
        method: null,
        similarPostId: null,
        similarityScore: null,
      } satisfies DuplicateCheckResult),
    };
    harmfulContentService = {
      check: vi.fn().mockResolvedValue({
        flagged: false,
        categories: {},
        categoryScores: {},
        raw: null,
      }),
    };
    llmValidationService = {
      validateDuplicate: vi
        .fn()
        .mockResolvedValue({ confidence: 70, summary: "Likely duplicate" }),
      validateHarmful: vi
        .fn()
        .mockResolvedValue({ confidence: 70, summary: "Likely harmful" }),
      validateReport: vi
        .fn()
        .mockResolvedValue({ confidence: 70, summary: "Likely valid report" }),
    };
    moderationService = {
      updateContentHash: vi.fn().mockResolvedValue(undefined),
      createModerationRecord: vi.fn().mockResolvedValue({ id: "moderation-1" }),
      hidePost: vi.fn().mockResolvedValue(undefined),
      createReport: vi.fn().mockResolvedValue({ id: "report-1" }),
      getPostText: vi.fn().mockResolvedValue("Existing post text"),
    };

    service = new ModerationPipelineService(
      contentHashService as ContentHashService,
      duplicateDetectionService as DuplicateDetectionService,
      harmfulContentService as HarmfulContentService,
      llmValidationService as LlmValidationService,
      moderationService as ModerationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips all checks when runPipeline receives null text", async () => {
    await service.runPipeline("post-1", null);

    expect(contentHashService.hash).not.toHaveBeenCalled();
    expect(moderationService.updateContentHash).not.toHaveBeenCalled();
    expect(duplicateDetectionService.check).not.toHaveBeenCalled();
    expect(harmfulContentService.check).not.toHaveBeenCalled();
  });

  it("creates no moderation record when no duplicate or harmful content is found", async () => {
    await service.runPipeline("post-1", "Legitimate post text");

    expect(contentHashService.hash).toHaveBeenCalledWith(
      "Legitimate post text",
    );
    expect(moderationService.updateContentHash).toHaveBeenCalledWith(
      "post-1",
      "hash-123",
    );
    expect(duplicateDetectionService.check).toHaveBeenCalledWith(
      "post-1",
      "Legitimate post text",
    );
    expect(harmfulContentService.check).toHaveBeenCalledWith(
      "Legitimate post text",
    );
    expect(moderationService.createModerationRecord).not.toHaveBeenCalled();
    expect(moderationService.hidePost).not.toHaveBeenCalled();
  });

  it("auto-rejects and hides exact hash duplicates", async () => {
    (duplicateDetectionService.check as any).mockResolvedValue({
      isDuplicate: true,
      method: "hash",
      similarPostId: "post-original",
      similarityScore: 1,
    } satisfies DuplicateCheckResult);

    await service.runPipeline("post-1", "Repeated text");

    expect(moderationService.createModerationRecord).toHaveBeenCalledWith({
      postId: "post-1",
      source: "auto_duplicate",
      status: "rejected",
      priority: "high",
      llmConfidence: 100,
      llmSummary: "Exact content hash match — this post is an exact duplicate",
      similarPostId: "post-original",
      similarityScore: 1,
    });
    expect(moderationService.hidePost).toHaveBeenCalledWith("post-1");
  });

  it("rejects embedding duplicates when LLM confidence is high", async () => {
    (duplicateDetectionService.check as any).mockResolvedValue({
      isDuplicate: true,
      method: "embedding",
      similarPostId: "post-original",
      similarityScore: 0.96,
    } satisfies DuplicateCheckResult);
    (llmValidationService.validateDuplicate as any).mockResolvedValue({
      confidence: 88,
      summary: "These posts say the same thing",
    });
    (moderationService.getPostText as any).mockResolvedValue(
      "Original post text",
    );

    await service.runPipeline("post-1", "Copied text");

    expect(llmValidationService.validateDuplicate).toHaveBeenCalledWith(
      "Copied text",
      "Original post text",
      0.96,
    );
    expect(moderationService.createModerationRecord).toHaveBeenCalledWith({
      postId: "post-1",
      source: "auto_duplicate",
      status: "rejected",
      priority: "high",
      llmConfidence: 88,
      llmSummary: "These posts say the same thing",
      similarPostId: "post-original",
      similarityScore: 0.96,
    });
    expect(moderationService.hidePost).toHaveBeenCalledWith("post-1");
  });

  it("escalates embedding duplicates for human review when LLM confidence is low", async () => {
    (duplicateDetectionService.check as any).mockResolvedValue({
      isDuplicate: true,
      method: "embedding",
      similarPostId: "post-original",
      similarityScore: 0.94,
    } satisfies DuplicateCheckResult);
    (llmValidationService.validateDuplicate as any).mockResolvedValue({
      confidence: 42,
      summary: "Could be discussing the same event differently",
    });

    await service.runPipeline("post-1", "Possibly similar text");

    expect(moderationService.createModerationRecord).toHaveBeenCalledWith({
      postId: "post-1",
      source: "auto_duplicate",
      status: "needs_human_review",
      priority: "medium",
      llmConfidence: 42,
      llmSummary: "Could be discussing the same event differently",
      similarPostId: "post-original",
      similarityScore: 0.94,
    });
    expect(moderationService.hidePost).not.toHaveBeenCalled();
  });

  it("rejects and hides harmful content when LLM confidence is high", async () => {
    (harmfulContentService.check as any).mockResolvedValue({
      flagged: true,
      categories: { violence: true },
      categoryScores: { violence: 0.98 },
      raw: { flagged: true },
    });
    (llmValidationService.validateHarmful as any).mockResolvedValue({
      confidence: 91,
      summary: "Direct threat detected",
    });

    await service.runPipeline("post-1", "I will hurt you");

    expect(moderationService.createModerationRecord).toHaveBeenCalledWith({
      postId: "post-1",
      source: "auto_harmful",
      status: "rejected",
      priority: "high",
      llmConfidence: 91,
      llmSummary: "Direct threat detected",
      moderationResult: { flagged: true },
    });
    expect(moderationService.hidePost).toHaveBeenCalledWith("post-1");
  });

  it("escalates harmful content for human review when LLM confidence is low", async () => {
    (harmfulContentService.check as any).mockResolvedValue({
      flagged: true,
      categories: { hate: true },
      categoryScores: { hate: 0.71 },
      raw: { flagged: true, categories: ["hate"] },
    });
    (llmValidationService.validateHarmful as any).mockResolvedValue({
      confidence: 35,
      summary: "Context may matter",
    });

    await service.runPipeline("post-1", "Questionable content");

    expect(moderationService.createModerationRecord).toHaveBeenCalledWith({
      postId: "post-1",
      source: "auto_harmful",
      status: "needs_human_review",
      priority: "medium",
      llmConfidence: 35,
      llmSummary: "Context may matter",
      moderationResult: { flagged: true, categories: ["hate"] },
    });
    expect(moderationService.hidePost).not.toHaveBeenCalled();
  });

  it("saves gibberish reports without escalation", async () => {
    const result = await service.processReport(
      "post-1",
      "reporter-1",
      "spam",
      "asdfasdfasdf",
    );

    expect(moderationService.createReport).toHaveBeenCalledWith({
      postId: "post-1",
      reporterId: "reporter-1",
      reason: "spam",
      description: "asdfasdfasdf",
      passedHeuristic: false,
    });
    expect(result).toEqual({ reportId: "report-1", moderationId: null });
    expect(llmValidationService.validateReport).not.toHaveBeenCalled();
    expect(moderationService.createModerationRecord).not.toHaveBeenCalled();
  });

  it("creates a pending moderation record for reports with medium confidence", async () => {
    (llmValidationService.validateReport as any).mockResolvedValue({
      confidence: 70,
      summary: "Report seems plausible",
    });
    (moderationService.createModerationRecord as any).mockResolvedValue({
      id: "moderation-pending",
    });

    const result = await service.processReport(
      "post-1",
      "reporter-1",
      "harassment",
      "This is targeting another user repeatedly.",
    );

    expect(llmValidationService.validateReport).toHaveBeenCalledWith(
      "Existing post text",
      "harassment",
      "This is targeting another user repeatedly.",
    );
    expect(moderationService.createModerationRecord).toHaveBeenCalledWith({
      postId: "post-1",
      source: "user_report",
      status: "pending",
      priority: "medium",
      llmConfidence: 70,
      llmSummary: "Report seems plausible",
    });
    expect(moderationService.createReport).toHaveBeenCalledWith({
      postId: "post-1",
      reporterId: "reporter-1",
      reason: "harassment",
      description: "This is targeting another user repeatedly.",
      passedHeuristic: true,
      moderationId: "moderation-pending",
    });
    expect(result).toEqual({
      reportId: "report-1",
      moderationId: "moderation-pending",
    });
    expect(moderationService.hidePost).not.toHaveBeenCalled();
  });

  it("rejects and hides posts for high-confidence valid reports", async () => {
    (llmValidationService.validateReport as any).mockResolvedValue({
      confidence: 95,
      summary: "The report is clearly valid",
    });
    (moderationService.createModerationRecord as any).mockResolvedValue({
      id: "moderation-rejected",
    });

    const result = await service.processReport(
      "post-1",
      "reporter-1",
      "violence",
      "This is an explicit threat.",
    );

    expect(moderationService.createModerationRecord).toHaveBeenCalledWith({
      postId: "post-1",
      source: "user_report",
      status: "rejected",
      priority: "high",
      llmConfidence: 95,
      llmSummary: "The report is clearly valid",
    });
    expect(moderationService.hidePost).toHaveBeenCalledWith("post-1");
    expect(result).toEqual({
      reportId: "report-1",
      moderationId: "moderation-rejected",
    });
  });

  it("marks reports as needing human review when confidence is low", async () => {
    (llmValidationService.validateReport as any).mockResolvedValue({
      confidence: 20,
      summary: "The report lacks enough support",
    });
    (moderationService.createModerationRecord as any).mockResolvedValue({
      id: "moderation-review",
    });

    const result = await service.processReport(
      "post-1",
      "reporter-1",
      "other",
      "The context is unclear but concerning.",
    );

    expect(moderationService.createModerationRecord).toHaveBeenCalledWith({
      postId: "post-1",
      source: "user_report",
      status: "needs_human_review",
      priority: "medium",
      llmConfidence: 20,
      llmSummary: "The report lacks enough support",
    });
    expect(moderationService.hidePost).not.toHaveBeenCalled();
    expect(result).toEqual({
      reportId: "report-1",
      moderationId: "moderation-review",
    });
  });
});
