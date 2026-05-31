import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { EmbeddingModule } from "@/embedding/embedding.module";
import { NotificationsModule } from "@/notifications/notifications.module";

import { ContentHashService } from "./content-hash.service";
import { DuplicateDetectionService } from "./duplicate-detection.service";
import { HarmfulContentService } from "./harmful-content.service";
import { LlmValidationService } from "./llm-validation.service";
import { ModerationService } from "./moderation.service";
import { ModerationPipelineService } from "./moderation-pipeline.service";
import { ModerationController } from "./moderation.controller";

@Module({
  imports: [DatabaseModule, EmbeddingModule, NotificationsModule],
  controllers: [ModerationController],
  providers: [
    ContentHashService,
    DuplicateDetectionService,
    HarmfulContentService,
    LlmValidationService,
    ModerationService,
    ModerationPipelineService,
  ],
  exports: [ModerationService, ModerationPipelineService, ContentHashService],
})
export class ModerationModule {}
