import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";

import { env } from "@/env";

export interface HarmfulContentResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
  raw: unknown;
}

/**
 * Uses OpenAI's omni-moderation-latest model to detect harmful content.
 * When OPENAI_API_KEY is not set, always returns unflagged (safe for testing).
 */
@Injectable()
export class HarmfulContentService {
  private readonly logger = new Logger(HarmfulContentService.name);
  private readonly client: OpenAI | null;

  constructor() {
    this.client = env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
      : null;
  }

  /**
   * Check text content for harmful material using OpenAI's moderation API.
   */
  async check(text: string): Promise<HarmfulContentResult> {
    if (!this.client) {
      this.logger.debug(
        "OpenAI API key not set, skipping harmful content check",
      );
      return {
        flagged: false,
        categories: {},
        categoryScores: {},
        raw: null,
      };
    }

    if (!text || text.trim().length === 0) {
      return {
        flagged: false,
        categories: {},
        categoryScores: {},
        raw: null,
      };
    }

    try {
      const response = await this.client.moderations.create({
        model: "omni-moderation-latest",
        input: text,
      });

      const result = response.results[0];

      return {
        flagged: result.flagged,
        categories: result.categories as unknown as Record<string, boolean>,
        categoryScores: result.category_scores as unknown as Record<
          string,
          number
        >,
        raw: result,
      };
    } catch (error) {
      this.logger.error(`OpenAI moderation API failed: ${error}`);
      // Fail open — don't block posts if moderation API is down
      return {
        flagged: false,
        categories: {},
        categoryScores: {},
        raw: null,
      };
    }
  }
}
