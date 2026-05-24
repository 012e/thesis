import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";

import { env } from "@/env";

export interface LlmValidationResult {
  confidence: number; // 1-100
  summary: string;
}

/**
 * Uses a fast, cheap LLM (gpt-4.1-mini) to validate flagged content
 * and provide a confidence score + summary.
 */
@Injectable()
export class LlmValidationService {
  private readonly logger = new Logger(LlmValidationService.name);
  private readonly client: OpenAI | null;

  constructor() {
    this.client = env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
      : null;
  }

  /**
   * Validate a potentially duplicated post.
   * Returns confidence (1-100) that the post IS a duplicate and a summary.
   */
  async validateDuplicate(
    originalText: string,
    similarText: string,
    similarityScore: number,
  ): Promise<LlmValidationResult> {
    const prompt = `You are a content moderation assistant. Two posts have been flagged as potentially duplicated.

Original post:
"""
${originalText}
"""

Similar post:
"""
${similarText}
"""

Similarity score: ${similarityScore.toFixed(4)}

Evaluate whether these posts are truly duplicates. Consider:
- Are they conveying the same information?
- Is one a repost/copy of the other?
- Could they be legitimate different perspectives on the same topic?

Respond with ONLY a JSON object (no markdown, no code fences):
{"confidence": <number 1-100>, "summary": "<brief explanation>"}

Where confidence is how confident you are that this IS a duplicate (100 = definitely duplicate, 1 = definitely not).`;

    return this.callLlm(prompt);
  }

  /**
   * Validate potentially harmful content flagged by OpenAI moderation.
   * Returns confidence (1-100) that the content IS harmful and a summary.
   */
  async validateHarmful(
    text: string,
    flaggedCategories: Record<string, boolean>,
    categoryScores: Record<string, number>,
  ): Promise<LlmValidationResult> {
    const flaggedList = Object.entries(flaggedCategories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category)
      .join(", ");

    const scoresList = Object.entries(categoryScores)
      .filter(([, score]) => score > 0.1)
      .map(([category, score]) => `${category}: ${score.toFixed(4)}`)
      .join("\n");

    const prompt = `You are a content moderation assistant. A post has been flagged by an automated system for potentially harmful content.

Post content:
"""
${text}
"""

Flagged categories: ${flaggedList || "none"}
Category scores (above 0.1):
${scoresList || "none"}

Evaluate whether this content is genuinely harmful or if it's a false positive. Consider:
- Is the content actually harmful or just discussing a sensitive topic?
- Could the flagged categories be incorrect?
- Is there context that makes the content acceptable?

Respond with ONLY a JSON object (no markdown, no code fences):
{"confidence": <number 1-100>, "summary": "<brief explanation>"}

Where confidence is how confident you are that this IS harmful (100 = definitely harmful, 1 = definitely not).`;

    return this.callLlm(prompt);
  }

  /**
   * Validate a user report.
   * Returns confidence (1-100) that the report is valid and a summary.
   */
  async validateReport(
    postText: string,
    reportReason: string,
    reportDescription: string | null,
  ): Promise<LlmValidationResult> {
    const prompt = `You are a content moderation assistant. A user has reported a post.

Post content:
"""
${postText}
"""

Report reason: ${reportReason}
Report description: ${reportDescription || "(no description provided)"}

Evaluate whether this report appears valid. Consider:
- Does the post content match the reported reason?
- Is the report specific and actionable?
- Could this be a frivolous or malicious report?

Respond with ONLY a JSON object (no markdown, no code fences):
{"confidence": <number 1-100>, "summary": "<brief explanation>"}

Where confidence is how confident you are that the report IS valid (100 = definitely valid report, 1 = definitely invalid).`;

    return this.callLlm(prompt);
  }

  private async callLlm(prompt: string): Promise<LlmValidationResult> {
    if (!this.client) {
      this.logger.debug("OpenAI API key not set, returning default result");
      return {
        confidence: 50,
        summary: "LLM validation unavailable — API key not configured",
      };
    }

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        return {
          confidence: 50,
          summary: "LLM returned empty response",
        };
      }

      const parsed = JSON.parse(content) as {
        confidence: number;
        summary: string;
      };

      // Clamp confidence to valid range
      const confidence = Math.max(1, Math.min(100, Math.round(parsed.confidence)));

      return {
        confidence,
        summary: parsed.summary || "No summary provided",
      };
    } catch (error) {
      this.logger.error(`LLM validation failed: ${error}`);
      return {
        confidence: 50,
        summary: `LLM validation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
