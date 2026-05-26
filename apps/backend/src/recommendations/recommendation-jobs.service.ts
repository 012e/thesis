import { Injectable, Logger } from "@nestjs/common";
import { Job } from "@wavezync/nestjs-pgboss";
import type { JobWithMetadata } from "pg-boss";

import { RecommendationPipelineService } from "./recommendation-pipeline.service";

export const GENERATE_RECOMMENDATIONS_JOB = "generate-recommendations";

export interface GenerateRecommendationsJobData {
  userId: string;
  trigger: string;
}

/**
 * PgBoss job handler for background recommendation generation.
 */
@Injectable()
export class RecommendationJobsService {
  private readonly logger = new Logger(RecommendationJobsService.name);

  constructor(
    private readonly pipelineService: RecommendationPipelineService,
  ) {}

  @Job(GENERATE_RECOMMENDATIONS_JOB, { teamSize: 3, teamConcurrency: 1 })
  async handleGenerateRecommendations(
    jobs: JobWithMetadata<GenerateRecommendationsJobData>[],
  ): Promise<void> {
    await Promise.allSettled(
      jobs.map(async (job) => {
        const { userId, trigger } = job.data;
        this.logger.log(
          `Processing recommendation generation for user ${userId} (trigger: ${trigger})`,
        );

        try {
          await this.pipelineService.generateForUser(userId, trigger);
        } catch (error) {
          this.logger.error(
            `Failed to generate recommendations for user ${userId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }),
    );
  }
}
