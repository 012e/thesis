import { Injectable } from "@nestjs/common";
import { HealthIndicatorService } from "@nestjs/terminus";

@Injectable()
export class NestHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    // NestJS instance is healthy if this indicator is being called
    return indicator.up();
  }
}
