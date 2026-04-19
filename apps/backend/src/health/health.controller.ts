import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { DatabaseHealthIndicator } from "./database.health";
import { NestHealthIndicator } from "./nest.health";
import { AiServiceHealthIndicator } from "./ai-service.health";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

@Controller("health")
@AllowAnonymous()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly nest: NestHealthIndicator,
    private readonly aiService: AiServiceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.nest.isHealthy("nestjs"),
      () => this.database.isHealthy("database"),
      () => this.aiService.isHealthy("ai-service"),
    ]);
  }

  @Get("live")
  @HealthCheck()
  live() {
    return this.health.check([() => this.nest.isHealthy("nestjs")]);
  }

  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.nest.isHealthy("nestjs"),
      () => this.database.isHealthy("database"),
      () => this.aiService.isHealthy("ai-service"),
    ]);
  }
}
