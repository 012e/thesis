import { Module } from "@nestjs/common";

import { PistonClient } from "./piston.client";
import { PlaygroundController } from "./playground.controller";
import { PlaygroundService } from "./playground.service";

@Module({
  controllers: [PlaygroundController],
  providers: [PistonClient, PlaygroundService],
})
export class PlaygroundModule {}
