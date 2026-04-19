import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { StorageModule } from "@/storage";
import { UsersModule } from "@/users/users.module";

import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

@Module({
  imports: [DatabaseModule, StorageModule, UsersModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
