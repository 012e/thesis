import { Injectable, Logger } from "@nestjs/common";

import { ContentHashService } from "./content-hash.service";
import { DuplicateDetectionService } from "./duplicate-detection.service";
import { HarmfulContentService } from "./harmful-content.service";
import { LlmValidationService } from "./llm-validation.service";
import { ModerationService } from "./moderation.service";
import { passesGibberishCheck } from "./gibberish-heuristic";

import type { ReportReasonDto } from "@repo/shared-dto";

/** Confidence threshold below which we escalate to human review. */
const LLM_CONFIDENCE_THRESHOLD = 60;

/**
 * Orchestrates the full moderation pipeline for a post.
 *
 * Pipeline steps:
 * 1. Content hash for exact duplicate detection
 * 2. Embedding similarity for near-duplicate detection
 * 3. OpenAI omni-moderation for harmful content
 * 4. LLM validation for uncertain results
 * 5. Human review escalation for low-confidence results
 */
@Injectable()
export class ModerationPipelineService {
  private readonly logger = new Logger(ModerationPipelineService.name);

  constructor(
    private readonly contentHashService: ContentHashService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    private readonly harmfulContentService: HarmfulContentService,
    private readonly llmValidationService: LlmValidationService,
    private readonly moderationService: ModerationService,
  ) {}

  /**
   * Run the full moderation pipeline on a newly created post.
   * This runs asynchronously — the post is already created and visible.
   * If issues are found, the post may be hidden.
   */
  async runPipeline(postId: string, textContent: string | null): Promise<void> {
    this.logger.log(`Running moderation pipeline for post ${postId}`);

    // Step 1: Update content hash
    if (textContent) {
      const hash = this.contentHashService.hash(textContent);
      await this.moderationService.updateContentHash(postId, hash);
    }

    // Step 2: Duplicate detection
    await this.checkDuplication(postId, textContent);

    // Step 3: Harmful content detection
    if (textContent) {
      await this.checkHarmfulContent(postId, textContent);
    }

    this.logger.log(`Moderation pipeline completed for post ${postId}`);
  }

  /**
   * Process a user report through the pipeline.
   */
  async processReport(
    postId: string,
    reporterId: string,
    reason: ReportReasonDto,
    description: string | null,
  ): Promise<{ reportId: string; moderationId: string | null }> {
    const heuristicPassed = passesGibberishCheck(description);

    // If the report description is gibberish, still save but don't escalate
    if (description && !heuristicPassed) {
      this.logger.log(
        `Report from ${reporterId} on post ${postId} failed gibberish check`,
      );
      const report = await this.moderationService.createReport({
        postId,
        reporterId,
        reason,
        description,
        passedHeuristic: false,
      });
      return { reportId: report.id, moderationId: null };
    }

    // Get post text for LLM validation
    const postText = await this.moderationService.getPostText(postId);

    let llmResult = { confidence: 50, summary: "No LLM validation performed" };
    let moderationStatus: "pending" | "needs_human_review" | "rejected" =
      "pending";

    if (postText) {
      // Run LLM validation on the report
      llmResult = await this.llmValidationService.validateReport(
        postText,
        reason,
        description,
      );

      if (llmResult.confidence >= 80) {
        moderationStatus = "rejected"; // High confidence the report is valid → reject the post
      } else if (llmResult.confidence < LLM_CONFIDENCE_THRESHOLD) {
        moderationStatus = "needs_human_review";
      }
    } else {
      moderationStatus = "needs_human_review";
    }

    // Create moderation record
    const moderationRecord =
      await this.moderationService.createModerationRecord({
        postId,
        source: "user_report",
        status: moderationStatus,
        priority: moderationStatus === "rejected" ? "high" : "medium",
        llmConfidence: llmResult.confidence,
        llmSummary: llmResult.summary,
      });

    // Create report linked to moderation record
    const report = await this.moderationService.createReport({
      postId,
      reporterId,
      reason,
      description,
      passedHeuristic: heuristicPassed,
      moderationId: moderationRecord.id,
    });

    // If high confidence, hide the post
    if (moderationStatus === "rejected") {
      await this.moderationService.hidePost(postId);
    }

    return { reportId: report.id, moderationId: moderationRecord.id };
  }

  // ─── Private Pipeline Steps ──────────────────────────────────────────

  private async checkDuplication(
    postId: string,
    textContent: string | null,
  ): Promise<void> {
    if (!textContent) return;

    const result = await this.duplicateDetectionService.check(
      postId,
      textContent,
    );

    if (!result.isDuplicate) return;

    if (result.method === "hash") {
      // Exact duplicate — high confidence, auto-reject
      await this.moderationService.createModerationRecord({
        postId,
        source: "auto_duplicate",
        status: "rejected",
        priority: "high",
        llmConfidence: 100,
        llmSummary: "Exact content hash match — this post is an exact duplicate",
        similarPostId: result.similarPostId,
        similarityScore: result.similarityScore,
      });
      await this.moderationService.hidePost(postId);
      return;
    }

    // Embedding similarity — run LLM validation
    if (result.method === "embedding" && result.similarPostId) {
      const similarPostText = await this.moderationService.getPostText(
        result.similarPostId,
      );

      if (similarPostText) {
        const llmResult = await this.llmValidationService.validateDuplicate(
          textContent,
          similarPostText,
          result.similarityScore ?? 0,
        );

        const status =
          llmResult.confidence >= LLM_CONFIDENCE_THRESHOLD
            ? "rejected"
            : "needs_human_review";

        await this.moderationService.createModerationRecord({
          postId,
          source: "auto_duplicate",
          status,
          priority: status === "rejected" ? "high" : "medium",
          llmConfidence: llmResult.confidence,
          llmSummary: llmResult.summary,
          similarPostId: result.similarPostId,
          similarityScore: result.similarityScore,
        });

        if (status === "rejected") {
          await this.moderationService.hidePost(postId);
        }
      }
    }
  }

  private async checkHarmfulContent(
    postId: string,
    textContent: string,
  ): Promise<void> {
    const result = await this.harmfulContentService.check(textContent);

    if (!result.flagged) return;

    // OpenAI flagged it — run LLM validation for secondary opinion
    const llmResult = await this.llmValidationService.validateHarmful(
      textContent,
      result.categories,
      result.categoryScores,
    );

    const status =
      llmResult.confidence >= LLM_CONFIDENCE_THRESHOLD
        ? "rejected"
        : "needs_human_review";

    await this.moderationService.createModerationRecord({
      postId,
      source: "auto_harmful",
      status,
      priority: status === "rejected" ? "high" : "medium",
      llmConfidence: llmResult.confidence,
      llmSummary: llmResult.summary,
      moderationResult: result.raw,
    });

    if (status === "rejected") {
      await this.moderationService.hidePost(postId);
    }
  }
}
