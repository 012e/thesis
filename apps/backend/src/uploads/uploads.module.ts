import { Module } from "@nestjs/common";

import { StorageModule } from "@/storage";

import { UploadsController } from "./uploads.controller";

@Module({
  imports: [StorageModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
