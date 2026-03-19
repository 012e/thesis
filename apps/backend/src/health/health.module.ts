import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './database.health';
import { NestHealthIndicator } from './nest.health';
import { AiServiceHealthIndicator } from './ai-service.health';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    NestHealthIndicator,
    AiServiceHealthIndicator,
  ],
})
export class HealthModule {}
