import { forwardRef, Module } from "@nestjs/common";
import { PgBossModule } from "@wavezync/nestjs-pgboss";

import { DatabaseModule } from "@/db/database.module";
import { PostsModule } from "@/posts/posts.module";

import { RecommendationService } from "./recommendation.service";
import { RecommendationPipelineService } from "./recommendation-pipeline.service";
import { RecommendationJobsService } from "./recommendation-jobs.service";
import { UserPreferenceVectorService } from "./user-preference-vector.service";

import {
  RECOMMENDATION_FILTERS,
  VisiblePostFilter,
  OwnPostFilter,
  AlreadyInteractedFilter,
  AlreadyQueuedFilter,
} from "./filters";

@Module({
  imports: [DatabaseModule, PgBossModule, forwardRef(() => PostsModule)],
  providers: [
    // Filters (individual providers so DI resolves their dependencies)
    VisiblePostFilter,
    OwnPostFilter,
    AlreadyInteractedFilter,
    AlreadyQueuedFilter,
    {
      provide: RECOMMENDATION_FILTERS,
      useFactory: (
        visible: VisiblePostFilter,
        own: OwnPostFilter,
        interacted: AlreadyInteractedFilter,
        queued: AlreadyQueuedFilter,
      ) => [visible, own, interacted, queued],
      inject: [
        VisiblePostFilter,
        OwnPostFilter,
        AlreadyInteractedFilter,
        AlreadyQueuedFilter,
      ],
    },
    // Core services
    UserPreferenceVectorService,
    RecommendationPipelineService,
    RecommendationJobsService,
    RecommendationService,
  ],
  exports: [RecommendationService],
})
export class RecommendationsModule {}
