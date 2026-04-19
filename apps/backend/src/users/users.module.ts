import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { StorageModule } from "@/storage";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
