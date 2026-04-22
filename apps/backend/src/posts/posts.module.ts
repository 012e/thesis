import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { EmbeddingModule } from "@/embedding/embedding.module";
import { StorageModule } from "@/storage";
import { UsersModule } from "@/users/users.module";

import { PostsController } from "./posts.controller";
import { PostsSearchService } from "./posts-search.service";
import { PostsService } from "./posts.service";

@Module({
  imports: [DatabaseModule, StorageModule, UsersModule, EmbeddingModule],
  controllers: [PostsController],
  providers: [PostsService, PostsSearchService],
  exports: [PostsService],
})
export class PostsModule {}
