import { Module } from "@nestjs/common";

import { CommentsModule } from "@/comments/comments.module";
import { DatabaseModule } from "@/db/database.module";
import { FollowsModule } from "@/follows/follows.module";
import { PostsModule } from "@/posts/posts.module";
import { ReactionsModule } from "@/reactions/reactions.module";
import { ThreadsModule } from "@/threads/threads.module";

import { SeedController } from "./seed.controller";
import { SeedService } from "./seed.service";

@Module({
  imports: [
    DatabaseModule,
    PostsModule,
    CommentsModule,
    ReactionsModule,
    FollowsModule,
    ThreadsModule,
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
