import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { EmbeddingModule } from "@/embedding/embedding.module";
import { StorageModule } from "@/storage";
import { UsersModule } from "@/users/users.module";
import { NotificationsModule } from "@/notifications/notifications.module";
import { ModerationModule } from "@/moderation/moderation.module";
import { TagsModule } from "@/tags/tags.module";

import { PostsController } from "./posts.controller";
import { PostsEngagementService } from "./posts-engagement.service";
import { PostsMutationService } from "./posts-mutation.service";
import { PostsNotificationsService } from "./posts-notifications.service";
import { PostsPresenterService } from "./posts-presenter.service";
import { PostsReadService } from "./posts-read.service";
import { PostsSearchService } from "./posts-search.service";
import { PostsService } from "./posts.service";

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    UsersModule,
    EmbeddingModule,
    NotificationsModule,
    ModerationModule,
    TagsModule,
  ],
  controllers: [PostsController],
  providers: [
    PostsService,
    PostsReadService,
    PostsMutationService,
    PostsEngagementService,
    PostsNotificationsService,
    PostsPresenterService,
    PostsSearchService,
  ],
  exports: [PostsService, PostsSearchService],
})
export class PostsModule {}
