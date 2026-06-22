import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { EmbeddingModule } from "@/embedding/embedding.module";

import { AgentSkillsController } from "./agent-skills.controller";
import { AgentSkillsService } from "./agent-skills.service";

@Module({
  imports: [DatabaseModule, EmbeddingModule],
  controllers: [AgentSkillsController],
  providers: [AgentSkillsService],
  exports: [AgentSkillsService],
})
export class AgentSkillsModule {}
